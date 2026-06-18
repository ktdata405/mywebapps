const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || process.env.ktapps_MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'ktdata405_db_user';
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION_TEMP || 'temp_form_submissions';

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

function validatePayload(payload) {
    if (!payload || typeof payload !== 'object') {
        return 'Payload must be a JSON object.';
    }

    const firstName = String(payload.firstName || '').trim();
    const lastName = String(payload.lastName || '').trim();
    const mobile = String(payload.mobile || '').trim();

    if (!firstName) {
        return 'First name is required.';
    }
    if (!lastName) {
        return 'Last name is required.';
    }
    if (!mobile) {
        return 'Mobile number is required.';
    }
    if (!/^\d{7,15}$/.test(mobile)) {
        return 'Mobile number must contain 7 to 15 digits only.';
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
function sendJson(res, status, obj) {
    // Basic CORS headers for browser dev/demo usage
    try {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    } catch (e) {
        // Some serverless platforms provide headers differently; ignore if not available
    }
    res.status(status).json(obj);
}

async function handler(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        try {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        } catch (e) {}
        res.status(204).end();
        return;
    }

    if (req.method !== 'POST') {
        sendJson(res, 405, { ok: false, message: 'Method not allowed. Use POST.' });
        return;
    }

    const payload = parseRequestBody(req);
    const validationError = validatePayload(payload);
    if (validationError) {
        sendJson(res, 400, { ok: false, message: validationError });
        return;
    }

    try {
        const collection = await getMongoCollection();
        const document = {
            firstName: String(payload.firstName).trim(),
            lastName: String(payload.lastName).trim(),
            mobile: String(payload.mobile).trim(),
            createdAt: new Date().toISOString(),
            demo: true
        };

        const insertResult = await collection.insertOne(document);

        sendJson(res, 200, {
            ok: true,
            message: 'Saved to MongoDB.',
            insertedId: insertResult.insertedId
        });
    } catch (error) {
        sendJson(res, 500, {
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
