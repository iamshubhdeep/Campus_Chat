# Campus Chat

A real-time chat app with rooms, usernames, persistent message history, and
typing indicators. Built with Node.js, Express, and Socket.io.

## Run it

```
npm install
npm start
```

Then open http://localhost:3000 in a couple of browser tabs (or on two
different devices on the same network) to chat between them.

## How it works

- **server.js** — Express serves the static frontend; Socket.io handles all
  real-time events (joining a room, sending messages, typing indicators,
  presence/online-user tracking).
- **db.js** — a tiny JSON-file-backed store (`data.json`, created on first
  run). No database server to install — good for a class project, though
  you'd swap this for a real database (Postgres, SQLite via a driver, etc.)
  if you needed multiple server processes or heavier concurrent writes.
- **public/** — plain HTML/CSS/JS frontend, no build step. `client.js` holds
  all the Socket.io event handling on the browser side.

## Features

- Enter a username and a room name (or click one of the suggested rooms) to
  join
- Messages are broadcast to everyone in the same room in real time
- Message history persists to disk and reloads when you rejoin a room, even
  after restarting the server
- Typing indicators show when someone else in the room is composing a message
- A live sidebar shows who's currently online in the room
- System messages announce when someone joins or leaves

## Architecture notes worth knowing if you're asked about this

- Rooms are created on demand — typing a new room name and joining it creates
  it. Three rooms (`general`, `random`, `help`) exist by default.
- Presence (who's online) is tracked in memory per server process, not in
  `data.json` — that's intentional, since "who's online right now" isn't
  something you want stale after a restart.
- Message history is capped at 200 messages per room to keep `data.json`
  from growing indefinitely; older messages are dropped from the file (this
  is a place you'd add pagination or a real database if you needed more).
