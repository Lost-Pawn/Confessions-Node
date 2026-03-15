import path from 'node:path'
import fs from 'node:fs/promises'
import { contentType } from './contentType.js'
import { sendResponse } from './sendResponse.js'

// Serves static files (HTML, CSS, JS, images, etc.) from the /public folder for reqs that dosen't start with /api
export async function serveStatic(req, res, baseDir) {
    console.log("Request:", req.url)
    const publicPath = path.join(baseDir, 'public')

    const resource = req.url === '/' ? 'index.html' : req.url.slice(1)
    const pathToResource = path.normalize(path.join(publicPath, resource))

    const ext = path.extname(pathToResource)
    const type = contentType(ext)

    try {
        const content = await fs.readFile(pathToResource)
        sendResponse(res, 200, type, content)

    } catch (err) {
        console.error("Static file err: ", err.message)
        sendResponse(res, 404, 'text/plain', 'File Not Found')
    }
}
