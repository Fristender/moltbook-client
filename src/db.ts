import { Database } from "bun:sqlite";
import { mkdirSync, existsSync } from "fs";
import { join } from "path";

const DATA_DIR = join(import.meta.dir, "..", "data");

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(join(DATA_DIR, "moltchat.db"), { create: true });
db.exec("PRAGMA journal_mode=WAL;");
db.exec("PRAGMA foreign_keys=ON;");

// Schema migrations
db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS posts_cache (
    id TEXT PRIMARY KEY,
    submolt TEXT,
    title TEXT,
    content TEXT,
    url TEXT,
    author TEXT,
    score INTEGER,
    created_at TEXT,
    fetched_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS comments_cache (
    id TEXT PRIMARY KEY,
    post_id TEXT,
    parent_id TEXT,
    author TEXT,
    content TEXT,
    score INTEGER,
    created_at TEXT,
    fetched_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS conversations_cache (
    id TEXT PRIMARY KEY,
    with_agent TEXT,
    last_message_at TEXT,
    unread_count INTEGER DEFAULT 0,
    fetched_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS action_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    target_id TEXT,
    detail TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Config helpers
export function getConfig(key: string): string | null {
  const row = db.query("SELECT value FROM config WHERE key = ?").get(key) as { value: string } | null;
  return row?.value ?? null;
}

export function setConfig(key: string, value: string): void {
  db.query("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)").run(key, value);
}

export function deleteConfig(key: string): void {
  db.query("DELETE FROM config WHERE key = ?").run(key);
}

// Safely extract a string for SQLite binding — handles objects like { name: "foo" }
function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "name" in v) return String((v as any).name);
  return String(v);
}

function num(v: unknown): number {
  if (typeof v === "number") return v;
  return 0;
}

// Posts cache
export function cachePost(post: Record<string, unknown>): void {
  db.query(`INSERT OR REPLACE INTO posts_cache (id, submolt, title, content, url, author, score, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    str(post.id), str(post.submolt), str(post.title), str(post.content),
    str(post.url), str(post.author), num(post.upvotes) - num(post.downvotes), str(post.created_at)
  );
}

export function getCachedPost(id: string) {
  return db.query("SELECT * FROM posts_cache WHERE id = ?").get(id);
}

// Comments cache
export function cacheComment(comment: Record<string, unknown>): void {
  db.query(`INSERT OR REPLACE INTO comments_cache (id, post_id, parent_id, author, content, score, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    str(comment.id), str(comment.post_id), str(comment.parent_id),
    str(comment.author), str(comment.content), num(comment.score), str(comment.created_at)
  );
}

// Conversations cache
export function cacheConversation(conv: Record<string, unknown>): void {
  db.query(`INSERT OR REPLACE INTO conversations_cache (id, with_agent, last_message_at, unread_count)
    VALUES (?, ?, ?, ?)`).run(
    str(conv.id), str(conv.with_agent), str(conv.last_message_at), num(conv.unread_count)
  );
}

// Action log
export function logAction(action: string, targetId?: string, detail?: string): void {
  db.query("INSERT INTO action_log (action, target_id, detail) VALUES (?, ?, ?)").run(
    action, targetId ?? null, detail ?? null
  );
}

export function getRecentActions(limit = 50) {
  return db.query("SELECT * FROM action_log ORDER BY created_at DESC LIMIT ?").all(limit);
}

export default db;
