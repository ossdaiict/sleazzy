# Sleazzy

A full-stack venue slot booking system for university clubs and committees. Clubs can request meeting rooms, administrators can approve or reject bookings, and everyone gets a real-time view of the master schedule — no more double-bookings or email chains.

## Features

### Clubs
- **Global schedule** — see every approved booking across all venues at a glance
- **Slot booking** — request a venue with automatic conflict detection
- **Booking management** — track request status, edit pending bookings, submit post-event reports
- **Policy reference** — in-app access to booking rules and guidelines

### Administrators
- **Dashboard** — pending request count, approval stats, and quick actions
- **Request workflow** — review, approve, or reject bookings with optional email notifications
- **Master schedule** — filterable calendar view of all venues

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui (Radix UI) |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | Supabase (PostgreSQL + Auth) |
| **Notifications** | EmailJS (optional) |
| **Deployment** | Nginx, PM2, GitHub Actions CI/CD |

## Prerequisites

- **Node.js** v18+
- **npm**
- A [Supabase](https://supabase.com) project (free tier works)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/ossdaiict/sleazzy.git
cd sleazzy
```

### 2. Install dependencies

```bash
# Server
cd server && npm install

# Client
cd ../client && npm install
```

### 3. Configure environment variables

Copy the example files and fill in your values:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

**`server/.env`**

```env
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
PORT=4000

# Optional — EmailJS for approval notifications
EMAILJS_SERVICE_ID=
EMAILJS_TEMPLATE_ID=
EMAILJS_PUBLIC_KEY=
EMAILJS_PRIVATE_KEY=
APPROVAL_NOTIFY_EMAIL=
```

**`client/.env`**

```env
VITE_API_URL=http://localhost:4000
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

### 4. Seed the database (optional)

Populate the database with sample profiles, clubs, and venues:

```bash
cd server
npx ts-node seed.ts
```

### 5. Start development servers

```bash
# Terminal 1 — API server (localhost:4000)
cd server
npm run dev

# Terminal 2 — Frontend (localhost:5173)
cd client
npm run dev
```

## Project Structure

```
sleazzy/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/ui/   # shadcn/ui primitives
│   │   ├── lib/             # Shared utilities & composite components
│   │   ├── pages/           # Route-level pages
│   │   ├── App.tsx          # Router & layout
│   │   ├── types.ts         # Shared TypeScript types
│   │   └── constants.ts     # Static data (venues, categories)
│   ├── vite.config.ts
│   └── .env.example
│
├── server/                  # Express API
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── routes/          # Express route definitions
│   │   ├── services/        # Business logic
│   │   ├── middleware/       # Auth & request middleware
│   │   ├── types/           # Server-side types
│   │   ├── server.ts        # Entry point
│   │   └── supabaseClient.ts
│   ├── seed.ts              # Database seed script
│   └── .env.example
│
├── deploy.sh                # Production deployment script
├── ecosystem.config.js      # PM2 process config
├── nginx.conf               # Nginx reference config
├── DEPLOYMENT.md            # Ops & deployment guide
└── .github/workflows/       # CI/CD pipeline
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/health` | No | Health check |
| `GET` | `/api/venues` | No | List all venues |
| `GET` | `/api/clubs` | No | List all clubs |
| `GET` | `/api/public-bookings` | No | Approved bookings (public schedule) |
| `POST` | `/api/auth/register` | No | Register a new user |
| `GET` | `/api/auth/profile` | Yes | Current user profile |
| `POST` | `/api/bookings` | Yes | Create a booking request |
| `GET` | `/api/my-bookings` | Yes | Current user's bookings |
| `GET` | `/api/bookings/check-conflict` | Yes | Check venue/time conflicts |
| `*` | `/api/admin/*` | Admin | Admin management routes |

## Production Build

```bash
# Build the server
cd server
npm run build   # compiles to server/dist/
npm start       # runs the compiled server

# Build the client
cd client
npm run build   # outputs to client/dist/
npm run preview # preview the production bundle locally
```

For full VPS deployment instructions (Nginx, PM2, GitHub Actions), see [DEPLOYMENT.md](DEPLOYMENT.md).

## Contributing

Contributions are welcome! If you'd like to help improve Sleazzy:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m "Add my feature"`)
4. Push to your branch (`git push origin feature/my-feature`)
5. Open a Pull Request

Feel free to open an issue for bug reports, feature requests, or questions.

## License

This project is licensed under the [MIT License](LICENSE).
