create table merrylist_private.gift_ideas (
  id uuid primary key default gen_random_uuid(),
  suggested_by uuid not null references auth.users(id),
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
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index gift_ideas_pending_idx on merrylist_private.gift_ideas (created_at desc) where status = 'pending';
create index gift_ideas_submitter_idx on merrylist_private.gift_ideas (suggested_by, created_at desc);
alter table merrylist_private.gift_ideas enable row level security;
revoke all on merrylist_private.gift_ideas from public, anon, authenticated;

create function public.approved_gift_ideas() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', 'idea-' || idea.id::text,
    'name', idea.name,
    'cost', idea.cost,
    'theme', idea.theme,
    'link', idea.link,
    'description', idea.description,
    'image', idea.image_url,
    'note', idea.note,
    'tags', idea.tags
  ) order by idea.created_at desc), '[]'::jsonb)
  from merrylist_private.gift_ideas idea
  where idea.status = 'approved';
$$;

create function public.gift_ideas() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare viewer text := merrylist_private.viewer_role();
begin
  if viewer not in ('owner', 'shopper') then
    return jsonb_build_object('role', viewer, 'suggestions', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'role', viewer,
    'suggestions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', idea.id,
        'status', idea.status,
        'createdAt', idea.created_at,
        'gift', jsonb_build_object(
          'id', 'idea-' || idea.id::text,
          'name', idea.name,
          'cost', idea.cost,
          'theme', idea.theme,
          'link', idea.link,
          'description', idea.description,
          'image', idea.image_url,
          'note', idea.note,
          'tags', idea.tags
        )
      ) order by idea.created_at desc)
      from merrylist_private.gift_ideas idea
      where (viewer = 'owner' and idea.status = 'pending')
         or (viewer = 'shopper' and idea.suggested_by = auth.uid())
    ), '[]'::jsonb)
  );
end;
$$;

create function public.submit_gift_idea(
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
  if merrylist_private.viewer_role() <> 'shopper' then
    raise exception 'Shopper access required' using errcode = '42501';
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
     or exists (select 1 from unnest(p_tags) as item(tag) where btrim(item.tag) = '')
     or char_length(array_to_string(p_tags, '')) > 400 then
    raise exception 'Invalid gift suggestion details' using errcode = '22023';
  end if;
  insert into merrylist_private.gift_ideas (
    suggested_by, name, cost, theme, link, description, image_url, note, tags
  ) values (
    auth.uid(), btrim(p_name), p_cost, p_theme, btrim(p_link), btrim(p_description),
    nullif(btrim(p_image_url), ''), btrim(p_note),
    array(select btrim(item.tag) from unnest(p_tags) as item(tag))
  ) returning id into new_id;
  return new_id;
end;
$$;

create function public.review_gift_idea(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare idea merrylist_private.gift_ideas;
begin
  if merrylist_private.viewer_role() <> 'owner' then
    raise exception 'Owner access required' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('approved', 'denied') then
    raise exception 'Invalid review status' using errcode = '22023';
  end if;
  select * into idea from merrylist_private.gift_ideas where id = p_id for update;
  if not found or idea.status <> 'pending' then
    raise exception 'Gift suggestion is no longer pending' using errcode = '40001';
  end if;
  update merrylist_private.gift_ideas
  set status = p_status, reviewed_at = now()
  where id = p_id;
  if p_status = 'approved' then
    insert into merrylist_private.gift_catalog (id)
    values ('idea-' || p_id::text)
    on conflict (id) do nothing;
  end if;
end;
$$;

revoke all on function public.approved_gift_ideas() from public;
revoke all on function public.gift_ideas() from public, anon;
revoke all on function public.submit_gift_idea(text, numeric, text, text, text, text, text, text[]) from public, anon;
revoke all on function public.review_gift_idea(uuid, text) from public, anon;
grant execute on function public.approved_gift_ideas() to anon, authenticated;
grant execute on function public.gift_ideas() to authenticated;
grant execute on function public.submit_gift_idea(text, numeric, text, text, text, text, text, text[]) to authenticated;
grant execute on function public.review_gift_idea(uuid, text) to authenticated;
