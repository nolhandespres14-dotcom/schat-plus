-- Core tables required by the current schat+ web app.
-- This creates new tables only in the schat+ Supabase project.
-- It does not alter the separate Poképlex project or import its private reservation data.
begin;

create table if not exists public.ai_agents (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  system_prompt text,
  model text,
  enabled boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.ai_agents (name, description, model, enabled)
values
  ('ChatGPT', 'Assistant IA schat+', 'gpt-5-mini', false),
  ('Claude', 'Assistant IA schat+', 'claude-sonnet-4-5', false),
  ('Gemini', 'Assistant IA schat+', 'gemini-2.5-flash', false)
on conflict (name) do nothing;

create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ai_agent_id uuid references public.ai_agents(id) on delete set null,
  title text not null default 'Nouvelle conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists chat_conversations_user_updated_idx
  on public.chat_conversations (user_id, updated_at desc);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null check (char_length(content) <= 50000),
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_conversation_created_idx
  on public.chat_messages (conversation_id, created_at);
create index if not exists chat_messages_user_created_idx
  on public.chat_messages (user_id, created_at desc);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null default 0 check (price >= 0),
  rarity text,
  stock integer not null default 1 check (stock >= 0),
  card_number text,
  image_url text,
  status text not null default 'available' check (status in ('available','reserved','sold')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cards_status_created_idx
  on public.cards (status, created_at desc);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.cards(id) on delete restrict,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  buyer_name text not null check (char_length(trim(buyer_name)) between 1 and 80),
  buyer_phone text not null check (char_length(trim(buyer_phone)) between 1 and 40),
  status text not null default 'reserved' check (status in ('reserved','completed','cancelled')),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists reservations_buyer_created_idx
  on public.reservations (buyer_id, created_at desc);
create index if not exists reservations_product_status_idx
  on public.reservations (product_id, status);

alter table public.ai_agents enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.cards enable row level security;
alter table public.reservations enable row level security;

grant select on public.ai_agents to anon, authenticated;
grant insert, update, delete on public.ai_agents to authenticated;
grant select, insert, update, delete on public.chat_conversations to authenticated;
grant select, insert, delete on public.chat_messages to authenticated;
grant select on public.cards to anon, authenticated;
grant insert, update, delete on public.cards to authenticated;
grant select, update on public.reservations to authenticated;
grant all on public.ai_agents, public.chat_conversations, public.chat_messages, public.cards, public.reservations to service_role;

drop policy if exists "read enabled ai agents or admin" on public.ai_agents;
create policy "read enabled ai agents or admin"
  on public.ai_agents for select to anon, authenticated
  using (enabled = true or exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

drop policy if exists "admins insert ai agents" on public.ai_agents;
create policy "admins insert ai agents"
  on public.ai_agents for insert to authenticated
  with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
drop policy if exists "admins update ai agents" on public.ai_agents;
create policy "admins update ai agents"
  on public.ai_agents for update to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
drop policy if exists "admins delete ai agents" on public.ai_agents;
create policy "admins delete ai agents"
  on public.ai_agents for delete to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

drop policy if exists "users read own conversations or admins read all" on public.chat_conversations;
create policy "users read own conversations or admins read all"
  on public.chat_conversations for select to authenticated
  using ((select auth.uid()) = user_id or exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
drop policy if exists "users create own conversations" on public.chat_conversations;
create policy "users create own conversations"
  on public.chat_conversations for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "users update own conversations" on public.chat_conversations;
create policy "users update own conversations"
  on public.chat_conversations for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "users delete own conversations or admins delete all" on public.chat_conversations;
create policy "users delete own conversations or admins delete all"
  on public.chat_conversations for delete to authenticated
  using ((select auth.uid()) = user_id or exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

drop policy if exists "users read messages in own conversations or admins read all" on public.chat_messages;
create policy "users read messages in own conversations or admins read all"
  on public.chat_messages for select to authenticated
  using (
    exists (select 1 from public.chat_conversations c where c.id = conversation_id and c.user_id = (select auth.uid()))
    or exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
  );
drop policy if exists "users add messages to own conversations" on public.chat_messages;
create policy "users add messages to own conversations"
  on public.chat_messages for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.chat_conversations c where c.id = conversation_id and c.user_id = (select auth.uid()))
  );
drop policy if exists "admins delete chat messages" on public.chat_messages;
create policy "admins delete chat messages"
  on public.chat_messages for delete to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

drop policy if exists "public read cards" on public.cards;
create policy "public read cards"
  on public.cards for select to anon, authenticated
  using (true);
drop policy if exists "admins insert cards" on public.cards;
create policy "admins insert cards"
  on public.cards for insert to authenticated
  with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
drop policy if exists "admins update cards" on public.cards;
create policy "admins update cards"
  on public.cards for update to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
drop policy if exists "admins delete cards" on public.cards;
create policy "admins delete cards"
  on public.cards for delete to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

drop policy if exists "users read own reservations or admins read all" on public.reservations;
create policy "users read own reservations or admins read all"
  on public.reservations for select to authenticated
  using ((select auth.uid()) = buyer_id or exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
drop policy if exists "admins update reservations" on public.reservations;
create policy "admins update reservations"
  on public.reservations for update to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

-- Atomic reservation operation. It is intentionally SECURITY DEFINER so users
-- cannot update catalogue stock directly; it checks auth.uid() and validates inputs.
create or replace function public.reserve_product(
  p_product_id uuid,
  p_buyer_name text,
  p_buyer_phone text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_card public.cards%rowtype;
  v_reservation_id uuid;
begin
  if v_user_id is null then
    raise exception 'Connexion requise.';
  end if;
  if length(trim(coalesce(p_buyer_name,''))) not between 1 and 80 then
    raise exception 'Nom invalide.';
  end if;
  if length(trim(coalesce(p_buyer_phone,''))) not between 1 and 40 then
    raise exception 'Téléphone invalide.';
  end if;

  update public.cards
    set stock = stock - 1,
        status = case when stock <= 1 then 'reserved' else 'available' end,
        updated_at = now()
    where id = p_product_id and status = 'available' and stock > 0
    returning * into v_card;

  if not found then
    raise exception 'Cette carte n’est plus disponible.';
  end if;

  insert into public.reservations (product_id, buyer_id, buyer_name, buyer_phone, status)
  values (v_card.id, v_user_id, trim(p_buyer_name), trim(p_buyer_phone), 'reserved')
  returning id into v_reservation_id;

  return jsonb_build_object('reservation_id', v_reservation_id, 'product_id', v_card.id, 'status', 'reserved');
end;
$$;
revoke all on function public.reserve_product(uuid,text,text) from public, anon;
grant execute on function public.reserve_product(uuid,text,text) to authenticated;

-- Supabase no longer auto-exposes newly created public tables; grant the
-- required Data API privileges explicitly above. Add chat tables to Realtime.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_conversations') then
      alter publication supabase_realtime add table public.chat_conversations;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages') then
      alter publication supabase_realtime add table public.chat_messages;
    end if;
  end if;
end $$;

commit;
