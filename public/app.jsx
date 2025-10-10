/* -------------------------------------------------------------
   public/app.js – React front‑end (notepad UI)
   ------------------------------------------------------------- */
const { useState, useEffect, useContext, createContext } = window.React;
const { createRoot } = window.ReactDOM;
const axios = window.axios;

// ---------- Axios instance with token handling ----------
const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ---------- Auth context ----------
const AuthContext = createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Load token on mount – decode payload (client‑side only)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUser({ id: payload.id, email: payload.email });
      } catch {
        localStorage.removeItem("token");
      }
    }
  }, []);

  const login = (token, userInfo) => {
    localStorage.setItem("token", token);
    setUser(userInfo);
  };
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/* -------------------------------------------------------------
   Register component
   ------------------------------------------------------------- */
function Register({ switchToLogin }) {
  const { login } = useContext(AuthContext);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/auth/register", form);
      login(data.token, data.user);
    } catch (err) {
      alert(err.response?.data?.msg || "Registration failed");
    }
  };

  return (
    <div className="card" style={{ maxWidth: "400px", margin: "auto" }}>
      <h2>Register</h2>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <input name="name" placeholder="Full name" value={form.name}
               onChange={handleChange} required />
        <input name="email" type="email" placeholder="Email" value={form.email}
               onChange={handleChange} required />
        <input name="password" type="password" placeholder="Password"
               value={form.password} onChange={handleChange} required />
        <button type="submit" style={{ background: "#ffb74d", border: "none", padding: "8px", cursor: "pointer" }}>
          Create account
        </button>
        <p>Already have an account? <a href="#" onClick={switchToLogin}>Log in</a></p>
      </form>
    </div>
  );
}

/* -------------------------------------------------------------
   Login component
   ------------------------------------------------------------- */
function Login({ switchToRegister }) {
  const { login } = useContext(AuthContext);
  const [form, setForm] = useState({ email: "", password: "" });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/auth/login", form);
      login(data.token, data.user);
    } catch (err) {
      alert(err.response?.data?.msg || "Login failed");
    }
  };

  return (
    <div className="card" style={{ maxWidth: "400px", margin: "auto" }}>
      <h2>Login</h2>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <input name="email" type="email" placeholder="Email" value={form.email}
               onChange={handleChange} required />
        <input name="password" type="password" placeholder="Password"
               value={form.password} onChange={handleChange} required />
        <button type="submit" style={{ background: "#ffb74d", border: "none", padding: "8px", cursor: "pointer" }}>
          Sign in
        </button>
        <p>No account? <a href="#" onClick={switchToRegister}>Register</a></p>
      </form>
    </div>
  );
}

/* -------------------------------------------------------------
   TodoList component – now inside a “notepad” container
   ------------------------------------------------------------- */
function TodoList() {
  const { logout } = useContext(AuthContext);
  const [todos, setTodos] = useState([]);
  const [newTitle, setNewTitle] = useState("");

  // Load the user's todos once after login
  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    const { data } = await api.get("/todos");
    setTodos(data);
  };

  const addTodo = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const { data } = await api.post("/todos", { title: newTitle });
    setTodos([data, ...todos]);
    setNewTitle("");
  };

  const toggleTodo = async (todo) => {
    const { data } = await api.put(`/todos/${todo._id}`, {
      completed: !todo.completed,
    });
    setTodos(todos.map(t => (t._id === todo._id ? data : t)));
  };

  const deleteTodo = async (todo) => {
    await api.delete(`/todos/${todo._id}`);
    setTodos(todos.filter(t => t._id !== todo._id));
  };

  return (
    <div className="notepad">
      <header className="todo-header">
        {/* Pencil icon – reliable CDN link */}
        <img
          src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/icons/pencil.svg"
          alt="pencil"
        />
        <h2 style={{ margin: 0 }}>My To‑Do List</h2>
        <button
          onClick={logout}
          style={{
            marginLeft: "auto",
            background: "#e57373",
            border: "none",
            padding: "4px 8px",
            cursor: "pointer",
            color: "#fff"
          }}
        >
          Log out
        </button>
      </header>
      <form onSubmit={addTodo}
            style={{ display: "flex", gap: "8px", margin: "12px 0" }}>
        <input value={newTitle}
               onChange={e => setNewTitle(e.target.value)}
               placeholder="New task..."
               style={{ flex: 1, padding: "6px" }}
               required />
        <button type="submit"
                style={{ background: "#81c784", border: "none", padding: "6px 12px", cursor: "pointer", color: "#fff" }}>
          Add
        </button>
      </form>

      {todos.length === 0 ? (
        <p className="empty-state">Your list is empty – start adding tasks!</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {todos.map(todo => (
            <li key={todo._id}
                className="todo-item"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  borderBottom: "1px solid #ddd"
                }}>
              <label>
                <input type="checkbox"
                       checked={todo.completed}
                       onChange={() => toggleTodo(todo)} />
                <span style={{
                  textDecoration: todo.completed ? "line-through" : "none",
                  color: todo.completed ? "#777" : "#000"
                }}>{todo.title}</span>
              </label>
              <button onClick={() => deleteTodo(todo)}
                      style={{ background: "transparent", border: "none", color: "#f44336", cursor: "pointer" }}>
                ✖
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------------------------------------
   Root component – switches between Auth screens & Todo UI
   ------------------------------------------------------------- */
function App() {
  const { user } = useContext(AuthContext);
  const [view, setView] = useState("login"); // "login" | "register"

  if (!user) {
    return view === "register"
      ? <Register switchToLogin={() => setView("login")} />
      : <Login    switchToRegister={() => setView("register")} />;
  }

  // Logged‑in → show the notepad‑styled Todo UI
  return <TodoList />;
}

/* -------------------------------------------------------------
   Render the SPA
   ------------------------------------------------------------- */
const root = createRoot(document.getElementById("root"));
root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
