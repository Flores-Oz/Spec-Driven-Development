'use strict';
const {DatabaseSync} = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

function openDatabase(file = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'yogaflow.sqlite')) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), {recursive:true});
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('admin','instructor','student')),
    password_hash TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS student_packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    total INTEGER NOT NULL CHECK(total>0),
    used INTEGER NOT NULL DEFAULT 0 CHECK(used >= 0 AND used <= total)
  );
  CREATE TABLE IF NOT EXISTS class_sessions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    instructor TEXT NOT NULL,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 12 CHECK(capacity=12),
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','cancelled'))
  );
  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id TEXT NOT NULL REFERENCES class_sessions(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    status TEXT NOT NULL CHECK(status IN ('confirmed','cancelled')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(class_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS waitlist_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id TEXT NOT NULL REFERENCES class_sessions(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    status TEXT NOT NULL CHECK(status IN ('active','promoted','withdrawn','skipped')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS unique_active_wait ON waitlist_entries(class_id, user_id) WHERE status='active';
  CREATE INDEX IF NOT EXISTS wait_fifo ON waitlist_entries(class_id, status, id);
  CREATE INDEX IF NOT EXISTS res_class_status ON reservations(class_id,status);
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL,
    read_at TEXT
  );
  CREATE TABLE IF NOT EXISTS audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id TEXT REFERENCES users(id),
    user_id TEXT REFERENCES users(id),
    class_id TEXT REFERENCES class_sessions(id),
    action TEXT NOT NULL,
    detail TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    csrf_token TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE TRIGGER IF NOT EXISTS no_more_than_capacity_insert
  BEFORE INSERT ON reservations WHEN NEW.status='confirmed'
  BEGIN
    SELECT CASE WHEN (
      SELECT COUNT(*) FROM reservations WHERE class_id=NEW.class_id AND status='confirmed'
    ) >= (SELECT capacity FROM class_sessions WHERE id=NEW.class_id)
    THEN RAISE(ABORT, 'FULL') END;
  END;
  CREATE TRIGGER IF NOT EXISTS no_more_than_capacity_update
  BEFORE UPDATE OF status ON reservations WHEN NEW.status='confirmed' AND OLD.status!='confirmed'
  BEGIN
    SELECT CASE WHEN (
      SELECT COUNT(*) FROM reservations WHERE class_id=NEW.class_id AND status='confirmed' AND id!=NEW.id
    ) >= (SELECT capacity FROM class_sessions WHERE id=NEW.class_id)
    THEN RAISE(ABORT, 'FULL') END;
  END;
  `);
  return db;
}
function tx(db, action) {
  db.exec('BEGIN IMMEDIATE');
  try {const value=action(); db.exec('COMMIT'); return value;}
  catch(error){db.exec('ROLLBACK');throw error;}
}
module.exports={openDatabase,tx};
