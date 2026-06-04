p /**
 * GET /api/cashew-dedupe
 *
 * Removes duplicate rows from cashew_expenses so each
 * (expense_date, category) combination keeps only the
 * most-recently inserted record (highest id).
 *
 * Call this once after deploying to clean up accumulated duplicates.
 * It is safe to run multiple times (idempotent).
 */
const { createClient } = require('@libsql/client');

const TURSO_DATABASE_URL = process.env.ktapps_TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN   = process.env.ktapps_TURSO_AUTH_TOKEN;

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        res.status(405).json({ ok: false, message: 'Method not allowed' });
        return;
    }

    if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
        res.status(500).json({ ok: false, message: 'Missing Turso configuration.' });
        return;
    }

    const client = createClient({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN });

    try {
        // Count before
        const beforeResult = await client.execute(
            'SELECT COUNT(*) AS total FROM cashew_expenses'
        );
        const totalBefore = Number(beforeResult.rows?.[0]?.total ?? 0);

        // Delete rows that are NOT the latest id per (expense_date, category)
        await client.execute(`
            DELETE FROM cashew_expenses
            WHERE id NOT IN (
                SELECT MAX(id)
                FROM cashew_expenses
                GROUP BY expense_date, category
            )
        `);

        // Count after
        const afterResult = await client.execute(
            'SELECT COUNT(*) AS total FROM cashew_expenses'
        );
        const totalAfter = Number(afterResult.rows?.[0]?.total ?? 0);
        const removed = totalBefore - totalAfter;

        res.status(200).json({
            ok: true,
            message: removed > 0
                ? `Removed ${removed} duplicate row(s). ${totalAfter} clean row(s) remain.`
                : `No duplicates found. ${totalAfter} row(s) are already clean.`,
            rowsBefore: totalBefore,
            rowsAfter: totalAfter,
            duplicatesRemoved: removed
        });
    } catch (error) {
        res.status(500).json({
            ok: false,
            message: error.message || 'Dedupe failed.',
            hasDbUrl: Boolean(TURSO_DATABASE_URL),
            hasDbToken: Boolean(TURSO_AUTH_TOKEN)
        });
    } finally {
        try { client.close(); } catch (_) {}
    }
};

