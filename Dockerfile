# -------------------------------------------------
# 1️⃣  Builder stage – install all deps (including bcryptjs)
# -------------------------------------------------
FROM node:20-slim AS builder

# Install build‑tools just in case you ever need native modules
RUN apt-get update && apt-get install -y \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ---- Copy ONLY the package files first (helps Docker caching) ----
COPY package*.json ./

# Install **exact** versions from package‑lock (production only)
RUN npm ci --only=production

# ---- Now copy the rest of the source code ----
COPY . .

# (If you have a front‑end build step, run it here)
# RUN npm run build   # <-- uncomment if you bundle React

# -------------------------------------------------
# 2️⃣  Runtime stage – thin image, no build tools
# -------------------------------------------------
FROM node:20-slim AS runtime

WORKDIR /app

# Bring the already‑installed node_modules from the builder
COPY --from=builder /app/node_modules ./node_modules

# Copy the application source (built files are already there)
COPY --from=builder /app .

# Expose the port your server listens on
EXPOSE 3000

# Run as a non‑root user (safer in production)
RUN groupadd -r app && useradd -r -g app app
USER app

# Start the server – adjust the entry‑point if your file lives elsewhere
CMD ["node", "server/server.js"]
