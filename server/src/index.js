import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { Server } from 'socket.io';
import { z } from 'zod';
import { query, pool } from './db.js';
import { authMiddleware, signToken } from './auth.js';
import { PERMISSIONS, hasPermission } from './permissions.js';

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const signupSchema = z.object({ username: z.string().min(3), email: z.string().email(), password: z.string().min(8) });
const loginSchema = z.object({ email: z.string().email(), password: z.string() });

app.get('/health', (_, res) => res.json({ ok: true }));

app.post('/api/auth/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);
  const { username, email, password } = parsed.data;
  const hash = await bcrypt.hash(password, 10);
  const user = await query(
    'INSERT INTO users (username, email, password_hash, display_name, status_type) VALUES ($1,$2,$3,$1,$4) RETURNING id, username, email, display_name',
    [username, email, hash, 'online']
  );
  res.json({ token: signToken(user.rows[0]), user: user.rows[0] });
});

app.post('/api/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);
  const { email, password } = parsed.data;
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (!(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ token: signToken(user), user: { id: user.id, username: user.username, display_name: user.display_name } });
});

app.get('/api/servers', authMiddleware, async (req, res) => {
  const rows = await query(
    `SELECT s.* FROM servers s
     JOIN server_members sm ON s.id = sm.server_id
     WHERE sm.user_id = $1 ORDER BY s.created_at ASC`,
    [req.user.id]
  );
  res.json(rows.rows);
});

app.post('/api/servers', authMiddleware, async (req, res) => {
  const { name, description } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const serverInsert = await client.query('INSERT INTO servers (name, description, owner_id) VALUES ($1,$2,$3) RETURNING *', [name, description, req.user.id]);
    const server = serverInsert.rows[0];
    const ownerRole = await client.query('INSERT INTO roles (server_id, name, color, is_system) VALUES ($1,$2,$3,true) RETURNING id', [server.id, 'Owner', '#f04747']);
    for (const permission of Object.values(PERMISSIONS)) {
      await client.query('INSERT INTO role_permissions (role_id, permission_key) VALUES ($1,$2)', [ownerRole.rows[0].id, permission]);
    }
    await client.query('INSERT INTO server_members (server_id, user_id) VALUES ($1,$2)', [server.id, req.user.id]);
    await client.query('INSERT INTO member_roles (server_id, user_id, role_id) VALUES ($1,$2,$3)', [server.id, req.user.id, ownerRole.rows[0].id]);
    await client.query('INSERT INTO channels (server_id, name, type, topic) VALUES ($1,$2,$3,$4),($1,$5,$3,$6),($1,$7,$8,$9)', [server.id, 'general', 'text', 'Welcome to general', 'chat', 'Open chat room', 'Voice Lounge', 'voice', 'Main voice']);
    await client.query('COMMIT');
    res.status(201).json(server);
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
});

app.get('/api/servers/:serverId/channels', authMiddleware, async (req, res) => {
  const rows = await query('SELECT * FROM channels WHERE server_id = $1 ORDER BY position ASC, id ASC', [req.params.serverId]);
  res.json(rows.rows);
});

app.get('/api/channels/:channelId/messages', authMiddleware, async (req, res) => {
  const rows = await query(
    `SELECT m.*, u.username, u.display_name, u.avatar_url
     FROM messages m JOIN users u ON m.user_id = u.id
     WHERE m.channel_id = $1 ORDER BY m.created_at DESC LIMIT 100`,
    [req.params.channelId]
  );
  res.json(rows.rows.reverse());
});

app.post('/api/channels/:channelId/messages', authMiddleware, async (req, res) => {
  const { content } = req.body;
  const created = await query(
    'INSERT INTO messages (channel_id, user_id, content, mentions_everyone, mentions_here) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [req.params.channelId, req.user.id, content, content.includes('@everyone'), content.includes('@here')]
  );
  const user = await query('SELECT username, display_name, avatar_url FROM users WHERE id = $1', [req.user.id]);
  const enriched = { ...created.rows[0], ...user.rows[0] };
  io.to(`channel:${req.params.channelId}`).emit('message:new', enriched);
  res.status(201).json(enriched);
});

app.post('/api/messages/:id/reactions', authMiddleware, async (req, res) => {
  const { emoji } = req.body;
  await query('INSERT INTO reactions (message_id, user_id, emoji) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [req.params.id, req.user.id, emoji]);
  const counts = await query('SELECT emoji, COUNT(*)::int as count FROM reactions WHERE message_id = $1 GROUP BY emoji', [req.params.id]);
  io.emit('message:reactions', { messageId: Number(req.params.id), reactions: counts.rows });
  res.json(counts.rows);
});

app.get('/api/friends', authMiddleware, async (req, res) => {
  const rows = await query('SELECT * FROM friend_edges WHERE requester_id = $1 OR addressee_id = $1', [req.user.id]);
  res.json(rows.rows);
});

app.post('/api/friends/request', authMiddleware, async (req, res) => {
  const { username } = req.body;
  const user = await query('SELECT id FROM users WHERE username = $1', [username]);
  if (!user.rows[0]) return res.status(404).json({ error: 'User not found' });
  const edge = await query(
    'INSERT INTO friend_edges (requester_id, addressee_id, status) VALUES ($1,$2,$3) RETURNING *',
    [req.user.id, user.rows[0].id, 'pending']
  );
  res.status(201).json(edge.rows[0]);
});

app.post('/api/admin/ban', authMiddleware, async (req, res) => {
  const { serverId, userId, reason } = req.body;
  const client = await pool.connect();
  const allowed = await hasPermission(client, serverId, req.user.id, PERMISSIONS.BAN_MEMBERS);
  if (!allowed) return res.status(403).json({ error: 'Missing permission' });
  await client.query('INSERT INTO bans (server_id, user_id, reason, banned_by) VALUES ($1,$2,$3,$4)', [serverId, userId, reason, req.user.id]);
  await client.query('DELETE FROM server_members WHERE server_id = $1 AND user_id = $2', [serverId, userId]);
  client.release();
  res.json({ ok: true });
});

io.use((socket, next) => {
  socket.userId = Number(socket.handshake.auth.userId || 0);
  next();
});

io.on('connection', (socket) => {
  socket.on('channel:join', (channelId) => {
    socket.join(`channel:${channelId}`);
  });

  socket.on('typing:start', (payload) => {
    socket.to(`channel:${payload.channelId}`).emit('typing:update', payload);
  });

  socket.on('voice:join', (payload) => {
    socket.join(`voice:${payload.channelId}`);
    io.to(`voice:${payload.channelId}`).emit('voice:state', { userId: socket.userId, speaking: false, muted: false, deafened: false });
  });

  socket.on('voice:update', (payload) => {
    io.to(`voice:${payload.channelId}`).emit('voice:state', { userId: socket.userId, ...payload });
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`ChatForge server on ${PORT}`));
