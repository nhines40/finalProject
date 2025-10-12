/* --------------------------------------------------------------
   server.js – minimal fixes only (keeps the original style)
   -------------------------------------------------------------- */
const express    = require('express');
const axios      = require('axios');
const mongoose   = require('mongoose');
const bcryptjs   = require('bcryptjs');       // you already used this
const https      = require('https');
const bodyParser = require('body-parser');
const jwt        = require('jsonwebtoken'); // <-- needed for JWT
const crypto     = require('crypto');       // <-- needed for auto‑generated secret

// ----- NEW: HTTP + Socket.IO -------------------------------------------------
const http       = require('http');
const { Server: SocketIOServer } = require('socket.io');

const app = express();
app.use(bodyParser.json());

// -------------------------------------------------
// 1️⃣  Configuration (defaults for local dev)
// -------------------------------------------------
const MONGO_URI = process.env.MONGO_URI ||
                  'mongodb://127.0.0.1:27017/todo-app';
const port      = process.env.PORT || 3000;

// -------------------------------------------------
// 2️⃣  JWT secret – env var or temporary generated one
// -------------------------------------------------
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  JWT_SECRET = crypto.randomBytes(64).toString('hex');
  console.warn('⚠️  No JWT_SECRET supplied – using a temporary secret for this session.');
}

// -------------------------------------------------
// 3️⃣  MongoDB connection
// -------------------------------------------------
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log(`✅ Connected to MongoDB (${MONGO_URI})`))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// -------------------------------------------------
// 4️⃣  Schemas
// -------------------------------------------------
const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true }   // bcrypt hash
});

userSchema.methods.isValidPassword = function (plain) {
  return bcryptjs.compare(plain, this.password);
};

const todoSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:     { type: String, required: true },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Todo = mongoose.model('Todo', todoSchema);

// -------------------------------------------------
// 5️⃣  Axios HTTPS config (kept from your old file)
// -------------------------------------------------
axios.defaults.httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

// -------------------------------------------------
// 6️⃣  Socket.IO server (replaces ws)
// -------------------------------------------------
const httpServer = http.createServer(app);               // <-- use the same Express app
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

io.on('connection', socket => {
  console.log('🔌 Socket.IO client connected (id =', socket.id, ')');

  socket.on('message', msg => {
    console.log(`📨 Received message => ${msg}`);
    // broadcast to everyone else
    socket.broadcast.emit('message', msg);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Socket.IO client disconnected (id =', socket.id, ')');
  });
});

// -------------------------------------------------
// 7️⃣  JWT helpers
// -------------------------------------------------
function generateToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function protect(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer '))
    return res.status(401).json({ msg: 'No token supplied' });

  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.id;
    next();
  } catch {
    res.status(401).json({ msg: 'Invalid token' });
  }
}

/* -----------------------------------------------------------------
   The rest of the file (auth routes, todo CRUD, static serving, etc.)
   stays exactly the same – you only swapped out `ws` for Socket.IO.
   ----------------------------------------------------------------- */

// ---------- 8️⃣  Auth routes ----------
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ msg: 'Email already taken' });

    const passwordHash = await bcryptjs.hash(password, 10);
    const user = await User.create({ name, email, password: passwordHash });

    const token = generateToken(user);
    res.status(201).json({ token, user: { id: user._id, name, email } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ msg: 'Bad credentials' });

    const ok = await user.isValidPassword(password);
    if (!ok) return res.status(401).json({ msg: 'Bad credentials' });

    const token = generateToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: 'Server error' });
  }
});

/* ---------- 9️⃣  Todo CRUD (protected) ---------- */
app.get('/api/todos', protect, async (req, res) => {
  const todos = await Todo.find({ user: req.userId }).sort({ createdAt: -1 });
  res.json(todos);
});

app.post('/api/todos', protect, async (req, res) => {
  const { title } = req.body;
  const todo = await Todo.create({ user: req.userId, title });
  res.status(201).json(todo);
});

app.put('/api/todos/:id', protect, async (req, res) => {
  const { title, completed } = req.body;
  const todo = await Todo.findOneAndUpdate(
    { _id: req.params.id, user: req.userId },
    { $set: { title, completed } },
    { new: true }
  );
  if (!todo) return res.status(404).json({ msg: 'Todo not found' });
  res.json(todo);
});

app.delete('/api/todos/:id', protect, async (req, res) => {
  const todo = await Todo.findOneAndDelete({
    _id: req.params.id,
    user: req.userId,
  });
  if (!todo) return res.status(404).json({ msg: 'Todo not found' });
  res.json({ msg: 'Deleted' });
});

/* ---------- 10️⃣  Serve static front‑end ---------- */
app.use(express.static('public'));

/* ---------- 11️⃣  Start the server ---------- */
// NOTE: we start the *httpServer* that also hosts Socket.IO
httpServer.listen(port, () => {
  console.log(`🚀 Server started on http://localhost:${port}`);
});
