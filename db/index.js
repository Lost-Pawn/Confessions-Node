import pg from 'pg'
import fs from 'node:fs/promises'
import path from 'node:path'

const { Pool } = pg

const isProduction = process.env.NODE_ENV === 'production'
const databaseUrl = process.env.DATABASE_URL
const useSsl = process.env.DB_SSL === 'true' || 
    (databaseUrl && (databaseUrl.includes('render.com') || databaseUrl.includes('sslmode=require')))

const poolConfig = {
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
}

if (databaseUrl) {
    poolConfig.connectionString = databaseUrl
} else {
    poolConfig.host = process.env.PGHOST || 'localhost'
    poolConfig.port = process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432
    poolConfig.database = process.env.PGDATABASE || 'confessions'
    poolConfig.user = process.env.PGUSER || 'postgres'
    poolConfig.password = process.env.PGPASSWORD || 'postgres'
}

if (useSsl) {
    poolConfig.ssl = { rejectUnauthorized: false }
}

export const pool = new Pool(poolConfig)

pool.on('error', (err) => {
    console.error('Unexpected error on idle database client:', err)
})

export async function query(text, params) {
    const start = Date.now()
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    if (process.env.NODE_ENV !== 'production') {
        console.log('Executed query', { text: text.trim().slice(0, 80), duration, rows: res.rowCount })
    }
    return res
}

// Automatically create tables & indexes if they don't exist
export async function initDB() {
    try {
        console.log('Connecting to PostgreSQL database...')
        // Test connection
        await pool.query('SELECT 1')
        console.log('PostgreSQL connected successfully.')

        // Create confessions table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS confessions (
                id VARCHAR(64) PRIMARY KEY,
                confession TEXT NOT NULL,
                vibe VARCHAR(20) NOT NULL CHECK (vibe IN ('sweet', 'edgy')),
                likes INTEGER NOT NULL DEFAULT 0 CHECK (likes >= 0),
                token VARCHAR(128) NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                edited_at TIMESTAMPTZ
            );
        `)

        // Create comments table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS comments (
                id VARCHAR(64) PRIMARY KEY,
                confession_id VARCHAR(64) NOT NULL REFERENCES confessions(id) ON DELETE CASCADE,
                text TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `)

        // Create indexes
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_confessions_created_at ON confessions(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_comments_confession_id ON comments(confession_id, created_at ASC);
        `)

        console.log('Database tables & indexes initialized.')

        // Seed existing data from data/data.json if table is empty
        await seedFromDataJson()
    } catch (err) {
        console.error('Database initialization error:', err)
        throw err
    }
}

// Migrate existing JSON data if PostgreSQL table is empty
async function seedFromDataJson() {
    try {
        const countRes = await pool.query('SELECT COUNT(*) AS count FROM confessions')
        const currentCount = parseInt(countRes.rows[0].count, 10)

        if (currentCount > 0) {
            return
        }

        const dataJsonPath = path.join(import.meta.dirname, '..', 'data', 'data.json')
        const raw = await fs.readFile(dataJsonPath, 'utf8')
        const confessions = JSON.parse(raw)

        if (!Array.isArray(confessions) || confessions.length === 0) {
            return
        }

        console.log(`Migrating ${confessions.length} existing items from data.json to PostgreSQL...`)

        for (const item of confessions) {
            if (!item.id || !item.confession || !item.vibe) continue

            const token = item.token || (Date.now().toString(36) + Math.random().toString(36).slice(2, 10))
            const createdAt = item.createdAt ? new Date(item.createdAt) : new Date()
            const editedAt = item.editedAt ? new Date(item.editedAt) : null
            const likes = typeof item.likes === 'number' ? item.likes : 0

            await pool.query(
                `INSERT INTO confessions (id, confession, vibe, likes, token, created_at, edited_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (id) DO NOTHING`,
                [item.id, item.confession, item.vibe, likes, token, createdAt, editedAt]
            )

            if (Array.isArray(item.comments)) {
                for (const comment of item.comments) {
                    if (!comment.id || !comment.text) continue
                    const cCreatedAt = comment.createdAt ? new Date(comment.createdAt) : new Date()

                    await pool.query(
                        `INSERT INTO comments (id, confession_id, text, created_at)
                         VALUES ($1, $2, $3, $4)
                         ON CONFLICT (id) DO NOTHING`,
                        [comment.id, item.id, comment.text, cCreatedAt]
                    )
                }
            }
        }

        console.log('Migration from data.json completed.')
    } catch (err) {
        // If data.json doesn't exist or is empty, ignore
        if (err.code !== 'ENOENT') {
            console.warn('Note: Could not seed from data.json:', err.message)
        }
    }
}

export async function closeDB() {
    await pool.end()
}
