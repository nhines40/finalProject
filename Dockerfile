# -------------------------------------------------
# 1️⃣  Build stage – install dependencies & compile (if any)
# -------------------------------------------------
FROM node:20-slim AS builder

# Install OS packages needed only for building native modules.
# (bcryptjs does NOT need any of these, but they are harmless and let you
#  switch back to native bcrypt later if you ever want to.)
RUN apt-get update && apt-get install -y \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# --------------  COPY ONLY LOCK & JSON FIRST  --------------
# This lets Docker cache the `npm ci` layer when only source files change.
COPY package*.json ./

# Install **exactly** the versions from package-lock.json.
# Use `npm ci` for reproducible installs.
RUN npm ci --only=production

# --------------  COPY THE SOURCE CODE  -----------------
COPY . .

# (Optional) If you have a front‑end build step, run it here.
# RUN npm run build   # <-- uncomment if you need it

# -------------------------------------------------
# 2️⃣  Production stage – only runtime files, no build tools
# -------------------------------------------------
FROM node:20-slim AS runtime

WORKDIR /app

# Copy the already‑installed node_modules from the builder stage.
COPY --from=builder /app/node_modules ./node_modules

# Copy the rest of the application code.
COPY --from=builder /app .

# Expose the port your server listens on (the same you use in code).
EXPOSE 3000

# Run as a non‑root user – safer in production.
RUN groupadd -r app && useradd -r -g app app
USER app

# Start the server – adjust the path if your entry point lives elsewhere.
CMD ["node", "server/server.js"]
