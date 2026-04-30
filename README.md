# ForgeTrack

> Attendance & Class Material Tracker for The Forge AI-ML Engineering Bootcamp

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.local.example .env.local
# Edit .env.local and fill in your Supabase URL, anon key, and Gemini API key

# 3. Start the dev server
npm run dev

# 4. Open http://localhost:5173/dev-tokens
# Verify the design system renders correctly (Phase 0 gate)
```

## Phase 1: Database Setup

This project uses a MongoDB database. To initialize the database with seed data:

1. Ensure your MongoDB connection string is set in `backend/.env`.
2. Run the seed script:
```bash
cd backend
npm install
node seed.js
```

## Creating User Accounts (Phase 1)

Students and mentors are authenticated via custom JWT authentication. You can generate the required test accounts by running the custom users script:

```bash
cd backend
node add_custom_users.js
```

This script will automatically create:

### Mentor Account
- Email: `mentor_test@forgetrack.com`
- Password: `password123`

### Test Student Account
- USN: `4SF21CS001`
- Password: `password123`

## Environment Variables

You need to configure environment variables for both the backend and frontend.

**Backend (`backend/.env`):**
| Variable | Description |
|---|---|
| `MONGO_URI` | Your MongoDB connection string |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `PORT` | Backend server port (default: 5000) |
| `GEMINI_API_KEY` | Google Gemini API key (needed for Phase 4 CSV agent) |

**Frontend (`frontend/.env.local`):**
| Variable | Description |
|---|---|
| `VITE_API_URL` | URL of the backend API (e.g., `http://localhost:5000/api`) |

## Build Phases

| Phase | Status | Description |
|---|---|---|
| P0 | ✅ Complete | Vite scaffold, design tokens, `/dev-tokens` test page |
| P1 | ✅ Complete | Schema, RLS, seed data (SQL files ready for execution) |
| P2 | ⏳ Next | App shell, router, login screen, role-aware nav |
| P3 | ⏳ | Mentor CRUD: Dashboard, Mark Attendance, History, Materials |
| P4 | ⏳ | CSV Import AI Agent (Gemini) |
| P5 | ⏳ | Student Portal |
| P6 | ⏳ | Polish & Acceptance |

## Tech Stack

- **Frontend**: React 19 + Vite
- **Styling**: Tailwind CSS v3 + CSS custom properties
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **CSV Parsing**: PapaParse (CSV) + SheetJS (XLSX)
- **AI Agent**: Google Gemini 2.0 Flash
- **Icons**: Lucide React
- **Fonts**: Satoshi (Fontshare) + Inter + JetBrains Mono (Google Fonts)
