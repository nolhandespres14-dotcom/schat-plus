begin;

create or replace function public.admin_complete_subscription_cancellation(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_admin uuid := auth.uid();
  v_request public.subscription_cancellation_requests%rowtype;
  v_subscription public.user_subscriptions%rowtype;
begin
  if v_admin is null or not exists (
    select 1 from public.admin_users a where a.user_id = v_admin
  ) then
    raise exception 'Accès administrateur requis.';
  end if;

  select * into v_request
  from public.subscription_cancellation_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Demande d’annulation introuvable.';
  end if;

  if v_request.status = 'completed' then
    return jsonb_build_object('ok', true, 'already_completed', true);
  end if;

  if v_request.status <> 'requested' then
    raise exception 'Cette demande ne peut plus être traitée.';
  end if;

  select * into v_subscription
  from public.user_subscriptions
  where id = v_request.subscription_id
    and user_id = v_request.user_id
  for update;

  if not found or v_subscription.status <> 'active' or v_subscription.plan_code = 'V1' then
    raise exception 'L’abonnement ne correspond plus à une offre payante active.';
  end if;

  update public.user_subscriptions
  set status = 'canceled', updated_at = now()
  where id = v_subscription.id;

  update public.subscription_cancellation_requests
  set status = 'completed', processed_at = now()
  where id = v_request.id;

  return jsonb_build_object('ok', true, 'subscription_id', v_subscription.id);
end;
$$;

revoke all on function public.admin_complete_subscription_cancellation(uuid) from public, anon;
grant execute on function public.admin_complete_subscription_cancellation(uuid) to authenticated;

commit;