# 🎀 Hello Kitty & Kuromi — Secret Confessions

A beautiful anonymous confession web app built with vanilla Node.js, backed by PostgreSQL, and ready for deployment on Render.

---

## ✨ Features

- 📝 **Post Confessions:** Submit anonymous confessions with a sweet (Hello Kitty 🎀) or edgy (Kuromi 💀) vibe.
- 💬 **Interactive Comments:** Anyone can comment on confessions.
- ♥ **Likes System:** Atomic like/unlike counter persisted locally.
- ✏️ **Author Ownership:** Secure secret tokens stored client-side in `localStorage` allow only the original author to edit or delete their confession.
- 🔍 **Vibe Filtering:** Real-time filter between All, Sweet 🎀, and Edgy 💀 confessions.
- 🐘 **PostgreSQL Backing:** Full relational persistence with automatic table initialization, cascade deletions, and indexes.
- 🔒 **Security:** XSS sanitization, path traversal prevention, request body size limits, and secret token isolation.
- ☁️ **Render Deployable:** Native 1-click Blueprint (`render.yaml`) and Docker/Node compatibility.

---

## 🗂 Project Structure

```
ConfessionsApp/
├── db/
│   ├── index.js                # PostgreSQL connection pool & auto-migration
│   ├── confessions.js          # DB queries (CRUD, likes, comments)
│   └── schema.sql              # Database DDL schema & indexes
├── handlers/
│   └── routeHandlers.js        # API endpoints (GET, POST, PUT, DELETE, Like, Comment)
├── public/
│   ├── index.html              # Frontend user interface
│   ├── index.js                # Frontend controller & UI events
│   ├── styles.css              # Hello Kitty & Kuromi themed styles
│   ├── kitty.jpeg              # Kitty asset
│   └── kuromi.jpeg             # Kuromi asset
├── test/
│   └── api.test.js             # Comprehensive automated test suite
├── utils/
│   ├── contentType.js          # MIME type mapping
│   ├── parseBody.js            # Secure request body parser with size limits
│   ├── sendResponse.js         # HTTP response sender
│   └── serveStatic.js          # Secure static file server
├── .env.example                # Example environment variables
├── .gitignore                  # Git ignore rules
├── package.json                # Project dependencies & scripts
├── render.yaml                 # Render Blueprint configuration
└── server.js                   # Application entrypoint & HTTP server
```

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/lost-pawn/Confessions-Node.git
cd Confessions-Node
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Configure your PostgreSQL connection in `.env`:

```env
PORT=8000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/confessions
DB_SSL=false
```

*(You can quickly start a local PostgreSQL container using Docker:)*
```bash
docker run -d --name confessions-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=confessions -p 5432:5432 postgres:16-alpine
```

### 4. Run the Server

```bash
# Production mode
npm start

# Development mode (auto-reload on changes)
npm run dev
```

The database tables and indexes are automatically created on initial launch. Open [http://localhost:8000](http://localhost:8000) in your browser.

---

## 🧪 Running Tests

To run the automated test suite:

```bash
npm test
```

---

## ☁️ Deploying to Render

### Option A: 1-Click Blueprint (Recommended)

1. Push your repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** and select **Blueprint**.
3. Select your repository.
4. Render will read [`render.yaml`](file:///home/master/Codes/ConfessionsApp/render.yaml) and automatically provision:
   - A **PostgreSQL Database** (`confessions-db`).
   - A **Web Service** (`kitty-confessions`) connected via `DATABASE_URL`.
5. Click **Apply** to deploy!

### Option B: Manual Setup

1. **Create PostgreSQL Database on Render:**
   - In Render, click **New +** -> **PostgreSQL**.
   - Note the **Internal Database URL** (or External Database URL).
2. **Create Web Service:**
   - Click **New +** -> **Web Service** and connect your repository.
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment Variables:**
     - `DATABASE_URL`: paste your database connection string.
     - `NODE_ENV`: `production`
     - `DB_SSL`: `true`
   - **Health Check Path:** `/health`

---

## 🛠 API Routes

| Method | Route | Description |
|---|---|---|
| GET | `/health` | Health check endpoint for monitoring & Render |
| GET | `/api` | Retrieve all confessions with nested comments |
| POST | `/api` | Create a new confession (returns secret token) |
| PUT | `/api` | Edit confession text (requires author token) |
| DELETE | `/api` | Delete confession & comments (requires author token) |
| PUT | `/api/like` | Atomic increment / decrement like counter |
| POST | `/api/comment` | Add a comment to a confession |
| DELETE | `/api/comment` | Delete a comment from a confession |

---

## 📦 Tech Stack

- **Runtime:** Node.js (Vanilla HTTP with native ES modules)
- **Database:** PostgreSQL (`pg` connection pool with SSL support)
- **Frontend:** Vanilla HTML5, CSS3, JavaScript (no framework dependencies)
- **Deployment:** Render Blueprint (`render.yaml`)

---

## 📄 License

MIT — feel free to use and modify.