#!/usr/bin/env bash
set -euo pipefail

target="${1:-}"
if [[ "$target" != "preview" && "$target" != "production" && "$target" != "both" ]]; then
  echo "Usage: $0 <preview|production|both>" >&2
  exit 2
fi

verify_linked_project() {
  local metadata_file=".vercel/repo.json"
  if [[ ! -f "$metadata_file" ]]; then
    echo "Missing $metadata_file. Run 'vercel link' for the approved quiz project first." >&2
    exit 1
  fi

  EXPECTED_VERCEL_PROJECT_ID="prj_YDef2X7CYY9mz4kqAb5J0apwWTyd" \
    EXPECTED_VERCEL_ORG_ID="team_codtnSUDmwIhkWn8oTizysI1" \
    node - "$metadata_file" <<'NODE'
const fs = require('node:fs');

const metadata = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const project = metadata.projects?.[0];
if (
  project?.id !== process.env.EXPECTED_VERCEL_PROJECT_ID ||
  project?.orgId !== process.env.EXPECTED_VERCEL_ORG_ID
) {
  console.error('The linked Vercel project/org does not match nutree_web_funnel.');
  process.exit(1);
}
NODE
}

verify_linked_project

if [[ "$target" == "production" || "$target" == "both" ]] && [[ "${CONFIRM_PRODUCTION_DEPLOY:-}" != "1" ]]; then
  echo "Production deploys require CONFIRM_PRODUCTION_DEPLOY=1." >&2
  exit 1
fi

if [[ "${SKIP_WEB_CHECKS:-0}" != "1" ]]; then
  npm test
  npm run build
fi

deploy_target() {
  local environment="$1"
  if [[ "$environment" == "preview" ]]; then
    echo "Deploying the linked Vercel project as a preview..."
    npx vercel --yes
  else
    echo "Deploying the linked Vercel project to production..."
    npx vercel --prod --yes
  fi
}

case "$target" in
  preview) deploy_target preview ;;
  production) deploy_target production ;;
  both)
    deploy_target preview
    deploy_target production
    ;;
esac

cat <<'EOF'

Deployment submitted. Verify the custom domains separately:
  staging:    https://quiz.preview.nutreeai.com/auth/email-link
  production: https://quiz.nutreeai.com/auth/email-link

The Vercel project must own both custom domains before these URLs can serve
this project. Do not treat the generated *.vercel.app URL as domain proof.
EOF
