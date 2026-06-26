#!/usr/bin/env bash
# raw-curl-power-platform.sh — Validate a Power Automate flow from a
# Power Platform Pipelines extension (or any custom Power Platform ALM hook)
# and forward Power Platform pipeline context so the validation record links
# back to the deployment.
#
# Usage:
#   FLOWCERTA_API_KEY=fc_live_... ./raw-curl-power-platform.sh flows/Main.json
#
# Required env vars:
#   FLOWCERTA_API_KEY    — Flowcerta API key
#
# Power Platform pipeline context env vars (set by your pipeline extension):
#   PIPELINE_NAME        — e.g. "Core ALM Pipeline"
#   STAGE_NAME           — e.g. "QA" or "Production"
#   DEPLOYMENT_ID        — Power Platform deployment id (e.g. dep-12345)
#   SOLUTION_NAME        — Dataverse solution name being deployed
#   SOLUTION_VERSION     — solution version string
#   ENVIRONMENT_NAME     — target environment display name
#   ENVIRONMENT_ID       — target environment GUID
#   DEPLOYMENT_URL       — link back to the deployment in admin center
#
# Optional env vars:
#   FLOWCERTA_API_URL    — API base URL (default: https://api.flowcerta.com)
#   POLICY_PACK_SLUG     — policy pack slug to enforce instead of org default
#   POLICY_ENVIRONMENT   — environment profile within the policy pack
#                          (e.g. "qa", "prod") — selects per-environment
#                          enforcement thresholds. Not the Power Platform
#                          environment GUID; that goes in the metadata block.
#   ENFORCEMENT_MODE     — advisory | warning | blocking (default: org default)

set -euo pipefail

FILE="${1:?Usage: $0 <flow-file>}"
API_URL="${FLOWCERTA_API_URL:-https://api.flowcerta.com}"

if [[ -z "${FLOWCERTA_API_KEY:-}" ]]; then
  echo "Error: FLOWCERTA_API_KEY is not set" >&2
  exit 1
fi

FILENAME=$(basename "$FILE")

# Build the canonical Power Platform pipeline metadata block.
# Field names match the snake_case contract pinned by the backend's
# ValidationPipelineMetadataParser and the dashboard's ValidationsPage.
METADATA=$(cat <<JSON
{
  "pipeline": "power_platform",
  "host": "power-platform-pipelines",
  "pipeline_name":    "${PIPELINE_NAME:-}",
  "stage_name":       "${STAGE_NAME:-}",
  "deployment_id":    "${DEPLOYMENT_ID:-}",
  "solution_name":    "${SOLUTION_NAME:-}",
  "solution_version": "${SOLUTION_VERSION:-}",
  "environment_name": "${ENVIRONMENT_NAME:-}",
  "environment_id":   "${ENVIRONMENT_ID:-}",
  "deployment_url":   "${DEPLOYMENT_URL:-}"
}
JSON
)

LABEL="${SOLUTION_NAME:-power-automate} / ${STAGE_NAME:-unknown} / ${FILENAME}"

EXTRA_FIELDS=()
[[ -n "${ENFORCEMENT_MODE:-}" ]]   && EXTRA_FIELDS+=(-F "enforcement_mode=${ENFORCEMENT_MODE}")
[[ -n "${POLICY_PACK_SLUG:-}" ]]   && EXTRA_FIELDS+=(-F "policy_pack=${POLICY_PACK_SLUG}")
[[ -n "${POLICY_ENVIRONMENT:-}" ]] && EXTRA_FIELDS+=(-F "environment=${POLICY_ENVIRONMENT}")

RESPONSE=$(curl -s \
  -X POST "${API_URL}/api/v1/validate" \
  -H "Authorization: Bearer ${FLOWCERTA_API_KEY}" \
  -F "file=@${FILE};filename=${FILENAME}" \
  -F "platform=power_automate" \
  -F "source=cicd" \
  -F "label=${LABEL}" \
  -F "metadata=${METADATA}" \
  "${EXTRA_FIELDS[@]}" \
  -w "\n%{http_code}") || { echo "Error: curl failed" >&2; exit 1; }

HTTP_STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)

if [[ "$HTTP_STATUS" == "422" ]]; then
  echo "❌ ${FILENAME} — FAILED (policy pack: ${POLICY_PACK_SLUG:-org default})"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
  exit 1
elif [[ "$HTTP_STATUS" == "200" ]]; then
  SCORE=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('score','—'))" 2>/dev/null || echo "—")
  echo "✅ ${FILENAME} — PASSED (Score: ${SCORE}, policy pack: ${POLICY_PACK_SLUG:-org default})"
else
  echo "Error: API returned HTTP ${HTTP_STATUS}" >&2
  echo "$BODY" >&2
  exit 1
fi
