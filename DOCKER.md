# Docker deployment

Single image, **one port (3006)**. The backend serves both the API and the frontend static files.

## Build and run locally

```bash
# Build (VITE_API_URL can be empty when FE is served from same origin)
docker build -t sleazzy \
  --build-arg VITE_SUPABASE_URL=your_supabase_url \
  --build-arg VITE_SUPABASE_ANON_KEY=your_anon_key \
  .

# Run
docker run -p 3006:3006 \
  -e SUPABASE_URL=... \
  -e SUPABASE_SERVICE_ROLE_KEY=... \
  sleazzy
```

- App + API: http://localhost:3006 (e.g. `/` for app, `/api/health` for API)

## GitHub Actions (CI/CD)

On push to `main`, the workflow:

1. Builds the Docker image
2. Pushes to Docker Hub (`DOCKERHUB_USERNAME/sleazzy`)
3. SSHs to the VPS and runs `docker pull` + `docker run`

### Required GitHub secrets

| Secret | Description |
|--------|-------------|
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token (Settings → Security → Access Tokens) |
| `VPS_HOST` | VPS IP or hostname |
| `VPS_USER` | SSH user |
| `VPS_PASSWORD` | SSH password (or use key with `VPS_KEY`) |
| `VPS_PORT` | Optional; default 22 |
| `VITE_SUPABASE_URL` | Supabase project URL (for frontend build) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (for frontend build) |
| `SUPABASE_URL` | Same (for backend at runtime) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `EMAILJS_*`, `APPROVAL_NOTIFY_EMAIL` | Optional; for approval emails |

### VPS requirements

- Docker installed
- Port 3006 open
