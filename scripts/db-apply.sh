#!/usr/bin/env bash
# Apply pending SQL migrations to the cloud Postgres, tracking applied versions
# in supabase_migrations.schema_migrations (compatible with the Supabase CLI).
set -euo pipefail
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"

cd "$(dirname "$0")/.."
set -a; source .env.local; set +a
DB="${SUPABASE_DB_URL:?SUPABASE_DB_URL is not set in .env.local}"

psql "$DB" -v ON_ERROR_STOP=1 -q <<'SQL'
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);
SQL

for f in supabase/migrations/*.sql; do
  [ -e "$f" ] || continue
  base=$(basename "$f")
  version=$(echo "$base" | sed -E 's/^([0-9]+)_.*/\1/')
  name=$(echo "$base" | sed -E 's/^[0-9]+_(.*)\.sql/\1/')
  applied=$(psql "$DB" -tAc "select 1 from supabase_migrations.schema_migrations where version='${version}'")
  if [ "$applied" = "1" ]; then
    echo "skip   ${version}  (${name})"
    continue
  fi
  echo "apply  ${version}  (${name})"
  psql "$DB" -v ON_ERROR_STOP=1 --single-transaction -f "$f"
  psql "$DB" -v ON_ERROR_STOP=1 -q \
    -c "insert into supabase_migrations.schema_migrations(version, name) values ('${version}', '${name}')"
done

echo "migrations applied."
