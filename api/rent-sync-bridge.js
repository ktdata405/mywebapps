const { neon } = require('@neondatabase/serverless');
const rentSyncModule = require('./rent-sync');

const NEON_DATABASE_URL = process.env.ktapps_NEON_DATABASE_URL;

function parseRequestBody(req) {
    if (!req || req.body === undefined || req.body === null) return {};
    if (typeof req.body === 'string') {
        try {
            return JSON.parse(req.body);
        } catch (_) {
            return {};
        }
    }
    return req.body;
}

function normalizeMonthKey(monthValue) {
    const raw = String(monthValue || '').trim().toLowerCase();
    if (!raw) return '';
    return raw.slice(0, 3);
}

function toSafeError(error) {
    return {
        name: error?.name || 'Error',
        message: error?.message || 'Unknown error',
        code: error?.code || '',
        hasDbUrl: Boolean(NEON_DATABASE_URL)
    };
}

function sanitizeSheetUrl(url) {
    const raw = String(url || '').trim();
    if (!raw) return '';
    try {
        const parsed = new URL(raw);
        const isValidHost = parsed.hostname === 'script.google.com' || parsed.hostname.endsWith('.script.google.com');
        if (parsed.protocol !== 'https:' || !isValidHost) return '';
        return parsed.toString();
    } catch (_) {
        return '';
    }
}

function formatDateToDDMMMYYYY(dateObj) {
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = dateObj.toLocaleString('en-US', { month: 'short' });
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
}

function normalizeDate(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';

    let match = raw.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
    if (match) {
        return `${String(Number(match[1])).padStart(2, '0')}/${match[2].slice(0, 3)}/${Number(match[3])}`;
    }

    match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
        const jsDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        if (!Number.isNaN(jsDate.getTime())) return formatDateToDDMMMYYYY(jsDate);
    }

    const fallback = new Date(raw);
    if (!Number.isNaN(fallback.getTime())) return formatDateToDDMMMYYYY(fallback);
    return raw;
}

function parseDateParts(value) {
    const normalized = normalizeDate(value);
    const match = normalized.match(/^(\d{2})\/([A-Za-z]{3})\/(\d{4})$/);
    if (!match) return null;
    return {
        month: normalizeMonthKey(match[2]),
        year: Number(match[3])
    };
}

function dedupeRecords(records) {
    const deduped = [];
    const signatures = new Set();

    records.forEach((row) => {
        const normalizedDate = normalizeDate(row.date);
        const side = String(row.side || '').trim();
        if (!normalizedDate || !side) return;

        const normalized = {
            date: normalizedDate,
            side,
            rentAmount: Number(row.rentAmount || 0),
            paidAmount: Number(row.paidAmount || 0),
            balanceAmount: Number(row.balanceAmount || 0),
            powerBill: Number(row.powerBill || 0),
            waterBill: Number(row.waterBill || 0),
            totalPaid: Number(row.totalPaid || 0),
            remarks: String(row.remarks || '').trim() || '-'
        };

        const signature = `${normalized.date}|${normalized.side.toLowerCase()}`;
        if (signatures.has(signature)) return;

        signatures.add(signature);
        deduped.push(normalized);
    });

    return deduped;
}

function matchesMonthYear(recordDate, month, year) {
    const parsed = parseDateParts(recordDate);
    if (!parsed) return false;
    return parsed.month === normalizeMonthKey(month) && parsed.year === Number(year);
}

async function fetchSheetRows({ sheetUrl }) {
    const response = await fetch(`${sheetUrl}?fetchAll=true&t=${Date.now()}`);
    if (!response.ok) {
        throw new Error(`Google Sheets fetch failed with status ${response.status}`);
    }

    const result = await response.json();
    return Array.isArray(result.data) ? result.data : [];
}

async function syncSheetToDatabase({ sheetUrl, month, year, fetchAll }) {
    const rawRows = await fetchSheetRows({ sheetUrl });
    const filteredRows = fetchAll
        ? rawRows
        : rawRows.filter((row) => matchesMonthYear(row.date, month, year));
    const dedupedRows = dedupeRecords(filteredRows);

    let rowsSynced = 0;
    for (const row of dedupedRows) {
        await rentSyncModule.syncToNeon({
            type: 'rent',
            action: 'update',
            originalDate: row.date,
            originalSide: row.side,
            record: row
        });
        rowsSynced += 1;
    }

    return {
        direction: 'sheet-to-db',
        rowsProcessed: filteredRows.length,
        rowsSynced,
        duplicatesSkipped: filteredRows.length - dedupedRows.length
    };
}

async function queryDatabaseRows() {
    if (!NEON_DATABASE_URL) {
        throw new Error('Missing Neon configuration in environment variables.');
    }

    const sql = neon(NEON_DATABASE_URL);
    return sql`
        SELECT
            record_date,
            side,
            rent_amount,
            paid_amount,
            balance_amount,
            power_bill,
            water_bill,
            total_paid,
            remarks
        FROM rent_records
        ORDER BY id ASC
    `;
}

async function pushRowToSheet(sheetUrl, record) {
    const updatePayload = {
        date: record.date,
        side: record.side,
        rentAmount: record.rentAmount,
        paidAmount: record.paidAmount,
        balanceAmount: record.balanceAmount,
        powerBill: record.powerBill,
        waterBill: record.waterBill,
        totalPaid: record.totalPaid,
        remarks: record.remarks || '-',
        action: 'update',
        originalDate: record.date,
        originalSide: record.side
    };

    let response = await fetch(sheetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
    });

    let result;
    try {
        result = await response.json();
    } catch (_) {
        result = null;
    }

    if (response.ok && result && result.result === 'success') return;

    const addPayload = {
        ...updatePayload,
        action: 'add'
    };

    response = await fetch(sheetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addPayload)
    });

    if (!response.ok) {
        throw new Error(`Google Sheets write failed with status ${response.status} for ${record.date} / ${record.side}`);
    }
}

async function syncDatabaseToSheet({ sheetUrl, month, year, fetchAll }) {
    const dbRows = await queryDatabaseRows();
    const mappedRows = dbRows.map((row) => ({
        date: String(row.record_date || ''),
        side: String(row.side || ''),
        rentAmount: Number(row.rent_amount || 0),
        paidAmount: Number(row.paid_amount || 0),
        balanceAmount: Number(row.balance_amount || 0),
        powerBill: Number(row.power_bill || 0),
        waterBill: Number(row.water_bill || 0),
        totalPaid: Number(row.total_paid || 0),
        remarks: String(row.remarks || '')
    }));

    const filteredRows = fetchAll
        ? mappedRows
        : mappedRows.filter((row) => matchesMonthYear(row.date, month, year));
    const dedupedRows = dedupeRecords(filteredRows);

    let rowsSynced = 0;
    for (const row of dedupedRows) {
        await pushRowToSheet(sheetUrl, row);
        rowsSynced += 1;
    }

    return {
        direction: 'db-to-sheet',
        rowsProcessed: filteredRows.length,
        rowsSynced,
        duplicatesSkipped: filteredRows.length - dedupedRows.length
    };
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ ok: false, message: 'Method not allowed' });
        return;
    }

    const body = parseRequestBody(req);
    const direction = String(body.direction || '').trim();
    const month = String(body.month || '').trim();
    const year = String(body.year || '').trim();
    const fetchAll = body.fetchAll === true || body.fetchAll === 'true';
    const sheetUrl = sanitizeSheetUrl(body.sheetUrl);

    if (!sheetUrl) {
        res.status(400).json({ ok: false, message: 'A valid Google Apps Script sheetUrl is required.' });
        return;
    }

    if (!fetchAll && (!month || !year)) {
        res.status(400).json({ ok: false, message: 'Provide month/year or set fetchAll=true.' });
        return;
    }

    if (direction !== 'sheet-to-db' && direction !== 'db-to-sheet') {
        res.status(400).json({ ok: false, message: 'direction must be sheet-to-db or db-to-sheet.' });
        return;
    }

    try {
        const summary = direction === 'sheet-to-db'
            ? await syncSheetToDatabase({ sheetUrl, month, year, fetchAll })
            : await syncDatabaseToSheet({ sheetUrl, month, year, fetchAll });

        res.status(200).json({
            ok: true,
            message: 'Sync completed successfully.',
            summary
        });
    } catch (error) {
        res.status(500).json({
            ok: false,
            message: error.message || 'Sync failed.',
            error: toSafeError(error)
        });
    }
};

