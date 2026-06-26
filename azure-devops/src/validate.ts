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
