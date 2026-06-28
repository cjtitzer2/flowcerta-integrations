import { buildAzureMetadata, parseResponseBody, processResponse } from '../src/validate';

describe('buildAzureMetadata', () => {
  const env = {
    BUILD_REPOSITORY_NAME: 'acme/rpa-bots',
    BUILD_SOURCEBRANCH: 'refs/heads/feature/my-branch',
    BUILD_SOURCEVERSION: 'def4567abc1234',
    BUILD_BUILDID: '1234',
    BUILD_BUILDNUMBER: '20260325.1',
    BUILD_DEFINITIONNAME: 'CI Pipeline',
  };

  it('extracts all ADO env vars into metadata', () => {
    const meta = buildAzureMetadata(env as any);
    expect(meta.pipeline).toBe('azure-devops');
    expect(meta.repository).toBe('acme/rpa-bots');
    expect(meta.branch).toBe('feature/my-branch');
    expect(meta.commit).toBe('def4567');
    expect(meta.build_id).toBe('1234');
    expect(meta.build_number).toBe('20260325.1');
    expect(meta.definition_name).toBe('CI Pipeline');
  });

  it('returns empty strings for missing env vars', () => {
    const meta = buildAzureMetadata({} as any);
    expect(meta.repository).toBe('');
    expect(meta.branch).toBe('');
    expect(meta.commit).toBe('');
  });

  it('strips refs/heads/ prefix from branch', () => {
    const meta = buildAzureMetadata({ BUILD_SOURCEBRANCH: 'refs/heads/main' } as any);
    expect(meta.branch).toBe('main');
  });
});

describe('processResponse', () => {
  it('returns failed=true for 422', () => {
    const r = processResponse(422, { score: 30, blocking_findings: [{ severity: 'critical', description: 'test', location: 'Main.xaml:5' }] });
    expect(r.failed).toBe(true);
    expect(r.blockingFindings).toHaveLength(1);
  });

  it('returns failed=false for 200', () => {
    const r = processResponse(200, { score: 92, validation_id: 'v-abc', report_url: 'https://app.flowcerta.com/results/v-abc' });
    expect(r.failed).toBe(false);
    expect(r.validationId).toBe('v-abc');
  });

  it('throws for unexpected status', () => {
    expect(() => processResponse(500, { error: { code: 'SERVER_ERROR', message: 'oops' } }))
      .toThrow('API error 500');
  });

  it('throws a key-specific message for 401', () => {
    expect(() => processResponse(401, {}))
      .toThrow(/API key/i);
  });

  it('throws a key-specific message for 403', () => {
    expect(() => processResponse(403, {}))
      .toThrow(/API key/i);
  });
});

describe('parseResponseBody', () => {
  it('parses valid JSON', () => {
    expect(parseResponseBody('{"score":92}')).toEqual({ score: 92 });
  });

  it('returns empty object for an empty body', () => {
    expect(parseResponseBody('')).toEqual({});
    expect(parseResponseBody('   ')).toEqual({});
  });

  it('returns empty object for non-JSON body instead of throwing', () => {
    expect(parseResponseBody('Bad Gateway')).toEqual({});
  });
});
