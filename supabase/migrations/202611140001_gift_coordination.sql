-- All purchase data lives outside the exposed public schema.
create schema if not exists merrylist_private;
revoke all on schema merrylist_private from public, anon, authenticated;

create table merrylist_private.settings (
  singleton boolean primary key default true check (singleton),
  owner_email text not null,
  owner_user_id uuid references auth.users(id)
);
-- Fail closed until setup-owner.sql is run through a trusted database connection.
create table merrylist_private.gift_catalog (
  id text primary key,
  revision integer not null default 0
);
create table merrylist_private.claims (
  gift_id text primary key references merrylist_private.gift_catalog(id),
  shopper_id uuid not null references auth.users(id),
  status text not null check (status in ('considering', 'bought')),
  updated_at timestamptz not null default now()
);
alter table merrylist_private.settings enable row level security;
alter table merrylist_private.gift_catalog enable row level security;
alter table merrylist_private.claims enable row level security;
revoke all on all tables in schema merrylist_private from public, anon, authenticated;

create function merrylist_private.viewer_role() returns text
language plpgsql stable security definer set search_path = '' as $$
declare config merrylist_private.settings; viewer auth.users;
begin
  if auth.uid() is null then return 'guest'; end if;
  select * into config from merrylist_private.settings where singleton;
  if not found then return 'unconfigured'; end if;
  select * into viewer from auth.users where id = auth.uid();
  if viewer.email_confirmed_at is null then return 'unverified'; end if;
  if viewer.id = config.owner_user_id or lower(viewer.email) = lower(config.owner_email) then
    return 'owner';
  end if;
  return 'shopper';
end;
$$;
revoke all on function merrylist_private.viewer_role() from public, anon, authenticated;

-- Bind the owner's stable user ID once their configured email is verified.
create function merrylist_private.bind_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is not null then
    update merrylist_private.settings set owner_user_id = new.id
    where singleton and owner_user_id is null and lower(owner_email) = lower(new.email);
  end if;
  return new;
end;
$$;
revoke all on function merrylist_private.bind_owner() from public, anon, authenticated;
create trigger merrylist_bind_owner after insert or update of email_confirmed_at, email on auth.users
for each row execute function merrylist_private.bind_owner();

create function public.gift_coordination() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare viewer text := merrylist_private.viewer_role();
begin
  -- Owner receives no statuses, timestamps, counts, or revisions.
  if viewer <> 'shopper' then return jsonb_build_object('role', viewer, 'gifts', '[]'::jsonb); end if;
  return jsonb_build_object('role', viewer, 'gifts', coalesce((
    select jsonb_agg(jsonb_build_object(
      'giftId', catalog.id, 'revision', catalog.revision,
      'status', coalesce(claim.status, 'available'),
      'mine', coalesce(claim.shopper_id = auth.uid(), false)
    ) order by catalog.id)
    from merrylist_private.gift_catalog catalog
    left join merrylist_private.claims claim on claim.gift_id = catalog.id
  ), '[]'::jsonb));
end;
$$;

create function public.set_gift_claim(p_gift_id text, p_status text, p_revision integer) returns void
language plpgsql security definer set search_path = '' as $$
declare current_revision integer; current_claim merrylist_private.claims;
begin
  if merrylist_private.viewer_role() <> 'shopper' then
    raise exception 'Shopper access required' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('considering', 'bought', 'available') then
    raise exception 'Invalid gift status' using errcode = '22023';
  end if;
  -- Serialize all claims for this gift, including simultaneous first claims.
  select revision into current_revision from merrylist_private.gift_catalog
  where id = p_gift_id for update;
  if not found then raise exception 'Unknown gift' using errcode = '22023'; end if;
  if p_revision is distinct from current_revision then
    raise exception 'This gift changed. Refresh and try again.' using errcode = '40001';
  end if;
  select * into current_claim from merrylist_private.claims where gift_id = p_gift_id;
  if found and current_claim.shopper_id <> auth.uid() then
    raise exception 'Another shopper already claimed this gift.' using errcode = '40001';
  end if;
  if p_status = 'available' then
    delete from merrylist_private.claims where gift_id = p_gift_id and shopper_id = auth.uid();
  else
    insert into merrylist_private.claims (gift_id, shopper_id, status)
    values (p_gift_id, auth.uid(), p_status)
    on conflict (gift_id) do update set status = excluded.status, updated_at = now();
  end if;
  update merrylist_private.gift_catalog set revision = revision + 1 where id = p_gift_id;
end;
$$;
revoke all on function public.gift_coordination() from public, anon;
revoke all on function public.set_gift_claim(text, text, integer) from public, anon;
grant execute on function public.gift_coordination() to authenticated;
grant execute on function public.set_gift_claim(text, text, integer) to authenticated;
