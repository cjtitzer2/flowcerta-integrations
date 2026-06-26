export interface PipelineMetadata {
  pipeline: 'github-actions';
  repository: string;
  branch: string;
  commit: string;
  workflowRunUrl: string; // matches d.pipeline.workflowRunUrl in ValidationsPage.jsx
  prUrl: string;          // matches d.pipeline.prUrl in ValidationsPage.jsx
  actor: string;
}

export interface ValidationResult {
  failed: boolean;
  score: number | null;
  validationId: string | null;
  reportUrl: string | null;
  blockingFindings: BlockingFinding[];
}

export interface BlockingFinding {
  severity: string;
  description: string;
  location: string;
}

interface GitHubContext {
  repo: { owner: string; repo: string };
  ref: string;
  sha: string;
  runId: number;
  actor: string;
  payload: { pull_request?: { number?: number } };
}

export function buildGitHubMetadata(ctx: GitHubContext): PipelineMetadata {
  const repoPath = `${ctx.repo.owner}/${ctx.repo.repo}`;
  const prNumber = ctx.payload.pull_request?.number;
  return {
    pipeline: 'github-actions',
    repository: repoPath,
    branch: ctx.ref.replace('refs/heads/', ''),
    commit: ctx.sha.slice(0, 7),
    workflowRunUrl: `https://github.com/${repoPath}/actions/runs/${ctx.runId}`,
    prUrl: prNumber ? `https://github.com/${repoPath}/pull/${prNumber}` : '',
    actor: ctx.actor,
  };
}

export function buildLabel(metadata: PipelineMetadata, filename: string, override: string): string {
  if (override) return override;
  return `${metadata.repository} / ${metadata.branch} / ${filename}`;
}

export function processResponse(status: number, body: any): ValidationResult {
  if (status === 422) {
    return {
      failed: true,
      score: body.score ?? null,
      validationId: body.validation_id ?? null,
      reportUrl: body.report_url ?? null,
      blockingFindings: body.blocking_findings ?? [],
    };
  }
  if (status >= 200 && status < 300) {
    return {
      failed: false,
      score: body.score ?? null,
      validationId: body.validation_id ?? null,
      reportUrl: body.report_url ?? null,
      blockingFindings: [],
    };
  }
  throw new Error(`API error ${status}: ${JSON.stringify(body)}`);
}
