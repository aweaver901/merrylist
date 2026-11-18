create table merrylist_private.spotify_playlist (
  singleton boolean primary key default true check (singleton),
  playlist_id text not null check (playlist_id ~ '^[A-Za-z0-9]{22}$'),
  playlist_name text not null check (char_length(btrim(playlist_name)) between 1 and 120),
  updated_at timestamptz not null default now()
);
alter table merrylist_private.spotify_playlist enable row level security;
revoke all on merrylist_private.spotify_playlist from public, anon, authenticated;

create function public.spotify_playlist_setting() returns jsonb
language sql stable security definer set search_path = '' as $$
  select (
    select jsonb_build_object(
      'id', playlist.playlist_id,
      'name', playlist.playlist_name
    )
    from merrylist_private.spotify_playlist playlist
    where playlist.singleton
  );
$$;

create function public.set_spotify_playlist(p_playlist_id text, p_playlist_name text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if merrylist_private.viewer_role() <> 'owner' then
    raise exception 'Owner access required' using errcode = '42501';
  end if;
  if p_playlist_id is null and p_playlist_name is null then
    delete from merrylist_private.spotify_playlist where singleton;
    return;
  end if;
  if p_playlist_id is null or p_playlist_id !~ '^[A-Za-z0-9]{22}$'
     or p_playlist_name is null or char_length(btrim(p_playlist_name)) not between 1 and 120 then
    raise exception 'Invalid Spotify playlist' using errcode = '22023';
  end if;
  insert into merrylist_private.spotify_playlist (singleton, playlist_id, playlist_name)
  values (true, p_playlist_id, btrim(p_playlist_name))
  on conflict (singleton) do update set
    playlist_id = excluded.playlist_id,
    playlist_name = excluded.playlist_name,
    updated_at = now();
end;
$$;

revoke all on function public.spotify_playlist_setting() from public;
revoke all on function public.set_spotify_playlist(text, text) from public, anon;
grant execute on function public.spotify_playlist_setting() to anon, authenticated;
grant execute on function public.set_spotify_playlist(text, text) to authenticated;
