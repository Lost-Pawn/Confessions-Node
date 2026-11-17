-- Schema for Hello Kitty & Kuromi Confessions App

-- Confessions table
CREATE TABLE IF NOT EXISTS confessions (
    id VARCHAR(64) PRIMARY KEY,
    confession TEXT NOT NULL,
    vibe VARCHAR(20) NOT NULL CHECK (vibe IN ('sweet', 'edgy')),
    likes INTEGER NOT NULL DEFAULT 0 CHECK (likes >= 0),
    token VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    edited_at TIMESTAMPTZ
);

-- Comments table with cascade deletion when confession is deleted
CREATE TABLE IF NOT EXISTS comments (
    id VARCHAR(64) PRIMARY KEY,
    confession_id VARCHAR(64) NOT NULL REFERENCES confessions(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_confessions_created_at ON confessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_confession_id ON comments(confession_id, created_at ASC);
