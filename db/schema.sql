CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(32) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name VARCHAR(64),
  avatar_url TEXT,
  banner_url TEXT,
  bio TEXT,
  status_type VARCHAR(16) DEFAULT 'offline',
  status_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS servers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  icon_url TEXT,
  owner_id INT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS server_members (
  server_id INT REFERENCES servers(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (server_id, user_id)
);

CREATE TABLE IF NOT EXISTS channels (
  id SERIAL PRIMARY KEY,
  server_id INT REFERENCES servers(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  type VARCHAR(16) NOT NULL,
  topic TEXT,
  description TEXT,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  channel_id INT REFERENCES channels(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions_everyone BOOLEAN DEFAULT false,
  mentions_here BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS reactions (
  message_id INT REFERENCES messages(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  emoji VARCHAR(16) NOT NULL,
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  server_id INT REFERENCES servers(id) ON DELETE CASCADE,
  name VARCHAR(64) NOT NULL,
  color VARCHAR(16) DEFAULT '#99aab5',
  is_system BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT REFERENCES roles(id) ON DELETE CASCADE,
  permission_key VARCHAR(64) NOT NULL,
  PRIMARY KEY (role_id, permission_key)
);

CREATE TABLE IF NOT EXISTS member_roles (
  server_id INT REFERENCES servers(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  role_id INT REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (server_id, user_id, role_id)
);

CREATE TABLE IF NOT EXISTS friend_edges (
  id SERIAL PRIMARY KEY,
  requester_id INT REFERENCES users(id) ON DELETE CASCADE,
  addressee_id INT REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(16) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invites (
  id SERIAL PRIMARY KEY,
  server_id INT REFERENCES servers(id) ON DELETE CASCADE,
  code VARCHAR(32) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ,
  max_uses INT,
  created_by INT REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS voice_sessions (
  id SERIAL PRIMARY KEY,
  channel_id INT REFERENCES channels(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  muted BOOLEAN DEFAULT false,
  deafened BOOLEAN DEFAULT false,
  speaking BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bans (
  id SERIAL PRIMARY KEY,
  server_id INT REFERENCES servers(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  banned_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
