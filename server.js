import http from 'node:http'
import { serveStatic } from './utils/serveStatic.js'
import { handleGET, handlePOST, handlePUT, handleDELETE, handleLike, handleComment } from './handlers/routeHandlers.js'

const PORT = 8000

const __dirname = import.meta.dirname

const server = http.createServer(async (req, res) => {
    if (req.url.startsWith('/api')) {

        // Like Route
        if (req.url === '/api/like' && req.method === 'PUT') {
            return await handleLike(req, res)
        }

        // Comment Route
        if (req.url === '/api/comment') {
            if (req.method === 'POST') return await handleComment.add(req, res)
            if (req.method === 'DELETE') return await handleComment.remove(req, res)
        }

        // GET, POST, PUT, DELETE Routes
        if (req.url === '/api') {
            if (req.method === 'GET') return await handleGET(res)
            if (req.method === 'POST') return await handlePOST(req, res)
            if (req.method === 'PUT') return await handlePUT(req, res)
            if (req.method === 'DELETE') return await handleDELETE(req, res)
        }
    }
    else {
        return await serveStatic(req, res, __dirname)
    }
})

server.listen(PORT, () => console.log(`Connected on port: ${PORT}`))