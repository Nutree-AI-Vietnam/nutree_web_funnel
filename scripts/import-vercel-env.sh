#!/usr/bin/env bash
set -euo pipefail

target=${1:?"Usage: ./scripts/import-vercel-env.sh <preview|production> <env-file>"}
env_file=${2:?"Usage: ./scripts/import-vercel-env.sh <preview|production> <env-file>"}

case "$target" in
  preview|production) ;;
  *)
    echo "Target must be preview or production." >&2
    exit 1
    ;;
esac

if [[ ! -f "$env_file" ]]; then
  echo "Environment file not found: $env_file" >&2
  exit 1
fi

while IFS='=' read -r key value || [[ -n "$key" ]]; do
  [[ -z "$key" || "$key" == \#* ]] && continue

  if [[ -z "$value" ]]; then
    echo "Skipping $key because it has no value."
    continue
  fi

  # Local dotenv files escape literal leading "$" characters so Next does not
  # expand provider package identifiers. Remove that transport-only escape
  # before sending the value to Vercel.
  if [[ "${value:0:1}" == "\\" && "${value:1:1}" == '$' ]]; then
    value="${value:1}"
  fi

  printf '%s' "$value" | npx vercel env add "$key" "$target" --force --yes --non-interactive
done < "$env_file"

echo "Imported non-empty variables from $env_file into Vercel $target. Redeploy to apply them."
