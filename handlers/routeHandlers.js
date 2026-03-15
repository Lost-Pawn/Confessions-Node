import { sendResponse } from "../utils/sendResponse.js"
import { getData } from "../utils/getData.js"
import fs from "node:fs/promises"
import path from "node:path"

const filePath = path.join(import.meta.dirname, '..', 'data', 'data.json')

async function saveData(data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2))
}

// Generates a random secret token
function generateToken() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

// Get Handler
export async function handleGET(res) {
    const data = await getData()

    // Strip tokens before sending to client — never expose them
    const safeData = data.map(({ token, ...rest }) => rest)

    sendResponse(res, 200, "application/json", safeData)
}

// Post Handler
export async function handlePOST(req, res) {
    let body = ""

    req.on("data", chunk => {
        body += chunk
    })

    req.on("end", async () => {
        try {
            const parsedBody = JSON.parse(body)
            const confession = parsedBody.confession?.trim()
            const vibe = parsedBody.vibe

            if (!confession || !vibe) {
                return sendResponse(res, 400, "application/json", {
                    error: "Confession and vibe required"
                })
            }

            const data = await getData()

            const newConfession = {
                id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                confession,
                vibe,
                createdAt: new Date().toISOString(),
                likes: 0,
                comments: [],
                // Token stored server-side, never returned except on creation
                token: generateToken()
            }

            data.push(newConfession)
            await saveData(data)

            // Token returned ONCE on creation so client can save it
            sendResponse(res, 201, "application/json", {
                success: true,
                id: newConfession.id,
                token: newConfession.token
            })

        } catch (err) {
            console.error("POST error:", err)
            sendResponse(res, 500, "application/json", {
                error: "Failed to save confession"
            })
        }
    })
}

// PUT Handler
export async function handlePUT(req, res) {

    let body = ""

    req.on("data", chunk => {
        body += chunk
    })

    req.on("end", async () => {
        try {
            const parsedBody = JSON.parse(body)
            const id = parsedBody.id
            const confession = parsedBody.confession?.trim()
            const token = parsedBody.token

            if (!id || !confession || !token) {
                return sendResponse(res, 400, "application/json", {
                    error: "ID, confession and token required"
                })
            }

            const data = await getData()
            const index = data.findIndex(item => item.id === id)

            if (index === -1) {
                return sendResponse(res, 404, "application/json", {
                    error: "Confession not found"
                })
            }

            // Verify token before allowing edit
            if (data[index].token !== token) {
                return sendResponse(res, 403, "application/json", {
                    error: "Not authorized to edit this confession"
                })
            }

            data[index].confession = confession
            data[index].editedAt = new Date().toISOString()

            await saveData(data)

            sendResponse(res, 200, "application/json", {
                success: true,
                message: "Confession updated"
            })

        } catch (err) {
            console.error("PUT error:", err)
            sendResponse(res, 500, "application/json", {
                error: "Failed to update confession"
            })
        }
    })
}

// Delete Handler
export async function handleDELETE(req, res) {
    let body = ""

    req.on("data", chunk => {
        body += chunk
    })

    req.on("end", async () => {
        try {
            const parsedBody = JSON.parse(body)
            const id = parsedBody.id
            const token = parsedBody.token

            if (!id || !token) {
                return sendResponse(res, 400, "application/json", {
                    error: "ID and token required"
                })
            }

            const data = await getData()
            const index = data.findIndex(item => item.id === id) // returns 0 and -1

            // Verify id
            if (index === -1) {
                return sendResponse(res, 404, "application/json", {
                    error: "Confession not found"
                })
            }

            // Verify token before allowing delete
            if (data[index].token !== token) {
                return sendResponse(res, 403, "application/json", {
                    error: "Not authorized to delete this confession"
                })
            }

            data.splice(index, 1)
            await saveData(data)

            sendResponse(res, 200, "application/json", {
                success: true,
                message: "Confession deleted"
            })

        } catch (err) {
            console.error("DELETE error:", err)
            sendResponse(res, 500, "application/json", {
                error: "Failed to delete confession"
            })
        }
    })
}

// Like Handler — no token needed, anyone can like
export async function handleLike(req, res) {
    let body = ""

    req.on("data", chunk => {
        body += chunk
    })

    req.on("end", async () => {
        try {
            const parsedBody = JSON.parse(body)
            const id = parsedBody.id
            const liked = parsedBody.liked

            if (!id || liked === undefined) {
                return sendResponse(res, 400, "application/json", {
                    error: "ID and liked status required"
                })
            }

            const data = await getData()
            const index = data.findIndex(item => item.id === id)

            if (index === -1) {
                return sendResponse(res, 404, "application/json", {
                    error: "Confession not found"
                })
            }

            if (typeof data[index].likes !== 'number') {
                data[index].likes = 0
            }

            data[index].likes = liked
                ? data[index].likes + 1
                : Math.max(0, data[index].likes - 1)

            await saveData(data)

            sendResponse(res, 200, "application/json", {
                success: true,
                likes: data[index].likes
            })

        } catch (err) {
            console.error("LIKE error:", err)
            sendResponse(res, 500, "application/json", {
                error: "Failed to update like"
            })
        }
    })
}

// Comment Handlers — no token needed, anyone can comment
export const handleComment = {

    // add comment 
    async add(req, res) {

        let body = ""

        // serves data in chunks
        req.on("data", chunk => { 
            body += chunk
        })

        req.on("end", async () => {
            try {
                const parsedBody = JSON.parse(body)
                const confessionId = parsedBody.confessionId
                const text = parsedBody.text?.trim()

                if (!confessionId || !text) {
                    return sendResponse(res, 400, "application/json", {
                        error: "Confession ID and comment text required"
                    })
                }

                const data = await getData()
                const index = data.findIndex(item => item.id === confessionId)

                if (index === -1) {
                    return sendResponse(res, 404, "application/json", {
                        error: "Confession not found"
                    })
                }

                if (!Array.isArray(data[index].comments)) {
                    data[index].comments = []
                }

                const newComment = {
                    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                    text,
                    createdAt: new Date().toISOString()
                }

                data[index].comments.push(newComment)
                await saveData(data)

                sendResponse(res, 201, "application/json", {
                    success: true,
                    comment: newComment
                })

            } catch (err) {
                console.error("COMMENT ADD error:", err)
                sendResponse(res, 500, "application/json", {
                    error: "Failed to add comment"
                })
            }
        })
    },

    // removes comment
    async remove(req, res) {

        let body = ""

        req.on("data", chunk => {
            body += chunk
        })

        req.on("end", async () => {
            try {
                const parsedBody = JSON.parse(body)
                const confessionId = parsedBody.confessionId
                const commentId = parsedBody.commentId

                if (!confessionId || !commentId) {
                    return sendResponse(res, 400, "application/json", {
                        error: "Confession ID and comment ID required"
                    })
                }

                const data = await getData()
                const index = data.findIndex(item => item.id === confessionId)

                if (index === -1) {
                    return sendResponse(res, 404, "application/json", {
                        error: "Confession not found"
                    })
                }

                const commentIndex = data[index].comments.findIndex(c => c.id === commentId)

                if (commentIndex === -1) {
                    return sendResponse(res, 404, "application/json", {
                        error: "Comment not found"
                    })
                }

                data[index].comments.splice(commentIndex, 1)
                await saveData(data)

                sendResponse(res, 200, "application/json", {
                    success: true,
                    message: "Comment deleted"
                })

            } catch (err) {
                console.error("COMMENT DELETE error:", err)
                sendResponse(res, 500, "application/json", {
                    error: "Failed to delete comment"
                })
            }
        })
    }
}