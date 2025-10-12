# ---- Build stage -------------------------------------------------
FROM node:20-alpine AS build

# Create app directory
WORKDIR /app

# Install build‑time dependencies (all of them)
COPY package*.json ./
RUN npm ci           

# -------------------------------------------------
# SECOND INSTALL – clean first, then add the extras
# -------------------------------------------------
RUN rm -rf node_modules && \
    npm install bcryptjs@3.0.2 jsonwebtoken@9.0.2 jws@3.2.2 jwa@1.4.1 buffer-equal-constant-time@1.0.1 ecdsa-sig-formatter@1.0.11 lodash.includes@4.3.0 lodash.isboolean@3.0.3 lodash.debounce@4.0.8 lodash.isinteger@4.0.4 lodash.isnumber@3.0.3 lodash.isplainobject@4.0.6 lodash.isstring@4.0.1 lodash.once@4.1.1 --save-prod

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
