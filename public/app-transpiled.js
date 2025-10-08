(() => {
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });

  // public/app.jsx
  var import_react_development = __require("https://unpkg.com/react@18/umd/react.development.js");
  var import_react_dom_development = __require("https://unpkg.com/react-dom@18/umd/react-dom.development.js");
  var api = axios.create({ baseURL: "/api" });
  api.interceptors.request.use((cfg) => {
    const token = localStorage.getItem("token");
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
  });
  var AuthContext = (0, import_react_development.createContext)();
  function AuthProvider({ children }) {
    const [user, setUser] = (0, import_react_development.useState)(null);
    (0, import_react_development.useEffect)(() => {
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
    return /* @__PURE__ */ React.createElement(AuthContext.Provider, { value: { user, login, logout } }, children);
  }
  function Register({ switchToLogin }) {
    const { login } = (0, import_react_development.useContext)(AuthContext);
    const [form, setForm] = (0, import_react_development.useState)({ name: "", email: "", password: "" });
    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
    const submit = async (e) => {
      e.preventDefault();
      try {
        const { data } = await api.post("/auth/register", form);
        login(data.token, data.user);
      } catch (err) {
        alert(err.response?.data?.msg || "Registration failed");
      }
    };
    return /* @__PURE__ */ React.createElement("div", { className: "card", style: { maxWidth: "400px", margin: "auto" } }, /* @__PURE__ */ React.createElement("h2", null, "Register"), /* @__PURE__ */ React.createElement("form", { onSubmit: submit, style: { display: "flex", flexDirection: "column", gap: "8px" } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        name: "name",
        placeholder: "Full name",
        value: form.name,
        onChange: handleChange,
        required: true
      }
    ), /* @__PURE__ */ React.createElement(
      "input",
      {
        name: "email",
        type: "email",
        placeholder: "Email",
        value: form.email,
        onChange: handleChange,
        required: true
      }
    ), /* @__PURE__ */ React.createElement(
      "input",
      {
        name: "password",
        type: "password",
        placeholder: "Password",
        value: form.password,
        onChange: handleChange,
        required: true
      }
    ), /* @__PURE__ */ React.createElement("button", { type: "submit", style: { background: "#ffb74d", border: "none", padding: "8px", cursor: "pointer" } }, "Create account"), /* @__PURE__ */ React.createElement("p", null, "Already have an account? ", /* @__PURE__ */ React.createElement("a", { href: "#", onClick: switchToLogin }, "Log in"))));
  }
  function Login({ switchToRegister }) {
    const { login } = (0, import_react_development.useContext)(AuthContext);
    const [form, setForm] = (0, import_react_development.useState)({ email: "", password: "" });
    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
    const submit = async (e) => {
      e.preventDefault();
      try {
        const { data } = await api.post("/auth/login", form);
        login(data.token, data.user);
      } catch (err) {
        alert(err.response?.data?.msg || "Login failed");
      }
    };
    return /* @__PURE__ */ React.createElement("div", { className: "card", style: { maxWidth: "400px", margin: "auto" } }, /* @__PURE__ */ React.createElement("h2", null, "Login"), /* @__PURE__ */ React.createElement("form", { onSubmit: submit, style: { display: "flex", flexDirection: "column", gap: "8px" } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        name: "email",
        type: "email",
        placeholder: "Email",
        value: form.email,
        onChange: handleChange,
        required: true
      }
    ), /* @__PURE__ */ React.createElement(
      "input",
      {
        name: "password",
        type: "password",
        placeholder: "Password",
        value: form.password,
        onChange: handleChange,
        required: true
      }
    ), /* @__PURE__ */ React.createElement("button", { type: "submit", style: { background: "#ffb74d", border: "none", padding: "8px", cursor: "pointer" } }, "Sign in"), /* @__PURE__ */ React.createElement("p", null, "No account? ", /* @__PURE__ */ React.createElement("a", { href: "#", onClick: switchToRegister }, "Register"))));
  }
  function TodoList() {
    const { logout } = (0, import_react_development.useContext)(AuthContext);
    const [todos, setTodos] = (0, import_react_development.useState)([]);
    const [newTitle, setNewTitle] = (0, import_react_development.useState)("");
    (0, import_react_development.useEffect)(() => {
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
        completed: !todo.completed
      });
      setTodos(todos.map((t) => t._id === todo._id ? data : t));
    };
    const deleteTodo = async (todo) => {
      await api.delete(`/todos/${todo._id}`);
      setTodos(todos.filter((t) => t._id !== todo._id));
    };
    return /* @__PURE__ */ React.createElement("div", { className: "card", style: { maxWidth: "600px", margin: "auto" } }, /* @__PURE__ */ React.createElement("header", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("h2", null, "My To\u2011Do List"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: logout,
        style: { background: "#e57373", border: "none", padding: "4px 8px", cursor: "pointer" }
      },
      "Log out"
    )), /* @__PURE__ */ React.createElement(
      "form",
      {
        onSubmit: addTodo,
        style: { display: "flex", gap: "8px", margin: "12px 0" }
      },
      /* @__PURE__ */ React.createElement(
        "input",
        {
          value: newTitle,
          onChange: (e) => setNewTitle(e.target.value),
          placeholder: "New task...",
          style: { flex: 1, padding: "6px" },
          required: true
        }
      ),
      /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "submit",
          style: { background: "#81c784", border: "none", padding: "6px 12px", cursor: "pointer" }
        },
        "Add"
      )
    ), /* @__PURE__ */ React.createElement("ul", { style: { listStyle: "none", padding: 0 } }, todos.map((todo) => /* @__PURE__ */ React.createElement(
      "li",
      {
        key: todo._id,
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 0",
          borderBottom: "1px solid #ddd"
        }
      },
      /* @__PURE__ */ React.createElement("label", { style: { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" } }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "checkbox",
          checked: todo.completed,
          onChange: () => toggleTodo(todo)
        }
      ), /* @__PURE__ */ React.createElement("span", { style: {
        textDecoration: todo.completed ? "line-through" : "none",
        color: todo.completed ? "#777" : "#000"
      } }, todo.title)),
      /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => deleteTodo(todo),
          style: { background: "transparent", border: "none", color: "#f44336", cursor: "pointer" }
        },
        "\u2716"
      )
    ))));
  }
  function App() {
    const { user } = (0, import_react_development.useContext)(AuthContext);
    const [view, setView] = (0, import_react_development.useState)("login");
    if (!user) {
      return view === "register" ? /* @__PURE__ */ React.createElement(Register, { switchToLogin: () => setView("login") }) : /* @__PURE__ */ React.createElement(Login, { switchToRegister: () => setView("register") });
    }
    return /* @__PURE__ */ React.createElement(TodoList, null);
  }
  var root = (0, import_react_dom_development.createRoot)(document.getElementById("root"));
  root.render(
    /* @__PURE__ */ React.createElement(AuthProvider, null, /* @__PURE__ */ React.createElement(App, null))
  );
})();
