-- HB-095 / HB-097（D-114 の追記）：本物の表に入れた2つの migration の写し
-- 1) hb095_room_form_32（2026-11-27 14:41 JST。PR #66 のマージより先）
--    ページが合言葉の番号を SHA-256 の先頭32文字にするので、room の決まりを広げる。
--    8文字の古い形も通す（表を読めなくしたので、古い形が残っても害は無い）。
alter table public.throws drop constraint throws_room_check;
alter table public.throws add constraint throws_room_check check (char_length(room) between 3 and 49);
alter table public.throws drop constraint throws_room_form;
alter table public.throws add constraint throws_room_form check (room ~ '^([0-9a-f]{8}|[0-9a-f]{32})-[a-z0-9]{1,16}$');

-- 2) hb095_close_throws_read（2026-11-27 18:15 JST。PR #66 が公開ページに出たあと）
--    ページは相手の投げを broadcast で受けるので、表 throws を外から読めないようにする。
drop policy if exists "anyone can read throws" on public.throws;
alter publication supabase_realtime drop table public.throws;
