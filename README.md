# ONECOOLIE — Unified Railway Station Assistance Platform

ONECOOLIE is a production-grade digital platform modernizing railway station assistance, luggage porterage (Sahayak/Coolie), wheelchair mobility escort, and last-mile platform transfers across Indian Railways stations.

---

## 🏗 System Architecture

The repository is structured with clean separation between frontend, backend, documentation, and database schema:

```text
ONECOOLIE/
│
├── client/                     # FRONTEND (React 19 + Vite + TailwindCSS)
│   ├── src/
│   │   ├── api/                # Pre-configured Axios instance with JWT interceptors
│   │   ├── assets/             # Brand logos and optimized high-res visual assets
│   │   ├── components/         # Modular UI components (ActiveBooking, PaymentModal, TrainLoader, etc.)
│   │   │   ├── admin/          # Ops console, payouts, station-desk, incident components
│   │   │   ├── cancellation/   # Authoritative cancellation & rebooking modal suite
│   │   │   ├── journey/        # Station selection, train cards, journey progress
│   │   │   └── support/        # Help center, ticket tracking, AI assistant chat, inbox
│   │   ├── config/             # Supabase client & environment configuration
│   │   ├── context/            # AuthContext, LanguageContext, ThemeContext, ProfileMenu
│   │   ├── pages/              # Routed views (Home, Passenger, Assistant, Admin, Help, etc.)
│   │   │   ├── active-sessions/# Admin active session security inspector
│   │   │   └── security-incidents/ # Admin security incident monitoring
│   │   ├── services/           # Desktop/mobile support handling & external bridge
│   │   ├── utils/              # Chat sync, audio alerts, Razorpay loader, support store
│   │   ├── App.jsx             # Route definitions & protected route guards
│   │   ├── index.css           # TailwindCSS configuration & design system tokens
│   │   └── main.jsx            # React root, Socket.IO client, error boundaries
│   ├── public/                 # Static assets, favicons, media graphics
│   ├── package.json            # Frontend dependencies
│   ├── vercel.json             # Vercel SPA routing rewrite configuration
│   └── vite.config.js          # Vite build & development proxy configuration
│
├── server/                     # BACKEND (Node.js + Express 5 + Socket.IO)
│   ├── src/
│   │   ├── config/             # DB client, Razorpay, RBAC, pricing, environment validator
│   │   ├── controllers/        # Auth, Bookings, Payments, Payouts, Admin, Support, Trains
│   │   ├── data/               # Station timetables, train database, audit journals
│   │   ├── middleware/         # JWT auth, RBAC guards, CSRF, rate-limiting, error handling
│   │   ├── routes/             # REST API routes mounted under /api/*
│   │   ├── services/           # Socket session manager, health checks, graceful shutdown
│   │   ├── utils/              # Structured logger, booking resolver, token generator
│   │   └── index.js            # Express app, Socket.IO server, graceful shutdown lifecycle
│   ├── scripts/                # Automated integration verification scripts
│   ├── test_cancellation_suite.js # Comprehensive 14-test cancellation & refund suite
│   ├── package.json            # Backend dependencies
│   ├── .env.example            # Backend environment variables template
│   └── nodemon.json            # Nodemon local development configuration
│
├── docs/                       # SYSTEM DOCUMENTATION & RUNBOOKS
│   ├── PROJECT_DOCUMENTATION.md          # Comprehensive architecture & API documentation
│   ├── PRODUCTION_DEPLOYMENT_CHECKLIST.md# Pre-flight deployment verification guide
│   ├── PRODUCTION_OPERATIONAL_RUNBOOK.md # Production monitoring & operations runbook
│   ├── DEPLOYMENT_SECURITY_CHECKLIST.md  # Security controls & audit verification
│   └── DISASTER_RECOVERY_RUNBOOK.md      # Disaster recovery & business continuity
│
├── 20260301_add_rbac.sql                     # RBAC database migration
├── supabase_complete_production_schema.sql  # Master database production schema
├── supabase_existing_database_upgrade.sql   # Database upgrade migration script
├── render.yaml                               # Render web service deployment configuration
├── package.json                              # Root orchestration & Render build/start scripts
└── README.md                                 # Project documentation
```

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **Supabase / PostgreSQL**: Running PostgreSQL instance with the schema applied

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/your-username/Railmitra-main.git
cd Railmitra-main

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Configure Environment Variables

#### Backend (`server/.env`)
Copy the template and fill in your credentials:
```bash
cp server/.env.example server/.env
```
Key variables:
- `PORT`: Server port (default `5000`)
- `NODE_ENV`: `development` | `production`
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SECRET_KEY`: Supabase service role secret key
- `JWT_SECRET`: Minimum 32-character secure secret
- `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`: Razorpay credentials

#### Frontend (`client/.env`)
Copy the template and fill in public endpoints:
```bash
cp client/.env.example client/.env
```
Key variables:
- `VITE_API_URL`: Backend API base URL (e.g., `http://localhost:5000/api`)
- `VITE_SOCKET_URL`: Backend WebSocket URL (e.g., `http://localhost:5000`)
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase publishable anonymous key
- `VITE_RAZORPAY_KEY_ID`: Razorpay public Key ID

---

## 💻 Development Commands

| Command | Working Directory | Description |
| :--- | :--- | :--- |
| `npm run dev` | `client/` | Start Vite frontend dev server on `http://localhost:5173` |
| `npm run build` | `client/` | Compile production frontend bundle into `client/dist/` |
| `npm run lint` | `client/` | Run high-speed OxLint code quality checker |
| `npm run dev` | `server/` | Start backend with Nodemon auto-reload on `http://localhost:5000` |
| `npm start` | `server/` | Run production backend server (`node src/index.js`) |
| `node test_cancellation_suite.js` | `server/` | Run full 14-test cancellation & refund test suite |
| `node scripts/test_payment_verification.js` | `server/` | Run automated payment lifecycle integration test |

---

## 🗄 Database Initialization & Migrations

1. Apply the master schema:
   ```bash
   psql -d <YOUR_DB_CONNECTION_STRING> -f supabase_complete_production_schema.sql
   ```
2. Apply the RBAC migration:
   ```bash
   psql -d <YOUR_DB_CONNECTION_STRING> -f 20260301_add_rbac.sql
   ```
3. For existing databases requiring an upgrade, run:
   ```bash
   psql -d <YOUR_DB_CONNECTION_STRING> -f supabase_existing_database_upgrade.sql
   ```

---

## 🌐 Deployment Architecture

| Layer | Platform | Configuration File | Domain / Target |
| :--- | :--- | :--- | :--- |
| **Frontend** | Vercel | `client/vercel.json` | `https://onecoolie.vercel.app` |
| **Backend API** | Render | `render.yaml` & root `package.json` | `https://onecoolie.onrender.com` |
| **Database** | Supabase | `supabase_complete_production_schema.sql` | Hosted PostgreSQL |
| **Payment Gateway** | Razorpay | Configured via `server/src/config/razorpay.js` | UPI QR, Cards, Netbanking |
| **Realtime Engine** | Socket.IO | Verified via JWT session middleware | WebSocket & Polling transports |

---

## 🛡 Security & Reliability Features

- **Strict Cryptographic Authentication**: HS256 JWT tokens with server-side session tracking (`public.user_sessions`), sid claim validation, and instant real-time revocation via WebSocket.
- **Fail-Safe RBAC**: Role-based access control isolating `passenger`, `assistant`, and `admin` scopes.
- **Dynamic Cancellation Engine**: Tier-based cancellation charges (100% refund for unassigned/schedule changes, 70% refund for voluntary cancellations, strict lock on in-service/completed trips).
- **Zero Demo Data in Production**: All dashboards dynamically load authentic database state; network errors show transparent error boundaries with retry mechanisms.
- **Graceful Shutdown**: Server handles `SIGTERM` and `SIGINT` with connection draining, active transaction completion, and socket disconnect notifications.

---

## 📖 Operational Documentation

Additional technical documentation is maintained in the [`docs/`](./docs/) directory:
- [System Architecture & Full API Reference](./docs/PROJECT_DOCUMENTATION.md)
- [Production Deployment Checklist](./docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md)
- [Production Operational Runbook](./docs/PRODUCTION_OPERATIONAL_RUNBOOK.md)
- [Deployment Security Checklist](./docs/DEPLOYMENT_SECURITY_CHECKLIST.md)
- [Disaster Recovery Runbook](./docs/DISASTER_RECOVERY_RUNBOOK.md)