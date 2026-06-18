const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || process.env.ktapps_MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'ktdata405_db_user';
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION_CASHEW || 'cashew_expenses';

let cachedClient = null;
let cachedDb = null;

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

function normalizeMonthKey(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    return raw.slice(0, 3);
}

function parseExpenseDate(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;

    let match = raw.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
    if (match) {
        const day = String(Number(match[1])).padStart(2, '0');
        const month = normalizeMonthKey(match[2]);
        const year = Number(match[3]);
        return { date: `${day}/${month}/${year}`, month, year };
    }

    match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
        const jsDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        if (!Number.isNaN(jsDate.getTime())) {
            const day = String(jsDate.getDate()).padStart(2, '0');
            const month = jsDate.toLocaleString('en-US', { month: 'short' });
            const year = jsDate.getFullYear();
            return { date: `${day}/${month}/${year}`, month: normalizeMonthKey(month), year };
        }
    }

    match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
        const jsDate = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
        if (!Number.isNaN(jsDate.getTime())) {
            const day = String(jsDate.getDate()).padStart(2, '0');
            const month = jsDate.toLocaleString('en-US', { month: 'short' });
            const year = jsDate.getFullYear();
            return { date: `${day}/${month}/${year}`, month: normalizeMonthKey(month), year };
        }
    }

    const fallback = new Date(raw);
    if (!Number.isNaN(fallback.getTime())) {
        const day = String(fallback.getDate()).padStart(2, '0');
        const month = fallback.toLocaleString('en-US', { month: 'short' });
        const year = fallback.getFullYear();
        return { date: `${day}/${month}/${year}`, month: normalizeMonthKey(month), year };
    }

    return null;
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

        if (!parseExpenseDate(expense.date)) {
            return `Invalid date format for expense: ${expense.date}`;
        }
    }

    return '';
}

async function getMongoCollection() {
    if (!MONGODB_URI) {
        throw new Error('Missing MongoDB connection URI. Set MONGODB_URI or ktapps_MONGODB_URI.');
    }

    if (cachedClient && cachedDb) {
        return cachedDb.collection(MONGODB_COLLECTION);
    }

    const client = new MongoClient(MONGODB_URI, {
        serverApi: {
            version: '1',
            strict: true,
            deprecationErrors: true
        }
    });

    await client.connect();
    cachedClient = client;
    cachedDb = client.db(MONGODB_DB);
    return cachedDb.collection(MONGODB_COLLECTION);
}

async function handler(req, res) {
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
        const collection = await getMongoCollection();

        const expenses = payload.expenses.map((expense) => {
            const parsed = parseExpenseDate(expense.date);
            return {
                type: 'cashew',
                expense_date: parsed.date,
                expense_month: parsed.month,
                expense_year: parsed.year,
                category: String(expense.category || '').trim(),
                description: String(expense.description || '').trim(),
                amount: Number(expense.amount),
                action_type: String(payload.action || 'add'),
                original_date: payload.originalDate ? String(payload.originalDate).trim() : null,
                is_edit: Boolean(payload.isEdit),
                created_at: new Date().toISOString()
            };
        });

        const uniqueDates = [...new Set(expenses.map((expense) => expense.expense_date))];

        const deletes = [{ expense_date: { $in: uniqueDates } }];
        if (payload.originalDate) {
            const original = parseExpenseDate(payload.originalDate);
            if (original && !uniqueDates.includes(original.date)) {
                deletes.push({ expense_date: original.date });
            }
        }

        await collection.deleteMany({ $or: deletes });
        const insertResult = await collection.insertMany(expenses, { ordered: true });

        res.status(200).json({
            ok: true,
            message: 'Saved to MongoDB Atlas.',
            insertedCount: insertResult.insertedCount,
            datesAffected: uniqueDates.length
        });
    } catch (error) {
        res.status(500).json({
            ok: false,
            message: error.message || 'MongoDB save failed.',
            error: {
                name: error.name || 'Error',
                message: error.message || 'Unknown error'
            }
        });
    }
}

module.exports = handler;
