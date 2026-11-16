export type WorkspaceTab = 'overview' | 'architecture' | 'simulator' | 'iac' | 'submission';

export type AwsServiceKey = 'apigateway' | 'lambda' | 'stepfunctions' | 'dynamodb' | 's3';

export interface ApiGatewayConfig {
  apiName: string;
  stage: string;
  routes: string[];
  throttleBurst: number;
  throttleRate: number;
  corsOrigin: string;
}

export interface LambdaConfig {
  ingestFunctionName: string;
  workerFunctionName: string;
  runtime: 'nodejs22.x' | 'python3.13';
  architecture: 'arm64' | 'x86_64';
  memoryMb: number;
  timeoutSec: number;
}

export interface StepFunctionsConfig {
  stateMachineName: string;
  type: 'STANDARD' | 'EXPRESS';
  states: string[];
  maxRetries: number;
  backoffRate: number;
  fallbackState: string;
}

export interface DynamoDbConfig {
  tableName: string;
  partitionKey: string;
  sortKey: string;
  gsi1Name: string;
  billingMode: 'PAY_PER_REQUEST' | 'PROVISIONED';
  ttlAttribute: string;
}

export interface S3Config {
  rawBucketName: string;
  processedBucketName: string;
  versioning: boolean;
  lifecycleDays: number;
  presignedTtlSec: number;
}

export interface ServiceConfigs {
  apigateway: ApiGatewayConfig;
  lambda: LambdaConfig;
  stepfunctions: StepFunctionsConfig;
  dynamodb: DynamoDbConfig;
  s3: S3Config;
}

export interface SubmissionDraft {
  title: string;
  description: string;
  body: string;
  tags: string[];
  coverImageUrl: string;
  coverImageName: string;
  coverImageWidth: number;
  coverImageHeight: number;
  coverImageBytes: number;
  repoUrl: string;
  demoUrl: string;
  notebookUrl: string;
  termsAccepted: boolean;
}

export interface SamplePayload {
  id: string;
  label: string;
  route: string;
  shouldFail?: boolean;
  payload: Record<string, unknown>;
}

export interface ServerlessProject {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  problemStatement: string;
  region: string;
  configs: ServiceConfigs;
  samplePayloads: SamplePayload[];
  customLambdaCode?: string;
  submission: SubmissionDraft;
}

export interface StepTraceEntry {
  stepName: string;
  service: AwsServiceKey;
  status: 'Succeeded' | 'Retried' | 'Caught' | 'Failed';
  durationMs: number;
  summary: string;
  inputPreview: Record<string, unknown>;
  outputPreview: Record<string, unknown>;
}

export interface S3StoredObject {
  key: string;
  bucket: string;
  sizeBytes: number;
  contentType: string;
  etag: string;
  createdAt: string;
  body: Record<string, unknown>;
}

export interface DynamoDbItem {
  pk: string;
  sk: string;
  entityType: string;
  status: string;
  executionId: string;
  s3Pointer: string;
  createdAt: string;
  attributes: Record<string, unknown>;
}

export interface ExecutionRecord {
  executionId: string;
  projectId: string;
  route: string;
  status: 'SUCCEEDED' | 'FAILED' | 'RECOVERED';
  totalDurationMs: number;
  startedAt: string;
  requestPayload: Record<string, unknown>;
  steps: StepTraceEntry[];
}

export interface SimulatorStoreState {
  executions: ExecutionRecord[];
  s3Objects: S3StoredObject[];
  dynamoItems: DynamoDbItem[];
}
