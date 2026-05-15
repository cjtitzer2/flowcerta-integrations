# Flowcerta Governance Gate

Stop shipping risky automation workflows. The Flowcerta Governance Gate validates UiPath, Power Automate, Automation Anywhere, and Blue Prism workflow files in your Azure Pipelines builds — and fails the build when a finding crosses your blocking threshold.

## What it does

For every workflow file you point it at, the task:

1. Posts the file to the Flowcerta validation API along with auto-detected pipeline context (repository, branch, commit, build number).
2. Receives a governance score (0–100), ranked findings, and a pass/fail status.
3. Writes a structured summary to the pipeline log.
4. Exits non-zero when running in **blocking** enforcement mode and any critical or high finding is present — failing the build automatically.

## Quick start

```yaml
- task: FlowcertaValidate@1
  displayName: Flowcerta Governance Gate
  inputs:
    apiKey: $(FLOWCERTA_API_KEY)
    files: $(Build.SourcesDirectory)/workflows/*.xaml
    platform: uipath
    enforcementMode: blocking
```

Store your API key as a secret pipeline variable named `FLOWCERTA_API_KEY`. Get a key from the **Team → API Keys** page inside the Flowcerta dashboard.

## Inputs

| Input | Required | Description |
|---|---|---|
| `apiKey` | yes | Flowcerta API key (`fc_live_…` or `fc_test_…`). Store as a secret pipeline variable. |
| `files` | yes | Glob pattern or path to workflow files. Supports `$(Build.SourcesDirectory)/workflows/*.xaml`. |
| `platform` | yes | `uipath` · `power_automate` · `aa` · `blue_prism` |
| `enforcementMode` | no | `advisory` (never block) · `warning` · `blocking` (fail on critical/high). Default: org default. |
| `policyPackSlug` | no | Policy pack slug (e.g. `soc2-prod`) to enforce. Default: org default. |

## Enforcement modes

| Mode | Behavior |
|---|---|
| Advisory | Findings reported, build never fails on Flowcerta status. |
| Warning | Same as advisory; log severity differs. |
| Blocking | Build fails (non-zero exit) when any critical/high finding lands. |

## Auto-injected pipeline context

You don't have to configure these — the task reads Azure DevOps environment variables and forwards them with the validation request, so each validation lands in the Flowcerta dashboard with full traceability:

- Repository name, branch (with `refs/heads/` stripped), commit SHA
- Build ID, build number, pipeline definition name

## Where to look

- **Flowcerta dashboard:** every API/CI run appears in the Validations feed with the pipeline context above attached.
- **Per-validation evidence export:** Pro and Enterprise accounts can pull a per-framework audit evidence report from `GET /api/v1/results/{id}/compliance/{frameworkId}/export`.
- **Compliance mapping:** [flowcerta.com/compliance](https://flowcerta.com/compliance) shows which Flowcerta rules satisfy which SOC 2, HIPAA, GDPR, and PCI DSS controls.

## Pricing

- **Starter — Free.** 25 analyses / month, no credit card.
- **Growth — $19/mo.** 100 analyses, RBAC, validation history.
- **Pro — $49/mo.** Unlimited users + analyses, audit evidence export.
- **Enterprise.** Custom — SSO, DPA, custom framework mapping.

See [flowcerta.com/pricing](https://flowcerta.com/pricing) for the current plans.

## Links

- 🏠 [Flowcerta](https://flowcerta.com)
- 📖 [API docs](https://flowcerta.com/api-docs) · [OpenAPI spec](https://app.flowcerta.com/api-docs/openapi.json)
- 🛡 [Compliance framework mapping](https://flowcerta.com/compliance)
- 💬 [Contact](https://flowcerta.com/contact/)
- 🐛 [Issues](https://github.com/cjtitzer2/flowcerta-integrations/issues)
