import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { initDB, pool, query } from '../db/index.js'
import {
    handleGET,
    handlePOST,
    handlePUT,
    handleDELETE,
    handleLike,
    handleComment
} from '../handlers/routeHandlers.js'
import { serveStatic } from '../utils/serveStatic.js'
import { sendResponse } from '../utils/sendResponse.js'

const __dirname = import.meta.dirname

// Setup test server
function createTestServer() {
    return http.createServer(async (req, res) => {
        try {
            const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
            const pathname = parsedUrl.pathname

            if (pathname === '/health' || pathname === '/api/health') {
                return sendResponse(res, 200, 'application/json', { status: 'ok' })
            }

            if (pathname.startsWith('/api')) {
                if (pathname === '/api/like') {
                    if (req.method === 'PUT') return await handleLike(req, res)
                    res.setHeader('Allow', 'PUT')
                    return sendResponse(res, 405, 'application/json', { error: 'Method Not Allowed' })
                }

                if (pathname === '/api/comment') {
                    if (req.method === 'POST') return await handleComment.add(req, res)
                    if (req.method === 'DELETE') return await handleComment.remove(req, res)
                    res.setHeader('Allow', 'POST, DELETE')
                    return sendResponse(res, 405, 'application/json', { error: 'Method Not Allowed' })
                }

                if (pathname === '/api' || pathname === '/api/') {
                    if (req.method === 'GET') return await handleGET(res)
                    if (req.method === 'POST') return await handlePOST(req, res)
                    if (req.method === 'PUT') return await handlePUT(req, res)
                    if (req.method === 'DELETE') return await handleDELETE(req, res)
                    res.setHeader('Allow', 'GET, POST, PUT, DELETE')
                    return sendResponse(res, 405, 'application/json', { error: 'Method Not Allowed' })
                }

                return sendResponse(res, 404, 'application/json', { error: 'API route not found' })
            }

            return await serveStatic(req, res, path.join(__dirname, '..'))
        } catch (err) {
            sendResponse(res, 500, 'application/json', { error: 'Internal Error' })
        }
    })
}

import path from 'node:path'

test('Full Application & PostgreSQL Database Test Suite', async (t) => {
    let server
    let baseUrl

    await t.test('Database connection and schema initialization', async () => {
        await initDB()
        const check = await query('SELECT 1 AS ok')
        assert.equal(check.rows[0].ok, 1)
    })

    await t.test('Start test server', async () => {
        server = createTestServer()
        await new Promise((resolve) => {
            server.listen(0, '127.0.0.1', () => {
                const port = server.address().port
                baseUrl = `http://127.0.0.1:${port}`
                resolve()
            })
        })
    })

    await t.test('GET /health returns 200 ok', async () => {
        const res = await fetch(`${baseUrl}/health`)
        assert.equal(res.status, 200)
        const data = await res.json()
        assert.equal(data.status, 'ok')
    })

    await t.test('GET / serves index.html', async () => {
        const res = await fetch(`${baseUrl}/`)
        assert.equal(res.status, 200)
        const text = await res.text()
        assert.ok(text.includes('Hello Kitty & Kuromi'))
    })

    await t.test('Path traversal is blocked with 403', async () => {
        const statusCode = await new Promise((resolve) => {
            http.get(`${baseUrl}/..%2f..%2fserver.js`, (res) => {
                resolve(res.statusCode)
            })
        })
        assert.equal(statusCode, 403)
    })

    let createdId
    let createdToken

    await t.test('POST /api creates a confession', async () => {
        const res = await fetch(`${baseUrl}/api`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                confession: 'Testing postgres confession',
                vibe: 'sweet'
            })
        })

        assert.equal(res.status, 201)
        const data = await res.json()
        assert.equal(data.success, true)
        assert.ok(data.id)
        assert.ok(data.token)
        createdId = data.id
        createdToken = data.token
    })

    await t.test('GET /api returns confessions without leaking token', async () => {
        const res = await fetch(`${baseUrl}/api`)
        assert.equal(res.status, 200)
        const data = await res.json()
        assert.ok(Array.isArray(data))
        const found = data.find(c => c.id === createdId)
        assert.ok(found)
        assert.equal(found.confession, 'Testing postgres confession')
        assert.equal(found.vibe, 'sweet')
        assert.equal(found.token, undefined) // Must NEVER expose token
        assert.ok(Array.isArray(found.comments))
    })

    await t.test('PUT /api updates confession with valid token', async () => {
        const res = await fetch(`${baseUrl}/api`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: createdId,
                token: createdToken,
                confession: 'Updated confession text'
            })
        })

        assert.equal(res.status, 200)
        const data = await res.json()
        assert.equal(data.success, true)
    })

    await t.test('PUT /api rejects update with invalid token (403)', async () => {
        const res = await fetch(`${baseUrl}/api`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: createdId,
                token: 'wrong-token',
                confession: 'Hacked text'
            })
        })

        assert.equal(res.status, 403)
    })

    await t.test('PUT /api/like toggles likes correctly', async () => {
        // Like +1
        const res1 = await fetch(`${baseUrl}/api/like`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: createdId, liked: true })
        })
        assert.equal(res1.status, 200)
        const data1 = await res1.json()
        assert.equal(data1.likes, 1)

        // Like -1
        const res2 = await fetch(`${baseUrl}/api/like`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: createdId, liked: false })
        })
        assert.equal(res2.status, 200)
        const data2 = await res2.json()
        assert.equal(data2.likes, 0)
    })

    let commentId

    await t.test('POST /api/comment adds a comment', async () => {
        const res = await fetch(`${baseUrl}/api/comment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                confessionId: createdId,
                text: 'So cute!'
            })
        })

        assert.equal(res.status, 201)
        const data = await res.json()
        assert.equal(data.success, true)
        assert.ok(data.comment.id)
        assert.equal(data.comment.text, 'So cute!')
        commentId = data.comment.id
    })

    await t.test('DELETE /api/comment removes comment', async () => {
        const res = await fetch(`${baseUrl}/api/comment`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                confessionId: createdId,
                commentId
            })
        })

        assert.equal(res.status, 200)
        const data = await res.json()
        assert.equal(data.success, true)
    })

    await t.test('DELETE /api removes confession with valid token', async () => {
        const res = await fetch(`${baseUrl}/api`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: createdId,
                token: createdToken
            })
        })

        assert.equal(res.status, 200)
        const data = await res.json()
        assert.equal(data.success, true)
    })

    await t.test('POST /api rejects invalid vibe with 400', async () => {
        const res = await fetch(`${baseUrl}/api`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ confession: 'Hello', vibe: 'angry' })
        })
        assert.equal(res.status, 400)
    })

    await t.test('POST /api rejects confession longer than 700 chars with 400', async () => {
        const res = await fetch(`${baseUrl}/api`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ confession: 'a'.repeat(701), vibe: 'sweet' })
        })
        assert.equal(res.status, 400)
    })

    await t.test('GET /api/nonexistent returns 404', async () => {
        const res = await fetch(`${baseUrl}/api/nonexistent`)
        assert.equal(res.status, 404)
    })

    await t.test('GET /api/like returns 405 Method Not Allowed', async () => {
        const res = await fetch(`${baseUrl}/api/like`)
        assert.equal(res.status, 405)
    })

    await t.test('Cleanup and close server and database pool', async () => {
        await new Promise((resolve) => server.close(resolve))
        await pool.end()
    })
})
