#!/usr/bin/env bash
# Seed reference data (categories). Idempotent.
set -euo pipefail
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"

cd "$(dirname "$0")/.."
set -a; source .env.local; set +a
DB="${SUPABASE_DB_URL:?SUPABASE_DB_URL is not set in .env.local}"

psql "$DB" -v ON_ERROR_STOP=1 -f supabase/seed.sql
echo "seed applied."
