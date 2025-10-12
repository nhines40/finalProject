# -------------------------------------------------
# 1️⃣  Build stage – install everything we need
# -------------------------------------------------
FROM node:20-alpine AS build

# Install the native‑build tool‑chain that node‑gyp (used by ws) needs.
#   - python3   : required by node‑gyp
#   - make, g++ : compiler tool‑chain
#   - libc-dev  : system headers (included in the meta‑package build-base)
RUN apk add --no-cache \
        python3 \
        build-base   # = make + gcc + g++ + libc-dev

WORKDIR /app

# Install **all** dependencies (dev + prod) from the lock file.
COPY package*.json ./
RUN npm ci                     # ws, bcryptjs, … are compiled here

# (Optional safety‑net – forces the two libs in case they are missing)
RUN npm install bcryptjs@3.0.2 --save-prod
RUN npm install ws@7.5.3        --save-prod

# Copy the rest of the source code
COPY . .

# -------------------------------------------------
# 2️⃣  Runtime stage – tiny image that only runs the app
# -------------------------------------------------
FROM node:20-alpine

WORKDIR /app

# Copy the **exact** node_modules that we just built.
COPY --from=build /app/node_modules ./node_modules

# Copy only the artefacts you need at runtime.
COPY --from=build /app/server ./server
COPY --from=build /app/public ./public
COPY --from=build /app/package*.json ./

EXPOSE 3000

# Run as a non‑root user (safer in production)
RUN addgroup app && adduser -S -G app app
USER app

ENV PORT=3000

CMD ["node", "server/server.js"]
