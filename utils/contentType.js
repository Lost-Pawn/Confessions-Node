// Uses extensions to map 'Content-Type'
export function contentType(ext) { 
    const types = {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "text/javascript",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".svg": "image/svg+xml",
        ".mp4": "video/mp4",
        ".mp3": "audio/mpeg",
        ".pdf": "application/pdf"
    }

    return types[ext.toLowerCase()] || "application/octet-stream"
}