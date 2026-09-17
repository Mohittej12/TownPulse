-- ==============================================================================
-- TownPulse Supabase Schema Migration
-- ==============================================================================
-- Run this complete script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. TABLES

-- Quizzes table
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'live', 'archived')),
  created_at timestamptz not null default now(),
  last_run_at timestamptz
);

-- Questions table
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  position int not null,
  title text not null,
  time_limit_sec int not null check (time_limit_sec in (10, 20, 30))
);

-- Options table
create table if not exists public.options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.questions(id) on delete cascade not null,
  text text not null,
  color text not null check (color in ('red', 'blue', 'yellow', 'green')),
  is_correct boolean not null default false
);

-- Sessions table
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  owner_id uuid references auth.users(id) on delete set null,
  pin text unique not null,
  phase text not null default 'lobby' check (phase in ('lobby', 'question', 'results', 'leaderboard', 'podium')),
  current_question_index int not null default 0,
  question_started_at timestamptz,
  created_at timestamptz not null default now()
);

-- Participants table
create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade not null,
  name text not null,
  avatar text not null,
  score int not null default 0,
  streak int not null default 0,
  joined_at timestamptz not null default now()
);

-- Responses table
create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade not null,
  participant_id uuid references public.participants(id) on delete cascade not null,
  question_id uuid references public.questions(id) on delete cascade not null,
  option_id uuid references public.options(id) on delete cascade not null,
  response_time_ms int not null,
  correct boolean not null,
  points_awarded int not null,
  created_at timestamptz not null default now(),
  constraint unique_participant_question unique (participant_id, question_id)
);

-- 3. INDEXES FOR PERFORMANCE
create index if not exists idx_questions_quiz_id on public.questions(quiz_id, position);
create index if not exists idx_options_question_id on public.options(question_id);
create index if not exists idx_sessions_pin on public.sessions(pin);
create index if not exists idx_participants_session_id on public.participants(session_id);
create index if not exists idx_responses_session_id on public.responses(session_id);
create index if not exists idx_responses_question_id on public.responses(question_id);

-- 4. ROW LEVEL SECURITY (RLS)
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.options enable row level security;
alter table public.sessions enable row level security;
alter table public.participants enable row level security;
alter table public.responses enable row level security;

-- Quizzes policies
create policy "Allow all read access to quizzes" on public.quizzes
  for select using (true);
create policy "Allow all insert access to quizzes" on public.quizzes
  for insert with check (true);
create policy "Allow all update access to quizzes" on public.quizzes
  for update using (true);
create policy "Allow all delete access to quizzes" on public.quizzes
  for delete using (true);

-- Questions policies
create policy "Allow all read access to questions" on public.questions
  for select using (true);
create policy "Allow all insert access to questions" on public.questions
  for insert with check (true);
create policy "Allow all update access to questions" on public.questions
  for update using (true);
create policy "Allow all delete access to questions" on public.questions
  for delete using (true);

-- Options policies
create policy "Allow all read access to options" on public.options
  for select using (true);
create policy "Allow all insert access to options" on public.options
  for insert with check (true);
create policy "Allow all update access to options" on public.options
  for update using (true);
create policy "Allow all delete access to options" on public.options
  for delete using (true);

-- Sessions policies
create policy "Allow all read access to sessions" on public.sessions
  for select using (true);
create policy "Allow all insert access to sessions" on public.sessions
  for insert with check (true);
create policy "Allow all update access to sessions" on public.sessions
  for update using (true);
create policy "Allow all delete access to sessions" on public.sessions
  for delete using (true);

-- Participants policies
create policy "Allow all read access to participants" on public.participants
  for select using (true);
create policy "Allow all insert access to participants" on public.participants
  for insert with check (true);
create policy "Allow all update access to participants" on public.participants
  for update using (true);
create policy "Allow all delete access to participants" on public.participants
  for delete using (true);

-- Responses policies
create policy "Allow all read access to responses" on public.responses
  for select using (true);
create policy "Allow all insert access to responses" on public.responses
  for insert with check (true);
create policy "Allow all update access to responses" on public.responses
  for update using (true);
create policy "Allow all delete access to responses" on public.responses
  for delete using (true);

-- 5. REALTIME REPLICATION SETUP
-- Enable Realtime publication for tables that need live client sync
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.participants;
alter publication supabase_realtime add table public.responses;

-- 6. INITIAL SEED DATA (Demo Quizzes)
do $$
declare
  v_quiz_id uuid := 'a1111111-1111-1111-1111-111111111111';
  v_q1_id uuid := 'b1111111-1111-1111-1111-111111111111';
  v_q2_id uuid := 'b2222222-2222-2222-2222-222222222222';
  v_q3_id uuid := 'b3333333-3333-3333-3333-333333333333';
  v_q4_id uuid := 'b4444444-4444-4444-4444-444444444444';
  v_q5_id uuid := 'b5555555-5555-5555-5555-555555555555';
  v_q6_id uuid := 'b6666666-6666-6666-6666-666666666666';
begin
  if not exists (select 1 from public.quizzes where id = v_quiz_id) then
    -- Insert Demo Quiz
    insert into public.quizzes (id, title, status, created_at, last_run_at)
    values (v_quiz_id, 'Q3 all-hands pulse check', 'live', now(), now() - interval '3 days');

    -- Question 1
    insert into public.questions (id, quiz_id, position, title, time_limit_sec)
    values (v_q1_id, v_quiz_id, 1, 'What should be our top engineering priority next quarter?', 20);
    insert into public.options (question_id, text, color, is_correct) values
      (v_q1_id, 'Performance', 'red', false),
      (v_q1_id, 'Reliability', 'blue', false),
      (v_q1_id, 'New features', 'yellow', false),
      (v_q1_id, 'Developer experience', 'green', true);

    -- Question 2
    insert into public.questions (id, quiz_id, position, title, time_limit_sec)
    values (v_q2_id, v_quiz_id, 2, 'Which team ritual delivered the most value last quarter?', 20);
    insert into public.options (question_id, text, color, is_correct) values
      (v_q2_id, 'Daily standup', 'red', false),
      (v_q2_id, 'Sprint retro', 'blue', true),
      (v_q2_id, 'Pair programming', 'yellow', false),
      (v_q2_id, 'Async design review', 'green', false);

    -- Question 3
    insert into public.questions (id, quiz_id, position, title, time_limit_sec)
    values (v_q3_id, v_quiz_id, 3, 'How many new engineers joined the org this quarter?', 10);
    insert into public.options (question_id, text, color, is_correct) values
      (v_q3_id, '6', 'red', false),
      (v_q3_id, '12', 'blue', false),
      (v_q3_id, '18', 'yellow', true),
      (v_q3_id, '24', 'green', false);

    -- Question 4
    insert into public.questions (id, quiz_id, position, title, time_limit_sec)
    values (v_q4_id, v_quiz_id, 4, 'Which city will host our next engineering offsite?', 10);
    insert into public.options (question_id, text, color, is_correct) values
      (v_q4_id, 'Austin', 'red', false),
      (v_q4_id, 'Lisbon', 'blue', true),
      (v_q4_id, 'Bengaluru', 'yellow', false),
      (v_q4_id, 'Toronto', 'green', false);

    -- Question 5
    insert into public.questions (id, quiz_id, position, title, time_limit_sec)
    values (v_q5_id, v_quiz_id, 5, 'What''s our current customer NPS score?', 20);
    insert into public.options (question_id, text, color, is_correct) values
      (v_q5_id, '32', 'red', false),
      (v_q5_id, '41', 'blue', false),
      (v_q5_id, '58', 'yellow', true),
      (v_q5_id, '67', 'green', false);

    -- Question 6
    insert into public.questions (id, quiz_id, position, title, time_limit_sec)
    values (v_q6_id, v_quiz_id, 6, 'Which product area is getting the biggest headcount increase?', 20);
    insert into public.options (question_id, text, color, is_correct) values
      (v_q6_id, 'Platform', 'red', false),
      (v_q6_id, 'Mobile', 'blue', false),
      (v_q6_id, 'Core product', 'yellow', true),
      (v_q6_id, 'Growth', 'green', false);
  end if;
end $$;
