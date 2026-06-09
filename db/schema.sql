create extension if not exists pg_trgm;

create table if not exists categories (
  slug          text primary key,
  name          text not null,
  icon          text,
  blurb         text,
  rank          int  default 0,
  product_count int  default 0,
  updated_at    timestamptz default now()
);

create table if not exists products (
  id               text primary key,
  name             text not null,
  summary          text,
  description      text,
  price            numeric not null,
  currency         text default 'LKR',
  compare_at_price numeric,
  image            text,
  images           jsonb default '[]'::jsonb,
  category         text,
  category_slug    text references categories(slug),
  url              text,
  in_stock         boolean default true,
  stock_level      text,
  variants         jsonb default '[]'::jsonb,
  addons           jsonb default '[]'::jsonb,
  attributes       jsonb default '{}'::jsonb,
  is_featured      boolean default false,
  rank             int default 0,
  raw              jsonb,
  synced_at        timestamptz default now()
);

create index if not exists products_category_idx on products(category_slug);
create index if not exists products_featured_idx on products(is_featured);
create index if not exists products_name_trgm on products using gin (name gin_trgm_ops);
