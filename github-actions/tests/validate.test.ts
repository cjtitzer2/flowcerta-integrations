import { buildGitHubMetadata, buildLabel, parseResponseBody, processResponse } from '../src/validate';

const mockContext = {
  repo: { owner: 'acme', repo: 'rpa-bots' },
  ref: 'refs/heads/main',
  sha: 'abc1234def5678',
  runId: 99,
  actor: 'dev-user',
  payload: { pull_request: { number: 42 } },
};

describe('buildGitHubMetadata', () => {
  it('extracts repo, branch, commit, actor from context', () => {
    const meta = buildGitHubMetadata(mockContext as any);
    expect(meta.pipeline).toBe('github-actions');
    expect(meta.repository).toBe('acme/rpa-bots');
    expect(meta.branch).toBe('main');
    expect(meta.commit).toBe('abc1234');
    expect(meta.actor).toBe('dev-user');
  });

  it('constructs workflowRunUrl from repo and runId', () => {
    const meta = buildGitHubMetadata(mockContext as any);
    expect(meta.workflowRunUrl).toBe('https://github.com/acme/rpa-bots/actions/runs/99');
  });

  it('constructs prUrl when pull_request present in payload', () => {
    const meta = buildGitHubMetadata(mockContext as any);
    expect(meta.prUrl).toBe('https://github.com/acme/rpa-bots/pull/42');
  });

  it('sets prUrl to empty string when no pull_request in payload', () => {
    const ctx = { ...mockContext, payload: {} };
    const meta = buildGitHubMetadata(ctx as any);
    expect(meta.prUrl).toBe('');
  });

  it('strips refs/heads/ prefix from branch', () => {
    const ctx = { ...mockContext, ref: 'refs/heads/feature/my-branch' };
    const meta = buildGitHubMetadata(ctx as any);
    expect(meta.branch).toBe('feature/my-branch');
  });
});

describe('buildLabel', () => {
  const meta = { repository: 'acme/rpa-bots', branch: 'main' } as any;

  it('uses override when provided', () => {
    expect(buildLabel(meta, 'Main.xaml', 'my custom label')).toBe('my custom label');
  });

  it('builds default label from repo/branch/filename', () => {
    expect(buildLabel(meta, 'Main.xaml', '')).toBe('acme/rpa-bots / main / Main.xaml');
  });
});

describe('processResponse', () => {
  it('returns failed=true for 422 status', () => {
    const result = processResponse(422, { score: 40, blocking_findings: [] });
    expect(result.failed).toBe(true);
    expect(result.score).toBe(40);
  });

  it('returns failed=false for 200 status', () => {
    const result = processResponse(200, { score: 88, validation_id: 'v-123', report_url: 'https://app.flowcerta.com/results/v-123' });
    expect(result.failed).toBe(false);
    expect(result.validationId).toBe('v-123');
    expect(result.reportUrl).toBe('https://app.flowcerta.com/results/v-123');
  });

  it('throws for unexpected non-200/422 status', () => {
    expect(() => processResponse(500, { error: { code: 'SERVER_ERROR', message: 'oops' } }))
      .toThrow('API error 500');
  });

  it('throws a key/org-specific message for 401', () => {
    expect(() => processResponse(401, null)).toThrow(/API key/i);
  });

  it('throws a key/org-specific message for 403', () => {
    expect(() => processResponse(403, null)).toThrow(/API key/i);
  });

  it('fails closed: throws on a 2xx with a missing/unparseable body', () => {
    expect(() => processResponse(200, null)).toThrow(/not valid JSON/i);
  });

  it('still blocks on a 422 with a null body (fails closed)', () => {
    expect(processResponse(422, null).failed).toBe(true);
  });
});

describe('parseResponseBody', () => {
  it('parses valid JSON', () => {
    expect(parseResponseBody('{"score":88}')).toEqual({ score: 88 });
  });

  it('returns null for an empty body', () => {
    expect(parseResponseBody('')).toBeNull();
    expect(parseResponseBody('   ')).toBeNull();
  });

  it('returns null for a non-JSON body instead of throwing', () => {
    expect(parseResponseBody('Bad Gateway')).toBeNull();
  });
});
