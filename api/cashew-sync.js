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

async function ensureSchema(client) {
    await client.execute(`
        CREATE TABLE IF NOT EXISTS cashew_expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            expense_date TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            amount REAL NOT NULL,
            action_type TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await client.execute('CREATE INDEX IF NOT EXISTS idx_cashew_expenses_date ON cashew_expenses(expense_date)');
}

async function syncToTurso(payload) {
    if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
        throw new Error('Missing Turso configuration in environment variables.');
    }

    const client = createClient({
        url: TURSO_DATABASE_URL,
        authToken: TURSO_AUTH_TOKEN
    });

    await ensureSchema(client);

    const statements = [];

    if (payload.action === 'update' && payload.originalDate) {
        statements.push({
            sql: 'DELETE FROM cashew_expenses WHERE expense_date = ?',
            args: [payload.originalDate]
        });
    }

    for (const expense of payload.expenses) {
        statements.push({
            sql: `
                INSERT INTO cashew_expenses (expense_date, category, description, amount, action_type)
                VALUES (?, ?, ?, ?, ?)
            `,
            args: [
                expense.date,
                String(expense.category || '').trim(),
                String(expense.description || '').trim(),
                Number(expense.amount),
                String(payload.action || 'add')
            ]
        });
    }

    // Turso/libsql handles atomicity for write batch; avoids manual BEGIN/COMMIT issues.
    await client.batch(statements, 'write');
    return { ok: true, rowsSaved: payload.expenses.length };
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
            message: error.message || 'Turso save failed.'
        });
    }
};

