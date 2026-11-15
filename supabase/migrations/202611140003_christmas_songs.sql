create table merrylist_private.christmas_songs (
  id uuid primary key default gen_random_uuid(),
  position bigint generated always as identity unique,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  artist text not null default '' check (char_length(artist) <= 160),
  audio_url text not null unique
    check (char_length(audio_url) <= 2048 and audio_url ~ '^https://[^[:space:]]+$'),
  source_url text not null
    check (char_length(source_url) <= 2048 and source_url ~ '^https://[^[:space:]]+$'),
  created_at timestamptz not null default now()
);
alter table merrylist_private.christmas_songs enable row level security;
revoke all on merrylist_private.christmas_songs from public, anon, authenticated;

insert into merrylist_private.christmas_songs (title, artist, audio_url, source_url) values
  (
    'Jingle Bells',
    'Starlifter and Roots in Blue · U.S. Air Force Band of Mid-America',
    'https://upload.wikimedia.org/wikipedia/commons/7/72/Jingle_Bells_%282020%29_-_Starlifter_and_Roots_in_Blue_-_United_States_Air_Force_Band_of_Mid-America.mp3',
    'https://commons.wikimedia.org/wiki/File:Jingle_Bells_(2020)_-_Starlifter_and_Roots_in_Blue_-_United_States_Air_Force_Band_of_Mid-America.mp3'
  ),
  (
    'Deck the Halls',
    'U.S. Air Force Band and Singing Sergeants',
    'https://upload.wikimedia.org/wikipedia/commons/5/53/Deck_the_Halls_%28USAFB_Concert_Band%29.ogg',
    'https://commons.wikimedia.org/wiki/File:Deck_the_Halls_(USAFB_Concert_Band).ogg'
  ),
  (
    'Joy to the World',
    'Starlifter and Roots in Blue · U.S. Air Force Band of Mid-America',
    'https://upload.wikimedia.org/wikipedia/commons/f/f1/Joy_to_the_World_%282020%29_-_Starlifter_and_Roots_in_Blue_-_United_States_Air_Force_Band_of_Mid-America.mp3',
    'https://commons.wikimedia.org/wiki/File:Joy_to_the_World_(2020)_-_Starlifter_and_Roots_in_Blue_-_United_States_Air_Force_Band_of_Mid-America.mp3'
  ),
  (
    'We Wish You a Merry Christmas',
    'Starlifter and Roots in Blue · U.S. Air Force Band of Mid-America',
    'https://upload.wikimedia.org/wikipedia/commons/6/65/We_Wish_You_a_Merry_Christmas_%282020%29_-_Starlifter_and_Roots_in_Blue_-_United_States_Air_Force_Band_of_Mid-America.mp3',
    'https://commons.wikimedia.org/wiki/File:We_Wish_You_a_Merry_Christmas_(2020)_-_Starlifter_and_Roots_in_Blue_-_United_States_Air_Force_Band_of_Mid-America.mp3'
  ),
  (
    'Silent Night',
    'Singing Sergeants · U.S. Air Force Band',
    'https://upload.wikimedia.org/wikipedia/commons/b/b8/Silent_Night_%281990%29_-_Singing_Sergeants_-_United_States_Air_Force_Band.mp3',
    'https://commons.wikimedia.org/wiki/File:Silent_Night_(1990)_-_Singing_Sergeants_-_United_States_Air_Force_Band.mp3'
  ),
  (
    'O Christmas Tree',
    'Airmen of Note · U.S. Air Force Band',
    'https://upload.wikimedia.org/wikipedia/commons/5/5c/O_Christmas_Tree_-_Airmen_of_Note_-_United_States_Air_Force_Band.mp3',
    'https://commons.wikimedia.org/wiki/File:O_Christmas_Tree_-_Airmen_of_Note_-_United_States_Air_Force_Band.mp3'
  );

create function public.christmas_songs() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', song.id,
    'title', song.title,
    'artist', song.artist,
    'audioUrl', song.audio_url,
    'sourceUrl', song.source_url
  ) order by song.position), '[]'::jsonb)
  from merrylist_private.christmas_songs song;
$$;

create function public.add_christmas_song(
  p_title text,
  p_artist text,
  p_audio_url text,
  p_source_url text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if merrylist_private.viewer_role() <> 'owner' then
    raise exception 'Owner access required' using errcode = '42501';
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 120
     or char_length(coalesce(p_artist, '')) > 160
     or p_audio_url is null or char_length(p_audio_url) > 2048 or p_audio_url !~ '^https://[^[:space:]]+$'
     or p_source_url is null or char_length(p_source_url) > 2048 or p_source_url !~ '^https://[^[:space:]]+$' then
    raise exception 'Invalid song details' using errcode = '22023';
  end if;
  insert into merrylist_private.christmas_songs (title, artist, audio_url, source_url)
  values (btrim(p_title), btrim(coalesce(p_artist, '')), btrim(p_audio_url), btrim(p_source_url))
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.christmas_songs() from public;
revoke all on function public.add_christmas_song(text, text, text, text) from public, anon;
grant execute on function public.christmas_songs() to anon, authenticated;
grant execute on function public.add_christmas_song(text, text, text, text) to authenticated;
