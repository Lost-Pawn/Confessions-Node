// SANITIZER — prevents XSS attacks

function sanitize(str) {
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
    document.getElementById(sectionId).classList.add('active')

    if (sectionId === 'view') {
        loadConfessions()
    }

    // Reset form every time when confess section is opened
    if (sectionId === 'confess') {
        const form = document.querySelector('#confessionForm')
        const successMessage = document.querySelector('#successMessage')

        form.style.display = ''
        form.reset()
        charCount.textContent = '0'
        successMessage.classList.remove('show')
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

// TIME FORMATTER

function timeAgo(isoString) {
    const now = Date.now()
    const then = new Date(isoString).getTime()
    const diff = Math.floor((now - then) / 1000)

    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)} minute${Math.floor(diff / 60) === 1 ? '' : 's'} ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) === 1 ? '' : 's'} ago`
    return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) === 1 ? '' : 's'} ago`
}

// LIKES — SESSION STORAGE

function getLikedIds() {
    return JSON.parse(localStorage.getItem('likedConfessions') || '[]')
}

function saveLikedIds(ids) {
    localStorage.setItem('likedConfessions', JSON.stringify(ids))
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
    return JSON.parse(localStorage.getItem('confessionTokens') || '{}')
}

function saveToken(id, token) {
    const tokens = getTokens()
    tokens[id] = token
    localStorage.setItem('confessionTokens', JSON.stringify(tokens))
}

// Returns token string if user owns this confession, otherwise null
function getToken(id) {
    const tokens = getTokens()
    return tokens[id] || null
}

// LOAD & RENDER CARDS

async function loadConfessions() {
    try {
        const data = await fetch('/api')
        const response = await data.json()
        renderCards(response)
    } catch (err) {
        console.log(err)
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

    if (!cardsData || cardsData.length === 0) {
        container.innerHTML = ''
        emptyState.classList.add('show')
        return
    }

    emptyState.classList.remove('show')

    let cardsHTML = ''

    cardsData.forEach((card) => {
        const badgeClass = card.vibe === 'sweet' ? 'sweet-badge' : 'edgy-badge'
        const badgeIcon = card.vibe === 'sweet' ? '🎀 Sweet' : '💀 Edgy'
        const time = card.createdAt ? timeAgo(card.createdAt) : 'Just now'
        const editedNote = card.editedAt ? ' (edited)' : ''
        const likes = card.likes || 0
        const liked = isLiked(card.id)
        const comments = card.comments || []

        // Only show Edit/Delete if this user owns the confession
        const isOwner = getToken(card.id) !== null

        const ownerActions = isOwner ? `
            <div class="confession-actions">
                <button class="edit-btn">Edit ✏️</button>
                <button class="delete-btn">Delete 🗑</button>
            </div>
        ` : ''

        cardsHTML += `
            <div class="confession-card ${sanitize(card.vibe)}" data-id="${sanitize(card.id)}">
                <div class="confession-header">
                    <span class="confession-badge ${badgeClass}">${badgeIcon}</span>
                    <span class="confession-id-display">#${sanitize(card.id)}</span>
                </div>

                <div class="confession-content">
                    <p>${sanitize(card.confession)}</p>
                </div>

                <div class="confession-footer">
                    <span class="confession-time">${time}${editedNote}</span>
                    <!-- ✅ Only renders for the owner -->
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

document
    .querySelector('#confessionForm')
    .addEventListener('submit', async (e) => {

        e.preventDefault()

        const confession = document.querySelector('#confessionText').value
        const vibe = document.querySelector('input[name="vibe"]:checked').value

        const response = await fetch('/api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ confession, vibe })
        })

        const data = await response.json()

        // Save token to localStorage so user can edit/delete later
        if (data.id && data.token) {
            saveToken(data.id, data.token)
        }

        const form = document.querySelector('#confessionForm')
        const successMessage = document.querySelector('#successMessage')
        const confessionIdSpan = document.querySelector('#confessionId')

        form.style.display = 'none'
        confessionIdSpan.textContent = sanitize(data.id)
        successMessage.classList.add('show')

        form.reset()
        charCount.textContent = '0'
    })

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

        const response = await fetch('/api/like', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, liked: nowLiked })
        })

        const data = await response.json()

        btn.classList.toggle('liked', nowLiked)
        btn.innerHTML = `${nowLiked ? '♥' : '♡'} <span class="like-count">${sanitize(String(data.likes))}</span>`
        return
    }

    // TOGGLE COMMENTS
    if (e.target.closest('.toggle-comments-btn')) {
        const btn = e.target.closest('.toggle-comments-btn')
        const id = btn.dataset.id
        const commentsSection = document.querySelector(`.comments-section[data-id="${id}"]`)
        commentsSection.classList.toggle('hidden')
        return
    }

    // SUBMIT COMMENT
    if (e.target.closest('.submit-comment-btn')) {
        const btn = e.target.closest('.submit-comment-btn')
        const id = btn.dataset.id
        const input = document.querySelector(`.comment-input[data-id="${id}"]`)
        const text = input.value.trim()

        if (!text) return

        const response = await fetch('/api/comment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ confessionId: id, text })
        })

        const data = await response.json()

        if (data.success) {
            input.value = ''
            const commentsList = document.querySelector(`.comments-section[data-id="${id}"] .comments-list`)
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
            const currentCount = commentsList.querySelectorAll('.comment-item').length
            toggleBtn.textContent = `💬 ${currentCount} Comment${currentCount === 1 ? '' : 's'}`
        }
        return
    }

    // DELETE COMMENT
    if (e.target.closest('.delete-comment-btn')) {
        const btn = e.target.closest('.delete-comment-btn')
        const confessionId = btn.dataset.confessionId
        const commentId = btn.dataset.commentId

        if (!confirm('Delete this comment?')) return

        const response = await fetch('/api/comment', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ confessionId, commentId })
        })

        const data = await response.json()

        if (data.success) {
            const commentItem = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`)
            if (commentItem) commentItem.remove()

            const commentsList = document.querySelector(`.comments-section[data-id="${confessionId}"] .comments-list`)
            const remaining = commentsList.querySelectorAll('.comment-item').length

            if (remaining === 0) {
                commentsList.innerHTML = `<p class="no-comments">No comments yet. Be the first!</p>`
            }

            const toggleBtn = document.querySelector(`.toggle-comments-btn[data-id="${confessionId}"]`)
            toggleBtn.textContent = `💬 ${remaining} Comment${remaining === 1 ? '' : 's'}`
        }
        return
    }

    if (!card) return

    const id = card.dataset.id

    // EDIT — sends token with request
    if (e.target.classList.contains('edit-btn')) {
        const token = getToken(id)
        if (!token) return

        const newText = prompt('Edit confession:')
        if (!newText || !newText.trim()) return

        const response = await fetch('/api', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, confession: newText.trim(), token })
        })

        const data = await response.json()

        if (!data.success) {
            alert(data.error || 'Failed to edit confession')
            return
        }

        loadConfessions()
    }

    // DELETE — sends token with request
    if (e.target.classList.contains('delete-btn')) {
        const token = getToken(id)
        if (!token) return

        if (!confirm('Delete this confession?')) return

        const response = await fetch('/api', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, token })
        })

        const data = await response.json()

        if (!data.success) {
            alert(data.error || 'Failed to delete confession')
            return
        }

        loadConfessions()
    }
})