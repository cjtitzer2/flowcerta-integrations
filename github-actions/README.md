# flowcerta/validate-action

GitHub Action for the [Flowcerta](https://flowcerta.com) governance gate. Validates RPA and automation workflow files for compliance before merging.

## Usage

```yaml
- uses: flowcerta/validate-action@v1
  with:
    api_key: ${{ secrets.FLOWCERTA_API_KEY }}
    files: |
      workflows/InvoiceProcessing.xaml
      workflows/PaymentApproval.xaml
    platform: uipath
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `api_key` | ✅ | — | Flowcerta API key. Store as a repository secret. |
| `files` | ✅ | — | Newline-separated list of workflow files to validate. |
| `platform` | ✅ | — | `uipath` \| `power_automate` \| `aa` \| `blue_prism` |
| `ruleset` | ❌ | org default | Ruleset ID to apply. |
| `enforcement_mode` | ❌ | org default | `advisory` \| `warning` \| `blocking` |
| `label` | ❌ | auto-generated | Human-readable label shown in Flowcerta dashboard. |
| `api_url` | ❌ | `https://api.flowcerta.com` | Override for self-hosted deployments. |

## Outputs

| Output | Description |
|--------|-------------|
| `validation_ids` | Comma-separated list of validation IDs |
| `passed` | `true` if all files passed, `false` if any failed |
| `report_urls` | Comma-separated list of report URLs in Flowcerta dashboard |

## Metadata auto-injected

The action automatically captures and sends to Flowcerta:
- Repository name (`owner/repo`)
- Branch name
- Commit SHA (7-char short)
- Workflow run URL
- PR URL (if triggered on `pull_request`)
- Actor (who triggered the run)

## Examples

**Basic — single file:**
See [`../examples/github-actions-basic.yml`](../examples/github-actions-basic.yml)

**Multi-file — scan whole directory:**
See [`../examples/github-actions-multi-file.yml`](../examples/github-actions-multi-file.yml)

## Build

```bash
npm install
npm run build   # outputs dist/index.js via ncc
npm test        # runs ts-jest unit tests
```
