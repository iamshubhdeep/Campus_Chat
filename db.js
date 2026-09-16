// Tiny JSON-file "database". No native modules, no external DB server —
// just reads/writes data.json. Good enough for a class project; swap for
// a real database later if you need concurrent writers or bigger scale.
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.json');
const DEFAULT_ROOMS = ['general', 'random', 'help'];
const MAX_HISTORY_PER_ROOM = 200; // keep the file from growing forever

function load() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = { rooms: {} };
    DEFAULT_ROOMS.forEach((r) => (initial.rooms[r] = { messages: [] }));
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (err) {
    console.error('data.json was corrupt, starting fresh:', err.message);
    const initial = { rooms: {} };
    DEFAULT_ROOMS.forEach((r) => (initial.rooms[r] = { messages: [] }));
    return initial;
  }
}

let state = load();
let saveTimer = null;

function persist() {
  // Debounce writes so a burst of messages doesn't hammer the disk.
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2));
  }, 200);
}

function ensureRoom(room) {
  if (!state.rooms[room]) state.rooms[room] = { messages: [] };
  return state.rooms[room];
}

function listRooms() {
  return Object.keys(state.rooms);
}

function getHistory(room, limit = 50) {
  const r = ensureRoom(room);
  return r.messages.slice(-limit);
}

function addMessage(room, msg) {
  const r = ensureRoom(room);
  r.messages.push(msg);
  if (r.messages.length > MAX_HISTORY_PER_ROOM) {
    r.messages = r.messages.slice(-MAX_HISTORY_PER_ROOM);
  }
  persist();
}

module.exports = { listRooms, getHistory, addMessage, ensureRoom };
