-- Table for storing OAuth state nonces to avoid exposing JWT tokens in OAuth URLs
CREATE TABLE oauth_state_nonces (
  nonce TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  origin TEXT,
  target_user_id UUID,
  mode TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cleanup queries on expired nonces
CREATE INDEX oauth_state_nonces_expires_at_idx ON oauth_state_nonces (expires_at);

-- Only Edge Functions (service role) should access this table — no client access
ALTER TABLE oauth_state_nonces ENABLE ROW LEVEL SECURITY;
