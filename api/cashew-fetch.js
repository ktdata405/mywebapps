const { createClient } = require('@libsql/client');

const TURSO_DATABASE_URL = process.env.ktapps_TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN   = process.env.ktapps_TURSO_AUTH_TOKEN;

function toSafeError(error) {
    return {
        name: error?.name || 'Error',
        message: error?.message || 'Unknown error',
        hasDbUrl: Boolean(TURSO_DATABASE_URL),
        hasDbToken: Boolean(TURSO_AUTH_TOKEN)
    };
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

    const schema = await client.execute('PRAGMA table_info(cashew_expenses)');
    const columns = new Set((schema.rows || []).map((row) => String(row.name || '').toLowerCase()));
    if (!columns.has('expense_month')) {
        await client.execute('ALTER TABLE cashew_expenses ADD COLUMN expense_month TEXT');
    }
    if (!columns.has('expense_year')) {
        await client.execute('ALTER TABLE cashew_expenses ADD COLUMN expense_year INTEGER');
    }

    await client.execute(
        'CREATE INDEX IF NOT EXISTS idx_cashew_expenses_date ON cashew_expenses(expense_date)'
    );
    await client.execute(
        'CREATE INDEX IF NOT EXISTS idx_cashew_expenses_month_year ON cashew_expenses(expense_month, expense_year)'
    );
}

function buildResponseData(rows) {
    const data = (rows || []).map(r => ({
        date:        String(r.expense_date || r[0] || ''),
        category:    String(r.category    || r[1] || ''),
        description: String(r.description || r[2] || ''),
        amount:      Number(r.amount       ?? r[3] ?? 0)
    }));

    const monthlyBalances = {};
    data.forEach(entry => {
        const parts = String(entry.date).split('/');
        if (parts.length === 3) {
            const key = `${parts[1]} ${parts[2]}`;
            monthlyBalances[key] = (monthlyBalances[key] || 0) + entry.amount;
        }
    });

    return { data, monthlyBalances };
}

function normalizeMonthKey(monthValue) {
    const raw = String(monthValue || '').trim().toLowerCase();
    if (!raw) return '';
    // Supports Jan/January style values.
    return raw.slice(0, 3);
}

function parseExpenseDate(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;

    // dd/MMM/yyyy (e.g. 05/Jun/2026)
    let match = raw.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
    if (match) {
        return {
            year: Number(match[3]),
            monthKey: normalizeMonthKey(match[2])
        };
    }

    // yyyy-MM-dd
    match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
        const monthIndex = Number(match[2]) - 1;
        const jsDate = new Date(Number(match[1]), monthIndex, Number(match[3]));
        if (!Number.isNaN(jsDate.getTime())) {
            return {
                year: jsDate.getFullYear(),
                monthKey: normalizeMonthKey(jsDate.toLocaleString('en-US', { month: 'short' }))
            };
        }
    }

    // dd/MM/yyyy
    match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
        const jsDate = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
        if (!Number.isNaN(jsDate.getTime())) {
            return {
                year: jsDate.getFullYear(),
                monthKey: normalizeMonthKey(jsDate.toLocaleString('en-US', { month: 'short' }))
            };
        }
    }

    const fallback = new Date(raw);
    if (!Number.isNaN(fallback.getTime())) {
        return {
            year: fallback.getFullYear(),
            monthKey: normalizeMonthKey(fallback.toLocaleString('en-US', { month: 'short' }))
        };
    }

    return null;
}

function matchesMonthYear(dateValue, month, year) {
    const parsed = parseExpenseDate(dateValue);
    if (!parsed) return false;
    return parsed.year === Number(year) && parsed.monthKey === normalizeMonthKey(month);
}

async function backfillMonthYear(client) {
    const missingResult = await client.execute(`
        SELECT id, expense_date
        FROM cashew_expenses
        WHERE expense_month IS NULL OR expense_year IS NULL
    `);

    const missingRows = missingResult.rows || [];
    if (!missingRows.length) return;

    const statements = [];
    missingRows.forEach((row) => {
        const parsed = parseExpenseDate(row.expense_date || row[1]);
        if (!parsed) return;
        statements.push({
            sql: 'UPDATE cashew_expenses SET expense_month = ?, expense_year = ? WHERE id = ?',
            args: [parsed.monthKey, parsed.year, Number(row.id || row[0])]
        });
    });

    if (statements.length) {
        await client.batch(statements, 'write');
    }
}

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        res.status(405).json({ ok: false, message: 'Method not allowed' });
        return;
    }

    if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
        res.status(500).json({ ok: false, message: 'Missing Turso configuration in environment variables.' });
        return;
    }

    const { month, year, fetchAll } = req.query || {};

    if (!fetchAll && !(month && year)) {
        res.status(400).json({ ok: false, message: 'Provide ?month=Jun&year=2026 or ?fetchAll=true' });
        return;
    }

    const client = createClient({
        url: TURSO_DATABASE_URL,
        authToken: TURSO_AUTH_TOKEN
    });

    try {
        // Always ensure the table exists before querying
        await ensureSchema(client);
        await backfillMonthYear(client);

        let rows;

        if (fetchAll === 'true') {
            const result = await client.execute(
                'SELECT expense_date, category, description, amount FROM cashew_expenses ORDER BY id ASC'
            );
            rows = result.rows || [];
        } else {
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
            rows = result.rows || [];

            // Safety fallback for any unparsable legacy rows that could not be backfilled.
            if (!rows.length) {
                const allResult = await client.execute(
                    'SELECT expense_date, category, description, amount FROM cashew_expenses ORDER BY id ASC'
                );
                const allRows = allResult.rows || [];
                rows = allRows.filter(row => matchesMonthYear(row.expense_date || row[0], month, year));
            }
        }

        const { data, monthlyBalances } = buildResponseData(rows);

        res.status(200).json({
            ok: true,
            source: 'database',
            data,
            availableBalance: 0,
            monthlyBalances
        });
    } catch (error) {
        res.status(500).json({
            ok: false,
            message: error.message || 'Failed to fetch from Turso.',
            error: toSafeError(error)
        });
    } finally {
        try { client.close(); } catch (_) {}
    }
};
