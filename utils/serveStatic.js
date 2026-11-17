import path from 'node:path'
import fs from 'node:fs/promises'
import { contentType } from './contentType.js'
import { sendResponse } from './sendResponse.js'

// Serves static files (HTML, CSS, JS, images, etc.) from the /public folder
export async function serveStatic(req, res, baseDir) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.setHeader('Allow', 'GET, HEAD')
        return sendResponse(res, 405, 'text/plain', 'Method Not Allowed')
    }

    try {
        const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
        const decodedPath = decodeURIComponent(parsedUrl.pathname)
        const publicPath = path.resolve(baseDir, 'public')

        let resource = decodedPath === '/' ? 'index.html' : decodedPath.slice(1)
        let pathToResource = path.resolve(publicPath, resource)

        // Prevent directory traversal attacks
        if (req.url.includes('..') || decodedPath.includes('..') || !pathToResource.startsWith(publicPath)) {
            return sendResponse(res, 403, 'text/plain', 'Forbidden')
        }

        let stats
        try {
            stats = await fs.stat(pathToResource)
        } catch {
            return sendResponse(res, 404, 'text/plain', 'File Not Found')
        }

        // If directory, check for index.html inside
        if (stats.isDirectory()) {
            pathToResource = path.join(pathToResource, 'index.html')
            try {
                stats = await fs.stat(pathToResource)
            } catch {
                return sendResponse(res, 404, 'text/plain', 'File Not Found')
            }
        }

        const ext = path.extname(pathToResource)
        const type = contentType(ext)

        if (req.method === 'HEAD') {
            res.statusCode = 200
            res.setHeader('Content-Type', type)
            res.setHeader('Content-Length', stats.size)
            return res.end()
        }

        const content = await fs.readFile(pathToResource)
        sendResponse(res, 200, type, content)
    } catch (err) {
        console.error('Static file error: ', err.message)
        sendResponse(res, 500, 'text/plain', 'Internal Server Error')
    }
}
