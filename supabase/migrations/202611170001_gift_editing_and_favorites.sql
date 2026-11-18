create table merrylist_private.gift_overrides (
  gift_id text primary key references merrylist_private.gift_catalog(id),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  cost numeric(10, 2) not null check (cost > 0 and cost <= 100000),
  theme text not null check (theme in (
    'Footwear', 'Food & drink', 'Gift Card', 'Books', 'Safety & Security',
    'Car Accessories', 'Electronics', 'Clothing', 'Other', 'Swimming'
  )),
  link text not null check (char_length(link) <= 2048 and link ~ '^https://[^[:space:]]+$'),
  description text not null check (char_length(btrim(description)) between 1 and 500),
  image_url text check (image_url is null or (
    char_length(image_url) <= 2048 and
    (image_url ~ '^https://[^[:space:]]+$' or image_url ~ '^/gifts/[A-Za-z0-9._-]+$')
  )),
  note text not null check (char_length(btrim(note)) between 1 and 500),
  tags text[] not null default array[]::text[]
    check (cardinality(tags) <= 8 and array_position(tags, null) is null and array_position(tags, '') is null
      and char_length(array_to_string(tags, '')) <= 400),
  updated_at timestamptz not null default now()
);
alter table merrylist_private.gift_overrides enable row level security;
revoke all on merrylist_private.gift_overrides from public, anon, authenticated;

create table merrylist_private.owner_favorite_gifts (
  gift_id text primary key references merrylist_private.gift_catalog(id),
  created_at timestamptz not null default now()
);
alter table merrylist_private.owner_favorite_gifts enable row level security;
revoke all on merrylist_private.owner_favorite_gifts from public, anon, authenticated;

create function public.gift_public_settings() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'overrides', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', gift.gift_id,
        'name', gift.name,
        'cost', gift.cost,
        'theme', gift.theme,
        'link', gift.link,
        'description', gift.description,
        'image', gift.image_url,
        'note', gift.note,
        'tags', gift.tags
      ) order by gift.gift_id)
      from merrylist_private.gift_overrides gift
    ), '[]'::jsonb),
    'favoriteGiftIds', coalesce((
      select jsonb_agg(favorite.gift_id order by favorite.gift_id)
      from merrylist_private.owner_favorite_gifts favorite
    ), '[]'::jsonb)
  );
$$;

create function public.save_gift_details(
  p_gift_id text,
  p_name text,
  p_cost numeric,
  p_theme text,
  p_link text,
  p_description text,
  p_image_url text,
  p_note text,
  p_tags text[]
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if merrylist_private.viewer_role() <> 'owner' then
    raise exception 'Owner access required' using errcode = '42501';
  end if;
  if p_gift_id is null or not exists (
    select 1 from merrylist_private.gift_catalog where id = p_gift_id
  ) then
    raise exception 'Unknown gift' using errcode = '22023';
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 120
     or p_cost is null or p_cost <= 0 or p_cost > 100000
     or p_theme is null or p_theme not in (
       'Footwear', 'Food & drink', 'Gift Card', 'Books', 'Safety & Security',
       'Car Accessories', 'Electronics', 'Clothing', 'Other', 'Swimming'
     )
     or p_link is null or char_length(p_link) > 2048 or p_link !~ '^https://[^[:space:]]+$'
     or p_description is null or char_length(btrim(p_description)) not between 1 and 500
     or (p_image_url is not null and (
       char_length(p_image_url) > 2048 or
       (p_image_url !~ '^https://[^[:space:]]+$' and p_image_url !~ '^/gifts/[A-Za-z0-9._-]+$')
     ))
     or p_note is null or char_length(btrim(p_note)) not between 1 and 500
     or p_tags is null or cardinality(p_tags) > 8
     or array_position(p_tags, null) is not null
     or array_position(p_tags, '') is not null
     or exists (select 1 from unnest(p_tags) as item(tag) where btrim(item.tag) = '' or char_length(item.tag) > 50)
     or char_length(array_to_string(p_tags, '')) > 400 then
    raise exception 'Invalid gift details' using errcode = '22023';
  end if;
  insert into merrylist_private.gift_overrides (
    gift_id, name, cost, theme, link, description, image_url, note, tags
  ) values (
    p_gift_id, btrim(p_name), p_cost, p_theme, btrim(p_link), btrim(p_description),
    nullif(btrim(p_image_url), ''), btrim(p_note),
    array(select btrim(item.tag) from unnest(p_tags) as item(tag))
  )
  on conflict (gift_id) do update set
    name = excluded.name,
    cost = excluded.cost,
    theme = excluded.theme,
    link = excluded.link,
    description = excluded.description,
    image_url = excluded.image_url,
    note = excluded.note,
    tags = excluded.tags,
    updated_at = now();
end;
$$;

create function public.set_owner_gift_favorite(p_gift_id text, p_favorite boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if merrylist_private.viewer_role() <> 'owner' then
    raise exception 'Owner access required' using errcode = '42501';
  end if;
  if p_gift_id is null or p_favorite is null or not exists (
    select 1 from merrylist_private.gift_catalog where id = p_gift_id
  ) then
    raise exception 'Invalid gift favorite' using errcode = '22023';
  end if;
  if p_favorite then
    insert into merrylist_private.owner_favorite_gifts (gift_id)
    values (p_gift_id)
    on conflict (gift_id) do nothing;
  else
    delete from merrylist_private.owner_favorite_gifts where gift_id = p_gift_id;
  end if;
end;
$$;

create or replace function public.get_chat_messages() returns jsonb
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
    ) order by recent.created_at, recent.id)
    from merrylist_private.chat_messages recent
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.gift_public_settings() from public;
revoke all on function public.save_gift_details(text, text, numeric, text, text, text, text, text, text[]) from public, anon;
revoke all on function public.set_owner_gift_favorite(text, boolean) from public, anon;
revoke all on function public.get_chat_messages() from public, anon;
grant execute on function public.gift_public_settings() to anon, authenticated;
grant execute on function public.save_gift_details(text, text, numeric, text, text, text, text, text, text[]) to authenticated;
grant execute on function public.set_owner_gift_favorite(text, boolean) to authenticated;
grant execute on function public.get_chat_messages() to authenticated;
