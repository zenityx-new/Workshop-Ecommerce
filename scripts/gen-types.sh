#!/usr/bin/env bash
# Generate TypeScript types from the live database schema.
#
# Preferred (no container needed): set SUPABASE_ACCESS_TOKEN in .env.local, then
# this uses the hosted Management API via --project-id.
# Fallback (needs Docker/podman): --db-url spins up a local postgres-meta image.
set -euo pipefail

cd "$(dirname "$0")/.."
set -a; source .env.local; set +a

OUT="src/lib/supabase/database.types.ts"
TMP="$(mktemp)"

if [ -n "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "generating types via Management API (project-id)…"
  supabase gen types typescript \
    --project-id "${SUPABASE_PROJECT_ID:-pxzfnnupgsmgaqnsoxgb}" \
    --schema public > "$TMP"
else
  echo "generating types via --db-url (requires Docker/podman)…"
  supabase gen types typescript --db-url "${SUPABASE_DB_URL:?}" --schema public > "$TMP"
fi

# Only overwrite when the output looks like real TypeScript (guards against the
# CLI writing an error blob into the file).
if grep -q "export type Database" "$TMP"; then
  mv "$TMP" "$OUT"
  echo "types written to $OUT"
else
  echo "ERROR: type generation did not produce valid output; keeping existing $OUT" >&2
  echo "---- output was: ----" >&2
  head -c 400 "$TMP" >&2; echo >&2
  rm -f "$TMP"
  exit 1
fi
