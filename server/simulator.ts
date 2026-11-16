import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  DynamoDbItem,
  ExecutionRecord,
  S3StoredObject,
  ServerlessProject,
  SimulatorStoreState,
  StepTraceEntry,
} from '../src/types/serverless.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

export function stripUndefinedDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const DEFAULT_STORE: SimulatorStoreState = {
  executions: [
    {
      executionId: 'exec-seed-1042',
      projectId: 'invoice-triage',
      route: 'POST /v1/invoices',
      status: 'SUCCEEDED',
      totalDurationMs: 184,
      startedAt: '2026-11-15T18:40:12.000Z',
      requestPayload: {
        invoiceId: 'INV-2026-4088',
        vendor: 'Northwind Cloud Infrastructure',
        currency: 'USD',
        amountCents: 31900,
      },
      steps: [
        {
          stepName: 'API Gateway -> InvoiceIngestHandler',
          service: 'apigateway',
          status: 'Succeeded',
          durationMs: 24,
          summary: 'Validated HTTP route POST /v1/invoices and minted execution ID.',
          inputPreview: { route: 'POST /v1/invoices', stage: 'v1' },
          outputPreview: { executionId: 'exec-seed-1042', accepted: true },
        },
        {
          stepName: 'ArchiveRawToS3',
          service: 's3',
          status: 'Succeeded',
          durationMs: 38,
          summary: 'Stored immutable raw intake payload in invoice-vault-raw-bucket.',
          inputPreview: { bucket: 'invoice-vault-raw-bucket' },
          outputPreview: { key: 'raw/2026-11-15/exec-seed-1042.json', etag: '"a81c4f92"' },
        },
        {
          stepName: 'ValidatePayload & CheckDuplicateLedger',
          service: 'stepfunctions',
          status: 'Succeeded',
          durationMs: 49,
          summary: 'Verified required fields and confirmed no duplicate invoice ID in ledger.',
          inputPreview: { invoiceId: 'INV-2026-4088' },
          outputPreview: { duplicate: false, valid: true },
        },
        {
          stepName: 'CommitDynamoLedger',
          service: 'dynamodb',
          status: 'Succeeded',
          durationMs: 73,
          summary: 'Wrote single-table item PK=INV#INV-2026-4088 SK=META.',
          inputPreview: { tableName: 'InvoiceLedgerTable' },
          outputPreview: { pk: 'INV#INV-2026-4088', sk: 'META', status: 'VERIFIED' },
        },
      ],
    },
  ],
  s3Objects: [
    {
      key: 'raw/2026-11-15/exec-seed-1042.json',
      bucket: 'invoice-vault-raw-bucket',
      sizeBytes: 142,
      contentType: 'application/json',
      etag: '"a81c4f92"',
      createdAt: '2026-11-15T18:40:12.040Z',
      body: {
        invoiceId: 'INV-2026-4088',
        vendor: 'Northwind Cloud Infrastructure',
        currency: 'USD',
        amountCents: 31900,
      },
    },
    {
      key: 'processed/2026-11-15/exec-seed-1042-manifest.json',
      bucket: 'invoice-vault-processed-bucket',
      sizeBytes: 214,
      contentType: 'application/json',
      etag: '"c39e11b0"',
      createdAt: '2026-11-15T18:40:12.110Z',
      body: {
        executionId: 'exec-seed-1042',
        normalizedAmountUsd: 319.0,
        riskTier: 'LOW',
        archivedFrom: 'raw/2026-11-15/exec-seed-1042.json',
      },
    },
  ],
  dynamoItems: [
    {
      pk: 'INV#INV-2026-4088',
      sk: 'META',
      entityType: 'INVOICE',
      status: 'VERIFIED',
      executionId: 'exec-seed-1042',
      s3Pointer: 's3://invoice-vault-raw-bucket/raw/2026-11-15/exec-seed-1042.json',
      createdAt: '2026-11-15T18:40:12.184Z',
      attributes: {
        vendor: 'Northwind Cloud Infrastructure',
        amountCents: 31900,
        currency: 'USD',
        gsi1pk: 'VENDOR#NORTHWIND',
        gsi1sk: '2026-11',
      },
    },
  ],
};

export async function readStore(): Promise<SimulatorStoreState> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<SimulatorStoreState>;
    return {
      executions: Array.isArray(parsed.executions) ? parsed.executions : DEFAULT_STORE.executions,
      s3Objects: Array.isArray(parsed.s3Objects) ? parsed.s3Objects : DEFAULT_STORE.s3Objects,
      dynamoItems: Array.isArray(parsed.dynamoItems) ? parsed.dynamoItems : DEFAULT_STORE.dynamoItems,
    };
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
}

export async function writeStore(state: SimulatorStoreState): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const clean = stripUndefinedDeep(state);
  await fs.writeFile(STORE_PATH, JSON.stringify(clean, null, 2), 'utf8');
}

export async function resetStore(): Promise<SimulatorStoreState> {
  const fresh = structuredClone(DEFAULT_STORE);
  await writeStore(fresh);
  return fresh;
}

function detectFailureReason(payload: Record<string, unknown>): string | null {
  if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) {
    return 'ValidationError: Request body is empty.';
  }
  if (payload.signatureValid === false) {
    return 'SecurityError: HMAC signature verification failed.';
  }
  if (typeof payload.amountCents === 'number' && payload.amountCents < 0) {
    return 'ValidationError: amountCents must be a positive integer.';
  }
  if (typeof payload.bytes === 'number' && payload.bytes <= 0) {
    return 'MediaError: Zero-byte or unsupported executable payload rejected.';
  }
  for (const [k, v] of Object.entries(payload)) {
    if (k.toLowerCase().includes('id') && v === '') {
      return `ValidationError: Required identifier field "${k}" cannot be blank.`;
    }
  }
  return null;
}

export async function executePipelineSimulation(
  project: ServerlessProject,
  route: string,
  payload: Record<string, unknown>,
): Promise<{ execution: ExecutionRecord; store: SimulatorStoreState }> {
  const store = await readStore();
  const executionId = `exec-${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date();
  const datePrefix = now.toISOString().slice(0, 10);
  const rawKey = `raw/${datePrefix}/${executionId}.json`;
  const processedKey = `processed/${datePrefix}/${executionId}-manifest.json`;
  const rawJsonStr = JSON.stringify(payload);
  const etagRaw = `"${crypto.createHash('md5').update(rawJsonStr).digest('hex').slice(0, 8)}"`;

  const failureReason = detectFailureReason(payload);
  const steps: StepTraceEntry[] = [];

  // Step 1: API Gateway + Ingest Lambda
  const apiDur = 18 + (executionId.charCodeAt(5) % 15);
  steps.push({
    stepName: `API Gateway (${route}) -> ${project.configs.lambda.ingestFunctionName}`,
    service: 'apigateway',
    status: 'Succeeded',
    durationMs: apiDur,
    summary: `Accepted ${route} on stage ${project.configs.apigateway.stage} within burst limit ${project.configs.apigateway.throttleBurst}.`,
    inputPreview: { route, stage: project.configs.apigateway.stage },
    outputPreview: { executionId, statusCode: 202 },
  });

  // Step 2: S3 Raw Object Archival
  const rawObject: S3StoredObject = {
    key: rawKey,
    bucket: project.configs.s3.rawBucketName,
    sizeBytes: Buffer.byteLength(rawJsonStr, 'utf8'),
    contentType: 'application/json',
    etag: etagRaw,
    createdAt: now.toISOString(),
    body: stripUndefinedDeep(payload),
  };

  const s3Dur = 29 + (rawJsonStr.length % 22);
  steps.push({
    stepName: `PutObject -> ${project.configs.s3.rawBucketName}`,
    service: 's3',
    status: 'Succeeded',
    durationMs: s3Dur,
    summary: `Persisted immutable intake payload (${rawObject.sizeBytes} bytes) before workflow launch.`,
    inputPreview: { bucket: project.configs.s3.rawBucketName, key: rawKey },
    outputPreview: { etag: etagRaw, sizeBytes: rawObject.sizeBytes },
  });

  const primaryStates = project.configs.stepfunctions.states;
  const firstState = primaryStates[0] || 'ValidatePayload';

  if (failureReason) {
    // Step 3: Step Functions Validation Fails & Retries/Catches
    steps.push({
      stepName: `${firstState} (${project.configs.lambda.workerFunctionName})`,
      service: 'lambda',
      status: 'Retried',
      durationMs: 42,
      summary: `${failureReason} Exhausted ${project.configs.stepfunctions.maxRetries} retries; routing via Catch.`,
      inputPreview: payload,
      outputPreview: { error: failureReason, routedTo: project.configs.stepfunctions.fallbackState },
    });

    const quarantineItem: DynamoDbItem = {
      pk: `QUARANTINE#${executionId}`,
      sk: 'ERROR',
      entityType: 'QUARANTINE_RECORD',
      status: 'QUARANTINED',
      executionId,
      s3Pointer: `s3://${project.configs.s3.rawBucketName}/${rawKey}`,
      createdAt: new Date(now.getTime() + 95).toISOString(),
      attributes: {
        errorCause: failureReason,
        projectId: project.id,
        fallbackState: project.configs.stepfunctions.fallbackState,
      },
    };

    steps.push({
      stepName: `${project.configs.stepfunctions.fallbackState} -> ${project.configs.dynamodb.tableName}`,
      service: 'dynamodb',
      status: 'Caught',
      durationMs: 36,
      summary: `Step Functions Catch wrote quarantine item PK=${quarantineItem.pk} for safe inspection.`,
      inputPreview: { tableName: project.configs.dynamodb.tableName, pk: quarantineItem.pk },
      outputPreview: { status: 'QUARANTINED', s3Pointer: quarantineItem.s3Pointer },
    });

    const execution: ExecutionRecord = {
      executionId,
      projectId: project.id,
      route,
      status: 'RECOVERED',
      totalDurationMs: steps.reduce((acc, s) => acc + s.durationMs, 0),
      startedAt: now.toISOString(),
      requestPayload: stripUndefinedDeep(payload),
      steps,
    };

    const nextStore: SimulatorStoreState = {
      executions: [execution, ...store.executions].slice(0, 20),
      s3Objects: [rawObject, ...store.s3Objects].slice(0, 30),
      dynamoItems: [quarantineItem, ...store.dynamoItems].slice(0, 30),
    };
    await writeStore(nextStore);
    return { execution, store: nextStore };
  }

  // Happy path through Step Functions states
  const middleStates = primaryStates.slice(0, Math.max(1, primaryStates.length - 1));
  for (const st of middleStates) {
    steps.push({
      stepName: `${st} (${project.configs.stepfunctions.stateMachineName})`,
      service: 'stepfunctions',
      status: 'Succeeded',
      durationMs: 31 + (st.length % 19),
      summary: `State ${st} completed using ${project.configs.lambda.workerFunctionName} (${project.configs.lambda.architecture}).`,
      inputPreview: { executionId, step: st },
      outputPreview: { step: st, passed: true },
    });
  }

  // Processed S3 Manifest
  const processedBody = {
    executionId,
    projectId: project.id,
    sourceKey: rawKey,
    processedAt: new Date(now.getTime() + 110).toISOString(),
    summaryFields: Object.keys(payload),
    status: 'VERIFIED',
  };
  const processedStr = JSON.stringify(processedBody);
  const processedObject: S3StoredObject = {
    key: processedKey,
    bucket: project.configs.s3.processedBucketName,
    sizeBytes: Buffer.byteLength(processedStr, 'utf8'),
    contentType: 'application/json',
    etag: `"${crypto.createHash('md5').update(processedStr).digest('hex').slice(0, 8)}"`,
    createdAt: new Date(now.getTime() + 115).toISOString(),
    body: processedBody,
  };

  steps.push({
    stepName: `WriteProcessed -> ${project.configs.s3.processedBucketName}`,
    service: 's3',
    status: 'Succeeded',
    durationMs: 34,
    summary: `Saved normalized derivative manifest to ${processedKey}.`,
    inputPreview: { bucket: project.configs.s3.processedBucketName, key: processedKey },
    outputPreview: { etag: processedObject.etag, sizeBytes: processedObject.sizeBytes },
  });

  // DynamoDB Commit
  const candidateId =
    (typeof payload.invoiceId === 'string' && payload.invoiceId) ||
    (typeof payload.eventId === 'string' && payload.eventId) ||
    (typeof payload.assetId === 'string' && payload.assetId) ||
    executionId.toUpperCase();

  const ddbItem: DynamoDbItem = {
    pk: `ITEM#${candidateId}`,
    sk: 'META',
    entityType: project.id.toUpperCase(),
    status: 'VERIFIED',
    executionId,
    s3Pointer: `s3://${project.configs.s3.processedBucketName}/${processedKey}`,
    createdAt: new Date(now.getTime() + 160).toISOString(),
    attributes: stripUndefinedDeep({
      ...payload,
      gsi1pk: `PROJECT#${project.id.toUpperCase()}`,
      gsi1sk: datePrefix,
    }),
  };

  steps.push({
    stepName: `${primaryStates[primaryStates.length - 1] || 'CommitDynamo'} -> ${project.configs.dynamodb.tableName}`,
    service: 'dynamodb',
    status: 'Succeeded',
    durationMs: 46,
    summary: `Committed single-table record PK=${ddbItem.pk} SK=${ddbItem.sk} with S3 pointer.`,
    inputPreview: { tableName: project.configs.dynamodb.tableName, pk: ddbItem.pk },
    outputPreview: { pk: ddbItem.pk, sk: ddbItem.sk, status: 'VERIFIED' },
  });

  const execution: ExecutionRecord = {
    executionId,
    projectId: project.id,
    route,
    status: 'SUCCEEDED',
    totalDurationMs: steps.reduce((acc, s) => acc + s.durationMs, 0),
    startedAt: now.toISOString(),
    requestPayload: stripUndefinedDeep(payload),
    steps,
  };

  const nextStore: SimulatorStoreState = {
    executions: [execution, ...store.executions].slice(0, 20),
    s3Objects: [processedObject, rawObject, ...store.s3Objects].slice(0, 30),
    dynamoItems: [ddbItem, ...store.dynamoItems].slice(0, 30),
  };
  await writeStore(nextStore);
  return { execution, store: nextStore };
}
