-- Run this after the three administrator accounts have been created in Supabase Auth.
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
