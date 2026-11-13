-- SCHAT+ subscriptions. Migration additive; does not touch Poképlex tables.
-- Paid subscriptions remain pending until a verified payment webhook activates them.
begin;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  admin_number integer not null unique check (admin_number between 1 and 3),
  can_use_chatgpt boolean not null default false,
  can_modify_site boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
grant select on public.admin_users to authenticated;
drop policy if exists "admins read own admin record" on public.admin_users;
create policy "admins read own admin record"
  on public.admin_users for select to authenticated
  using ((select auth.uid()) = user_id);

-- Seed only accounts that already exist in Supabase Auth.
insert into public.admin_users (user_id, admin_number, can_use_chatgpt, can_modify_site)
select
  id,
  case lower(email)
    when 'nolhandespres14@gmail.com' then 1
    when 'nelson.diraddo@gmail.com' then 2
    when 'monsieur_d2@hotmail.com' then 3
  end,
  lower(email) = 'nolhandespres14@gmail.com',
  lower(email) = 'nolhandespres14@gmail.com'
from auth.users
where lower(email) in (
  'nolhandespres14@gmail.com',
  'nelson.diraddo@gmail.com',
  'monsieur_d2@hotmail.com'
)
on conflict (user_id) do update set
  admin_number = excluded.admin_number,
  can_use_chatgpt = excluded.can_use_chatgpt,
  can_modify_site = excluded.can_modify_site;

create table if not exists public.subscription_plans (
  code text primary key check (code in ('V1','V2','V3','V4','V5')),
  name text not null,
  monthly_price_cents integer not null check (monthly_price_cents >= 0),
  currency text not null default 'CAD' check (currency = 'CAD'),
  interval text not null default 'month' check (interval = 'month'),
  active boolean not null default true,
  features jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.subscription_plans (code, name, monthly_price_cents, currency, interval, features)
values
  ('V1', 'V1 — Gratuit', 0, 'CAD', 'month', '[]'::jsonb),
  ('V2', 'V2', 2000, 'CAD', 'month', '[]'::jsonb),
  ('V3', 'V3 — Emergent', 3000, 'CAD', 'month', '[]'::jsonb),
  ('V4', 'V4 — Lovable', 4000, 'CAD', 'month', '[]'::jsonb),
  ('V5', 'V5 — SCHAT+ MASTER', 5000, 'CAD', 'month', '[]'::jsonb)
on conflict (code) do update set
  name = excluded.name,
  monthly_price_cents = excluded.monthly_price_cents,
  currency = excluded.currency,
  interval = excluded.interval;

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null references public.subscription_plans(code),
  status text not null check (status in ('pending_payment','active','canceled','past_due','expired')),
  payment_provider text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_subscriptions_user_created_idx
  on public.user_subscriptions (user_id, created_at desc);
create index if not exists user_subscriptions_status_idx
  on public.user_subscriptions (status);

create table if not exists public.subscription_cancellation_requests (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.user_subscriptions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'requested' check (status in ('requested','completed','rejected')),
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint cancellation_subscription_user_unique unique (subscription_id, user_id)
);

create index if not exists subscription_cancellations_user_created_idx
  on public.subscription_cancellation_requests (user_id, created_at desc);

alter table public.subscription_plans enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.subscription_cancellation_requests enable row level security;

grant select on public.subscription_plans to anon, authenticated;
grant select, insert on public.user_subscriptions to authenticated;
grant select, insert on public.subscription_cancellation_requests to authenticated;
grant all on public.subscription_plans, public.user_subscriptions, public.subscription_cancellation_requests to service_role;

drop policy if exists "read active subscription plans" on public.subscription_plans;
create policy "read active subscription plans"
  on public.subscription_plans for select to anon, authenticated
  using (active = true);

drop policy if exists "users read own subscriptions or admins read all" on public.user_subscriptions;
create policy "users read own subscriptions or admins read all"
  on public.user_subscriptions for select to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
  );

drop policy if exists "users request their own subscription" on public.user_subscriptions;
create policy "users request their own subscription"
  on public.user_subscriptions for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      status = 'pending_payment'
      or (status = 'active' and plan_code = 'V1')
    )
  );

drop policy if exists "users read own cancellation requests or admins read all" on public.subscription_cancellation_requests;
create policy "users read own cancellation requests or admins read all"
  on public.subscription_cancellation_requests for select to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
  );

drop policy if exists "users request cancellation of own active paid subscription" on public.subscription_cancellation_requests;
create policy "users request cancellation of own active paid subscription"
  on public.subscription_cancellation_requests for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.user_subscriptions s
      where s.id = subscription_id
        and s.user_id = (select auth.uid())
        and s.status = 'active'
        and s.plan_code <> 'V1'
    )
  );

comment on table public.subscription_plans is 'Catalogue des offres schat+; les fonctionnalités détaillées seront définies avant la mise en vente.';
comment on table public.user_subscriptions is 'État des abonnements schat+; seuls les processus serveur de paiement peuvent activer une offre payante.';
comment on table public.subscription_cancellation_requests is 'Demandes de résiliation déposées par les utilisateurs.';

commit;
