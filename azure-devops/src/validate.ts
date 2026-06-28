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
 * Parse a response body string, returning null when the body is empty or not
 * valid JSON (e.g. a bare 401 or an HTML error page). Callers MUST treat null
 * as "no usable response" — never as an implicit pass. Returning a distinct
 * null (rather than {}) lets processResponse fail closed on a malformed 2xx
 * instead of silently passing the governance gate.
 */
export function parseResponseBody(text: string): any | null {
  if (!text || !text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function processResponse(status: number, body: any): ValidationResult {
  if (status === 401 || status === 403) {
    throw new Error(
      `Authentication failed (${status}): check your Flowcerta API key.`,
    );
  }
  if (status === 422) {
    // Blocked — fail the build. Safe even with a null body (fails closed).
    return {
      failed: true,
      score: body?.score ?? null,
      validationId: body?.validation_id ?? null,
      reportUrl: body?.report_url ?? null,
      blockingFindings: body?.blocking_findings ?? [],
    };
  }
  if (status >= 200 && status < 300) {
    // A pass must be backed by a parseable result body. Fail closed on a
    // malformed/empty 2xx so the gate never green-lights on a garbled response.
    if (body === null || typeof body !== 'object') {
      throw new Error(
        `API returned ${status} but the response body was not valid JSON; failing closed.`,
      );
    }
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
