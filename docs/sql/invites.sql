CREATE TABLE IF NOT EXISTS mello_invites (
  id TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  redeemed_by TEXT UNIQUE,
  email TEXT,
  revoked_at INTEGER
);
