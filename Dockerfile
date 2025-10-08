# ---- Build stage -------------------------------------------------
FROM node:20-alpine AS build

# Create app directory
WORKDIR /app

# Install build‑time dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# ---- Production stage --------------------------------------------
FROM node:20-alpine

WORKDIR /app

# Copy only what we need from the build stage
COPY --from=build /app/package*.json ./
COPY --from=build /app/server ./server
COPY --from=build /app/public ./public

# Install only production deps
RUN npm ci --only=production

# Expose the port the app runs on
EXPOSE 3000

# Use a non‑root user (optional but recommended)
RUN addgroup app && adduser -S -G app app
USER app

# Environment variables default (override at runtime)
ENV PORT=3000

# Start the server
CMD ["node", "server/server.js"]
