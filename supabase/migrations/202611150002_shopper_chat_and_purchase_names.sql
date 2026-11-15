create table merrylist_private.chat_messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null references auth.users(id),
  sender_name text not null,
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table merrylist_private.chat_messages enable row level security;
revoke all on merrylist_private.chat_messages from public, anon, authenticated;

create table public.gift_claim_updates (
  gift_id text primary key references merrylist_private.gift_catalog(id),
  status text not null check (status in ('available', 'considering', 'bought')),
  buyer_name text
);
alter table public.gift_claim_updates enable row level security;
revoke all on public.gift_claim_updates from public, anon;
grant select on public.gift_claim_updates to authenticated;

create function public.can_read_gift_claim_updates() returns boolean
language sql stable security definer set search_path = '' as $$
  select merrylist_private.viewer_role() = 'shopper'
$$;
revoke all on function public.can_read_gift_claim_updates() from public, anon;
grant execute on function public.can_read_gift_claim_updates() to authenticated;

create policy shopper_reads_claim_updates on public.gift_claim_updates
for select to authenticated using (public.can_read_gift_claim_updates());

create function merrylist_private.publish_claim_update() returns trigger
language plpgsql security definer set search_path = '' as $$
declare claimant auth.users; claim_gift_id text; claim_status text; claim_buyer_name text;
begin
  if tg_op = 'DELETE' then
    claim_gift_id := old.gift_id;
    claim_status := 'available';
  else
    claim_gift_id := new.gift_id;
    claim_status := new.status;
    select * into claimant from auth.users where id = new.shopper_id;
    if claim_status = 'bought' then
      claim_buyer_name := coalesce(
        nullif(left(btrim(regexp_replace(claimant.raw_user_meta_data ->> 'full_name', '[[:cntrl:]]', '', 'g')), 80), ''),
        nullif(left(btrim(regexp_replace(claimant.raw_user_meta_data ->> 'name', '[[:cntrl:]]', '', 'g')), 80), ''),
        'A shopper'
      );
    end if;
  end if;
  insert into public.gift_claim_updates (gift_id, status, buyer_name)
  values (claim_gift_id, claim_status, claim_buyer_name)
  on conflict (gift_id) do update set status = excluded.status, buyer_name = excluded.buyer_name;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger publish_gift_claim_update
after insert or update or delete on merrylist_private.claims
for each row execute function merrylist_private.publish_claim_update();

insert into public.gift_claim_updates (gift_id, status, buyer_name)
select catalog.id,
       coalesce(claim.status, 'available'),
       case when claim.status = 'bought' then coalesce(
         nullif(left(btrim(regexp_replace(claimant.raw_user_meta_data ->> 'full_name', '[[:cntrl:]]', '', 'g')), 80), ''),
         nullif(left(btrim(regexp_replace(claimant.raw_user_meta_data ->> 'name', '[[:cntrl:]]', '', 'g')), 80), ''),
         'A shopper'
       ) end
from merrylist_private.gift_catalog catalog
left join merrylist_private.claims claim on claim.gift_id = catalog.id
left join auth.users claimant on claimant.id = claim.shopper_id;

do $$
declare already_published boolean;
begin
  if to_regclass('pg_catalog.pg_publication') is not null then
    execute $query$
      select exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'gift_claim_updates'
      )
    $query$ into already_published;
    if not already_published and exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
      execute 'alter publication supabase_realtime add table public.gift_claim_updates';
    end if;
  end if;
end;
$$;

create or replace function public.gift_coordination() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare viewer text := merrylist_private.viewer_role();
begin
  if viewer <> 'shopper' then return jsonb_build_object('role', viewer, 'gifts', '[]'::jsonb); end if;
  return jsonb_build_object('role', viewer, 'gifts', coalesce((
    select jsonb_agg(jsonb_build_object(
      'giftId', catalog.id,
      'revision', catalog.revision,
      'status', coalesce(claim.status, 'available'),
      'mine', coalesce(claim.shopper_id = auth.uid(), false),
      'buyerName', case when claim.status = 'bought' then
        coalesce(
          nullif(left(btrim(regexp_replace(claimant.raw_user_meta_data ->> 'full_name', '[[:cntrl:]]', '', 'g')), 80), ''),
          nullif(left(btrim(regexp_replace(claimant.raw_user_meta_data ->> 'name', '[[:cntrl:]]', '', 'g')), 80), ''),
          'A shopper'
        )
        else null
      end
    ) order by catalog.id)
    from merrylist_private.gift_catalog catalog
    left join merrylist_private.claims claim on claim.gift_id = catalog.id
    left join auth.users claimant on claimant.id = claim.shopper_id
  ), '[]'::jsonb));
end;
$$;

create function public.get_chat_messages() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if merrylist_private.viewer_role() <> 'shopper' then
    raise exception 'Shopper access required' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', recent.id,
      'senderName', recent.sender_name,
      'message', recent.message,
      'createdAt', recent.created_at,
      'mine', recent.sender_id = auth.uid()
    ) order by recent.id)
    from (
      select id, sender_id, sender_name, message, created_at
      from merrylist_private.chat_messages
      order by id desc
    ) recent
  ), '[]'::jsonb);
end;
$$;

create function public.send_chat_message(p_message text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare sender auth.users; clean_message text; clean_name text; new_id bigint;
begin
  if merrylist_private.viewer_role() <> 'shopper' then
    raise exception 'Shopper access required' using errcode = '42501';
  end if;
  clean_message := btrim(p_message);
  if clean_message is null or char_length(clean_message) not between 1 and 2000 then
    raise exception 'Message must contain 1 to 2000 characters' using errcode = '22023';
  end if;
  select * into sender from auth.users where id = auth.uid();
  clean_name := coalesce(
    nullif(left(btrim(regexp_replace(sender.raw_user_meta_data ->> 'full_name', '[[:cntrl:]]', '', 'g')), 80), ''),
    nullif(left(btrim(regexp_replace(sender.raw_user_meta_data ->> 'name', '[[:cntrl:]]', '', 'g')), 80), ''),
    'A shopper'
  );
  insert into merrylist_private.chat_messages (sender_id, sender_name, message)
  values (auth.uid(), clean_name, clean_message)
  returning id into new_id;
  return new_id;
end;
$$;

create function public.delete_chat_message(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if merrylist_private.viewer_role() <> 'shopper' then
    raise exception 'Shopper access required' using errcode = '42501';
  end if;
  delete from merrylist_private.chat_messages
  where id = p_id and sender_id = auth.uid();
  if not found then raise exception 'Message not found' using errcode = '40001'; end if;
end;
$$;

revoke all on function public.get_chat_messages() from public, anon;
revoke all on function public.send_chat_message(text) from public, anon;
revoke all on function public.delete_chat_message(bigint) from public, anon;
grant execute on function public.get_chat_messages() to authenticated;
grant execute on function public.send_chat_message(text) to authenticated;
grant execute on function public.delete_chat_message(bigint) to authenticated;
