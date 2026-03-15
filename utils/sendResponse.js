export function sendResponse(res, statusCode, contentType, payload) {
    res.statusCode = statusCode
    res.setHeader('Content-Type', contentType)

    // Buffer check must come first — Buffers are objects too
    let body
    if (Buffer.isBuffer(payload)) {
        body = payload
    } else if (typeof payload === 'object') {
        body = JSON.stringify(payload)
    } else {
        body = payload
    }

    res.end(body)
}