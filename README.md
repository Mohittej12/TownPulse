# TownPulse

Live, gamified engagement for townhalls, meetings, and workshops. Next.js (App Router) + TypeScript + Tailwind CSS + Framer Motion + lucide-react, backed by **Supabase** (PostgreSQL + Realtime) with seamless fallback support.

---

## Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Set up Supabase credentials in .env.local
# If omitted, the app will run seamlessly in local mock mode.
cp .env.example .env.local

# 3. Start local development server
npm run dev
```

Open `http://localhost:3000`. The 3 core roles:
- **Admin Builder** (`/admin`): Create quizzes, manage questions, launch live sessions.
- **Host Stage** (`/host/[sessionId]`): Projector / big-screen view with PIN, join QR code, countdown timer, animated results chart, leaderboard, and podium with confetti.
- **Participant** (`/join` -> `/play/[sessionId]`): Mobile phone view to join by PIN and submit fast color/shape answers.

---

## Step-by-Step Backend Setup in Supabase

Follow these steps from point one to connect your live Supabase backend:

### Step 1: Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and log in or create a free account.
2. Click **New Project**.
3. Choose an organization, enter a project name (e.g. `townpulse`), set a database password, and choose your preferred region.
4. Click **Create new project** and wait ~1-2 minutes for provisioning.

### Step 2: Run the SQL Schema Migration
1. In your Supabase project dashboard, open the **SQL Editor** tab from the left sidebar.
2. Click **+ New Query**.
3. Open the file [`supabase/schema.sql`](supabase/schema.sql) in this repository and copy all its contents.
4. Paste the SQL into the editor and click **Run** (or `Ctrl+Enter`).
5. This automatically creates:
   - Tables: `quizzes`, `questions`, `options`, `sessions`, `participants`, `responses`
   - Foreign key cascades and performance indexes
   - Row-Level Security (RLS) policies
   - Supabase Realtime publication setup
   - Seed data with demo quizzes

### Step 3: Verify Supabase Realtime is Enabled
1. Go to **Database** -> **Replication** (or **Database** -> **Publications**).
2. Under `supabase_realtime`, verify that the following tables are listed:
   - `sessions`
   - `participants`
   - `responses`
   *(If not listed, toggle the switch for these tables to enabled).*

### Step 4: Get Your Supabase API Keys
1. In the left sidebar, click the **Settings** (gear icon) -> **API**.
2. Copy two values:
   - **Project URL** (e.g. `https://xyzcompany.supabase.co`)
   - **Project API Keys** -> `anon` `public` key (e.g. `eyJhbGci...`)

### Step 5: Configure Local Environment
1. In the project root, open `.env.local`.
2. Paste your keys:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. Restart your dev server (`npm run dev`). Now all quizzes, sessions, and live multiplayer answers sync directly through your Supabase database in real-time!

---

## Deploying Frontend to Vercel

1. Push your code to GitHub / GitLab / Bitbucket:
   ```bash
   git add .
   git commit -m "Complete Supabase backend integration"
   git push origin main
   ```
2. Go to [https://vercel.com](https://vercel.com) and click **Add New...** -> **Project**.
3. Import your `townpulse` repository.
4. In the configuration screen, expand **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL`: (Your Supabase Project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (Your Supabase `anon` public key)
5. Click **Deploy**.
6. Once deployed, share your Vercel URL with participants to join from any device anywhere!

---

## Architecture & File Layout

```
app/
  page.tsx                             Landing / role picker
  admin/page.tsx                       Admin quiz dashboard (Supabase integrated)
  admin/quiz/new/page.tsx              New quiz builder
  admin/quiz/[quizId]/edit/page.tsx    Edit quiz builder
  host/[sessionId]/page.tsx            Projector view (lobby/question/results/leaderboard/podium)
  join/page.tsx, join/JoinForm.tsx     Participant join screen
  play/[sessionId]/page.tsx            Participant in-game screen
components/
  ui/primitives.tsx                    Button, Card, Badge
  quiz/OptionButton.tsx                The 4 color-coded shape buttons
  quiz/CountdownRing.tsx               SVG countdown ring
  quiz/QRCode.tsx                      Join QR code generator
  quiz/ParticipantTag.tsx              Bouncy lobby name tag
  quiz/AnswerBarChart.tsx              Animated results bars
  quiz/Leaderboard.tsx                 Top-N board with animated reordering
  quiz/Podium.tsx                      Final podium + confetti
  builder/QuestionEditor.tsx           Quiz builder form with Supabase save
context/
  QuizGameContext.tsx                  React context wired to supabaseSessionService
hooks/
  useHostSession.ts                    Host stage live state synchronization hook
  useParticipantSession.ts             Participant live state synchronization hook
  useCountdown.ts                      Shared countdown ring timing logic
lib/
  types.ts                             Data models (Quiz, GameSession, Participant, etc.)
  scoring.ts                           Speed-based scoring calculation
  supabaseClient.ts                    Supabase client initialization & config check
  services/quizService.ts              Quiz CRUD operations for Supabase
  services/sessionService.ts           Contract interface for game sessions
  services/supabaseSessionService.ts   Supabase Realtime + Postgres live multiplayer engine
  services/mockSessionService.ts       In-memory fallback engine
supabase/
  schema.sql                           Full PostgreSQL migration script
```
