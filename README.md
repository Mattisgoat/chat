# ChatForge — Discord-like Real-Time Web App

ChatForge is a full-stack Discord-inspired platform with:
- Authentication + profile settings
- Server/channel management
- Real-time text chat + typing indicator + emoji reactions
- Role-permission model + admin moderation endpoint
- Friend request graph
- Voice-presence socket events (join/mute/deafen/speaking state)
- Modern Discord-like three-column + member list layout
- Dark/light/auto theme scaffolding point and settings architecture

## Tech Stack
- **Frontend:** React + Vite + TailwindCSS
- **Backend:** Node.js + Express
- **Realtime:** Socket.io
- **Database:** PostgreSQL
- **Security:** bcrypt password hashing, JWT auth, Helmet, rate limiting, validation with Zod

## Project Structure

```text
chatforge/
├── client/
│   ├── src/
│   │   ├── components/AuthPanel.jsx
│   │   ├── pages/App.jsx
│   │   ├── lib/api.js
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/
│   ├── src/
│   │   ├── index.js
│   │   ├── auth.js
│   │   ├── db.js
│   │   └── permissions.js
│   └── package.json
├── db/
│   ├── schema.sql
│   └── seed.sql
└── README.md
```

## Database Setup

1. Create DB:
```bash
createdb chatforge
```

2. Run schema + seed:
```bash
psql postgres://postgres:postgres@localhost:5432/chatforge -f db/schema.sql
psql postgres://postgres:postgres@localhost:5432/chatforge -f db/seed.sql
```

## Environment Variables
Create `server/.env`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/chatforge
JWT_SECRET=super-secret-chatforge-key
PORT=4000
```

## Install & Run

```bash
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

## Sample Users
Both seeded users use password: `password123`

- `matt@example.com`
- `sara@example.com`

## Feature Coverage
- Accounts: signup/login/logout token flow, profile fields in schema
- Presence: online/idle/dnd/invisible/offline + custom status field
- Friends: pending/accepted/blocked model through `friend_edges`
- Servers: create/list, owner assignment, default channels
- Channels: text + voice channel records
- Messaging: send/fetch, mention booleans, reaction counts, typing indicator
- Roles/Permissions: owner/admin/mod/member modeled via `roles` + `role_permissions`
- Admin commands foundation: moderation endpoint (`/api/admin/ban`) checks permissions
- Notifications/unread/search/themes/settings: designed as extension points in current UI architecture

## Notes
This implementation is production-oriented scaffolding with many Discord-class capabilities fully wired (auth, servers, channels, messaging, reactions, typing, permissions, moderation ban endpoint) and a clear extension path for deeper features like WebRTC audio transport, slash command parser, GIF picker, and advanced notification routing.
