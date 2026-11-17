// Safely parses JSON request body with size limit to prevent Denial of Service (DoS)
export function parseBody(req, maxBytes = 1024 * 1024) {
    return new Promise((resolve, reject) => {
        let body = ''
        let receivedBytes = 0

        req.on('data', chunk => {
            receivedBytes += chunk.length
            if (receivedBytes > maxBytes) {
                req.destroy()
                const err = new Error('Payload too large')
                err.statusCode = 413
                reject(err)
                return
            }
            body += chunk
        })

        req.on('end', () => {
            if (!body || !body.trim()) {
                resolve({})
                return
            }
            try {
                const parsed = JSON.parse(body)
                resolve(parsed)
            } catch (syntaxErr) {
                const err = new Error('Invalid JSON')
                err.statusCode = 400
                reject(err)
            }
        })

        req.on('error', err => {
            reject(err)
        })
    })
}
