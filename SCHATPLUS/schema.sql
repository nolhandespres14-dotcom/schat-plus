-- schat+ + Poképlx : extension additive du schéma Supabase.
create table if not exists public.ais (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.ais(name) values
('ChatGPT'),('Claude'),('Gemini'),('Llama'),('Plaisir AI')
on conflict(name) do nothing;

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null check (char_length(trim(text)) > 0),
  created_at timestamptz not null default now()
);
create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  ai_name text not null,
  answer_text text not null,
  created_at timestamptz not null default now()
);

alter table public.ais enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;

drop policy if exists "public read active ais" on public.ais;
create policy "public read active ais" on public.ais for select to anon,authenticated using (active=true or public.is_admin());

drop policy if exists "users read own questions" on public.questions;
create policy "users read own questions" on public.questions for select to authenticated using (auth.uid()=user_id or public.is_admin());
drop policy if exists "users insert own questions" on public.questions;
create policy "users insert own questions" on public.questions for insert to authenticated with check (auth.uid()=user_id);
drop policy if exists "users delete own questions" on public.questions;
create policy "users delete own questions" on public.questions for delete to authenticated using (auth.uid()=user_id or public.is_admin());

drop policy if exists "users read own answers" on public.answers;
create policy "users read own answers" on public.answers for select to authenticated
using (exists(select 1 from public.questions q where q.id=question_id and (q.user_id=auth.uid() or public.is_admin())));
drop policy if exists "users insert answers" on public.answers;
create policy "users insert answers" on public.answers for insert to authenticated
with check (exists(select 1 from public.questions q where q.id=question_id and q.user_id=auth.uid()));

-- NOTE: ne mets jamais de clé service_role ou de clé d'IA dans le navigateur.
-- Les appels réels aux modèles doivent passer par une fonction serveur / Edge Function.
