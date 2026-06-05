const { createClient } = require('@libsql/client');

const TURSO_DATABASE_URL = process.env.ktapps_TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.ktapps_TURSO_AUTH_TOKEN;

function parseRequestBody(req) {
    if (!req || req.body === undefined || req.body === null) return null;
    if (typeof req.body === 'string') {
        try {
            return JSON.parse(req.body);
        } catch (_) {
            return null;
        }
    }
    return req.body;
}

function validatePayload(payload) {
    if (!payload || payload.type !== 'cashew') {
        return 'Invalid payload. Expected type=cashew.';
    }

    if (!Array.isArray(payload.expenses) || payload.expenses.length === 0) {
        return 'No valid expenses provided.';
    }

    for (const expense of payload.expenses) {
        const amount = Number(expense.amount);
        if (!expense.date || !expense.category || Number.isNaN(amount) || amount <= 0) {
            return 'Each expense must include date, category and amount > 0.';
        }
    }

    return '';
}

function toSafeErrorDetails(error) {
    return {
        name: error?.name || 'Error',
        message: error?.message || 'Unknown error',
        code: error?.code || '',
        hasDbUrl: Boolean(TURSO_DATABASE_URL),
        hasDbToken: Boolean(TURSO_AUTH_TOKEN)
    };
}

function normalizeMonthKey(monthValue) {
    const raw = String(monthValue || '').trim();
    if (!raw) return '';
    return raw.slice(0, 3);
}

function parseExpenseDateParts(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;

    // dd/MMM/yyyy (e.g. 05/Jun/2026)
    let match = raw.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
    if (match) {
        return {
            month: normalizeMonthKey(match[2]),
            year: Number(match[3])
        };
    }

    // yyyy-MM-dd
    match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
        const jsDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        if (!Number.isNaN(jsDate.getTime())) {
            return {
                month: jsDate.toLocaleString('en-US', { month: 'short' }),
                year: jsDate.getFullYear()
            };
        }
    }

    // dd/MM/yyyy
    match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
        const jsDate = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
        if (!Number.isNaN(jsDate.getTime())) {
            return {
                month: jsDate.toLocaleString('en-US', { month: 'short' }),
                year: jsDate.getFullYear()
            };
        }
    }

    const fallback = new Date(raw);
    if (!Number.isNaN(fallback.getTime())) {
        return {
            month: fallback.toLocaleString('en-US', { month: 'short' }),
            year: fallback.getFullYear()
        };
    }

    return null;
}

async function ensureMonthYearColumns(client) {
    const schema = await client.execute('PRAGMA table_info(cashew_expenses)');
    const columns = new Set((schema.rows || []).map((row) => String(row.name || '').toLowerCase()));

    if (!columns.has('expense_month')) {
        await client.execute('ALTER TABLE cashew_expenses ADD COLUMN expense_month TEXT');
    }
    if (!columns.has('expense_year')) {
        await client.execute('ALTER TABLE cashew_expenses ADD COLUMN expense_year INTEGER');
    }
}

async function ensureSchema(client) {
    await client.execute(`
        CREATE TABLE IF NOT EXISTS cashew_expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            expense_date TEXT NOT NULL,
            expense_month TEXT,
            expense_year INTEGER,
            category TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            amount REAL NOT NULL,
            action_type TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await ensureMonthYearColumns(client);
    await client.execute('CREATE INDEX IF NOT EXISTS idx_cashew_expenses_date ON cashew_expenses(expense_date)');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_cashew_expenses_month_year ON cashew_expenses(expense_month, expense_year)');
}

async function syncToTurso(payload) {
    if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
        throw new Error('Missing Turso configuration in environment variables.');
    }

    const client = createClient({
        url: TURSO_DATABASE_URL,
        authToken: TURSO_AUTH_TOKEN
    });

    try {
        await ensureSchema(client);

        const statements = [];

        // Always delete ALL existing rows for every unique date in this payload
        // before inserting. This prevents duplicate accumulation regardless of
        // whether action is 'add' or 'update'.
        const uniqueDates = [...new Set(payload.expenses.map(e => String(e.date)))];
        for (const date of uniqueDates) {
            statements.push({
                sql: 'DELETE FROM cashew_expenses WHERE expense_date = ?',
                args: [date]
            });
        }

        // Also delete by originalDate when it differs (date was changed during edit)
        if (payload.originalDate && !uniqueDates.includes(String(payload.originalDate))) {
            statements.push({
                sql: 'DELETE FROM cashew_expenses WHERE expense_date = ?',
                args: [String(payload.originalDate)]
            });
        }

        for (const expense of payload.expenses) {
            const parsedDate = parseExpenseDateParts(expense.date);
            statements.push({
                sql: `
                    INSERT INTO cashew_expenses (expense_date, expense_month, expense_year, category, description, amount, action_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `,
                args: [
                    expense.date,
                    parsedDate ? String(parsedDate.month) : null,
                    parsedDate ? Number(parsedDate.year) : null,
                    String(expense.category || '').trim(),
                    String(expense.description || '').trim(),
                    Number(expense.amount),
                    String(payload.action || 'add')
                ]
            });
        }

        // Turso/libsql handles atomicity for write batch.
        await client.batch(statements, 'write');

        const dateToVerify = String(payload.expenses[0].date || '');
        const verifyResult = await client.execute({
            sql: 'SELECT COUNT(*) AS saved_count FROM cashew_expenses WHERE expense_date = ?',
            args: [dateToVerify]
        });

        const savedCountRaw = verifyResult.rows?.[0]?.saved_count;
        const savedCount = Number(savedCountRaw || 0);
        if (!savedCount) {
            throw new Error('Turso write reported success but no rows were found after verification.');
        }

        return {
            ok: true,
            rowsSaved: payload.expenses.length,
            verifiedDate: dateToVerify,
            verifiedRowsForDate: savedCount
        };
    } finally {
        try {
            client.close();
        } catch (_) {
            // Ignore close errors in serverless cleanup.
        }
    }
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ ok: false, message: 'Method not allowed' });
        return;
    }

    const payload = parseRequestBody(req);
    const validationError = validatePayload(payload);

    if (validationError) {
        res.status(400).json({ ok: false, message: validationError });
        return;
    }

    try {
        const tursoResult = await syncToTurso(payload);
        res.status(200).json({
            ok: true,
            message: 'Saved to Turso.',
            turso: tursoResult
        });
    } catch (error) {
        res.status(500).json({
            ok: false,
            message: error.message || 'Turso save failed.',
            error: toSafeErrorDetails(error)
        });
    }
};

// Expose core sync helper for internal API-to-API reuse (e.g., sheet<->db bridge sync).
module.exports.syncToTurso = syncToTurso;

