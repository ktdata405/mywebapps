const { createClient } = require('@libsql/client');
const milkSyncModule = require('./milk-sync');

const TURSO_DATABASE_URL = process.env.ktapps_TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.ktapps_TURSO_AUTH_TOKEN;

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
    const raw = String(monthValue || '').trim();
    if (!raw) return '';
    return raw.slice(0, 3);
}

function toSafeError(error) {
    return {
        name: error?.name || 'Error',
        message: error?.message || 'Unknown error',
        code: error?.code || '',
        hasDbUrl: Boolean(TURSO_DATABASE_URL),
        hasDbToken: Boolean(TURSO_AUTH_TOKEN)
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

function parseDate(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;

    let match = raw.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
    if (match) {
        const day = String(Number(match[1])).padStart(2, '0');
        const month = normalizeMonthKey(match[2]);
        const year = Number(match[3]);
        return { date: `${day}/${month}/${year}`, month, year };
    }

    const jsDate = new Date(raw);
    if (Number.isNaN(jsDate.getTime())) return null;

    const day = String(jsDate.getDate()).padStart(2, '0');
    const month = jsDate.toLocaleString('en-US', { month: 'short' });
    const year = jsDate.getFullYear();
    return { date: `${day}/${month}/${year}`, month, year };
}

function dedupeRows(rows) {
    // One row per date for milk. Keep the latest seen row.
    const byDate = new Map();

    rows.forEach((row) => {
        const parsedDate = parseDate(row.date);
        if (!parsedDate) return;

        const normalized = {
            date: parsedDate.date,
            morning: Number(row.morning ?? 0),
            evening: Number(row.evening ?? 0),
            unitPrice: Number(row.unitPrice ?? row.unitprice ?? 80),
            dailyCost: Number(row.dailyCost ?? row.dailycost ?? 0),
            remarks: String(row.remarks || '').trim(),
            status: String(row.status || 'Unpaid').trim() || 'Unpaid'
        };

        if (Number.isNaN(normalized.morning) || normalized.morning < 0) return;
        if (Number.isNaN(normalized.evening) || normalized.evening < 0) return;
        if (Number.isNaN(normalized.unitPrice) || normalized.unitPrice < 0) return;

        if (Number.isNaN(normalized.dailyCost) || normalized.dailyCost <= 0) {
            normalized.dailyCost = (normalized.morning + normalized.evening) * normalized.unitPrice;
        }

        byDate.set(normalized.date, normalized);
    });

    return Array.from(byDate.values()).sort((a, b) => {
        const ad = parseDate(a.date);
        const bd = parseDate(b.date);
        return (ad?.year || 0) - (bd?.year || 0) || (ad?.month || '').localeCompare(bd?.month || '') || a.date.localeCompare(b.date);
    });
}

async function fetchSheetRows({ sheetUrl, month, year, fetchAll }) {
    const url = fetchAll === 'true' || fetchAll === true
        ? `${sheetUrl}?fetchAll=true&t=${Date.now()}`
        : `${sheetUrl}?sheetName=${encodeURIComponent(`${month} ${year}`)}&t=${Date.now()}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Google Sheets fetch failed with status ${response.status}`);
    }

    const result = await response.json();
    return Array.isArray(result.data) ? result.data : [];
}

async function queryDatabaseRows(client, { month, year, fetchAll }) {
    if (fetchAll === 'true' || fetchAll === true) {
        const result = await client.execute(`
            SELECT entry_date, morning, evening, unit_price, daily_cost, remarks, status
            FROM milk_entries
            ORDER BY id ASC
        `);
        return result.rows || [];
    }

    const result = await client.execute({
        sql: `
            SELECT entry_date, morning, evening, unit_price, daily_cost, remarks, status
            FROM milk_entries
            WHERE entry_month = ? AND entry_year = ?
            ORDER BY id ASC
        `,
        args: [normalizeMonthKey(month), Number(year)]
    });

    return result.rows || [];
}

async function syncSheetToDatabase({ sheetUrl, month, year, fetchAll }) {
    const rows = await fetchSheetRows({ sheetUrl, month, year, fetchAll });
    const dedupedRows = dedupeRows(rows);

    for (const row of dedupedRows) {
        await milkSyncModule.syncToTurso({
            type: 'milk',
            action: 'update',
            date: row.date,
            morning: row.morning,
            evening: row.evening,
            unitPrice: row.unitPrice,
            dailyCost: row.dailyCost,
            remarks: row.remarks,
            status: row.status
        });
    }

    return {
        direction: 'sheet-to-db',
        datesProcessed: dedupedRows.length,
        rowsProcessed: rows.length,
        rowsSynced: dedupedRows.length,
        duplicatesSkipped: rows.length - dedupedRows.length
    };
}

async function syncDatabaseToSheet({ sheetUrl, month, year, fetchAll }) {
    if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
        throw new Error('Missing Turso configuration in environment variables.');
    }

    const client = createClient({
        url: TURSO_DATABASE_URL,
        authToken: TURSO_AUTH_TOKEN
    });

    try {
        const rows = await queryDatabaseRows(client, { month, year, fetchAll });
        const mapped = dedupeRows(rows.map((row) => ({
            date: String(row.entry_date || row[0] || ''),
            morning: Number(row.morning ?? row[1] ?? 0),
            evening: Number(row.evening ?? row[2] ?? 0),
            unitPrice: Number(row.unit_price ?? row[3] ?? 80),
            dailyCost: Number(row.daily_cost ?? row[4] ?? 0),
            remarks: String(row.remarks ?? row[5] ?? ''),
            status: String(row.status ?? row[6] ?? 'Unpaid')
        })));

        for (const row of mapped) {
            const response = await fetch(sheetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'milk',
                    action: 'add',
                    date: row.date,
                    morning: row.morning,
                    evening: row.evening,
                    unitPrice: row.unitPrice,
                    dailyCost: row.dailyCost,
                    remarks: row.remarks,
                    status: row.status
                })
            });

            if (!response.ok) {
                throw new Error(`Google Sheets write failed with status ${response.status} for ${row.date}`);
            }
        }

        return {
            direction: 'db-to-sheet',
            datesProcessed: mapped.length,
            rowsSynced: mapped.length,
            duplicatesSkipped: rows.length - mapped.length
        };
    } finally {
        try { client.close(); } catch (_) {}
    }
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

