const { neon } = require('@neondatabase/serverless');

const NEON_DATABASE_URL = process.env.ktapps_NEON_DATABASE_URL;

function normalizeMonthKey(monthValue) {
    const raw = String(monthValue || '').trim().toLowerCase();
    if (!raw) return '';
    return raw.slice(0, 3);
}

function parseRecordDate(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;

    let match = raw.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
    if (match) {
        return {
            monthKey: normalizeMonthKey(match[2]),
            year: Number(match[3])
        };
    }

    match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
        const jsDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        if (!Number.isNaN(jsDate.getTime())) {
            return {
                monthKey: normalizeMonthKey(jsDate.toLocaleString('en-US', { month: 'short' })),
                year: jsDate.getFullYear()
            };
        }
    }

    const fallback = new Date(raw);
    if (!Number.isNaN(fallback.getTime())) {
        return {
            monthKey: normalizeMonthKey(fallback.toLocaleString('en-US', { month: 'short' })),
            year: fallback.getFullYear()
        };
    }

    return null;
}

function matchesMonthYear(dateValue, month, year) {
    const parsed = parseRecordDate(dateValue);
    if (!parsed) return false;
    return parsed.monthKey === normalizeMonthKey(month) && parsed.year === Number(year);
}

function toSafeError(error) {
    return {
        name: error?.name || 'Error',
        message: error?.message || 'Unknown error',
        code: error?.code || '',
        hasDbUrl: Boolean(NEON_DATABASE_URL)
    };
}

async function ensureSchema(sql) {
    await sql`
        CREATE TABLE IF NOT EXISTS rent_records (
            id BIGSERIAL PRIMARY KEY,
            record_date TEXT NOT NULL,
            record_month TEXT,
            record_year INTEGER,
            side TEXT NOT NULL,
            rent_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
            paid_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
            balance_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
            power_bill DOUBLE PRECISION NOT NULL DEFAULT 0,
            water_bill DOUBLE PRECISION NOT NULL DEFAULT 0,
            total_paid DOUBLE PRECISION NOT NULL DEFAULT 0,
            remarks TEXT NOT NULL DEFAULT '',
            action_type TEXT NOT NULL DEFAULT 'add',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_rent_records_date_side ON rent_records(record_date, side)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_rent_records_month_year ON rent_records(record_month, record_year)`;
}

function mapRow(row) {
    return {
        date: String(row.record_date || ''),
        side: String(row.side || ''),
        rentAmount: Number(row.rent_amount || 0),
        paidAmount: Number(row.paid_amount || 0),
        balanceAmount: Number(row.balance_amount || 0),
        powerBill: Number(row.power_bill || 0),
        waterBill: Number(row.water_bill || 0),
        totalPaid: Number(row.total_paid || 0),
        remarks: String(row.remarks || '')
    };
}

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        res.status(405).json({ ok: false, message: 'Method not allowed' });
        return;
    }

    if (!NEON_DATABASE_URL) {
        res.status(500).json({ ok: false, message: 'Missing Neon configuration in environment variables.' });
        return;
    }

    const { month, year, fetchAll } = req.query || {};
    if (!fetchAll && !(month && year)) {
        res.status(400).json({ ok: false, message: 'Provide ?month=Jun&year=2026 or ?fetchAll=true' });
        return;
    }

    const sql = neon(NEON_DATABASE_URL);

    try {
        await ensureSchema(sql);

        let rows;
        if (fetchAll === 'true') {
            rows = await sql`
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
        } else {
            rows = await sql`
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
                WHERE record_month = ${normalizeMonthKey(month)}
                  AND record_year = ${Number(year)}
                ORDER BY id ASC
            `;

            if (!rows.length) {
                const fallbackRows = await sql`
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
                rows = fallbackRows.filter((row) => matchesMonthYear(row.record_date, month, year));
            }
        }

        const data = rows.map(mapRow);
        res.status(200).json({
            ok: true,
            source: 'database',
            data
        });
    } catch (error) {
        res.status(500).json({
            ok: false,
            message: error.message || 'Failed to fetch from Neon.',
            error: toSafeError(error)
        });
    }
};

