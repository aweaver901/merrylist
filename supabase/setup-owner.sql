-- Run as database administrator, never from the browser.
insert into merrylist_private.settings (singleton, owner_email, owner_user_id)
values (true, 'aweaver901@gmail.com', (
  select id from auth.users where lower(email) = 'aweaver901@gmail.com' and email_confirmed_at is not null
))
on conflict (singleton) do update set
  owner_email = excluded.owner_email,
  owner_user_id = coalesce(excluded.owner_user_id, merrylist_private.settings.owner_user_id);
