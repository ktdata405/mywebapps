const { createClient } = require('@libsql/client');

const TURSO_DATABASE_URL = process.env.ktapps_TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.ktapps_TURSO_AUTH_TOKEN;

function toSafeError(error) {
    return {
        name: error?.name || 'Error',
        message: error?.message || 'Unknown error',
        hasDbUrl: Boolean(TURSO_DATABASE_URL),
        hasDbToken: Boolean(TURSO_AUTH_TOKEN)
    };
}

function normalizeMonthKey(monthValue) {
    const raw = String(monthValue || '').trim().toLowerCase();
    if (!raw) return '';
    return raw.slice(0, 3);
}

function parseEntryDate(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;

    let match = raw.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
    if (match) {
        return {
            year: Number(match[3]),
            monthKey: normalizeMonthKey(match[2])
        };
    }

    match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
        const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        if (!Number.isNaN(d.getTime())) {
            return {
                year: d.getFullYear(),
                monthKey: normalizeMonthKey(d.toLocaleString('en-US', { month: 'short' }))
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
    const parsed = parseEntryDate(dateValue);
    if (!parsed) return false;
    return parsed.year === Number(year) && parsed.monthKey === normalizeMonthKey(month);
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

    await client.execute('CREATE INDEX IF NOT EXISTS idx_milk_entries_date ON milk_entries(entry_date)');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_milk_entries_month_year ON milk_entries(entry_month, entry_year)');
}

async function backfillMonthYear(client) {
    const missingResult = await client.execute(`
        SELECT id, entry_date
        FROM milk_entries
        WHERE entry_month IS NULL OR entry_year IS NULL
    `);

    const rows = missingResult.rows || [];
    if (!rows.length) return;

    const updates = [];
    rows.forEach((row) => {
        const parsed = parseEntryDate(row.entry_date || row[1]);
        if (!parsed) return;
        updates.push({
            sql: 'UPDATE milk_entries SET entry_month = ?, entry_year = ? WHERE id = ?',
            args: [parsed.monthKey, parsed.year, Number(row.id || row[0])]
        });
    });

    if (updates.length) {
        await client.batch(updates, 'write');
    }
}

function buildResponseData(rows) {
    const data = (rows || []).map((r) => {
        const morning = Number(r.morning ?? r[1] ?? 0);
        const evening = Number(r.evening ?? r[2] ?? 0);
        const unitPrice = Number(r.unit_price ?? r[3] ?? 80);
        const explicitDailyCost = Number(r.daily_cost ?? r[4]);
        const computedDailyCost = (morning + evening) * unitPrice;
        const dailyCost = Number.isFinite(explicitDailyCost) && explicitDailyCost > 0
            ? explicitDailyCost
            : computedDailyCost;

        return {
            date: String(r.entry_date || r[0] || ''),
            morning,
            evening,
            unitprice: unitPrice,
            unitPrice,
            dailycost: dailyCost,
            dailyCost,
            remarks: String(r.remarks ?? r[5] ?? ''),
            status: String(r.status ?? r[6] ?? 'Unpaid')
        };
    });

    const monthlyBalances = {};
    data.forEach((entry) => {
        const parsed = parseEntryDate(entry.date);
        if (!parsed) return;
        const monthLabel = `${parsed.monthKey.charAt(0).toUpperCase()}${parsed.monthKey.slice(1)} ${parsed.year}`;
        monthlyBalances[monthLabel] = (monthlyBalances[monthLabel] || 0) + Number(entry.dailyCost || 0);
    });

    return { data, monthlyBalances };
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
        await ensureSchema(client);
        await backfillMonthYear(client);

        let rows = [];
        if (fetchAll === 'true') {
            const result = await client.execute(`
                SELECT entry_date, morning, evening, unit_price, daily_cost, remarks, status
                FROM milk_entries
                ORDER BY id ASC
            `);
            rows = result.rows || [];
        } else {
            const result = await client.execute({
                sql: `
                    SELECT entry_date, morning, evening, unit_price, daily_cost, remarks, status
                    FROM milk_entries
                    WHERE entry_month = ? AND entry_year = ?
                    ORDER BY id ASC
                `,
                args: [normalizeMonthKey(month), Number(year)]
            });
            rows = result.rows || [];

            if (!rows.length) {
                const allResult = await client.execute(`
                    SELECT entry_date, morning, evening, unit_price, daily_cost, remarks, status
                    FROM milk_entries
                    ORDER BY id ASC
                `);
                const allRows = allResult.rows || [];
                rows = allRows.filter((row) => matchesMonthYear(row.entry_date || row[0], month, year));
            }
        }

        const { data, monthlyBalances } = buildResponseData(rows);
        const availableBalance = data.reduce((sum, row) => sum + Number(row.dailyCost || 0), 0);

        res.status(200).json({
            ok: true,
            source: 'database',
            data,
            availableBalance,
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

