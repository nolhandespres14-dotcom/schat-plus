begin;
create index if not exists user_subscriptions_plan_code_idx
  on public.user_subscriptions (plan_code);
create unique index if not exists user_subscriptions_one_pending_per_user_idx
  on public.user_subscriptions (user_id) where status = 'pending_payment';
create unique index if not exists user_subscriptions_one_active_per_user_idx
  on public.user_subscriptions (user_id) where status = 'active';
commit;