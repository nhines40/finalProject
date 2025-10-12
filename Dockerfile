# -------------------------------------------------
# 1️⃣  Build stage – Debian‑based (no extra apk needed)
# -------------------------------------------------
FROM node:20-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

# (optional safety‑net – still works)
RUN npm install bcryptjs@3.0.2 --save-prod
RUN npm install ws@7.5.3        --save-prod

COPY . .

# -------------------------------------------------
# 2️⃣  Runtime stage – same base
# -------------------------------------------------
FROM node:20-slim

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server ./server
COPY --from=build /app/public ./public
COPY --from=build /app/package*.json ./

EXPOSE 3000
RUN addgroup app && adduser -S -G app app
USER app
ENV PORT=3000
CMD ["node", "server/server.js"]
