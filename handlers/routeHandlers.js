import { sendResponse } from '../utils/sendResponse.js'
import { parseBody } from '../utils/parseBody.js'
import {
    getAllConfessions,
    createConfession,
    updateConfession,
    deleteConfession,
    toggleLike,
    addComment,
    deleteComment
} from '../db/confessions.js'

// GET Handler - Retrieve all confessions
export async function handleGET(res) {
    try {
        const confessions = await getAllConfessions()
        sendResponse(res, 200, 'application/json', confessions)
    } catch (err) {
        console.error('GET error:', err)
        sendResponse(res, 500, 'application/json', {
            error: 'Failed to retrieve confessions'
        })
    }
}

// POST Handler - Create a new confession
export async function handlePOST(req, res) {
    try {
        const parsedBody = await parseBody(req)
        const confession = parsedBody.confession?.trim()
        const vibe = parsedBody.vibe

        if (!confession || !vibe) {
            return sendResponse(res, 400, 'application/json', {
                error: 'Confession and vibe required'
            })
        }

        if (vibe !== 'sweet' && vibe !== 'edgy') {
            return sendResponse(res, 400, 'application/json', {
                error: "Vibe must be either 'sweet' or 'edgy'"
            })
        }

        if (confession.length > 700) {
            return sendResponse(res, 400, 'application/json', {
                error: 'Confession must be 700 characters or fewer'
            })
        }

        const result = await createConfession({ confession, vibe })

        sendResponse(res, 201, 'application/json', {
            success: true,
            id: result.id,
            token: result.token
        })
    } catch (err) {
        console.error('POST error:', err)
        const statusCode = err.statusCode || 500
        sendResponse(res, statusCode, 'application/json', {
            error: err.statusCode ? err.message : 'Failed to save confession'
        })
    }
}

// PUT Handler - Edit an existing confession
export async function handlePUT(req, res) {
    try {
        const parsedBody = await parseBody(req)
        const id = parsedBody.id
        const confession = parsedBody.confession?.trim()
        const token = parsedBody.token

        if (!id || !confession || !token) {
            return sendResponse(res, 400, 'application/json', {
                error: 'ID, confession and token required'
            })
        }

        if (confession.length > 700) {
            return sendResponse(res, 400, 'application/json', {
                error: 'Confession must be 700 characters or fewer'
            })
        }

        const result = await updateConfession({ id, confession, token })

        if (result.error === 'not_found') {
            return sendResponse(res, 404, 'application/json', {
                error: 'Confession not found'
            })
        }

        if (result.error === 'unauthorized') {
            return sendResponse(res, 403, 'application/json', {
                error: 'Not authorized to edit this confession'
            })
        }

        sendResponse(res, 200, 'application/json', {
            success: true,
            message: 'Confession updated'
        })
    } catch (err) {
        console.error('PUT error:', err)
        const statusCode = err.statusCode || 500
        sendResponse(res, statusCode, 'application/json', {
            error: err.statusCode ? err.message : 'Failed to update confession'
        })
    }
}

// DELETE Handler - Delete a confession
export async function handleDELETE(req, res) {
    try {
        const parsedBody = await parseBody(req)
        const id = parsedBody.id
        const token = parsedBody.token

        if (!id || !token) {
            return sendResponse(res, 400, 'application/json', {
                error: 'ID and token required'
            })
        }

        const result = await deleteConfession({ id, token })

        if (result.error === 'not_found') {
            return sendResponse(res, 404, 'application/json', {
                error: 'Confession not found'
            })
        }

        if (result.error === 'unauthorized') {
            return sendResponse(res, 403, 'application/json', {
                error: 'Not authorized to delete this confession'
            })
        }

        sendResponse(res, 200, 'application/json', {
            success: true,
            message: 'Confession deleted'
        })
    } catch (err) {
        console.error('DELETE error:', err)
        const statusCode = err.statusCode || 500
        sendResponse(res, statusCode, 'application/json', {
            error: err.statusCode ? err.message : 'Failed to delete confession'
        })
    }
}

// Like Handler
export async function handleLike(req, res) {
    try {
        const parsedBody = await parseBody(req)
        const id = parsedBody.id
        const liked = parsedBody.liked

        if (!id || liked === undefined) {
            return sendResponse(res, 400, 'application/json', {
                error: 'ID and liked status required'
            })
        }

        const result = await toggleLike({ id, liked })

        if (result.error === 'not_found') {
            return sendResponse(res, 404, 'application/json', {
                error: 'Confession not found'
            })
        }

        sendResponse(res, 200, 'application/json', {
            success: true,
            likes: result.likes
        })
    } catch (err) {
        console.error('LIKE error:', err)
        const statusCode = err.statusCode || 500
        sendResponse(res, statusCode, 'application/json', {
            error: err.statusCode ? err.message : 'Failed to update like'
        })
    }
}

// Comment Handlers
export const handleComment = {
    async add(req, res) {
        try {
            const parsedBody = await parseBody(req)
            const confessionId = parsedBody.confessionId
            const text = parsedBody.text?.trim()

            if (!confessionId || !text) {
                return sendResponse(res, 400, 'application/json', {
                    error: 'Confession ID and comment text required'
                })
            }

            const result = await addComment({ confessionId, text })

            if (result.error === 'confession_not_found') {
                return sendResponse(res, 404, 'application/json', {
                    error: 'Confession not found'
                })
            }

            sendResponse(res, 201, 'application/json', {
                success: true,
                comment: result.comment
            })
        } catch (err) {
            console.error('COMMENT ADD error:', err)
            const statusCode = err.statusCode || 500
            sendResponse(res, statusCode, 'application/json', {
                error: err.statusCode ? err.message : 'Failed to add comment'
            })
        }
    },

    async remove(req, res) {
        try {
            const parsedBody = await parseBody(req)
            const confessionId = parsedBody.confessionId
            const commentId = parsedBody.commentId

            if (!confessionId || !commentId) {
                return sendResponse(res, 400, 'application/json', {
                    error: 'Confession ID and comment ID required'
                })
            }

            const result = await deleteComment({ confessionId, commentId })

            if (result.error === 'confession_not_found') {
                return sendResponse(res, 404, 'application/json', {
                    error: 'Confession not found'
                })
            }

            if (result.error === 'comment_not_found') {
                return sendResponse(res, 404, 'application/json', {
                    error: 'Comment not found'
                })
            }

            sendResponse(res, 200, 'application/json', {
                success: true,
                message: 'Comment deleted'
            })
        } catch (err) {
            console.error('COMMENT DELETE error:', err)
            const statusCode = err.statusCode || 500
            sendResponse(res, statusCode, 'application/json', {
                error: err.statusCode ? err.message : 'Failed to delete comment'
            })
        }
    }
}