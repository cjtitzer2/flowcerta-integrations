# flowcerta-integrations

CI/CD integration artifacts for the [Flowcerta](https://flowcerta.com) RPA governance platform.

This repo contains thin REST wrappers around the Flowcerta Validation API that auto-inject pipeline metadata (repo, branch, commit, PR URL) so you don't have to configure it.

## Integrations

| Integration | Directory | Status |
|-------------|-----------|--------|
| GitHub Actions | [`github-actions/`](github-actions/) | ✅ Available |
| Azure DevOps | [`azure-devops/`](azure-devops/) | ✅ Available |
| Raw curl | [`examples/raw-curl.sh`](examples/raw-curl.sh) | ✅ Available |

## Quick Start

### GitHub Actions

```yaml
- uses: flowcerta/validate-action@v1
  with:
    api_key: ${{ secrets.FLOWCERTA_API_KEY }}
    files: workflows/Main.xaml
    platform: uipath
```

See [`examples/github-actions-basic.yml`](examples/github-actions-basic.yml) for a full workflow example.

### Azure DevOps

```yaml
- task: FlowcertaValidate@1
  inputs:
    apiKey: $(FLOWCERTA_API_KEY)
    files: $(Build.SourcesDirectory)/workflows/*.xaml
    platform: uipath
```

See [`examples/azure-devops-basic.yml`](examples/azure-devops-basic.yml) for a full pipeline example.

### Raw curl

```bash
FLOWCERTA_API_KEY=fc_live_... ./examples/raw-curl.sh workflows/Main.xaml
```

## How It Works

Each integration:

1. Reads pipeline context automatically (no manual config required)
2. Posts each workflow file to `POST /api/v1/validate` as multipart form data
3. Passes the enforcement mode configured for your org (or overridden in the pipeline)
4. Exits non-zero if `enforcement_mode=blocking` and blocking findings are found

## Enforcement Modes

| Mode | Behaviour |
|------|-----------|
| `advisory` | Reports findings, never blocks the pipeline |
| `warning` | Reports findings, never blocks the pipeline |
| `blocking` | Fails the pipeline if critical or high findings are found |

The mode defaults to your org setting in Flowcerta. You can override it per-pipeline.

## API Keys

- **Live keys** (`fc_live_...`): Count against your plan quota
- **Test keys** (`fc_test_...`): Always return 200 (pass), never count quota — use in non-production pipelines

## API Documentation

Full API reference is available at `https://api.flowcerta.com/swagger` on a running instance.
The validation endpoint is `POST /api/v1/validate` (multipart form data).
