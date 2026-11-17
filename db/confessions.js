import { query } from './index.js'

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function generateToken() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

// Retrieve all confessions with nested comments, ordered by newest first
export async function getAllConfessions() {
    const res = await query(`
        SELECT 
            c.id,
            c.confession,
            c.vibe,
            c.likes,
            c.created_at AS "createdAt",
            c.edited_at AS "editedAt",
            COALESCE(
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', cm.id,
                            'text', cm.text,
                            'createdAt', cm.created_at
                        ) ORDER BY cm.created_at ASC
                    )
                    FROM comments cm
                    WHERE cm.confession_id = c.id
                ),
                '[]'::json
            ) AS comments
        FROM confessions c
        ORDER BY c.created_at DESC;
    `)
    return res.rows
}

// Create a new confession
export async function createConfession({ confession, vibe }) {
    const id = generateId()
    const token = generateToken()

    const res = await query(
        `INSERT INTO confessions (id, confession, vibe, likes, token, created_at)
         VALUES ($1, $2, $3, 0, $4, NOW())
         RETURNING id, created_at AS "createdAt"`,
        [id, confession, vibe, token]
    )

    return {
        id: res.rows[0].id,
        token,
        createdAt: res.rows[0].createdAt
    }
}

// Update confession text after token validation
export async function updateConfession({ id, confession, token }) {
    const existing = await query('SELECT token FROM confessions WHERE id = $1', [id])
    if (existing.rowCount === 0) {
        return { error: 'not_found' }
    }

    if (existing.rows[0].token !== token) {
        return { error: 'unauthorized' }
    }

    await query(
        'UPDATE confessions SET confession = $1, edited_at = NOW() WHERE id = $2',
        [confession, id]
    )

    return { success: true }
}

// Delete confession after token validation (cascades to comments)
export async function deleteConfession({ id, token }) {
    const existing = await query('SELECT token FROM confessions WHERE id = $1', [id])
    if (existing.rowCount === 0) {
        return { error: 'not_found' }
    }

    if (existing.rows[0].token !== token) {
        return { error: 'unauthorized' }
    }

    await query('DELETE FROM confessions WHERE id = $1', [id])
    return { success: true }
}

// Increment or decrement likes atomically
export async function toggleLike({ id, liked }) {
    const res = await query(
        `UPDATE confessions
         SET likes = CASE WHEN $1 = true THEN likes + 1 ELSE GREATEST(0, likes - 1) END
         WHERE id = $2
         RETURNING likes`,
        [Boolean(liked), id]
    )

    if (res.rowCount === 0) {
        return { error: 'not_found' }
    }

    return { success: true, likes: res.rows[0].likes }
}

// Add comment to a confession
export async function addComment({ confessionId, text }) {
    const confession = await query('SELECT 1 FROM confessions WHERE id = $1', [confessionId])
    if (confession.rowCount === 0) {
        return { error: 'confession_not_found' }
    }

    const commentId = generateId()
    const res = await query(
        `INSERT INTO comments (id, confession_id, text, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id, text, created_at AS "createdAt"`,
        [commentId, confessionId, text]
    )

    return { success: true, comment: res.rows[0] }
}

// Delete comment from a confession
export async function deleteComment({ confessionId, commentId }) {
    const confession = await query('SELECT 1 FROM confessions WHERE id = $1', [confessionId])
    if (confession.rowCount === 0) {
        return { error: 'confession_not_found' }
    }

    const res = await query(
        'DELETE FROM comments WHERE id = $1 AND confession_id = $2',
        [commentId, confessionId]
    )

    if (res.rowCount === 0) {
        return { error: 'comment_not_found' }
    }

    return { success: true }
}
