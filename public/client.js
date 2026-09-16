const socket = io();

// ----- elements -----
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const usernameInput = document.getElementById('username-input');
const roomInput = document.getElementById('room-input');
const joinBtn = document.getElementById('join-btn');
const loginError = document.getElementById('login-error');
const roomSuggestions = document.getElementById('room-suggestions');

const roomTitle = document.getElementById('room-title');
const leaveBtn = document.getElementById('leave-btn');
const userList = document.getElementById('user-list');
const userCount = document.getElementById('user-count');
const messagesEl = document.getElementById('messages');
const typingIndicator = document.getElementById('typing-indicator');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');

let myUsername = '';
let myRoom = '';
let typingTimeout = null;
const typingUsers = new Set();

// ----- login -----
socket.emit('list rooms');

socket.on('room list', (rooms) => {
  roomSuggestions.innerHTML = '';
  rooms.forEach((r) => {
    const chip = document.createElement('span');
    chip.className = 'room-chip';
    chip.textContent = `#${r}`;
    chip.addEventListener('click', () => { roomInput.value = r; });
    roomSuggestions.appendChild(chip);
  });
});

function attemptJoin() {
  const username = usernameInput.value.trim();
  const room = roomInput.value.trim();
  if (!username) { loginError.textContent = 'Enter a name.'; return; }
  if (!room) { loginError.textContent = 'Enter a room.'; return; }
  loginError.textContent = '';
  myUsername = username;
  myRoom = room.toLowerCase();
  socket.emit('join room', { username, room });
}

joinBtn.addEventListener('click', attemptJoin);
[usernameInput, roomInput].forEach((el) =>
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter') attemptJoin(); })
);

// ----- joined a room -----
socket.on('joined', ({ room, history }) => {
  myRoom = room;
  loginScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  roomTitle.textContent = `#${room}`;
  messagesEl.innerHTML = '';
  history.forEach(renderMessage);
  scrollToBottom();
  messageInput.focus();
});

leaveBtn.addEventListener('click', () => {
  location.reload(); // simplest, reliable way to fully reset client state
});

// ----- presence -----
socket.on('room users', (users) => {
  userCount.textContent = users.length;
  userList.innerHTML = '';
  users.forEach((u) => {
    const li = document.createElement('li');
    li.textContent = u;
    userList.appendChild(li);
  });
});

socket.on('system message', (text) => {
  const div = document.createElement('div');
  div.className = 'system-msg';
  div.textContent = text;
  messagesEl.appendChild(div);
  scrollToBottom();
});

// ----- messages -----
function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderMessage(msg) {
  const div = document.createElement('div');
  div.className = 'msg' + (msg.user === myUsername ? ' mine' : '');
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = `${msg.user} · ${formatTime(msg.ts)}`;
  const text = document.createElement('div');
  text.className = 'text';
  text.textContent = msg.text;
  div.appendChild(meta);
  div.appendChild(text);
  messagesEl.appendChild(div);
}

socket.on('chat message', (msg) => {
  renderMessage(msg);
  scrollToBottom();
});

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;
  socket.emit('chat message', { text });
  socket.emit('stop typing');
  clearTimeout(typingTimeout);
  messageInput.value = '';
});

// ----- typing indicator -----
messageInput.addEventListener('input', () => {
  socket.emit('typing');
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => socket.emit('stop typing'), 1500);
});

function renderTyping() {
  const names = Array.from(typingUsers);
  if (names.length === 0) { typingIndicator.textContent = ''; return; }
  if (names.length === 1) { typingIndicator.textContent = `${names[0]} is typing…`; return; }
  typingIndicator.textContent = `${names.join(', ')} are typing…`;
}

socket.on('typing', ({ user }) => { typingUsers.add(user); renderTyping(); });
socket.on('stop typing', ({ user }) => { typingUsers.delete(user); renderTyping(); });
