const { neon } = require('@neondatabase/serverless');

const NEON_DATABASE_URL = process.env.ktapps_NEON_DATABASE_URL;

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

function normalizeMonthKey(monthValue) {
    const raw = String(monthValue || '').trim();
    if (!raw) return '';
    return raw.slice(0, 3);
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
        return `${String(Number(match[1])).padStart(2, '0')}/${normalizeMonthKey(match[2])}/${Number(match[3])}`;
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

function parseMonthYearFromDate(value) {
    const normalized = normalizeDate(value);
    const match = normalized.match(/^(\d{2})\/([A-Za-z]{3})\/(\d{4})$/);
    if (!match) return null;
    return {
        month: normalizeMonthKey(match[2]),
        year: Number(match[3])
    };
}

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function validatePayload(payload) {
    if (!payload || payload.type !== 'rent') {
        return 'Invalid payload. Expected type=rent.';
    }

    const record = payload.record || {};
    if (!record.date) return 'date is required.';
    if (!record.side) return 'side is required.';

    return '';
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

async function syncToNeon(payload) {
    if (!NEON_DATABASE_URL) {
        throw new Error('Missing Neon configuration in environment variables.');
    }

    const sql = neon(NEON_DATABASE_URL);
    await ensureSchema(sql);

    const record = payload.record || {};
    const normalizedDate = normalizeDate(record.date);
    const side = String(record.side || '').trim();
    const monthYear = parseMonthYearFromDate(normalizedDate);

    if (!normalizedDate || !side) {
        throw new Error('Record date and side are required for Neon sync.');
    }

    const originalDate = normalizeDate(payload.originalDate || normalizedDate);
    const originalSide = String(payload.originalSide || side).trim();

    await sql`DELETE FROM rent_records WHERE record_date = ${originalDate} AND side = ${originalSide}`;
    if (originalDate !== normalizedDate || originalSide !== side) {
        await sql`DELETE FROM rent_records WHERE record_date = ${normalizedDate} AND side = ${side}`;
    }

    await sql`
        INSERT INTO rent_records (
            record_date,
            record_month,
            record_year,
            side,
            rent_amount,
            paid_amount,
            balance_amount,
            power_bill,
            water_bill,
            total_paid,
            remarks,
            action_type
        ) VALUES (
            ${normalizedDate},
            ${monthYear ? monthYear.month : null},
            ${monthYear ? monthYear.year : null},
            ${side},
            ${toNumber(record.rentAmount)},
            ${toNumber(record.paidAmount)},
            ${toNumber(record.balanceAmount)},
            ${toNumber(record.powerBill)},
            ${toNumber(record.waterBill)},
            ${toNumber(record.totalPaid)},
            ${String(record.remarks || '').trim() || '-'},
            ${String(payload.action || 'add')}
        )
    `;

    const verify = await sql`
        SELECT COUNT(*)::int AS saved_count
        FROM rent_records
        WHERE record_date = ${normalizedDate} AND side = ${side}
    `;

    const savedCount = Number(verify[0]?.saved_count || 0);
    if (!savedCount) {
        throw new Error('Neon write reported success but no rows found after verification.');
    }

    return {
        ok: true,
        action: String(payload.action || 'add'),
        verifiedDate: normalizedDate,
        verifiedSide: side,
        verifiedRowsForKey: savedCount
    };
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
        const neonResult = await syncToNeon(payload);
        res.status(200).json({
            ok: true,
            message: 'Saved to Neon.',
            neon: neonResult
        });
    } catch (error) {
        res.status(500).json({
            ok: false,
            message: error.message || 'Neon save failed.',
            error: toSafeError(error)
        });
    }
};

module.exports.syncToNeon = syncToNeon;

