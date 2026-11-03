create extension if not exists pgcrypto;
create table if not exists public.tickets (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 title text not null, description text not null, category text not null default 'Другое', status text not null default 'Новая',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint tickets_title_check check (char_length(trim(title)) between 1 and 200),
 constraint tickets_description_check check (char_length(trim(description)) between 1 and 5000),
 constraint tickets_category_check check (category in ('Бот','Интеграция','Отчёт','Другое')),
 constraint tickets_status_check check (status in ('Новая','В работе','Завершена'))
);
create index if not exists tickets_user_created_idx on public.tickets(user_id,created_at desc);
create index if not exists tickets_user_status_idx on public.tickets(user_id,status);
create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin if new.user_id<>old.user_id then raise exception 'user_id is immutable'; end if; if new.created_at<>old.created_at then raise exception 'created_at is immutable'; end if; new.updated_at=now(); return new; end; $$;
drop trigger if exists tickets_updated_at on public.tickets;
create trigger tickets_updated_at before update on public.tickets for each row execute function public.set_updated_at();
alter table public.tickets enable row level security;
drop policy if exists "tickets_select_own" on public.tickets; drop policy if exists "tickets_insert_own" on public.tickets; drop policy if exists "tickets_update_own" on public.tickets; drop policy if exists "tickets_delete_own" on public.tickets;
create policy "tickets_select_own" on public.tickets for select to authenticated using (user_id=(select auth.uid()));
create policy "tickets_insert_own" on public.tickets for insert to authenticated with check (user_id=(select auth.uid()));
create policy "tickets_update_own" on public.tickets for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "tickets_delete_own" on public.tickets for delete to authenticated using (user_id=(select auth.uid()));
revoke all on public.tickets from anon;
