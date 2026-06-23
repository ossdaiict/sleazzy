# Build stage: frontend (Vite)
FROM node:20-alpine AS client-builder

WORKDIR /build/client

# Build-time args for Vite (same origin in prod = empty API URL)
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

# Unique id for this build, baked into the client bundle. The server is given
# the same id (see below) so the running app can detect a stale cached bundle.
ARG BUILD_ID=
ENV VITE_BUILD_ID=$BUILD_ID

COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Build stage: backend (Express + TypeScript)
FROM node:20-alpine AS server-builder

WORKDIR /build/server

COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# Final stage: single service – BE serves API + FE static on one port
FROM node:20-alpine

WORKDIR /app

# Backend
COPY --from=server-builder /build/server/dist ./server/dist
COPY --from=server-builder /build/server/package.json ./server/
COPY --from=server-builder /build/server/node_modules ./server/node_modules

# Frontend dist copied into app (served by Express)
COPY --from=client-builder /build/client/dist ./client

# Same build id the client was compiled with, so getBuildVersion() reports a
# value the client can compare against (server.ts prefers BUILD_ID).
ARG BUILD_ID=
ENV BUILD_ID=$BUILD_ID

ENV PORT=3006
ENV CLIENT_DIST_DIR=/app/client
EXPOSE 3006

WORKDIR /app/server
CMD ["node", "dist/server.js"]
