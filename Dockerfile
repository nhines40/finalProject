# ---- Build stage -------------------------------------------------
FROM node:20-alpine AS build

# Create app directory
WORKDIR /app

# Install build‑time dependencies (all of them)
COPY package*.json ./
RUN npm ci                     # <-- installs bcryptjs + everything else

# -----------------------------------------------------------------
# Safety‑net: force the two libraries we know are missing.
# If they are already present, this command is a no‑op; if they are
# missing (or under devDependencies) they will be added and saved
# to the image’s package.json (the change lives only inside the image).
# -----------------------------------------------------------------
RUN npm install bcryptjs@3.0.2 --save-prod 
RUN npm install ws@7.5.3 --save-prod

# Copy source code (your server, public files …)
COPY . .

# ---- Production stage --------------------------------------------
FROM node:20-alpine

WORKDIR /app

# Copy the *entire* node_modules folder from the build stage
# (this avoids a second npm install and guarantees the exact same
#  deps you built with.)
COPY --from=build /app/node_modules ./node_modules

# Copy only the runtime artefacts you need
COPY --from=build /app/server ./server
COPY --from=build /app/public ./public
COPY --from=build /app/package*.json ./

# No more npm install here – we already have everything.

# Expose the port the app runs on
EXPOSE 3000

# Use a non‑root user (optional but recommended)
RUN addgroup app && adduser -S -G app app
USER app

# Environment variables default (override at runtime)
ENV PORT=3000

# Start the server
CMD ["node", "server/server.js"]
