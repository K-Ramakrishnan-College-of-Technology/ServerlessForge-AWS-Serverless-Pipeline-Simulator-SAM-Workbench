import type { ServerlessProject } from '../types/serverless';

export const BUILTIN_COVER_IMAGES = [
  {
    id: 'arch-light',
    label: 'Modular Cloud Topology (16:9)',
    url: '/src/assets/images/serverless_cover_architecture_1794797940051.jpg',
  },
  {
    id: 'workflow-dark',
    label: 'State Machine Conduits (16:9)',
    url: '/src/assets/images/serverless_cover_workflow_1794797941511.jpg',
  },
];

export const SUGGESTED_AWS_TAGS = [
  'serverless',
  'aws-lambda',
  'step-functions',
  'dynamodb',
  'api-gateway',
  'amazon-s3',
  'aws-sam',
  'event-driven',
  'typescript',
  'iac',
];

export const INITIAL_PROJECTS: ServerlessProject[] = [
  {
    id: 'invoice-triage',
    slug: 'invoice-triage-vault',
    name: 'Invoice & Receipt Triage Vault',
    tagline: 'Zero-server ingestion, schema validation, and single-table ledger persistence.',
    problemStatement:
      'Small engineering teams receive vendor invoices and receipts across email hooks and portals, then lose hours normalizing totals, catching duplicate charges, and archiving raw payloads. This weekend build ingests JSON or receipt uploads through API Gateway, issues short-lived S3 presigned keys via Lambda, orchestrates duplicate-check and enrichment branches in Step Functions, and commits immutable audit records to DynamoDB.',
    region: 'us-east-1',
    configs: {
      apigateway: {
        apiName: 'invoice-triage-http-api',
        stage: 'v1',
        routes: ['POST /v1/invoices', 'GET /v1/invoices/{id}'],
        throttleBurst: 100,
        throttleRate: 50,
        corsOrigin: 'https://app.example.com',
      },
      lambda: {
        ingestFunctionName: 'InvoiceIngestHandler',
        workerFunctionName: 'InvoiceEnrichWorker',
        runtime: 'nodejs22.x',
        architecture: 'arm64',
        memoryMb: 256,
        timeoutSec: 15,
      },
      stepfunctions: {
        stateMachineName: 'InvoiceTriageWorkflow',
        type: 'STANDARD',
        states: [
          'ValidatePayload',
          'ArchiveRawToS3',
          'CheckDuplicateLedger',
          'EnrichAndScore',
          'WriteProcessedS3',
          'CommitDynamoLedger',
        ],
        maxRetries: 2,
        backoffRate: 2.0,
        fallbackState: 'RecordQuarantineItem',
      },
      dynamodb: {
        tableName: 'InvoiceLedgerTable',
        partitionKey: 'pk',
        sortKey: 'sk',
        gsi1Name: 'GSI1_VendorMonth',
        billingMode: 'PAY_PER_REQUEST',
        ttlAttribute: 'expiresAt',
      },
      s3: {
        rawBucketName: 'invoice-vault-raw-bucket',
        processedBucketName: 'invoice-vault-processed-bucket',
        versioning: true,
        lifecycleDays: 90,
        presignedTtlSec: 300,
      },
    },
    samplePayloads: [
      {
        id: 'valid-invoice',
        label: 'Valid Vendor Invoice',
        route: 'POST /v1/invoices',
        payload: {
          invoiceId: 'INV-2026-4091',
          vendor: 'Northwind Cloud Infrastructure',
          currency: 'USD',
          amountCents: 48250,
          lineItems: [
            { sku: 'NAT-GW-HR', qty: 720, unitCents: 45 },
            { sku: 'S3-STD-GB', qty: 690, unitCents: 23 },
          ],
          submittedBy: 'ops-billing@northwind.example',
        },
      },
      {
        id: 'high-value-audit',
        label: 'High-Value Flagged Invoice',
        route: 'POST /v1/invoices',
        payload: {
          invoiceId: 'INV-2026-4099',
          vendor: 'Apex GPU Compute Labs',
          currency: 'USD',
          amountCents: 1495000,
          lineItems: [{ sku: 'A100-CLUSTER-WK', qty: 1, unitCents: 1495000 }],
          submittedBy: 'finance@apex.example',
        },
      },
      {
        id: 'malformed-invoice',
        label: 'Malformed Payload (Triggers Catch)',
        route: 'POST /v1/invoices',
        shouldFail: true,
        payload: {
          invoiceId: '',
          vendor: 'Unknown Vendor',
          amountCents: -120,
        },
      },
    ],
    submission: {
      title: 'Invoice & Receipt Triage Vault: Weekend Serverless Pipeline on AWS',
      description:
        'An event-driven invoice intake, duplicate detection, and immutable audit ledger built in one weekend using API Gateway, ARM64 Lambda, Step Functions, S3, and single-table DynamoDB.',
      body: `## Problem Worth Solving

Vendor invoices arrive in inconsistent formats, and manual triage breaks down fast when duplicate submissions or unexpected charges slip through. Instead of provisioning a background worker fleet and relational database, we built a scale-to-zero triage pipeline that costs pennies at low volume and enforces strict idempotency.

## Architecture Overview

1. **Amazon API Gateway (HTTP API v2)** exposes \`POST /v1/invoices\` with burst throttling and request validation.
2. **AWS Lambda (Node.js 22 on ARM64)** validates headers, computes an idempotency hash, writes an initial intake envelope to **Amazon S3**, and starts a **Step Functions** execution.
3. **AWS Step Functions** coordinates schema validation, duplicate inspection against **Amazon DynamoDB**, tax/threshold enrichment, and Catch-based quarantine routing.
4. **Amazon DynamoDB** stores single-table ledger records (\`PK=VENDOR#<name>\`, \`SK=INV#<id>\`) with on-demand capacity and TTL cleanup for temporary traces.

## DynamoDB Access Patterns

| Pattern | Key Structure | Index |
| :--- | :--- | :--- |
| Fetch invoice by ID | \`PK = INV#<invoiceId>\`, \`SK = META\` | Primary Table |
| List vendor invoices by month | \`GSI1PK = VENDOR#<vendor>\`, \`GSI1SK = 2026-11\` | \`GSI1_VendorMonth\` |

## What Shipped by Monday

- Zero idle compute cost with ARM64 Graviton2 Lambda functions
- Deterministic Step Functions retry/catch state transitions with S3 quarantine fallback
- Single \`sam deploy --guided\` template ready for any AWS account`,
      tags: ['serverless', 'aws-lambda', 'step-functions', 'dynamodb', 'amazon-s3'],
      coverImageUrl: '/src/assets/images/serverless_cover_architecture_1794797940051.jpg',
      coverImageName: 'serverless_cover_architecture.jpg',
      coverImageWidth: 1200,
      coverImageHeight: 675,
      coverImageBytes: 245000,
      repoUrl: 'https://github.com/aws-samples/invoice-triage-serverless',
      demoUrl: 'https://api.invoice-vault.example.com/v1',
      notebookUrl: '',
      termsAccepted: true,
    },
  },
  {
    id: 'webhook-relay',
    slug: 'signed-webhook-replay-vault',
    name: 'Signed Webhook Relay & Replay Vault',
    tagline: 'Idempotent webhook capture, S3 raw archival, and backoff delivery orchestration.',
    problemStatement:
      'Third-party SaaS webhooks fail silently when downstream services experience transient outages or deploy restarts. This serverless relay acknowledges webhooks in under 40ms via API Gateway and Lambda, archives the raw signed payload to S3, orchestrates exponential-backoff delivery in Step Functions, and maintains searchable delivery receipts in DynamoDB.',
    region: 'us-west-2',
    configs: {
      apigateway: {
        apiName: 'webhook-relay-edge-api',
        stage: 'prod',
        routes: ['POST /v1/hooks/{source}', 'POST /v1/hooks/{id}/replay'],
        throttleBurst: 250,
        throttleRate: 120,
        corsOrigin: 'https://hooks.example.com',
      },
      lambda: {
        ingestFunctionName: 'WebhookVerifyIngest',
        workerFunctionName: 'WebhookDispatchWorker',
        runtime: 'nodejs22.x',
        architecture: 'arm64',
        memoryMb: 256,
        timeoutSec: 10,
      },
      stepfunctions: {
        stateMachineName: 'WebhookDeliveryOrchestrator',
        type: 'STANDARD',
        states: [
          'VerifyHmacSignature',
          'ArchiveRawEventS3',
          'DispatchTargetEndpoint',
          'RecordDeliveryReceipt',
        ],
        maxRetries: 4,
        backoffRate: 2.0,
        fallbackState: 'MoveToDeadLetterDynamo',
      },
      dynamodb: {
        tableName: 'WebhookReceiptsTable',
        partitionKey: 'pk',
        sortKey: 'sk',
        gsi1Name: 'GSI1_StatusTimestamp',
        billingMode: 'PAY_PER_REQUEST',
        ttlAttribute: 'ttlEpoch',
      },
      s3: {
        rawBucketName: 'webhook-vault-raw-events',
        processedBucketName: 'webhook-vault-dead-letters',
        versioning: true,
        lifecycleDays: 30,
        presignedTtlSec: 180,
      },
    },
    samplePayloads: [
      {
        id: 'stripe-charge',
        label: 'Payment Succeeded Event',
        route: 'POST /v1/hooks/payments',
        payload: {
          eventId: 'evt_99418a',
          source: 'payments',
          signatureValid: true,
          targetUrl: 'https://orders.internal.example/webhook',
          data: { orderId: 'ORD-8821', totalCents: 12900, status: 'paid' },
        },
      },
      {
        id: 'bad-signature',
        label: 'Invalid HMAC Signature (Quarantine)',
        route: 'POST /v1/hooks/payments',
        shouldFail: true,
        payload: {
          eventId: 'evt_bad_002',
          source: 'payments',
          signatureValid: false,
          data: { orderId: 'ORD-0000' },
        },
      },
    ],
    submission: {
      title: 'Signed Webhook Relay & Replay Vault with AWS Step Functions',
      description:
        'Capture, verify, archive to S3, and reliably deliver third-party webhooks with automated exponential backoff and one-click DynamoDB replay.',
      body: `## Why Build a Serverless Webhook Vault?

Webhook providers enforce strict response timeouts. Performing heavy business logic synchronously inside a webhook handler risks dropped events. By decoupling capture from delivery using API Gateway, S3, Step Functions, and DynamoDB, every inbound webhook is durably persisted before dispatch begins.

## Key Design Decisions

- **Raw S3 Archival First**: Every verified event is written to Amazon S3 immediately so payloads exceeding DynamoDB's 400 KB item limit never break ingestion.
- **Step Functions Backoff**: Standard workflows handle \`2x\` exponential retry intervals across downstream 5xx responses without cron polling.
- **Replay Index**: DynamoDB GSI tracks failed deliveries for instant one-click replay.`,
      tags: ['serverless', 'step-functions', 'api-gateway', 'dynamodb', 'amazon-s3'],
      coverImageUrl: '/src/assets/images/serverless_cover_workflow_1794797941511.jpg',
      coverImageName: 'serverless_cover_workflow.jpg',
      coverImageWidth: 1200,
      coverImageHeight: 675,
      coverImageBytes: 218000,
      repoUrl: 'https://github.com/aws-samples/webhook-relay-vault',
      demoUrl: 'https://relay.example.com/v1',
      notebookUrl: '',
      termsAccepted: true,
    },
  },
  {
    id: 'media-pipeline',
    slug: 'async-media-manifest-pipeline',
    name: 'Async Media Asset & Manifest Pipeline',
    tagline: 'Direct-to-S3 uploads orchestrated via Step Functions and DynamoDB catalog indexing.',
    problemStatement:
      'Uploading large media assets through an API server bottlenecks bandwidth and inflates compute bills. This blueprint issues S3 presigned upload URLs from API Gateway + Lambda, triggers Step Functions to extract metadata and generate derivatives in parallel, and publishes searchable asset manifests in DynamoDB.',
    region: 'eu-west-1',
    configs: {
      apigateway: {
        apiName: 'media-catalog-http-api',
        stage: 'v1',
        routes: ['POST /v1/assets/presign', 'POST /v1/assets/process'],
        throttleBurst: 150,
        throttleRate: 75,
        corsOrigin: 'https://studio.example.com',
      },
      lambda: {
        ingestFunctionName: 'MediaPresignBroker',
        workerFunctionName: 'MediaMetadataExtractor',
        runtime: 'nodejs22.x',
        architecture: 'arm64',
        memoryMb: 512,
        timeoutSec: 30,
      },
      stepfunctions: {
        stateMachineName: 'MediaDerivativeWorkflow',
        type: 'STANDARD',
        states: [
          'VerifyS3ObjectExists',
          'ExtractExifAndHash',
          'GenerateManifestJson',
          'PublishCatalogDynamo',
        ],
        maxRetries: 2,
        backoffRate: 1.5,
        fallbackState: 'MarkAssetFailed',
      },
      dynamodb: {
        tableName: 'MediaCatalogTable',
        partitionKey: 'pk',
        sortKey: 'sk',
        gsi1Name: 'GSI1_CollectionAssets',
        billingMode: 'PAY_PER_REQUEST',
        ttlAttribute: 'archiveAfter',
      },
      s3: {
        rawBucketName: 'media-pipeline-uploads-raw',
        processedBucketName: 'media-pipeline-manifests-out',
        versioning: false,
        lifecycleDays: 60,
        presignedTtlSec: 600,
      },
    },
    samplePayloads: [
      {
        id: 'studio-asset',
        label: '4K Architectural Render Asset',
        route: 'POST /v1/assets/process',
        payload: {
          assetId: 'AST-7712',
          collection: 'architectural-renders',
          filename: 'elevation-north.webp',
          mimeType: 'image/webp',
          bytes: 1842900,
          uploader: 'design-team@studio.example',
        },
      },
      {
        id: 'unsupported-mime',
        label: 'Unsupported Binary (Triggers Catch)',
        route: 'POST /v1/assets/process',
        shouldFail: true,
        payload: {
          assetId: 'AST-BAD-01',
          filename: 'corrupt.exe',
          mimeType: 'application/x-msdownload',
          bytes: 0,
        },
      },
    ],
    submission: {
      title: 'Async Media Asset & Manifest Pipeline on Serverless AWS',
      description:
        'Bypass API payload limits with Lambda presigned S3 uploads, parallel Step Functions metadata extraction, and a single-table DynamoDB catalog.',
      body: `## Direct-to-S3 Without Server Bottlenecks

Passing multi-megabyte media payloads through Lambda or API Gateway hits payload limits quickly. Instead, API Gateway + Lambda mint a 10-minute S3 presigned URL, while Step Functions orchestrates post-upload verification, manifest creation, and DynamoDB indexing.`,
      tags: ['serverless', 'amazon-s3', 'aws-lambda', 'step-functions', 'dynamodb'],
      coverImageUrl: '/src/assets/images/serverless_cover_architecture_1794797940051.jpg',
      coverImageName: 'serverless_cover_architecture.jpg',
      coverImageWidth: 1200,
      coverImageHeight: 675,
      coverImageBytes: 245000,
      repoUrl: 'https://github.com/aws-samples/async-media-manifest',
      demoUrl: 'https://media-api.example.com/v1',
      notebookUrl: '',
      termsAccepted: true,
    },
  },
];

export function generateAslJson(project: ServerlessProject): string {
  const { stepfunctions, lambda, s3, dynamodb } = project.configs;
  const states: Record<string, unknown> = {};

  stepfunctions.states.forEach((stateName, index) => {
    const isLast = index === stepfunctions.states.length - 1;
    const nextState = isLast ? undefined : stepfunctions.states[index + 1];

    const stateDef: Record<string, unknown> = {
      Type: 'Task',
      Resource: 'arn:aws:states:::lambda:invoke',
      Parameters: {
        FunctionName:
          index === 0
            ? `\${${lambda.ingestFunctionName}Arn}`
            : `\${${lambda.workerFunctionName}Arn}`,
        Payload: {
          'step': stateName,
          'rawBucket': s3.rawBucketName,
          'processedBucket': s3.processedBucketName,
          'tableName': dynamodb.tableName,
          'input.$': '$',
        },
      },
      Retry: [
        {
          ErrorEquals: ['Lambda.ServiceException', 'Lambda.AWSLambdaException', 'States.TaskFailed'],
          IntervalSeconds: 2,
          MaxAttempts: stepfunctions.maxRetries,
          BackoffRate: stepfunctions.backoffRate,
        },
      ],
      Catch: [
        {
          ErrorEquals: ['States.ALL'],
          ResultPath: '$.errorInfo',
          Next: stepfunctions.fallbackState,
        },
      ],
    };

    if (isLast) {
      stateDef.End = true;
    } else {
      stateDef.Next = nextState;
    }

    states[stateName] = stateDef;
  });

  states[stepfunctions.fallbackState] = {
    Type: 'Task',
    Resource: 'arn:aws:states:::dynamodb:putItem',
    Parameters: {
      TableName: dynamodb.tableName,
      Item: {
        [dynamodb.partitionKey]: { 'S.$': "States.Format('QUARANTINE#{}', $$.Execution.Id)" },
        [dynamodb.sortKey]: { S: 'ERROR' },
        status: { S: 'QUARANTINED' },
        errorDetail: { 'S.$': '$.errorInfo.Cause' },
      },
    },
    End: true,
  };

  return JSON.stringify(
    {
      Comment: `${project.name} — ${project.tagline}`,
      StartAt: stepfunctions.states[0] || 'ValidatePayload',
      States: states,
    },
    null,
    2,
  );
}

export function generateSamTemplate(project: ServerlessProject): string {
  const { apigateway, lambda, stepfunctions, dynamodb, s3 } = project.configs;
  const primaryRoute = apigateway.routes[0] || 'POST /v1/ingest';
  const [method, path] = primaryRoute.split(' ');

  return `AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: >
  ${project.name} - ${project.tagline}

Globals:
  Function:
    Runtime: ${lambda.runtime}
    Architectures:
      - ${lambda.architecture}
    MemorySize: ${lambda.memoryMb}
    Timeout: ${lambda.timeoutSec}
    Environment:
      Variables:
        RAW_BUCKET: !Ref RawObjectsBucket
        PROCESSED_BUCKET: !Ref ProcessedObjectsBucket
        LEDGER_TABLE: !Ref LedgerTable
        STATE_MACHINE_ARN: !Ref OrchestrationStateMachine

Resources:
  HttpApiGateway:
    Type: AWS::Serverless::HttpApi
    Properties:
      Name: ${apigateway.apiName}
      StageName: ${apigateway.stage}
      CorsConfiguration:
        AllowOrigins:
          - "${apigateway.corsOrigin}"
        AllowMethods:
          - GET
          - POST
      DefaultRouteSettings:
        ThrottlingBurstLimit: ${apigateway.throttleBurst}
        ThrottlingRateLimit: ${apigateway.throttleRate}

  RawObjectsBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: ${s3.rawBucketName}-\${AWS::AccountId}
      VersioningConfiguration:
        Status: ${s3.versioning ? 'Enabled' : 'Suspended'}
      LifecycleConfiguration:
        Rules:
          - Id: ExpireRawAfterRetention
            Status: Enabled
            ExpirationInDays: ${s3.lifecycleDays}
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true

  ProcessedObjectsBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: ${s3.processedBucketName}-\${AWS::AccountId}
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true

  LedgerTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: ${dynamodb.tableName}
      BillingMode: ${dynamodb.billingMode}
      AttributeDefinitions:
        - AttributeName: ${dynamodb.partitionKey}
          AttributeType: S
        - AttributeName: ${dynamodb.sortKey}
          AttributeType: S
        - AttributeName: gsi1pk
          AttributeType: S
        - AttributeName: gsi1sk
          AttributeType: S
      KeySchema:
        - AttributeName: ${dynamodb.partitionKey}
          KeyType: HASH
        - AttributeName: ${dynamodb.sortKey}
          KeyType: RANGE
      GlobalSecondaryIndexes:
        - IndexName: ${dynamodb.gsi1Name}
          KeySchema:
            - AttributeName: gsi1pk
              KeyType: HASH
            - AttributeName: gsi1sk
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
      TimeToLiveSpecification:
        AttributeName: ${dynamodb.ttlAttribute}
        Enabled: true

  ${lambda.ingestFunctionName}:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: ${lambda.ingestFunctionName}
      CodeUri: src/
      Handler: handler.ingest
      Policies:
        - S3WritePolicy:
            BucketName: !Ref RawObjectsBucket
        - StepFunctionsExecutionPolicy:
            StateMachineName: !GetAtt OrchestrationStateMachine.Name
      Events:
        ApiTrigger:
          Type: HttpApi
          Properties:
            ApiId: !Ref HttpApiGateway
            Path: ${path || '/v1/ingest'}
            Method: ${(method || 'POST').toUpperCase()}

  ${lambda.workerFunctionName}:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: ${lambda.workerFunctionName}
      CodeUri: src/
      Handler: handler.worker
      Policies:
        - S3ReadPolicy:
            BucketName: !Ref RawObjectsBucket
        - S3WritePolicy:
            BucketName: !Ref ProcessedObjectsBucket
        - DynamoDBCrudPolicy:
            TableName: !Ref LedgerTable

  OrchestrationStateMachine:
    Type: AWS::Serverless::StateMachine
    Properties:
      Name: ${stepfunctions.stateMachineName}
      Type: ${stepfunctions.type}
      DefinitionUri: statemachine.asl.json
      DefinitionSubstitutions:
        ${lambda.ingestFunctionName}Arn: !GetAtt ${lambda.ingestFunctionName}.Arn
        ${lambda.workerFunctionName}Arn: !GetAtt ${lambda.workerFunctionName}.Arn
      Policies:
        - LambdaInvokePolicy:
            FunctionName: !Ref ${lambda.ingestFunctionName}
        - LambdaInvokePolicy:
            FunctionName: !Ref ${lambda.workerFunctionName}
        - DynamoDBWritePolicy:
            TableName: !Ref LedgerTable

Outputs:
  ApiEndpoint:
    Description: HTTP API Gateway invoke URL
    Value: !Sub "https://\${HttpApiGateway}.execute-api.\${AWS::Region}.amazonaws.com/${apigateway.stage}"
  StateMachineArn:
    Description: Step Functions State Machine ARN
    Value: !Ref OrchestrationStateMachine
`;
}

export function generateLambdaHandler(project: ServerlessProject): string {
  if (project.customLambdaCode) {
    return project.customLambdaCode;
  }
  const { dynamodb, s3, stepfunctions } = project.configs;
  return `import crypto from 'node:crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const s3 = new S3Client({});
const sfn = new SFNClient({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function ingest(event: { body?: string }) {
  const rawBody = event?.body ? JSON.parse(event.body) : {};
  const executionId = crypto.randomUUID();
  const rawKey = \`raw/\${new Date().toISOString().slice(0, 10)}/\${executionId}.json\`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.RAW_BUCKET || '${s3.rawBucketName}',
      Key: rawKey,
      ContentType: 'application/json',
      Body: JSON.stringify(rawBody),
    }),
  );

  await sfn.send(
    new StartExecutionCommand({
      stateMachineArn: process.env.STATE_MACHINE_ARN,
      name: \`exec-\${executionId}\`,
      input: JSON.stringify({
        executionId,
        rawKey,
        payload: rawBody,
      }),
    }),
  );

  return {
    statusCode: 202,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      accepted: true,
      executionId,
      stateMachine: '${stepfunctions.stateMachineName}',
      rawKey,
    }),
  };
}

export async function worker(event: {
  step: string;
  input: { executionId: string; rawKey: string; payload: Record<string, unknown> };
}) {
  const { step, input } = event;
  const payload = input?.payload || {};

  if (step === '${stepfunctions.states[0] || 'ValidatePayload'}') {
    if (!payload || Object.keys(payload).length === 0) {
      throw new Error('ValidationError: Empty event payload.');
    }
    return { ...input, validatedAt: new Date().toISOString() };
  }

  if (step === '${stepfunctions.states[stepfunctions.states.length - 1] || 'CommitDynamo'}') {
    await ddb.send(
      new PutCommand({
        TableName: process.env.LEDGER_TABLE || '${dynamodb.tableName}',
        Item: {
          ${dynamodb.partitionKey}: \`EXEC#\${input.executionId}\`,
          ${dynamodb.sortKey}: 'META',
          gsi1pk: 'STATUS#SUCCEEDED',
          gsi1sk: new Date().toISOString(),
          s3Pointer: \`s3://\${process.env.RAW_BUCKET}/\${input.rawKey}\`,
          payload,
        },
      }),
    );
  }

  return { ...input, lastCompletedStep: step };
}
`;
}

export function generateProjectReadme(project: ServerlessProject): string {
  const { apigateway, lambda, stepfunctions, dynamodb, s3 } = project.configs;
  return `# ${project.name}

${project.tagline}

## Problem Statement
${project.problemStatement}

## Serverless AWS Services
- **Amazon API Gateway**: \`${apigateway.apiName}\` (Stage: \`${apigateway.stage}\`, Routes: ${apigateway.routes.join(', ')})
- **AWS Lambda**: \`${lambda.ingestFunctionName}\` & \`${lambda.workerFunctionName}\` (\`${lambda.runtime}\`, \`${lambda.architecture}\`, ${lambda.memoryMb} MB)
- **AWS Step Functions**: \`${stepfunctions.stateMachineName}\` (\`${stepfunctions.type}\`, ${stepfunctions.states.length} states + \`${stepfunctions.fallbackState}\` Catch)
- **Amazon DynamoDB**: \`${dynamodb.tableName}\` (\`${dynamodb.partitionKey}\` / \`${dynamodb.sortKey}\`, \`${dynamodb.billingMode}\`)
- **Amazon S3**: \`${s3.rawBucketName}\` -> \`${s3.processedBucketName}\` (${s3.lifecycleDays}-day lifecycle)

## Deploy with AWS SAM
\`\`\`bash
sam build
sam deploy --guided --region ${project.region}
\`\`\`
`;
}
