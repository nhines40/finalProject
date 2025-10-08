// ---------------------------------------------------------------
// server/server.js – all back‑end in one file
// ---------------------------------------------------------------
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { WebSocketServer } from "ws";
import path from "path";
import { fileURLToPath } from "url";

// -------------------
// 1️⃣  Basic setup
// -------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(cors());
app.use(bodyParser.json());

// ---------------------------------------------------------------
// 2️⃣  Configuration defaults (no .env needed for local testing)
// ---------------------------------------------------------------
const MONGO_URI = process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/todo-app";  // local MongoDB
const PORT      = process.env.PORT || 3000;

// -------------------
// 3️⃣  JWT secret handling
// -------------------
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  // generate a cryptographically‑strong secret for this run only
  JWT_SECRET = crypto.randomBytes(64).toString("hex");
  console.warn("⚠️ No JWT_SECRET provided – using a temporary secret for this session.");
}

// -------------------
// 4️⃣  MongoDB connection
// -------------------
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log(`✅ Connected to MongoDB (${MONGO_URI})`))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ----------------------------------------------------------------
// 5️⃣  Mongoose schemas – Users + Todos (each todo belongs to a user)
// ----------------------------------------------------------------
const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true }   // bcrypt hash
});

userSchema.methods.isValidPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

const todoSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title:     { type: String, required: true },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);
const Todo = mongoose.model("Todo", todoSchema);

// ----------------------------------------------------------------
// 6️⃣  Helper: JWT generation & middleware
// ----------------------------------------------------------------
const generateToken = (user) =>
  jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

const protect = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer "))
    return res.status(401).json({ msg: "No token supplied" });

  const token = auth.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.id;   // attach user id for later use
    next();
  } catch {
    res.status(401).json({ msg: "Invalid token" });
  }
};

// ----------------------------------------------------------------
// 7️⃣  Auth routes – simple email / password (no OAuth)
// ----------------------------------------------------------------
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ msg: "Email already taken" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: passwordHash });

    const token = generateToken(user);
    res.status(201).json({ token, user: { id: user._id, name, email } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ msg: "Bad credentials" });

    const ok = await user.isValidPassword(password);
    if (!ok) return res.status(401).json({ msg: "Bad credentials" });

    const token = generateToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Server error" });
  }
});

// ----------------------------------------------------------------
// 8️⃣  Todo CRUD – all protected by `protect`
// ----------------------------------------------------------------
app.get("/api/todos", protect, async (req, res) => {
  const todos = await Todo.find({ user: req.userId }).sort({ createdAt: -1 });
  res.json(todos);
});

app.post("/api/todos", protect, async (req, res) => {
  const { title } = req.body;
  const todo = await Todo.create({ user: req.userId, title });
  res.status(201).json(todo);
});

app.put("/api/todos/:id", protect, async (req, res) => {
  const { title, completed } = req.body;
  const todo = await Todo.findOneAndUpdate(
    { _id: req.params.id, user: req.userId },
    { $set: { title, completed } },
    { new: true }
  );
  if (!todo) return res.status(404).json({ msg: "Todo not found" });
  res.json(todo);
});

app.delete("/api/todos/:id", protect, async (req, res) => {
  const todo = await Todo.findOneAndDelete({
    _id: req.params.id,
    user: req.userId,
  });
  if (!todo) return res.status(404).json({ msg: "Todo not found" });
  res.json({ msg: "Deleted" });
});

// ---------------------------------------------------------------
// 9️⃣  WebSocket server (optional – mirrors your original code)
// ---------------------------------------------------------------
const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (ws) => {
  console.log("🔌 WebSocket client connected");

  ws.on("message", (msg) => {
    // Simple broadcast – every other client receives the same message
    wss.clients.forEach((c) => {
      if (c !== ws && c.readyState === 1) c.send(msg);
    });
  });

  ws.on("close", () => console.log("❎ WebSocket client disconnected"));
});

// ---------------------------------------------------------------
// 10️⃣  Serve static React front‑end
// ---------------------------------------------------------------
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("*", (req, res) => {
  // For any SPA route, return the index page
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

// ---------------------------------------------------------------
// 11️⃣  Start the HTTP server
// ---------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server listening at http://localhost:${PORT}`);
  console.log(`📡 WebSocket listening on ws://localhost:8080`);
});
