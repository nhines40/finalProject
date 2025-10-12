# -------------------------------------------------
# 1️⃣  Build stage – install everything we need
# -------------------------------------------------
FROM node:20-alpine AS build

# Install native‑build toolchain for ws (and any other native modules)
RUN apk add --no-cache \
        python3 \
        build-base

WORKDIR /app

# Install all deps (dev + prod) from lock file
COPY package*.json ./
RUN npm ci

# Optional safety‑net – guarantees the two libs are present
RUN npm install bcryptjs@3.0.2 --save-prod
RUN npm install ws@7.5.3 --save-prod

# Copy the application source
COPY . .

# -------------------------------------------------
# 2️⃣  Runtime stage – tiny image that only runs the app
# -------------------------------------------------
FROM node:20-alpine

WORKDIR /app

# Bring the **exact** node_modules tree from the build stage
COPY --from=build /app/node_modules ./node_modules

# Copy only the runtime artefacts you need
COPY --from=build /app/server ./server
COPY --from=build /app/public ./public
COPY --from=build /app/package*.json ./

# Expose the port the server listens on
EXPOSE 3000

# Run as a non‑root user (safer)
RUN addgroup app && adduser -S -G app app
USER app

ENV PORT=3000

# Start the server
CMD ["node", "server/server.js"]
