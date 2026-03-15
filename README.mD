# 🎀 Hello Kitty & Kuromi — Secret Confessions

A beautiful anonymous confession app built with vanilla Node.js, no frameworks.

---

## ✨ Features

- 📝 Submit anonymous confessions with a sweet or edgy vibe
- 💬 Comment on confessions
- ♥ Like / unlike confessions (persists per session via localStorage)
- ✏️ Edit your confessions
- 🗑 Delete confessions and comments
- 🔍 Filter confessions by vibe (All / Sweet / Edgy)
- 🔒 XSS sanitization on all user input

---

## 🗂 Project Structure

```
hello-kitty/
├── data/
│   ├── data.json               # ← gitignored, create from template
│   └── data.template.json      # ← copy this to data.json
├── handlers/
│   └── routeHandlers.js        # GET, POST, PUT, DELETE, Like, Comment
├── public/
│   ├── index.html
│   ├── index.js
│   ├── styles.css
│   ├── kitty.jpeg
│   └── kuromi.jpeg
├── utils/
│   ├── contentType.js
│   ├── getData.js
│   ├── sendResponse.js
│   └── serveStatic.js
├── .gitignore
├── package.json
└── server.js
```

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/your-username/hello-kitty.git
cd hello-kitty
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up the data file

```bash
cp data/data.template.json data/data.json
```

> ⚠️ `data.json` is gitignored. You must create it from the template before running the app — otherwise it won't start.

### 4. Run the server

```bash
node server.js
```

### 5. Open in browser

```
http://localhost:8000
```

---

## 🛠 API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api` | Get all confessions |
| POST | `/api` | Create a new confession |
| PUT | `/api` | Edit a confession |
| DELETE | `/api` | Delete a confession |
| PUT | `/api/like` | Toggle like on a confession |
| POST | `/api/comment` | Add a comment |
| DELETE | `/api/comment` | Delete a comment |

---

## 📦 Tech Stack

- **Runtime:** Node.js (no frameworks)
- **Storage:** JSON file (`data.json`)
- **Frontend:** Vanilla HTML, CSS, JavaScript

---

## 📄 License

MIT — feel free to use and modify.