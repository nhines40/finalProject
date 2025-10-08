// ---------------------------------------------------
// public/app.js – complete React front‑end (single file)
// ---------------------------------------------------

// Import React hooks from the UMD bundle
const { useState, useEffect, useContext, createContext } = React;
const { createRoot } = ReactDOM;

// ---------------------------------------------------
// API helper (axios instance)
// ---------------------------------------------------
const api = axios.create({
  baseURL: "/api", // relative to same host
});
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ---------------------------------------------------
// Auth Context
// ---------------------------------------------------
const AuthContext = createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Decode token (client‑side only) to get basic info
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

// ---------------------------------------------------
// Simple view switcher (no react‑router)
// ---------------------------------------------------
function App() {
  const { user } = useContext(AuthContext);
  const [view, setView] = useState("login"); // "login" | "register" | "todos"

  // Switch view based on authentication state
  if (!user) {
    return view === "register" ? (
      <Register switchToLogin={() => setView("login")} />
    ) : (
      <Login switchToRegister={() => setView("register")} />
    );
  }

  // Logged‑in – show To‑Do list
  return <TodoList />;
}

// ---------------------------------------------------
// Login component
// ---------------------------------------------------
function Login({ switchToRegister }) {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/auth/login", { email, password });
      login(data.token, data.user);
    } catch (err) {
      alert(err.response?.data?.msg || "Login failed");
    }
  };

  return (
    <div className="card bg-tan" style={{ maxWidth: "400px", margin: "auto" }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <input type="email" placeholder="Email" value={email}
               onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password}
               onChange={e => setPassword(e.target.value)} required />
        <button type="submit"
                style={{ background: "#ffb74d", border: "none", padding: "8px", cursor: "pointer" }}>
          Sign In
        </button>
        <p>
          No account? <a href="#" onClick={switchToRegister}>Register</a>
        </p>
      </form>
    </div>
  );
}

// ---------------------------------------------------
// Register component
// ---------------------------------------------------
function Register({ switchToLogin }) {
  const { login } = useContext(AuthContext);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/auth/register", { name, email, password });
      login(data.token, data.user);
    } catch (err) {
      alert(err.response?.data?.msg || "Registration failed");
    }
  };

  return (
    <div className="card bg-tan" style={{ maxWidth: "400px", margin: "auto" }}>
      <h2>Register</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <input placeholder="Full name" value={name}
               onChange={e => setName(e.target.value)} required />
        <input type="email" placeholder="Email" value={email}
               onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password}
               onChange={e => setPassword(e.target.value)} required />
        <button type="submit"
                style={{ background: "#ffb74d", border: "none", padding: "8px", cursor: "pointer" }}>
          Create Account
        </button>
        <p>
          Already have one? <a href="#" onClick={switchToLogin}>Login</a>
        </p>
      </form>
    </div>
  );
}

// ---------------------------------------------------
// Todo List component
// ---------------------------------------------------
function TodoList() {
  const { logout } = useContext(AuthContext);
  const [todos, setTodos] = useState([]);
  const [newTitle, setNewTitle] = useState("");

  // Load tasks once component mounts
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
    <div className="card bg-tan" style={{ maxWidth: "600px", margin: "auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>My To‑Do List</h2>
        <button onClick={logout}
                style={{ background: "#e57373", border: "none", padding: "4px 8px", cursor: "pointer" }}>
          Log out
        </button>
      </header>

      <form onSubmit={addTodo}
            style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <input value={newTitle}
               onChange={e => setNewTitle(e.target.value)}
               placeholder="New task..."
               style={{ flex: 1, padding: "6px" }}
               required />
        <button type="submit"
                style={{ background: "#81c784", border: "none", padding: "6px 12px", cursor: "pointer" }}>
          Add
        </button>
      </form>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {todos.map(todo => (
          <li key={todo._id}
              style={{ display: "flex", alignItems: "center",
                       justifyContent: "space-between",
                       padding: "6px 0", borderBottom: "1px solid #ddd" }}>
 <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input type="checkbox" checked={todo.completed}
                     onChange={() => toggleTodo(todo)} />
              <span style={{
                textDecoration: todo.completed ? "line-through" : "none",
                color: todo.completed ? "#777" : "#000"
              }}>{todo.title}</span>
            </label>
            <button onClick={() => deleteTodo(todo)}
                    style={{ background: "transparent", border: "none",
                             color: "#f44336", cursor: "pointer" }}>
              ✖
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------
// Render
// ---------------------------------------------------
const root = createRoot(document.getElementById("root"));
root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
