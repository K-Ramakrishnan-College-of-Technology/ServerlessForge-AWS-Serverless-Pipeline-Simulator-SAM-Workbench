import { useState } from 'react';
import { ArrowRight, Cpu, Database, HardDrive, Network, Workflow } from 'lucide-react';
import type { AwsServiceKey, ServerlessProject, ServiceConfigs } from '../types/serverless';

interface ArchitectureViewProps {
  project: ServerlessProject;
  onUpdateConfigs: (configs: ServiceConfigs) => void;
}

const SERVICE_META: Array<{
  key: AwsServiceKey;
  title: string;
  role: string;
  Icon: typeof Network;
}> = [
  { key: 'apigateway', title: 'Amazon API Gateway', role: 'Ingress HTTP API & Throttling', Icon: Network },
  { key: 'lambda', title: 'AWS Lambda', role: 'Ingest & Worker Compute', Icon: Cpu },
  { key: 'stepfunctions', title: 'AWS Step Functions', role: 'State Machine Orchestrator', Icon: Workflow },
  { key: 's3', title: 'Amazon S3', role: 'Raw & Processed Object Store', Icon: HardDrive },
  { key: 'dynamodb', title: 'Amazon DynamoDB', role: 'Single-Table Ledger & GSI', Icon: Database },
];

export function ArchitectureView({ project, onUpdateConfigs }: ArchitectureViewProps) {
  const [selected, setSelected] = useState<AwsServiceKey>('apigateway');
  const { configs } = project;

  const updateSection = <K extends keyof ServiceConfigs>(
    key: K,
    patch: Partial<ServiceConfigs[K]>,
  ) => {
    onUpdateConfigs({
      ...configs,
      [key]: {
        ...configs[key],
        ...patch,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900">
            5-Service Serverless Topology
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Select any managed service node to inspect and adjust configuration parameters synced to your SAM template and simulator.
          </p>
        </div>
        <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
          Region: {project.region}
        </span>
      </div>

      {/* Visual Topology Pipeline */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-stretch">
          {SERVICE_META.map((node, index) => {
            const Icon = node.Icon;
            const isSelected = selected === node.key;
            return (
              <div key={node.key} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelected(node.key)}
                  className={`flex-1 h-full text-left p-4 rounded-xl border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 ${
                    isSelected
                      ? 'border-amber-600 bg-amber-50/60'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon
                      className={`w-5 h-5 ${isSelected ? 'text-amber-700' : 'text-slate-500'}`}
                      aria-hidden="true"
                    />
                    <span className="text-xs font-mono text-slate-400 tabular-nums">
                      0{index + 1}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 leading-snug">
                    {node.title}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{node.role}</div>
                </button>
                {index < SERVICE_META.length - 1 && (
                  <ArrowRight
                    className="hidden md:block w-4 h-4 text-slate-400 shrink-0"
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Functions State Path Strip */}
        <div className="mt-6 pt-5 border-t border-slate-200">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold text-slate-600">
              Step Functions Execution Sequence ({configs.stepfunctions.type})
            </span>
            <span className="text-xs font-mono text-slate-500">
              Catch -&gt; {configs.stepfunctions.fallbackState}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {configs.stepfunctions.states.map((stateName, idx) => (
              <div key={stateName} className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 font-mono text-xs text-slate-800">
                  {stateName}
                </span>
                {idx < configs.stepfunctions.states.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Node Configuration Inspector */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="font-display text-base font-semibold text-slate-900 pb-3 border-b border-slate-200 mb-5">
          {SERVICE_META.find((m) => m.key === selected)?.title} Configuration
        </h2>

        {selected === 'apigateway' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">API Name</label>
              <input
                type="text"
                value={configs.apigateway.apiName}
                onChange={(e) => updateSection('apigateway', { apiName: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Stage Name</label>
              <input
                type="text"
                value={configs.apigateway.stage}
                onChange={(e) => updateSection('apigateway', { stage: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Rate Limit (req/s)
              </label>
              <input
                type="number"
                min={1}
                max={10000}
                value={configs.apigateway.throttleRate}
                onChange={(e) =>
                  updateSection('apigateway', { throttleRate: Number(e.target.value) || 10 })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Burst Limit
              </label>
              <input
                type="number"
                min={1}
                max={10000}
                value={configs.apigateway.throttleBurst}
                onChange={(e) =>
                  updateSection('apigateway', { throttleBurst: Number(e.target.value) || 20 })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono tabular-nums"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                CORS Allowed Origin
              </label>
              <input
                type="text"
                value={configs.apigateway.corsOrigin}
                onChange={(e) => updateSection('apigateway', { corsOrigin: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono"
              />
            </div>
          </div>
        )}

        {selected === 'lambda' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Ingest Function Name
              </label>
              <input
                type="text"
                value={configs.lambda.ingestFunctionName}
                onChange={(e) => updateSection('lambda', { ingestFunctionName: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Worker Function Name
              </label>
              <input
                type="text"
                value={configs.lambda.workerFunctionName}
                onChange={(e) => updateSection('lambda', { workerFunctionName: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Runtime</label>
              <select
                value={configs.lambda.runtime}
                onChange={(e) =>
                  updateSection('lambda', {
                    runtime: e.target.value as ServiceConfigs['lambda']['runtime'],
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white font-mono"
              >
                <option value="nodejs22.x">nodejs22.x</option>
                <option value="python3.13">python3.13</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Instruction Set Architecture
              </label>
              <select
                value={configs.lambda.architecture}
                onChange={(e) =>
                  updateSection('lambda', {
                    architecture: e.target.value as ServiceConfigs['lambda']['architecture'],
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white font-mono"
              >
                <option value="arm64">arm64 (Graviton2)</option>
                <option value="x86_64">x86_64</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Memory (MB)
              </label>
              <select
                value={configs.lambda.memoryMb}
                onChange={(e) =>
                  updateSection('lambda', { memoryMb: Number(e.target.value) || 256 })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white font-mono tabular-nums"
              >
                <option value={128}>128 MB</option>
                <option value={256}>256 MB</option>
                <option value={512}>512 MB</option>
                <option value={1024}>1024 MB</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Timeout (Seconds)
              </label>
              <input
                type="number"
                min={3}
                max={900}
                value={configs.lambda.timeoutSec}
                onChange={(e) =>
                  updateSection('lambda', { timeoutSec: Number(e.target.value) || 15 })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono tabular-nums"
              />
            </div>
          </div>
        )}

        {selected === 'stepfunctions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                State Machine Name
              </label>
              <input
                type="text"
                value={configs.stepfunctions.stateMachineName}
                onChange={(e) =>
                  updateSection('stepfunctions', { stateMachineName: e.target.value })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Workflow Type
              </label>
              <select
                value={configs.stepfunctions.type}
                onChange={(e) =>
                  updateSection('stepfunctions', {
                    type: e.target.value as ServiceConfigs['stepfunctions']['type'],
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white font-mono"
              >
                <option value="STANDARD">STANDARD (Exactly-once durable)</option>
                <option value="EXPRESS">EXPRESS (High-volume event)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Max Retries per Task
              </label>
              <input
                type="number"
                min={0}
                max={6}
                value={configs.stepfunctions.maxRetries}
                onChange={(e) =>
                  updateSection('stepfunctions', { maxRetries: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Catch Fallback State
              </label>
              <input
                type="text"
                value={configs.stepfunctions.fallbackState}
                onChange={(e) =>
                  updateSection('stepfunctions', { fallbackState: e.target.value })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono"
              />
            </div>
          </div>
        )}

        {selected === 's3' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Raw Ingestion Bucket
              </label>
              <input
                type="text"
                value={configs.s3.rawBucketName}
                onChange={(e) => updateSection('s3', { rawBucketName: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Processed Archive Bucket
              </label>
              <input
                type="text"
                value={configs.s3.processedBucketName}
                onChange={(e) => updateSection('s3', { processedBucketName: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Lifecycle Expiration (Days)
              </label>
              <input
                type="number"
                min={1}
                max={3650}
                value={configs.s3.lifecycleDays}
                onChange={(e) =>
                  updateSection('s3', { lifecycleDays: Number(e.target.value) || 30 })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Presigned URL TTL (Seconds)
              </label>
              <input
                type="number"
                min={60}
                max={3600}
                value={configs.s3.presignedTtlSec}
                onChange={(e) =>
                  updateSection('s3', { presignedTtlSec: Number(e.target.value) || 300 })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono tabular-nums"
              />
            </div>
          </div>
        )}

        {selected === 'dynamodb' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Table Name</label>
              <input
                type="text"
                value={configs.dynamodb.tableName}
                onChange={(e) => updateSection('dynamodb', { tableName: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Capacity Mode
              </label>
              <select
                value={configs.dynamodb.billingMode}
                onChange={(e) =>
                  updateSection('dynamodb', {
                    billingMode: e.target.value as ServiceConfigs['dynamodb']['billingMode'],
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white font-mono"
              >
                <option value="PAY_PER_REQUEST">PAY_PER_REQUEST (On-Demand)</option>
                <option value="PROVISIONED">PROVISIONED</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Partition Key / Sort Key
              </label>
              <input
                type="text"
                readOnly
                value={`${configs.dynamodb.partitionKey} (HASH) / ${configs.dynamodb.sortKey} (RANGE)`}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-600 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                GSI1 Index Name
              </label>
              <input
                type="text"
                value={configs.dynamodb.gsi1Name}
                onChange={(e) => updateSection('dynamodb', { gsi1Name: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
