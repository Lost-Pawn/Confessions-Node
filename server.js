import 'dotenv/config'
import http from 'node:http'
import { serveStatic } from './utils/serveStatic.js'
import { sendResponse } from './utils/sendResponse.js'
import { initDB, closeDB } from './db/index.js'
import {
    handleGET,
    handlePOST,
    handlePUT,
    handleDELETE,
    handleLike,
    handleComment
} from './handlers/routeHandlers.js'

import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = parseInt(process.env.PORT, 10) || 8000
const HOST = '0.0.0.0'
const __dirname = import.meta.dirname || path.dirname(fileURLToPath(import.meta.url))

const server = http.createServer(async (req, res) => {
    try {
        const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
        const pathname = parsedUrl.pathname

        // Health Check for Render & Monitoring
        if (pathname === '/health' || pathname === '/api/health') {
            return sendResponse(res, 200, 'application/json', {
                status: 'ok',
                timestamp: new Date().toISOString()
            })
        }

        // API Routes
        if (pathname.startsWith('/api')) {
            // Like Route
            if (pathname === '/api/like') {
                if (req.method === 'PUT') return await handleLike(req, res)
                res.setHeader('Allow', 'PUT')
                return sendResponse(res, 405, 'application/json', { error: 'Method Not Allowed' })
            }

            // Comment Routes
            if (pathname === '/api/comment') {
                if (req.method === 'POST') return await handleComment.add(req, res)
                if (req.method === 'DELETE') return await handleComment.remove(req, res)
                res.setHeader('Allow', 'POST, DELETE')
                return sendResponse(res, 405, 'application/json', { error: 'Method Not Allowed' })
            }

            // Confessions Collection Routes (GET, POST, PUT, DELETE)
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

        // Static Files
        return await serveStatic(req, res, __dirname)
    } catch (err) {
        console.error('Unhandled server error:', err)
        sendResponse(res, 500, 'application/json', { error: 'Internal Server Error' })
    }
})

// Initialize PostgreSQL and start server
async function startServer() {
    try {
        await initDB()
        server.listen(PORT, HOST, () => {
            console.log(`Server running at http://${HOST}:${PORT}`)
        })
    } catch (err) {
        console.error('Fatal error starting server:', err)
        process.exit(1)
    }
}

// Graceful shutdown
async function handleShutdown(signal) {
    console.log(`Received ${signal}. Shutting down gracefully...`)
    server.close(async () => {
        try {
            await closeDB()
            console.log('Database pool closed. Process terminated.')
            process.exit(0)
        } catch (err) {
            console.error('Error during shutdown:', err)
            process.exit(1)
        }
    })

    // Force shutdown after timeout
    setTimeout(() => {
        console.error('Forced shutdown due to timeout')
        process.exit(1)
    }, 10000).unref()
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'))
process.on('SIGINT', () => handleShutdown('SIGINT'))

startServer()