# Flowcerta Governance Gate — Azure DevOps Task

Azure DevOps pipeline task for the [Flowcerta](https://flowcerta.com) governance gate. Validates RPA and automation workflow files for compliance.

## Usage

```yaml
- task: FlowcertaValidate@1
  displayName: Flowcerta Governance Gate
  inputs:
    apiKey: $(FLOWCERTA_API_KEY)
    files: $(Build.SourcesDirectory)/workflows/*.xaml
    platform: uipath
    enforcementMode: blocking
```

Store your API key as a secret pipeline variable named `FLOWCERTA_API_KEY`.

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `apiKey` | ✅ | — | Flowcerta API key. Use a secret pipeline variable. |
| `files` | ✅ | — | Glob pattern or path to workflow files. Supports `$(Build.SourcesDirectory)/workflows/*.xaml`. |
| `platform` | ✅ | — | `uipath` \| `power_automate` \| `aa` \| `blue_prism` |
| `enforcementMode` | ❌ | org default | `advisory` \| `warning` \| `blocking` |

## Environment Variables (optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `FLOWCERTA_API_URL` | `https://api.flowcerta.com` | Override for self-hosted deployments. |

## Metadata auto-injected

The task automatically captures and sends to Flowcerta:
- `BUILD_REPOSITORY_NAME` — repository name
- `BUILD_SOURCEBRANCH` — branch name (with `refs/heads/` stripped)
- `BUILD_SOURCEVERSION` — commit SHA (7-char short)
- `BUILD_BUILDID` — build ID
- `BUILD_BUILDNUMBER` — build number (e.g. `20260325.1`)
- `BUILD_DEFINITIONNAME` — pipeline definition name

## Examples

See [`../examples/azure-devops-basic.yml`](../examples/azure-devops-basic.yml) for a complete pipeline example.

## Build

```bash
npm install
npm run build   # outputs dist/index.js via ncc
npm test        # runs ts-jest unit tests
```
