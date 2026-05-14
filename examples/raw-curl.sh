#!/usr/bin/env bash
# raw-curl.sh — Validate a single workflow file via the Flowcerta API
#
# Usage:
#   FLOWCERTA_API_KEY=fc_live_... ./raw-curl.sh workflows/Main.xaml
#
# Required env vars:
#   FLOWCERTA_API_KEY   — your Flowcerta API key
#
# Optional env vars:
#   FLOWCERTA_API_URL   — API base URL (default: https://api.flowcerta.com)
#   PLATFORM            — uipath | power_automate | aa | blue_prism (default: uipath)
#   ENFORCEMENT_MODE    — advisory | warning | blocking (default: org default)
#   POLICY_PACK_SLUG    — policy pack slug to enforce (default: org default)

set -euo pipefail

FILE="${1:?Usage: $0 <workflow-file>}"
API_URL="${FLOWCERTA_API_URL:-https://api.flowcerta.com}"
PLATFORM="${PLATFORM:-uipath}"
ENFORCEMENT_MODE="${ENFORCEMENT_MODE:-}"

if [[ -z "${FLOWCERTA_API_KEY:-}" ]]; then
  echo "Error: FLOWCERTA_API_KEY is not set" >&2
  exit 1
fi

FILENAME=$(basename "$FILE")
LABEL="${CI_REPO:-local} / ${CI_BRANCH:-unknown} / ${FILENAME}"

EXTRA_FIELDS=()
[[ -n "$ENFORCEMENT_MODE" ]] && EXTRA_FIELDS+=(-F "enforcement_mode=$ENFORCEMENT_MODE")
[[ -n "${POLICY_PACK_SLUG:-}" ]] && EXTRA_FIELDS+=(-F "policy_pack_slug=${POLICY_PACK_SLUG}")

RESPONSE=$(curl -s \
  -X POST "${API_URL}/api/v1/validate" \
  -H "Authorization: Bearer ${FLOWCERTA_API_KEY}" \
  -F "file=@${FILE};filename=${FILENAME}" \
  -F "platform=${PLATFORM}" \
  -F "source=cicd" \
  -F "label=${LABEL}" \
  "${EXTRA_FIELDS[@]}" \
  -w "\n%{http_code}") || { echo "Error: curl failed" >&2; exit 1; }

HTTP_STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)

if [[ "$HTTP_STATUS" == "422" ]]; then
  echo "❌ ${FILENAME} — FAILED"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
  exit 1
elif [[ "$HTTP_STATUS" == "200" ]]; then
  SCORE=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('score','—'))" 2>/dev/null || echo "—")
  echo "✅ ${FILENAME} — PASSED (Score: ${SCORE})"
else
  echo "Error: API returned HTTP ${HTTP_STATUS}" >&2
  echo "$BODY" >&2
  exit 1
fi
