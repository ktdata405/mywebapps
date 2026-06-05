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

function parseMilkDateParts(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;

    // dd/MMM/yyyy
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

    const fallback = new Date(raw);
    if (!Number.isNaN(fallback.getTime())) {
        return {
            month: fallback.toLocaleString('en-US', { month: 'short' }),
            year: fallback.getFullYear()
        };
    }

    return null;
}

function parseSheetName(value) {
    const raw = String(value || '').trim();
    const match = raw.match(/^([A-Za-z]{3})\s+(\d{4})$/);
    if (!match) return null;
    return {
        month: normalizeMonthKey(match[1]),
        year: Number(match[2])
    };
}

function validatePayload(payload) {
    if (!payload || payload.type !== 'milk') {
        return 'Invalid payload. Expected type=milk.';
    }

    if (payload.action === 'markMonthPaid') {
        if (!payload.sheetName) {
            return 'sheetName is required for markMonthPaid.';
        }
        return '';
    }

    if (!payload.date) {
        return 'date is required for milk save.';
    }

    const morning = Number(payload.morning ?? 0);
    const evening = Number(payload.evening ?? 0);
    const unitPrice = Number(payload.unitPrice ?? 80);
    const dailyCost = Number(payload.dailyCost ?? (morning + evening) * unitPrice);

    if (Number.isNaN(morning) || morning < 0) return 'morning must be >= 0.';
    if (Number.isNaN(evening) || evening < 0) return 'evening must be >= 0.';
    if (Number.isNaN(unitPrice) || unitPrice < 0) return 'unitPrice must be >= 0.';
    if (Number.isNaN(dailyCost) || dailyCost < 0) return 'dailyCost must be >= 0.';

    return '';
}

async function ensureMonthYearColumns(client) {
    const schema = await client.execute('PRAGMA table_info(milk_entries)');
    const columns = new Set((schema.rows || []).map((row) => String(row.name || '').toLowerCase()));

    if (!columns.has('entry_month')) {
        await client.execute('ALTER TABLE milk_entries ADD COLUMN entry_month TEXT');
    }
    if (!columns.has('entry_year')) {
        await client.execute('ALTER TABLE milk_entries ADD COLUMN entry_year INTEGER');
    }
    if (!columns.has('daily_cost')) {
        await client.execute('ALTER TABLE milk_entries ADD COLUMN daily_cost REAL');
    }
    if (!columns.has('status')) {
        await client.execute('ALTER TABLE milk_entries ADD COLUMN status TEXT');
    }
}

async function ensureSchema(client) {
    await client.execute(`
        CREATE TABLE IF NOT EXISTS milk_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entry_date TEXT NOT NULL,
            entry_month TEXT,
            entry_year INTEGER,
            morning REAL NOT NULL DEFAULT 0,
            evening REAL NOT NULL DEFAULT 0,
            unit_price REAL NOT NULL DEFAULT 80,
            daily_cost REAL NOT NULL DEFAULT 0,
            remarks TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'Unpaid',
            action_type TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await ensureMonthYearColumns(client);
    await client.execute('CREATE INDEX IF NOT EXISTS idx_milk_entries_date ON milk_entries(entry_date)');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_milk_entries_month_year ON milk_entries(entry_month, entry_year)');
}

async function markMonthPaidInTurso(client, sheetName, statusValue) {
    const parsed = parseSheetName(sheetName);
    if (!parsed) {
        throw new Error('Invalid sheetName. Expected format like Jun 2026.');
    }

    await client.execute({
        sql: 'UPDATE milk_entries SET status = ? WHERE entry_month = ? AND entry_year = ?',
        args: [String(statusValue || 'Paid'), parsed.month, parsed.year]
    });

    return {
        month: parsed.month,
        year: parsed.year,
        status: String(statusValue || 'Paid')
    };
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

        if (payload.action === 'markMonthPaid') {
            const monthlyUpdate = await markMonthPaidInTurso(client, payload.sheetName, payload.status || 'Paid');
            return {
                ok: true,
                action: 'markMonthPaid',
                monthlyUpdate
            };
        }

        const date = String(payload.date).trim();
        const parsedDate = parseMilkDateParts(date);
        const morning = Number(payload.morning ?? 0);
        const evening = Number(payload.evening ?? 0);
        const unitPrice = Number(payload.unitPrice ?? 80);
        const dailyCost = Number(payload.dailyCost ?? (morning + evening) * unitPrice);

        const statements = [
            {
                sql: 'DELETE FROM milk_entries WHERE entry_date = ?',
                args: [date]
            },
            {
                sql: `
                    INSERT INTO milk_entries (
                        entry_date, entry_month, entry_year, morning, evening,
                        unit_price, daily_cost, remarks, status, action_type
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                args: [
                    date,
                    parsedDate ? String(parsedDate.month) : null,
                    parsedDate ? Number(parsedDate.year) : null,
                    morning,
                    evening,
                    unitPrice,
                    dailyCost,
                    String(payload.remarks || '').trim(),
                    String(payload.status || 'Unpaid').trim() || 'Unpaid',
                    String(payload.action || 'add')
                ]
            }
        ];

        await client.batch(statements, 'write');

        const verify = await client.execute({
            sql: 'SELECT COUNT(*) AS saved_count FROM milk_entries WHERE entry_date = ?',
            args: [date]
        });

        const savedCount = Number(verify.rows?.[0]?.saved_count || 0);
        if (!savedCount) {
            throw new Error('Turso write reported success but no rows found for date.');
        }

        return {
            ok: true,
            action: String(payload.action || 'add'),
            rowsSaved: 1,
            verifiedDate: date,
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

module.exports.syncToTurso = syncToTurso;

