import db from '../config/db.js';

export interface OutstandingSplitBalance {
    friendId: number | null;
    friendName: string;
    outstandingAmount: number;
    paidAmount: number;
    splitCount: number;
}

function buildDateFilter(year?: string, month?: string): { clause: string; params: Array<string | number> } {
    if (!year || !month) {
        return { clause: '', params: [] };
    }

    return {
        clause: "AND strftime('%Y', s.date) = ? AND strftime('%m', s.date) = ?",
        params: [year, month],
    };
}

export function roundCurrency(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getOutstandingSplitBalances(
    uid: string,
    options: { year?: string; month?: string } = {},
): OutstandingSplitBalance[] {
    const dateFilter = buildDateFilter(options.year, options.month);

    const rows = db.prepare(`
        WITH normalized_splits AS (
            SELECT
                s.friend_id AS friendId,
                COALESCE(NULLIF(TRIM(f.name), ''), NULLIF(TRIM(s.friend_name), ''), 'Unknown') AS friendName,
                CASE WHEN s.is_paid = 0 THEN ROUND(COALESCE(s.amount, 0), 2) ELSE 0 END AS outstandingAmount,
                CASE WHEN s.is_paid = 1 THEN ROUND(COALESCE(s.amount, 0), 2) ELSE 0 END AS paidAmount,
                CASE
                    WHEN s.friend_id IS NOT NULL THEN 'friend:' || CAST(s.friend_id AS TEXT)
                    ELSE 'name:' || LOWER(COALESCE(NULLIF(TRIM(s.friend_name), ''), 'Unknown'))
                END AS balanceKey
            FROM splits s
            LEFT JOIN friends f ON f.id = s.friend_id AND f.user_id = s.user_id
            WHERE s.user_id = ?
            ${dateFilter.clause}
        )
        SELECT
            friendId,
            friendName,
            ROUND(COALESCE(SUM(outstandingAmount), 0), 2) AS outstandingAmount,
            ROUND(COALESCE(SUM(paidAmount), 0), 2) AS paidAmount,
            COUNT(*) AS splitCount
        FROM normalized_splits
        GROUP BY balanceKey, friendId, friendName
        HAVING SUM(outstandingAmount) > 0
        ORDER BY outstandingAmount DESC, friendName ASC
    `).all(uid, ...dateFilter.params) as Array<{
        friendId: number | null;
        friendName: string;
        outstandingAmount: number;
        paidAmount: number;
        splitCount: number;
    }>;

    return rows.map((row) => ({
        friendId: row.friendId ?? null,
        friendName: row.friendName,
        outstandingAmount: Number(row.outstandingAmount || 0),
        paidAmount: Number(row.paidAmount || 0),
        splitCount: Number(row.splitCount || 0),
    }));
}
