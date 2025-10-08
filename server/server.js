// ---------------------------------------------------
// server/server.js – complete backend (single file)
// ---------------------------------------------------
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

dotenv.config();

// ------------------------------------------------------------------
// 1️⃣  Resolve __dirname (needed for static file serving)
// ------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// ------------------------------------------------------------------
// 2️⃣  Middleware
// ------------------------------------------------------------------
app.use(cors());
app.use(express.json());

// ------------------------------------------------------------------
// 3️⃣  Configuration – fall‑back defaults for local testing
// ------------------------------------------------------------------
const MONGO_URI =
  process.env.MONGO_URI ||
  // 👉 default: local MongoDB instance (Docker command in README works)
  "mongodb://127.0.0.1:27017/todo-app";

const PORT = process.env.PORT || 5000;

// ------------------------------------------------------------------
// 4️⃣  JWT secret handling
// ------------------------------------------------------------------
let JWT_SECRET = process.env.JWT_SECRET;

// If no secret is supplied we create one at runtime.
// This is **only** for development – every server restart will
// generate a new secret, thus invalidating existing tokens.
if (!JWT_SECRET) {
  JWT_SECRET = crypto.randomBytes(64).toString("hex");
  console.warn(
    "⚠️  No JWT_SECRET supplied – generated temporary secret for this session."
  );
  console.warn(`🗝️  Temporary secret: ${JWT_SECRET}`);
}

// ------------------------------------------------------------------
// 5️⃣  Connect to MongoDB
// ------------------------------------------------------------------
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log(`✅ Connected to MongoDB (${MONGO_URI})`))
  .catch((e) => console.error("❌ MongoDB connection error:", e));

// ------------------------------------------------------------------
// 6️⃣  Mongoose Schemas & Models
// ------------------------------------------------------------------
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
});
userSchema.methods.isValidPassword = function (pw) {
  return bcrypt.compare(pw, this.passwordHash);
};

const todoSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Todo = mongoose.model("Todo", todoSchema);

// ------------------------------------------------------------------
// 7️⃣  Helper functions for JWT
// ------------------------------------------------------------------
const generateToken = (user) =>
  jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
    expiresIn: "7d",
  });

export const protect = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer "))
    return res.status(401).json({ msg: "No token supplied" });

  const token = auth.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.id;
    next();
  } catch {
    res.status(401).json({ msg: "Invalid token" });
  }
};

// ------------------------------------------------------------------
// 8️⃣  Auth routes (register / login)
// ------------------------------------------------------------------
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const exists = await User.findOne({ email });
    if (exists)
      return res.status(409).json({ msg: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });

    const token = generateToken(user);
    res
      .status(201)
      .json({ token, user: { id: user._id, name, email } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ msg: "Bad credentials" });

    const ok = await user.isValidPassword(password);
    if (!ok) return res.status(401).json({ msg: "Bad credentials" });

    const token = generateToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Server error" });
  }
});

// ------------------------------------------------------------------
// 9️⃣  Todo CRUD routes (protected)
// ------------------------------------------------------------------
app.get("/api/todos", protect, async (req, res) => {
  const todos = await Todo.find({ user: req.userId }).sort({
    createdAt: -1,
  });
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
  if (!todo) return res.status(404).json({ msg: "Not found" });
  res.json(todo);
});

app.delete("/api/todos/:id", protect, async (req, res) => {
  const todo = await Todo.findOneAndDelete({
    _id: req.params.id,
    user: req.userId,
  });
  if (!todo) return res.status(404).json({ msg: "Not found" });
  res.json({ msg: "Deleted" });
});

// ------------------------------------------------------------------
// 10️⃣  Serve the React front‑end (public folder)
// ------------------------------------------------------------------
app.use(express.static(path.join(__dirname, "..", "public"))); // <-- public folder

// All unknown routes return the SPA entry point
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

// ------------------------------------------------------------------
// 11️⃣  Start the server
// ------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
