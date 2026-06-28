export interface AzureMetadata {
  pipeline: 'azure-devops';
  repository: string;
  branch: string;
  commit: string;
  build_id: string;
  build_number: string;
  definition_name: string;
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

export function buildAzureMetadata(env: NodeJS.ProcessEnv): AzureMetadata {
  return {
    pipeline: 'azure-devops',
    repository: env.BUILD_REPOSITORY_NAME ?? '',
    branch: (env.BUILD_SOURCEBRANCH ?? '').replace('refs/heads/', ''),
    commit: (env.BUILD_SOURCEVERSION ?? '').slice(0, 7),
    build_id: env.BUILD_BUILDID ?? '',
    build_number: env.BUILD_BUILDNUMBER ?? '',
    definition_name: env.BUILD_DEFINITIONNAME ?? '',
  };
}

/**
 * Safely parse a response body string. The API can return an empty body
 * (e.g. a bare 401) or a non-JSON error page; in those cases we return an
 * empty object rather than throwing an opaque "Unexpected end of JSON input".
 */
export function parseResponseBody(text: string): any {
  if (!text || !text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export function processResponse(status: number, body: any): ValidationResult {
  if (status === 401 || status === 403) {
    throw new Error(
      `Authentication failed (${status}): check your Flowcerta API key.`,
    );
  }
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
