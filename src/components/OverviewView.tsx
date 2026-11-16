import { useState } from 'react';
import { ArrowRight, Cpu, Database, HardDrive, Network, ShieldCheck, Workflow } from 'lucide-react';
import type { ServerlessProject, WorkspaceTab } from '../types/serverless';

interface OverviewViewProps {
  project: ServerlessProject;
  onNavigate: (tab: WorkspaceTab) => void;
  onArchitectIdea: (idea: string) => Promise<void>;
  architectLoading: boolean;
  architectError: string | null;
}

export function OverviewView({
  project,
  onNavigate,
  onArchitectIdea,
  architectLoading,
  architectError,
}: OverviewViewProps) {
  const [ideaInput, setIdeaInput] = useState('');
  const [imgFailed, setImgFailed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaInput.trim() || architectLoading) return;
    await onArchitectIdea(ideaInput.trim());
    setIdeaInput('');
  };

  return (
    <div className="space-y-8">
      {/* Split Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 lg:p-8 flex flex-col justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
              <span>Serverless Blueprint</span>
              <span aria-hidden="true">·</span>
              <span>{project.region}</span>
              <span aria-hidden="true">·</span>
              <span>5 Managed AWS Services</span>
            </div>

            <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
              {project.name}
            </h1>
            <p className="mt-3 text-sm lg:text-base text-slate-600 leading-relaxed max-w-2xl">
              {project.problemStatement}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('simulator')}
                className="inline-flex items-center gap-2 py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
              >
                <span>Run Pipeline Simulator</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('submission')}
                className="inline-flex items-center gap-2 py-2.5 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
              >
                <span>Open Builder Submission</span>
              </button>
            </div>
          </div>

          {/* Bring your own weekend problem */}
          <form onSubmit={handleSubmit} className="border-t border-slate-200 pt-5">
            <label htmlFor="weekend-idea" className="block text-xs font-semibold text-slate-700 mb-2">
              Architect a Custom Weekend Idea
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                id="weekend-idea"
                type="text"
                value={ideaInput}
                onChange={(e) => setIdeaInput(e.target.value)}
                placeholder="e.g., Automated support ticket triage that stores attachments in S3 and routes SLA alerts"
                className="flex-1 min-w-0 px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600"
              />
              <button
                type="submit"
                disabled={architectLoading || ideaInput.trim().length < 8}
                className="py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                {architectLoading ? 'Architecting...' : 'Generate Stack'}
              </button>
            </div>
            {architectError && (
              <p role="alert" className="mt-2 text-xs text-red-600">
                {architectError}
              </p>
            )}
          </form>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="relative flex-1 min-h-[240px] bg-slate-100">
            {!imgFailed ? (
              <img
                src={project.submission.coverImageUrl}
                alt={`Architectural visualization for ${project.name}`}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="w-full h-full lg:h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-100 text-slate-500">
                <Workflow className="w-8 h-8 mb-2 text-slate-400" aria-hidden="true" />
                <span className="text-sm font-medium text-slate-700">{project.name}</span>
              </div>
            )}
          </div>
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span className="truncate">{project.tagline}</span>
            <button
              type="button"
              onClick={() => onNavigate('architecture')}
              className="text-amber-700 hover:text-amber-800 font-medium whitespace-nowrap shrink-0 ml-3 cursor-pointer"
            >
              Inspect Nodes
            </button>
          </div>
        </div>
      </section>

      {/* Full-width 4-column Service Summary Strip */}
      <section aria-label="Active serverless configuration summary" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span>API Gateway</span>
            <Network className="w-4 h-4 text-slate-400" aria-hidden="true" />
          </div>
          <div className="text-sm font-semibold text-slate-900 truncate">
            {project.configs.apigateway.apiName}
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            {project.configs.apigateway.routes.length} routes · {project.configs.apigateway.throttleRate} req/s
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span>AWS Lambda</span>
            <Cpu className="w-4 h-4 text-slate-400" aria-hidden="true" />
          </div>
          <div className="text-sm font-semibold text-slate-900 truncate">
            {project.configs.lambda.runtime} ({project.configs.lambda.architecture})
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            {project.configs.lambda.memoryMb} MB · {project.configs.lambda.timeoutSec}s timeout
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span>Step Functions</span>
            <Workflow className="w-4 h-4 text-slate-400" aria-hidden="true" />
          </div>
          <div className="text-sm font-semibold text-slate-900 truncate">
            {project.configs.stepfunctions.stateMachineName}
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            {project.configs.stepfunctions.type} · {project.configs.stepfunctions.states.length} states · {project.configs.stepfunctions.maxRetries} retries
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span>DynamoDB &amp; S3</span>
            <div className="flex items-center gap-1.5">
              <Database className="w-4 h-4 text-slate-400" aria-hidden="true" />
              <HardDrive className="w-4 h-4 text-slate-400" aria-hidden="true" />
            </div>
          </div>
          <div className="text-sm font-semibold text-slate-900 truncate">
            {project.configs.dynamodb.tableName}
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            {project.configs.dynamodb.billingMode} · {project.configs.s3.lifecycleDays}d S3 lifecycle
          </div>
        </div>
      </section>

      {/* Security & Threat Posture Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-600" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-slate-900">
              Serverless Security &amp; Resilience Controls
            </h2>
          </div>
          <span className="text-xs text-slate-500">Generated in SAM template</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
              <tr>
                <th className="py-2.5 px-6 font-semibold">Boundary</th>
                <th className="py-2.5 px-6 font-semibold">Risk Mitigated</th>
                <th className="py-2.5 px-6 font-semibold">Enforced Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              <tr>
                <td className="py-3 px-6 font-medium text-slate-900">Amazon API Gateway</td>
                <td className="py-3 px-6">Traffic spikes &amp; unauthenticated floods</td>
                <td className="py-3 px-6 font-mono text-xs tabular-nums">
                  Burst {project.configs.apigateway.throttleBurst} / Rate {project.configs.apigateway.throttleRate} req/s + strict CORS
                </td>
              </tr>
              <tr>
                <td className="py-3 px-6 font-medium text-slate-900">AWS Lambda IAM</td>
                <td className="py-3 px-6">Over-privileged function roles</td>
                <td className="py-3 px-6 font-mono text-xs">
                  Scoped SAM policies: S3WritePolicy / DynamoDBCrudPolicy per function
                </td>
              </tr>
              <tr>
                <td className="py-3 px-6 font-medium text-slate-900">Amazon S3 Buckets</td>
                <td className="py-3 px-6">Accidental public exposure</td>
                <td className="py-3 px-6 font-mono text-xs tabular-nums">
                  PublicAccessBlock all-true · {project.configs.s3.presignedTtlSec}s presigned TTL
                </td>
              </tr>
              <tr>
                <td className="py-3 px-6 font-medium text-slate-900">AWS Step Functions</td>
                <td className="py-3 px-6">Silent partial failure &amp; lost payloads</td>
                <td className="py-3 px-6 font-mono text-xs tabular-nums">
                  Exponential retry ({project.configs.stepfunctions.maxRetries}x) + Catch -&gt; {project.configs.stepfunctions.fallbackState}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
