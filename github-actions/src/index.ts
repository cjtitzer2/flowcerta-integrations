import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { buildGitHubMetadata, buildLabel, parseResponseBody, processResponse, ValidationResult } from './validate';

async function run(): Promise<void> {
  const apiKey = core.getInput('api_key', { required: true });
  const orgId = core.getInput('org_id', { required: true });
  const filesInput = core.getInput('files', { required: true });
  const platform = core.getInput('platform', { required: true });
  const ruleset = core.getInput('ruleset');
  const enforcementMode = core.getInput('enforcement_mode');
  const policyPackSlug = core.getInput('policy_pack_slug');
  const labelInput = core.getInput('label');
  const apiUrl = core.getInput('api_url');

  const files = filesInput.split('\n').map(f => f.trim()).filter(Boolean);
  const metadata = buildGitHubMetadata(github.context);

  const results: ValidationResult[] = [];
  let anyFailed = false;

  for (const file of files) {
    const filename = path.basename(file);
    const label = buildLabel(metadata, filename, labelInput);

    core.info(`→ Validating: ${filename}`);

    const form = new FormData();
    // Send octet-stream so the API skips MIME sniffing (it still validates
    // file structure). Avoids form-data guessing e.g. application/xaml+xml for
    // .xaml, which the API rejects.
    form.append('file', fs.createReadStream(file), {
      filename,
      contentType: 'application/octet-stream',
    });
    form.append('platform', platform);
    form.append('source', 'cicd');
    form.append('metadata', JSON.stringify(metadata));
    form.append('label', label);
    if (ruleset) form.append('ruleset', ruleset);
    if (enforcementMode) form.append('enforcement_mode', enforcementMode);
    if (policyPackSlug) form.append('policy_pack', policyPackSlug);

    const response = await fetch(`${apiUrl}/api/v1/validate`, {
      method: 'POST',
      headers: { Authorization: `ApiKey ${apiKey}`, 'X-Org-Id': orgId },
      body: form,
    });

    const body = parseResponseBody(await response.text());
    const result = processResponse(response.status, body);
    results.push(result);

    if (result.failed) {
      anyFailed = true;
      core.error(`❌ ${filename} — FAILED (Score: ${result.score ?? '—'})`);
      for (const f of result.blockingFindings) {
        core.error(`  ${f.severity.toUpperCase()}: ${f.description} (${f.location})`);
      }
    } else {
      core.info(`✅ ${filename} — PASSED (Score: ${result.score ?? '—'})`);
    }
  }

  core.setOutput('validation_ids', results.map(r => r.validationId ?? '').join(','));
  core.setOutput('passed', String(!anyFailed));
  core.setOutput('report_urls', results.map(r => r.reportUrl ?? '').join(','));

  if (anyFailed) {
    core.setFailed('One or more workflow files failed governance validation.');
  }
}

run().catch(err => core.setFailed((err as Error).message));
