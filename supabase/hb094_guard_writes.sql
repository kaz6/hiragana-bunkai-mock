-- HB-094（D-114）知らない人と遊ぶ前の守り（作者 2026-11-27 11:21「たのみます」・12:29「やる」）
-- 本物の Supabase（iwcskmwqtcwkbhhnnvad）に、相談チャットが migration「hb094_guard_writes」として 2026-11-27 12:30 に入れたものの写し。
-- 1 中身の決まり  2 書き込みの勢いの上限  3 古い投げ（7日より前）を消す
create schema if not exists hb_private;
revoke all on schema hb_private from public, anon, authenticated;

alter table public.throws add constraint throws_room_form check (room ~ '^[0-9a-f]{8}-[a-z0-9]{1,16}$');
alter table public.throws add constraint throws_player_form check (player ~ '^[a-z0-9]{1,16}$');
alter table public.throws add constraint throws_word_kana check (word ~ '^[ぁ-ゖー。∘]+$');
alter table public.rejects add constraint rejects_player_form check (player ~ '^[a-z0-9]{1,16}$');
alter table public.rejects add constraint rejects_word_kana check (word ~ '^[ぁ-ゖー。∘]+$');
alter table public.exchange_votes add constraint votes_words_kana check (prev_word ~ '^[ぁ-ゖー。∘]+$' and reply_word ~ '^[ぁ-ゖー。∘]+$');
alter table public.exchange_votes add constraint votes_mode_form check (mode in ('cpu','online'));

create index if not exists throws_created_at_idx on public.throws (created_at);
create index if not exists rejects_created_at_idx on public.rejects (created_at);
create index if not exists votes_created_at_idx on public.exchange_votes (created_at);

create or replace function hb_private.guard_throws() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  new.created_at := now();
  if (select count(*) from public.throws where room = new.room and created_at > now() - interval '1 minute') >= 120 then
    raise exception 'too many throws in this room' using errcode = 'P0001';
  end if;
  if (select count(*) from public.throws where room = new.room) >= 400 then
    raise exception 'room is full' using errcode = 'P0001';
  end if;
  delete from public.throws where created_at < now() - interval '7 days';
  return new;
end $$;

create or replace function hb_private.guard_rejects() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  new.created_at := now();
  if (select count(*) from public.rejects where created_at > now() - interval '1 minute') >= 300
     or (select count(*) from public.rejects where player = new.player and created_at > now() - interval '1 minute') >= 60 then
    raise exception 'too many rejects' using errcode = 'P0001';
  end if;
  return new;
end $$;

create or replace function hb_private.guard_votes() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  new.created_at := now();
  if (select count(*) from public.exchange_votes where created_at > now() - interval '1 minute') >= 120 then
    raise exception 'too many votes' using errcode = 'P0001';
  end if;
  return new;
end $$;

revoke all on function hb_private.guard_throws() from public, anon, authenticated;
revoke all on function hb_private.guard_rejects() from public, anon, authenticated;
revoke all on function hb_private.guard_votes() from public, anon, authenticated;

create trigger guard_throws before insert on public.throws for each row execute function hb_private.guard_throws();
create trigger guard_rejects before insert on public.rejects for each row execute function hb_private.guard_rejects();
create trigger guard_votes before insert on public.exchange_votes for each row execute function hb_private.guard_votes();
