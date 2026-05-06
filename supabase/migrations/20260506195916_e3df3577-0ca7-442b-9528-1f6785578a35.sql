
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  initial_capital numeric not null default 0,
  currency text not null default 'USD',
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- trades
create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pair text not null,
  side text not null check (side in ('long','short')),
  entry_price numeric,
  exit_price numeric,
  lot_size numeric,
  pnl numeric not null default 0,
  notes text,
  traded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.trades enable row level security;
create policy "trades_select_own" on public.trades for select using (auth.uid() = user_id);
create policy "trades_insert_own" on public.trades for insert with check (auth.uid() = user_id);
create policy "trades_update_own" on public.trades for update using (auth.uid() = user_id);
create policy "trades_delete_own" on public.trades for delete using (auth.uid() = user_id);
create index trades_user_traded_idx on public.trades(user_id, traded_at desc);

-- capital_movements
create table public.capital_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('deposit','withdraw')),
  amount numeric not null check (amount > 0),
  note text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.capital_movements enable row level security;
create policy "cm_select_own" on public.capital_movements for select using (auth.uid() = user_id);
create policy "cm_insert_own" on public.capital_movements for insert with check (auth.uid() = user_id);
create policy "cm_update_own" on public.capital_movements for update using (auth.uid() = user_id);
create policy "cm_delete_own" on public.capital_movements for delete using (auth.uid() = user_id);

-- chat_messages
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.chat_messages enable row level security;
create policy "chat_select_own" on public.chat_messages for select using (auth.uid() = user_id);
create policy "chat_insert_own" on public.chat_messages for insert with check (auth.uid() = user_id);
create policy "chat_delete_own" on public.chat_messages for delete using (auth.uid() = user_id);
create index chat_user_created_idx on public.chat_messages(user_id, created_at);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
