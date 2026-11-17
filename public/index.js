// SANITIZER — prevents XSS attacks
function sanitize(str) {
    if (str === null || str === undefined) return ''
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
        '`': '&#x60;'
    }
    return String(str).replace(/[&<>"'`/]/g, match => map[match])
}

// SECTION NAVIGATION
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active')
    })
    const targetSection = document.getElementById(sectionId)
    if (targetSection) {
        targetSection.classList.add('active')
    }

    if (sectionId === 'view') {
        loadConfessions()
    }

    // Reset form every time when confess section is opened
    if (sectionId === 'confess') {
        const form = document.querySelector('#confessionForm')
        const successMessage = document.querySelector('#successMessage')

        if (form) {
            form.style.display = ''
            form.reset()
        }
        if (charCount) {
            charCount.textContent = '0'
        }
        if (successMessage) {
            successMessage.classList.remove('show')
        }
    }
}

document.querySelectorAll('.nav-card').forEach(card => {
    card.addEventListener('click', () => {
        const target = card.dataset.section
        if (target) showSection(target)
    })
})

document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.target
        if (target) showSection(target)
    })
})

document.querySelectorAll('.secondary-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.target
        if (target) showSection(target)
    })
})

// CHARACTER COUNTER
const textarea = document.querySelector('#confessionText')
const charCount = document.querySelector('#charCount')

if (textarea && charCount) {
    textarea.addEventListener('input', () => {
        const count = textarea.value.length
        charCount.textContent = count

        if (count > 700) {
            charCount.style.color = '#FF1493'
            charCount.style.fontWeight = 'bold'
        } else {
            charCount.style.color = ''
            charCount.style.fontWeight = ''
        }
    })
}

// TIME FORMATTER
function timeAgo(isoString) {
    if (!isoString) return 'Just now'
    const now = Date.now()
    const then = new Date(isoString).getTime()
    if (isNaN(then)) return 'Just now'
    const diff = Math.floor((now - then) / 1000)

    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)} minute${Math.floor(diff / 60) === 1 ? '' : 's'} ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) === 1 ? '' : 's'} ago`
    return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) === 1 ? '' : 's'} ago`
}

// LIKES — LOCAL STORAGE
function getLikedIds() {
    try {
        return JSON.parse(localStorage.getItem('likedConfessions') || '[]')
    } catch {
        return []
    }
}

function saveLikedIds(ids) {
    try {
        localStorage.setItem('likedConfessions', JSON.stringify(ids))
    } catch (e) {
        console.error('Failed to save liked IDs:', e)
    }
}

function isLiked(id) {
    return getLikedIds().includes(id)
}

function toggleLikedId(id) {
    const ids = getLikedIds()
    const index = ids.indexOf(id)
    if (index === -1) {
        ids.push(id)
    } else {
        ids.splice(index, 1)
    }
    saveLikedIds(ids)
    return index === -1
}

// TOKENS — OWNERSHIP
function getTokens() {
    try {
        return JSON.parse(localStorage.getItem('confessionTokens') || '{}')
    } catch {
        return {}
    }
}

function saveToken(id, token) {
    try {
        const tokens = getTokens()
        tokens[id] = token
        localStorage.setItem('confessionTokens', JSON.stringify(tokens))
    } catch (e) {
        console.error('Failed to save confession token:', e)
    }
}

function getToken(id) {
    const tokens = getTokens()
    return tokens[id] || null
}

// LOAD & RENDER CARDS
async function loadConfessions() {
    try {
        const response = await fetch('/api')
        if (!response.ok) {
            throw new Error(`Server returned HTTP ${response.status}`)
        }
        const data = await response.json()
        if (Array.isArray(data)) {
            renderCards(data)
        } else {
            renderCards([])
        }
    } catch (err) {
        console.error('Failed to load confessions:', err)
        renderCards([])
    }
}

loadConfessions()

function renderComments(comments, confessionId) {
    if (!comments || comments.length === 0) {
        return `<p class="no-comments">No comments yet. Be the first!</p>`
    }

    return comments.map(comment => `
        <div class="comment-item" data-comment-id="${sanitize(comment.id)}">
            <p class="comment-text">${sanitize(comment.text)}</p>
            <div class="comment-footer">
                <span class="comment-time">${timeAgo(comment.createdAt)}</span>
                <button
                    class="delete-comment-btn"
                    data-confession-id="${sanitize(confessionId)}"
                    data-comment-id="${sanitize(comment.id)}"
                >🗑</button>
            </div>
        </div>
    `).join('')
}

function renderCards(cardsData) {
    const container = document.querySelector('#confessionsContainer')
    const emptyState = document.querySelector('#emptyState')

    if (!container) return

    if (!cardsData || cardsData.length === 0) {
        container.innerHTML = ''
        if (emptyState) emptyState.classList.add('show')
        return
    }

    if (emptyState) emptyState.classList.remove('show')

    let cardsHTML = ''

    cardsData.forEach((card) => {
        const vibe = card.vibe === 'edgy' ? 'edgy' : 'sweet'
        const badgeClass = vibe === 'sweet' ? 'sweet-badge' : 'edgy-badge'
        const badgeIcon = vibe === 'sweet' ? '🎀 Sweet' : '💀 Edgy'
        const time = card.createdAt ? timeAgo(card.createdAt) : 'Just now'
        const editedNote = card.editedAt ? ' (edited)' : ''
        const likes = typeof card.likes === 'number' ? card.likes : 0
        const liked = isLiked(card.id)
        const comments = Array.isArray(card.comments) ? card.comments : []

        // Only show Edit/Delete if this user owns the confession
        const isOwner = getToken(card.id) !== null

        const ownerActions = isOwner ? `
            <div class="confession-actions">
                <button class="edit-btn">Edit ✏️</button>
                <button class="delete-btn">Delete 🗑</button>
            </div>
        ` : ''

        cardsHTML += `
            <div class="confession-card ${sanitize(vibe)}" data-id="${sanitize(card.id)}">
                <div class="confession-header">
                    <span class="confession-badge ${badgeClass}">${badgeIcon}</span>
                    <span class="confession-id-display">#${sanitize(card.id)}</span>
                </div>

                <div class="confession-content">
                    <p>${sanitize(card.confession)}</p>
                </div>

                <div class="confession-footer">
                    <span class="confession-time">${time}${editedNote}</span>
                    ${ownerActions}
                </div>

                <div class="confession-interactions">
                    <button
                        class="like-btn ${liked ? 'liked' : ''}"
                        data-id="${sanitize(card.id)}"
                    >
                        ${liked ? '♥' : '♡'} <span class="like-count">${likes}</span>
                    </button>

                    <button class="toggle-comments-btn" data-id="${sanitize(card.id)}">
                        💬 ${comments.length} Comment${comments.length === 1 ? '' : 's'}
                    </button>
                </div>

                <div class="comments-section hidden" data-id="${sanitize(card.id)}">
                    <div class="comments-list">
                        ${renderComments(comments, card.id)}
                    </div>

                    <div class="comment-input-wrapper">
                        <textarea
                            class="comment-input"
                            placeholder="Write a comment..."
                            rows="2"
                            data-id="${sanitize(card.id)}"
                        ></textarea>
                        <button class="submit-comment-btn" data-id="${sanitize(card.id)}">Post 💬</button>
                    </div>
                </div>
            </div>
        `
    })

    container.innerHTML = cardsHTML

    const activeFilter = document.querySelector('.filter-btn.active')
    if (activeFilter) {
        applyFilter(activeFilter.dataset.filter)
    }
}

// CONFESSION FORM
const confessionForm = document.querySelector('#confessionForm')
if (confessionForm) {
    confessionForm.addEventListener('submit', async (e) => {
        e.preventDefault()

        const confessionInput = document.querySelector('#confessionText')
        const vibeInput = document.querySelector('input[name="vibe"]:checked')

        if (!confessionInput || !vibeInput) return

        const confession = confessionInput.value.trim()
        const vibe = vibeInput.value

        if (!confession) {
            alert('Please enter a confession')
            return
        }

        try {
            const response = await fetch('/api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confession, vibe })
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
                alert(data.error || 'Failed to submit confession')
                return
            }

            // Save token to localStorage so user can edit/delete later
            if (data.id && data.token) {
                saveToken(data.id, data.token)
            }

            const successMessage = document.querySelector('#successMessage')
            const confessionIdSpan = document.querySelector('#confessionId')

            confessionForm.style.display = 'none'
            if (confessionIdSpan) {
                confessionIdSpan.textContent = sanitize(data.id)
            }
            if (successMessage) {
                successMessage.classList.add('show')
            }

            confessionForm.reset()
            if (charCount) {
                charCount.textContent = '0'
            }
        } catch (err) {
            console.error('Error submitting confession:', err)
            alert('Network error submitting confession. Please try again.')
        }
    })
}

// FILTER BUTTONS
function applyFilter(filter) {
    const cards = document.querySelectorAll('.confession-card')
    cards.forEach(card => {
        if (filter === 'all') {
            card.style.display = ''
        } else {
            card.style.display = card.classList.contains(filter) ? '' : 'none'
        }
    })
}

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        applyFilter(btn.dataset.filter)
    })
})

// DELEGATED CLICK HANDLER
document.addEventListener('click', async (e) => {
    const card = e.target.closest('.confession-card')

    // LIKE
    if (e.target.closest('.like-btn')) {
        const btn = e.target.closest('.like-btn')
        const id = btn.dataset.id
        const nowLiked = toggleLikedId(id)

        try {
            const response = await fetch('/api/like', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, liked: nowLiked })
            })

            const data = await response.json()

            if (response.ok && data.success && typeof data.likes === 'number') {
                btn.classList.toggle('liked', nowLiked)
                btn.innerHTML = `${nowLiked ? '♥' : '♡'} <span class="like-count">${sanitize(String(data.likes))}</span>`
            } else {
                toggleLikedId(id) // Revert on failure
                alert(data.error || 'Failed to update like')
            }
        } catch (err) {
            toggleLikedId(id) // Revert on network failure
            console.error('Like error:', err)
        }
        return
    }

    // TOGGLE COMMENTS
    if (e.target.closest('.toggle-comments-btn')) {
        const btn = e.target.closest('.toggle-comments-btn')
        const id = btn.dataset.id
        const commentsSection = document.querySelector(`.comments-section[data-id="${id}"]`)
        if (commentsSection) {
            commentsSection.classList.toggle('hidden')
        }
        return
    }

    // SUBMIT COMMENT
    if (e.target.closest('.submit-comment-btn')) {
        const btn = e.target.closest('.submit-comment-btn')
        const id = btn.dataset.id
        const input = document.querySelector(`.comment-input[data-id="${id}"]`)
        if (!input) return
        const text = input.value.trim()

        if (!text) return

        try {
            const response = await fetch('/api/comment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confessionId: id, text })
            })

            const data = await response.json()

            if (response.ok && data.success && data.comment) {
                input.value = ''
                const commentsList = document.querySelector(`.comments-section[data-id="${id}"] .comments-list`)
                if (commentsList) {
                    const noComments = commentsList.querySelector('.no-comments')
                    if (noComments) noComments.remove()

                    const newCommentHTML = `
                        <div class="comment-item" data-comment-id="${sanitize(data.comment.id)}">
                            <p class="comment-text">${sanitize(data.comment.text)}</p>
                            <div class="comment-footer">
                                <span class="comment-time">Just now</span>
                                <button
                                    class="delete-comment-btn"
                                    data-confession-id="${sanitize(id)}"
                                    data-comment-id="${sanitize(data.comment.id)}"
                                >🗑</button>
                            </div>
                        </div>
                    `
                    commentsList.insertAdjacentHTML('beforeend', newCommentHTML)

                    const toggleBtn = document.querySelector(`.toggle-comments-btn[data-id="${id}"]`)
                    if (toggleBtn) {
                        const currentCount = commentsList.querySelectorAll('.comment-item').length
                        toggleBtn.textContent = `💬 ${currentCount} Comment${currentCount === 1 ? '' : 's'}`
                    }
                }
            } else {
                alert(data.error || 'Failed to add comment')
            }
        } catch (err) {
            console.error('Error adding comment:', err)
            alert('Failed to post comment')
        }
        return
    }

    // DELETE COMMENT
    if (e.target.closest('.delete-comment-btn')) {
        const btn = e.target.closest('.delete-comment-btn')
        const confessionId = btn.dataset.confessionId
        const commentId = btn.dataset.commentId

        if (!confirm('Delete this comment?')) return

        try {
            const response = await fetch('/api/comment', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confessionId, commentId })
            })

            const data = await response.json()

            if (response.ok && data.success) {
                const commentItem = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`)
                if (commentItem) commentItem.remove()

                const commentsList = document.querySelector(`.comments-section[data-id="${confessionId}"] .comments-list`)
                if (commentsList) {
                    const remaining = commentsList.querySelectorAll('.comment-item').length

                    if (remaining === 0) {
                        commentsList.innerHTML = `<p class="no-comments">No comments yet. Be the first!</p>`
                    }

                    const toggleBtn = document.querySelector(`.toggle-comments-btn[data-id="${confessionId}"]`)
                    if (toggleBtn) {
                        toggleBtn.textContent = `💬 ${remaining} Comment${remaining === 1 ? '' : 's'}`
                    }
                }
            } else {
                alert(data.error || 'Failed to delete comment')
            }
        } catch (err) {
            console.error('Error deleting comment:', err)
            alert('Failed to delete comment')
        }
        return
    }

    if (!card) return

    const id = card.dataset.id

    // EDIT — sends token with request
    if (e.target.classList.contains('edit-btn')) {
        const token = getToken(id)
        if (!token) return

        const currentTextEl = card.querySelector('.confession-content p')
        const defaultText = currentTextEl ? currentTextEl.textContent : ''

        const newText = prompt('Edit confession:', defaultText)
        if (!newText || !newText.trim()) return

        try {
            const response = await fetch('/api', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, confession: newText.trim(), token })
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
                alert(data.error || 'Failed to edit confession')
                return
            }

            loadConfessions()
        } catch (err) {
            console.error('Error editing confession:', err)
            alert('Failed to edit confession')
        }
    }

    // DELETE — sends token with request
    if (e.target.classList.contains('delete-btn')) {
        const token = getToken(id)
        if (!token) return

        if (!confirm('Delete this confession?')) return

        try {
            const response = await fetch('/api', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, token })
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
                alert(data.error || 'Failed to delete confession')
                return
            }

            loadConfessions()
        } catch (err) {
            console.error('Error deleting confession:', err)
            alert('Failed to delete confession')
        }
    }
})