import * as tl from 'azure-pipelines-task-lib/task';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import { glob } from 'glob';
import { buildAzureMetadata, processResponse } from './validate';

async function run(): Promise<void> {
  const apiKey = tl.getInput('apiKey', true)!;
  const filesPattern = tl.getInput('files', true)!;
  const platform = tl.getInput('platform', true)!;
  const enforcementMode = tl.getInput('enforcementMode') ?? '';
  const policyPackSlug = tl.getInput('policyPackSlug') ?? '';
  const apiUrl = process.env.FLOWCERTA_API_URL ?? 'https://api.flowcerta.com';

  const metadata = buildAzureMetadata(process.env);
  const files = await glob(filesPattern);

  if (files.length === 0) {
    tl.warning(`No files matched: ${filesPattern}`);
    return;
  }

  let anyFailed = false;

  for (const file of files) {
    const filename = path.basename(file);
    console.log(`→ Validating: ${filename}`);

    const form = new FormData();
    form.append('file', fs.createReadStream(file), filename);
    form.append('platform', platform);
    form.append('source', 'cicd');
    form.append('metadata', JSON.stringify(metadata));
    form.append('label', `${metadata.build_number} / ${filename}`);
    if (enforcementMode) form.append('enforcement_mode', enforcementMode);
    if (policyPackSlug) form.append('policy_pack', policyPackSlug);

    const response = await fetch(`${apiUrl}/api/v1/validate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    const body = await response.json() as any;
    const result = processResponse(response.status, body);

    if (result.failed) {
      anyFailed = true;
      tl.error(`❌ ${filename} — FAILED (Score: ${result.score ?? '—'})`);
      for (const f of result.blockingFindings) {
        tl.error(`  ${f.severity.toUpperCase()}: ${f.description} (${f.location})`);
      }
    } else {
      console.log(`✅ ${filename} — PASSED (Score: ${result.score ?? '—'})`);
    }
  }

  if (anyFailed) {
    tl.setResult(tl.TaskResult.Failed, 'One or more files failed governance validation.');
  }
}

run().catch(err => tl.setResult(tl.TaskResult.Failed, (err as Error).message));
