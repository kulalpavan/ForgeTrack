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

Run the SQL files in Supabase SQL Editor **in this order**:

1. `supabase/schema.sql` — creates all 6 tables, constraints, triggers, helper functions
2. `supabase/rls.sql` — enables Row Level Security on all tables and sets policies
3. `supabase/seed.sql` — inserts 25 students, 15 sessions, attendance records, materials, and import log entries

After running, verify with the count check query at the bottom of `seed.sql`.

## Creating User Accounts (Phase 1)

Students and mentors are authenticated via Supabase Auth. After seeding:

### Mentor Account
In Supabase dashboard → Authentication → Users → Add user:
- Email: `mentor_test@forgetrack.com`
- Password: password123

Then insert their profile:
```sql
INSERT INTO public.users (id, email, role, display_name)
VALUES ('<auth-user-uuid>', 'nischay@theboringpeople.in', 'mentor', 'Nischay BK');
```

### Co-facilitator Account
- Email: `mentor_test@forgetrack.com`
- Same pattern as mentor.

### Test Student Account
- USN: `4SF21CS001`
- Password: `password123` (USN is default password, student prompted to change on first login)

Create via Supabase Auth → Add user, then run:
```sql
SELECT create_student_user_profile(
  '<auth-user-uuid>',
  '4SH24CS001@forge.local',
  1,  -- student_id from students table
  'Abhishek Sharma'
);
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public API key |
| `VITE_GEMINI_API_KEY` | Google Gemini API key (needed for Phase 4 CSV agent) |

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
