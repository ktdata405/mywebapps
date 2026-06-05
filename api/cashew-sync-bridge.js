const { createClient } = require('@libsql/client');
const cashewSyncModule = require('./cashew-sync');

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

function parseExpenseDate(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;

    // dd/MMM/yyyy (e.g. 05/Jun/2026)
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

function dedupeExpenses(expenses) {
    const deduped = [];
    const signatures = new Set();

    expenses.forEach((expense) => {
        const amount = Number(expense.amount);
        const parsedDate = parseExpenseDate(expense.date);
        const category = String(expense.category || '').trim();
        const description = String(expense.description || '').trim();

        if (!parsedDate || !category || Number.isNaN(amount) || amount <= 0) return;

        const normalized = {
            date: parsedDate.date,
            category,
            description,
            amount: Number(amount.toFixed(2))
        };

        const signature = [
            normalized.date,
            normalized.category.toLowerCase(),
            normalized.description.toLowerCase(),
            normalized.amount.toFixed(2)
        ].join('|');

        if (signatures.has(signature)) return;
        signatures.add(signature);
        deduped.push(normalized);
    });

    return deduped;
}

function groupByDate(expenses) {
    return expenses.reduce((acc, expense) => {
        if (!acc[expense.date]) acc[expense.date] = [];
        acc[expense.date].push(expense);
        return acc;
    }, {});
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
        const result = await client.execute(
            'SELECT expense_date, category, description, amount FROM cashew_expenses ORDER BY id ASC'
        );
        return result.rows || [];
    }

    const normalizedMonth = normalizeMonthKey(month);
    const normalizedYear = Number(year);
    const result = await client.execute({
        sql: `
            SELECT expense_date, category, description, amount
            FROM cashew_expenses
            WHERE expense_month = ? AND expense_year = ?
            ORDER BY id ASC
        `,
        args: [normalizedMonth, normalizedYear]
    });

    return result.rows || [];
}

async function syncSheetToDatabase({ sheetUrl, month, year, fetchAll }) {
    const sheetRows = await fetchSheetRows({ sheetUrl, month, year, fetchAll });
    const dedupedRows = dedupeExpenses(sheetRows);
    const grouped = groupByDate(dedupedRows);
    const dates = Object.keys(grouped);

    let syncedRows = 0;
    for (const dateLabel of dates) {
        const rows = grouped[dateLabel];
        if (!rows.length) continue;

        await cashewSyncModule.syncToTurso({
            type: 'cashew',
            expenses: rows,
            total: rows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
            isEdit: true,
            action: 'update',
            originalDate: dateLabel
        });

        syncedRows += rows.length;
    }

    return {
        direction: 'sheet-to-db',
        datesProcessed: dates.length,
        rowsProcessed: sheetRows.length,
        rowsSynced: syncedRows,
        duplicatesSkipped: sheetRows.length - dedupedRows.length
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
        const mappedRows = dedupeExpenses(
            rows.map((row) => ({
                date: String(row.expense_date || row[0] || ''),
                category: String(row.category || row[1] || ''),
                description: String(row.description || row[2] || ''),
                amount: Number(row.amount ?? row[3] ?? 0)
            }))
        );
        const grouped = groupByDate(mappedRows);

        let pushedRows = 0;
        const dateLabels = Object.keys(grouped);

        for (const dateLabel of dateLabels) {
            const expenses = grouped[dateLabel];
            if (!expenses.length) continue;

            const payload = {
                type: 'cashew',
                expenses,
                total: expenses.reduce((sum, row) => sum + Number(row.amount || 0), 0),
                isEdit: true,
                action: 'update',
                originalDate: dateLabel
            };

            const response = await fetch(sheetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Google Sheets write failed with status ${response.status} for ${dateLabel}`);
            }

            pushedRows += expenses.length;
        }

        return {
            direction: 'db-to-sheet',
            datesProcessed: dateLabels.length,
            rowsSynced: pushedRows,
            duplicatesSkipped: rows.length - mappedRows.length
        };
    } finally {
        try {
            client.close();
        } catch (_) {
            // Ignore close errors.
        }
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

