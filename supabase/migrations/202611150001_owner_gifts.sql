create table merrylist_private.owner_gifts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  cost numeric(10, 2) not null check (cost > 0 and cost <= 100000),
  theme text not null check (theme in (
    'Footwear', 'Food & drink', 'Gift Card', 'Books', 'Safety & Security',
    'Car Accessories', 'Electronics', 'Clothing', 'Other', 'Swimming'
  )),
  link text not null check (char_length(link) <= 2048 and link ~ '^https://[^[:space:]]+$'),
  description text not null check (char_length(btrim(description)) between 1 and 500),
  image_url text check (image_url is null or (char_length(image_url) <= 2048 and image_url ~ '^https://[^[:space:]]+$')),
  note text not null check (char_length(btrim(note)) between 1 and 500),
  tags text[] not null default array[]::text[]
    check (cardinality(tags) <= 8 and array_position(tags, null) is null and array_position(tags, '') is null and char_length(array_to_string(tags, '')) <= 400),
  created_at timestamptz not null default now()
);
alter table merrylist_private.owner_gifts enable row level security;
revoke all on merrylist_private.owner_gifts from public, anon, authenticated;

create or replace function public.approved_gift_ideas() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', gift.id,
    'name', gift.name,
    'cost', gift.cost,
    'theme', gift.theme,
    'link', gift.link,
    'description', gift.description,
    'image', gift.image_url,
    'note', gift.note,
    'tags', gift.tags
  ) order by gift.created_at desc), '[]'::jsonb)
  from (
    select
      'idea-' || idea.id::text as id,
      idea.name,
      idea.cost,
      idea.theme,
      idea.link,
      idea.description,
      idea.image_url,
      idea.note,
      idea.tags,
      idea.created_at
    from merrylist_private.gift_ideas idea
    where idea.status = 'approved'
    union all
    select
      'owner-' || owner_gift.id::text as id,
      owner_gift.name,
      owner_gift.cost,
      owner_gift.theme,
      owner_gift.link,
      owner_gift.description,
      owner_gift.image_url,
      owner_gift.note,
      owner_gift.tags,
      owner_gift.created_at
    from merrylist_private.owner_gifts owner_gift
  ) gift;
$$;

create function public.add_owner_gift(
  p_name text,
  p_cost numeric,
  p_theme text,
  p_link text,
  p_description text,
  p_image_url text,
  p_note text,
  p_tags text[]
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if merrylist_private.viewer_role() <> 'owner' then
    raise exception 'Owner access required' using errcode = '42501';
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 120
     or p_cost is null or p_cost <= 0 or p_cost > 100000
     or p_theme is null or p_theme not in (
       'Footwear', 'Food & drink', 'Gift Card', 'Books', 'Safety & Security',
       'Car Accessories', 'Electronics', 'Clothing', 'Other', 'Swimming'
     )
     or p_link is null or char_length(p_link) > 2048 or p_link !~ '^https://[^[:space:]]+$'
     or p_description is null or char_length(btrim(p_description)) not between 1 and 500
     or (p_image_url is not null and (char_length(p_image_url) > 2048 or p_image_url !~ '^https://[^[:space:]]+$'))
     or p_note is null or char_length(btrim(p_note)) not between 1 and 500
     or p_tags is null or cardinality(p_tags) > 8
     or array_position(p_tags, null) is not null
     or array_position(p_tags, '') is not null
     or exists (select 1 from unnest(p_tags) as item(tag) where btrim(item.tag) = '' or char_length(item.tag) > 50)
     or char_length(array_to_string(p_tags, '')) > 400 then
    raise exception 'Invalid gift details' using errcode = '22023';
  end if;
  insert into merrylist_private.owner_gifts (
    name, cost, theme, link, description, image_url, note, tags
  ) values (
    btrim(p_name), p_cost, p_theme, btrim(p_link), btrim(p_description),
    nullif(btrim(p_image_url), ''), btrim(p_note),
    array(select btrim(item.tag) from unnest(p_tags) as item(tag))
  ) returning id into new_id;
  insert into merrylist_private.gift_catalog (id) values ('owner-' || new_id::text);
  return new_id;
end;
$$;

revoke all on function public.add_owner_gift(text, numeric, text, text, text, text, text, text[]) from public, anon;
grant execute on function public.add_owner_gift(text, numeric, text, text, text, text, text, text[]) to authenticated;
