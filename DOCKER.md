# Docker deployment

Single image, **one port (3006)**. The backend serves both the API and the frontend static files.

## Build and run locally

```bash
# Build (VITE_API_URL can be empty when the FE is served from the same origin)
docker build -t sleazzy \
  --build-arg VITE_API_URL= \
  .

# Run (pass runtime env via a file)
docker run -p 3006:3006 --env-file ./server/.env sleazzy
```

The backend reads these runtime env vars (see `server/.env.example`):

| Var | Required | Notes |
|-----|----------|-------|
| `DATABASE_URL` | yes | Postgres connection string |
| `JWT_SECRET` | yes | Long random string |
| `NODE_ENV` | recommended | `production` in prod |
| `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY` | optional | Password reset & approval emails |
| `APPROVAL_NOTIFY_EMAIL` | optional | Approval notifications |

`PORT` (3006) and `CLIENT_DIST_DIR` are baked into the image — no need to set them.

- App + API: http://localhost:3006 (e.g. `/` for the app, `/api/health` for the API)

## GitHub Actions (CI/CD)

On push to `main` (or via manual "Run workflow"), the workflow:

1. **`build-and-push`** — builds the Docker image and pushes it to Docker Hub (`DOCKERHUB_USERNAME/sleazzy:latest` and `:<sha>`).
2. **`deploy`** — SSHes to the VPS, runs `docker pull` of `:latest`, removes the old `sleazzy` container, and starts a new one on port 3006 using `/root/sleazzy/.env` for runtime config.

### Required GitHub secrets

| Secret | Description |
|--------|-------------|
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token (Settings → Security → Access Tokens) |
| `VPS_HOST` | VPS IP or hostname |
| `VPS_USER` | SSH user (e.g. `root`) |
| `VPS_PASSWORD` | SSH password |
| `VPS_PORT` | Optional; default 22 |

> The frontend only uses `VITE_API_URL` (empty for same-origin). It does **not** use Supabase, so no `VITE_SUPABASE_*` / `SUPABASE_*` secrets are needed. (The `VITE_SUPABASE_*` build args still present in the `Dockerfile` and `deploy.yml` are unused leftovers.)

### VPS requirements

- Docker installed
- Port 3006 open
- A `/root/sleazzy/.env` file containing the backend runtime vars listed above (the `deploy` job passes it via `--env-file`)
