# SyncBoard 🎨

A real-time collaborative whiteboard — draw, chat, and design together live,
with everyone's strokes and cursors synced instantly over WebSockets.

No sign-up required: pick a name, share a room code, start drawing.

## How it's built

```
syncboard/
├── client/     Next.js 15 frontend (React, Tailwind, socket.io-client)
└── server/     Node.js + Express backend (Socket.IO for real-time sync)
```

**Frontend** (`/client`)
- `app/page.js` — lobby: enter your name + a room code
- `app/board/[roomId]/page.js` — the whiteboard route
- `components/CanvasBoard.jsx` — the core: canvas drawing + all Socket.IO wiring
- `components/Toolbar.jsx`, `ChatPanel.jsx`, `UsersPanel.jsx`, `Header.jsx` — UI pieces
- `lib/socket.js` — a singleton Socket.IO client connection
- `lib/colors.js` — shared color palette / brush sizes / id helper

**Backend** (`/server`)
- `server.js` — Express app + Socket.IO server, all real-time event handlers
- `rooms.js` — in-memory store: rooms, users, strokes, chat history

## How the real-time sync works

Every stroke is streamed in three events so everyone sees it appear live,
point by point, not just after you lift the pen:

| Event | When | Payload |
|---|---|---|
| `draw-start` | mouse/finger down | `{ id, points: [firstPoint], color, size }` |
| `draw-point` | mouse/finger moves | `{ id, point }` |
| `draw-end` | mouse/finger up | `{ id }` |

The server keeps an in-memory copy of every room's strokes so that when a
new person joins mid-session, they get the full board via a `board-state`
event instead of a blank canvas.

Other real-time events: `cursor-move` / `cursor-update` (live cursors),
`chat-message`, `undo` (removes your own last stroke), `clear-board`
(wipes the room for everyone), and `users-update` / `user-joined` /
`user-left` for presence.

## Shape tools

Line, rectangle, circle, and arrow tools live next to the pen in the
toolbar. Unlike freehand strokes (which stream point-by-point as you
draw), a shape is computed client-side from just a start and end point
(`lib/shapes.js`), previewed locally with a dashed outline while
dragging, then sent as one complete stroke on release — reusing the
exact same `draw-start` / `draw-end` events as freehand drawing, so the
backend needed no new endpoints for this.

An arrow is really three disconnected line segments (shaft + two head
strokes) bundled into one stroke object via a `segments` field, instead
of the single continuous `points` trail a pen stroke uses.

## Typing indicator

While someone types in chat, everyone else sees "*Name* is typing...".
The client emits a `typing` event on the first keystroke and a
`stop-typing` event 1.5s after the last one (or immediately on send).
Nothing is persisted — it's a live-only signal relayed by the server.

## Running it locally

You need two terminals — one for the backend, one for the frontend.

**1. Backend**
```bash
cd server
npm install
cp .env.example .env
npm run dev        # or: npm start
```
Runs on http://localhost:4000

**2. Frontend**
```bash
cd client
npm install
cp .env.local.example .env.local
npm run dev
```
Runs on http://localhost:3000

Open two browser tabs (or one normal + one incognito) at
`http://localhost:3000`, join the same room code in both, and draw —
you'll see it sync between them instantly.

## Going live

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full walkthrough: deploying
the backend to Render, the frontend to Vercel, and pointing a custom
domain at it.

## Ideas for what to build next

These aren't implemented yet, but the architecture leaves room for them:

- **Persistent storage** — swap the in-memory `rooms.js` store for Redis
  or a database so boards survive a server restart.
- **Resizable/draggable shapes** — swap the raw Canvas API for
  `react-konva` or `fabric.js` so shapes and sticky notes can be
  selected, moved, and resized after they're drawn instead of being
  permanent once placed.
- **Sticky notes & text boxes** — a new object type alongside strokes,
  synced the same way draw events are.
- **Infinite canvas** — pan and zoom, again easiest with `react-konva`.
- **Auth (optional)** — Clerk, Firebase Auth, or Supabase Auth if you
  ever want named accounts instead of "anyone can join freely."
