-- AdForge D1 schema — 0001_init
-- Apply: npm run db:migrate   (wrangler d1 migrations apply adforge-db --remote)

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

CREATE TABLE profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  handle TEXT NOT NULL DEFAULT '',
  workspace TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT '',
  plan TEXT NOT NULL DEFAULT 'Forge Free',
  avatar_color TEXT NOT NULL DEFAULT '#FF5A1F',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  settings TEXT NOT NULL DEFAULT '{}',
  notification_prefs TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE brands (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  industry TEXT NOT NULL DEFAULT '',
  colors TEXT NOT NULL DEFAULT '{}',
  fonts TEXT NOT NULL DEFAULT '{}',
  tone TEXT NOT NULL DEFAULT '',
  voice TEXT NOT NULL DEFAULT '[]',
  banned TEXT NOT NULL DEFAULT '[]',
  prefs TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_brands_user ON brands(user_id);

CREATE TABLE campaigns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_id TEXT NOT NULL,
  brief TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ideas',
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_campaigns_user ON campaigns(user_id);

CREATE TABLE concepts (
  id TEXT PRIMARY KEY,
  campaign_id TEXT,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  hook TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  hook_score INTEGER NOT NULL DEFAULT 0,
  score_breakdown TEXT NOT NULL DEFAULT '[]',
  payload TEXT NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'deterministic',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_concepts_user ON concepts(user_id);
CREATE INDEX idx_concepts_campaign ON concepts(campaign_id);

CREATE TABLE creatives (
  id TEXT PRIMARY KEY,
  concept_id TEXT,
  user_id TEXT NOT NULL,
  placement TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  hashtags TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_creatives_user ON creatives(user_id);
CREATE INDEX idx_creatives_concept ON creatives(concept_id);

CREATE TABLE scheduled_posts (
  id TEXT PRIMARY KEY,
  creative_id TEXT,
  user_id TEXT NOT NULL,
  network TEXT NOT NULL DEFAULT '',
  scheduled_at TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'queued',
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_scheduled_user ON scheduled_posts(user_id);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'info',
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_notifications_user ON notifications(user_id);

CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_used_at TEXT
);
CREATE INDEX idx_apikeys_user ON api_keys(user_id);

-- ------------------------------------------------------------------
-- Seed: demo user (demo@adforge.studio). Password hash only — the
-- plaintext password is never stored. PBKDF2-SHA256, 100k iterations.
-- ------------------------------------------------------------------
INSERT INTO users (id, email, password_hash, name) VALUES (
  'user_demo',
  'demo@adforge.studio',
  'pbkdf2$100000$yQ/D2dWaQNfroAGdSD+QGg==$7u0jqhGETYbbXIIGoNqWnWQvDVJeDJBwlNITgjtm1pI=',
  'Alex Carter'
);

INSERT INTO profiles (user_id, handle, workspace, role, plan, avatar_color, timezone, settings, notification_prefs) VALUES (
  'user_demo',
  '@alexforges',
  'Forge Studio',
  'Founder · Growth',
  'Forge Pro',
  '#FF5A1F',
  'Asia/Karachi (PKT)',
  '{"autopilot":"gates","slopSensitivity":60,"connections":{"instagram":"connected"}}',
  '{"product":true,"weekly":true,"mentions":true,"autopilot":true}'
);

INSERT INTO brands (id, user_id, name, tagline, industry, colors, fonts, tone, voice, banned, prefs) VALUES
(
  'brand_kova',
  'user_demo',
  'KOVA',
  'Nothing extra.',
  'Footwear — minimalist sneakers',
  '{"ink":"#101014","paper":"#FAFAF7","accent":"#FF5A1F","muted":"#8B8B93"}',
  '{"display":"Space Grotesk","body":"Inter"}',
  'Blunt. Minimal. Zero hype.',
  '["Short sentences. No throat-clearing.","No adjective without evidence.","Confidence, not shouting."]',
  '["Amazing","Revolutionary","Game-changer","Epic"]',
  '{"tone":"Match brand kit","hookStyle":"auto","ctaType":"auto","captionLength":"medium","emoji":true,"creativity":55,"avoid":""}'
),
(
  'brand_juniper',
  'user_demo',
  'Juniper & Co.',
  'Slow light for fast lives.',
  'Home — hand-poured candles',
  '{"ink":"#1B231F","paper":"#F6F1E7","accent":"#D9A441","muted":"#9A917F"}',
  '{"display":"Space Grotesk","body":"Inter"}',
  'Warm, slow, sensory.',
  '["Sensory detail over claims.","Unhurried rhythm — let sentences breathe.","Never shout about calm."]',
  '["Insane","Crazy","Hustle","Smash"]',
  '{"tone":"Match brand kit","hookStyle":"auto","ctaType":"auto","captionLength":"medium","emoji":true,"creativity":55,"avoid":""}'
);

INSERT INTO notifications (id, user_id, title, body, kind, read) VALUES
('n_seed1', 'user_demo', 'Welcome to the forge', 'Your demo workspace is ready — brief once, ship everywhere.', 'success', 0),
('n_seed2', 'user_demo', 'Slop Shield is watching', 'Every concept is QC-checked before it can ship.', 'info', 0),
('n_seed3', 'user_demo', 'KOVA is trending up', 'Hook scores on the last 5 posts averaged 79.', 'info', 1);
