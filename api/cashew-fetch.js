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

    const client = createClient({
        url: TURSO_DATABASE_URL,
        authToken: TURSO_AUTH_TOKEN
    });

    try {
        let rows;

        if (fetchAll === 'true') {
            // Return all records across all time
            const result = await client.execute(
                'SELECT expense_date, category, description, amount FROM cashew_expenses ORDER BY expense_date ASC'
            );
            rows = result.rows;
        } else if (month && year) {
            // Match records for the given month/year by checking expense_date like "dd/Mon/yyyy"
            // expense_date is stored as "dd/MMM/yyyy" e.g. "05/Jun/2026"
            const pattern = `%/${month}/${year}`;
            const result = await client.execute({
                sql: 'SELECT expense_date, category, description, amount FROM cashew_expenses WHERE expense_date LIKE ? ORDER BY expense_date ASC',
                args: [pattern]
            });
            rows = result.rows;
        } else {
            res.status(400).json({ ok: false, message: 'Provide ?month=Jun&year=2026 or ?fetchAll=true' });
            return;
        }

        const data = (rows || []).map(r => ({
            date:        String(r.expense_date || r[0] || ''),
            category:    String(r.category    || r[1] || ''),
            description: String(r.description || r[2] || ''),
            amount:      Number(r.amount       ?? r[3] ?? 0)
        }));

        // Group monthly totals for available balance compatibility
        const monthlyBalances = {};
        data.forEach(entry => {
            const parts = String(entry.date).split('/');
            if (parts.length === 3) {
                const key = `${parts[1]} ${parts[2]}`;
                monthlyBalances[key] = (monthlyBalances[key] || 0) + entry.amount;
            }
        });

        res.status(200).json({
            ok: true,
            source: 'database',
            data,
            availableBalance: 0, // Balance tracking is a Sheet-only feature
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

