# Build stage: frontend (Vite)
FROM node:20-alpine AS client-builder

WORKDIR /build/client

# Build-time args for Vite (same origin in prod = empty API URL)
ARG VITE_API_URL=
ARG VITE_SUPABASE_URL=
ARG VITE_SUPABASE_ANON_KEY=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

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

ENV PORT=3006
ENV CLIENT_DIST_DIR=/app/client
EXPOSE 3006

WORKDIR /app/server
CMD ["node", "dist/server.js"]
