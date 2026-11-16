import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Play, RotateCcw } from 'lucide-react';
import type {
  DynamoDbItem,
  ExecutionRecord,
  S3StoredObject,
  ServerlessProject,
  SimulatorStoreState,
} from '../types/serverless';

interface SimulatorViewProps {
  project: ServerlessProject;
  store: SimulatorStoreState;
  loading: boolean;
  error: string | null;
  onRunSimulation: (route: string, payload: Record<string, unknown>) => Promise<ExecutionRecord | null>;
  onResetStore: () => Promise<void>;
}

type InspectorTab = 'traces' | 's3' | 'dynamodb';

export function SimulatorView({
  project,
  store,
  loading,
  error,
  onRunSimulation,
  onResetStore,
}: SimulatorViewProps) {
  const defaultSample = project.samplePayloads[0];
  const [selectedRoute, setSelectedRoute] = useState<string>(
    project.configs.apigateway.routes[0] || 'POST /v1/ingest',
  );
  const [payloadText, setPayloadText] = useState<string>(
    JSON.stringify(defaultSample?.payload ?? {}, null, 2),
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('traces');
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(
    store.executions[0]?.executionId ?? null,
  );
  const [selectedS3, setSelectedS3] = useState<S3StoredObject | null>(
    store.s3Objects[0] ?? null,
  );
  const [selectedDynamo, setSelectedDynamo] = useState<DynamoDbItem | null>(
    store.dynamoItems[0] ?? null,
  );

  useEffect(() => {
    const first = project.samplePayloads[0];
    setSelectedRoute(project.configs.apigateway.routes[0] || 'POST /v1/ingest');
    if (first) {
      setPayloadText(JSON.stringify(first.payload, null, 2));
    }
    setJsonError(null);
  }, [project.id]);

  useEffect(() => {
    if (store.executions.length > 0 && !selectedExecutionId) {
      setSelectedExecutionId(store.executions[0].executionId);
    }
    if (store.s3Objects.length > 0 && !selectedS3) {
      setSelectedS3(store.s3Objects[0]);
    }
    if (store.dynamoItems.length > 0 && !selectedDynamo) {
      setSelectedDynamo(store.dynamoItems[0]);
    }
  }, [store]);

  const activeExecution =
    store.executions.find((e) => e.executionId === selectedExecutionId) || store.executions[0] || null;

  const handleInvoke = async () => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(payloadText) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setJsonError('Payload must be a JSON object.');
        return;
      }
      setJsonError(null);
    } catch {
      setJsonError('Invalid JSON syntax. Please fix formatting before invoking.');
      return;
    }

    const created = await onRunSimulation(selectedRoute, parsed);
    if (created) {
      setSelectedExecutionId(created.executionId);
      setInspectorTab('traces');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900">
            Live Pipeline Simulator
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Invoke the API Gateway endpoint and trace Step Functions execution, S3 object writes, and DynamoDB ledger commits.
          </p>
        </div>
        <button
          type="button"
          onClick={onResetStore}
          disabled={loading}
          className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Reset Store</span>
        </button>
      </div>

      {error && (
        <div role="alert" className="p-3.5 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Request Runner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 mr-1">Sample Events:</span>
            {project.samplePayloads.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => {
                  setSelectedRoute(sample.route);
                  setPayloadText(JSON.stringify(sample.payload, null, 2));
                  setJsonError(null);
                }}
                className="px-3 py-1.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {sample.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            <select
              aria-label="API Gateway route"
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 bg-white text-slate-800"
            >
              {project.configs.apigateway.routes.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleInvoke}
              disabled={loading}
              className="inline-flex items-center gap-2 py-2 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              <Play className="w-4 h-4" aria-hidden="true" />
              <span>{loading ? 'Executing...' : 'Invoke Endpoint'}</span>
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="sim-payload" className="block text-xs font-medium text-slate-600 mb-1.5">
            JSON Request Body
          </label>
          <textarea
            id="sim-payload"
            rows={7}
            value={payloadText}
            onChange={(e) => setPayloadText(e.target.value)}
            className="w-full p-3.5 rounded-lg border border-slate-300 bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-600"
          />
          {jsonError && (
            <p role="alert" className="mt-1.5 text-xs text-red-600">
              {jsonError}
            </p>
          )}
        </div>
      </div>

      {/* Inspector Tabs: Execution Trace, S3 Objects, DynamoDB Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setInspectorTab('traces')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
                inspectorTab === 'traces'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Step Functions Trace ({store.executions.length})
            </button>
            <button
              type="button"
              onClick={() => setInspectorTab('s3')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
                inspectorTab === 's3'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              S3 Buckets ({store.s3Objects.length})
            </button>
            <button
              type="button"
              onClick={() => setInspectorTab('dynamodb')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
                inspectorTab === 'dynamodb'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              DynamoDB Table ({store.dynamoItems.length})
            </button>
          </div>
          <span className="text-xs text-slate-500 tabular-nums">
            Persisted across reloads
          </span>
        </div>

        {inspectorTab === 'traces' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            <div className="lg:col-span-4 divide-y divide-slate-200 max-h-[420px] overflow-y-auto">
              {store.executions.length === 0 ? (
                <div className="p-6 text-sm text-slate-500">
                  No executions yet. Click Invoke Endpoint above to run your first trace.
                </div>
              ) : (
                store.executions.map((exec) => {
                  const isActive = activeExecution?.executionId === exec.executionId;
                  return (
                    <button
                      key={exec.executionId}
                      type="button"
                      onClick={() => setSelectedExecutionId(exec.executionId)}
                      className={`w-full text-left px-5 py-3.5 transition-colors cursor-pointer ${
                        isActive ? 'bg-amber-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-900">
                          {exec.executionId}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium ${
                            exec.status === 'SUCCEEDED'
                              ? 'text-emerald-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {exec.status === 'SUCCEEDED' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                          <span>{exec.status}</span>
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-slate-500 tabular-nums">
                        <span className="truncate font-mono">{exec.route}</span>
                        <span>{exec.totalDurationMs} ms</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="lg:col-span-8 p-6 space-y-4">
              {activeExecution ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                    <div>
                      <div className="font-mono text-sm font-semibold text-slate-900">
                        {activeExecution.executionId}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                        Started {new Date(activeExecution.startedAt).toLocaleTimeString()} · Total{' '}
                        {activeExecution.totalDurationMs} ms
                      </div>
                    </div>
                    <span className="text-xs font-medium text-slate-700">
                      {activeExecution.steps.length} state transitions
                    </span>
                  </div>

                  <div className="space-y-3">
                    {activeExecution.steps.map((step, idx) => (
                      <div
                        key={`${step.stepName}-${idx}`}
                        className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/50"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-slate-900">
                            {idx + 1}. {step.stepName}
                          </div>
                          <div className="flex items-center gap-3 text-xs tabular-nums shrink-0">
                            <span
                              className={
                                step.status === 'Succeeded'
                                  ? 'text-emerald-700 font-medium'
                                  : 'text-amber-700 font-medium'
                              }
                            >
                              {step.status}
                            </span>
                            <span className="font-mono text-slate-500">{step.durationMs} ms</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{step.summary}</p>
                        <pre className="mt-2 p-2.5 rounded bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto">
                          {JSON.stringify(step.outputPreview, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-500">Select an execution to view state transitions.</div>
              )}
            </div>
          </div>
        )}

        {inspectorTab === 's3' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            <div className="lg:col-span-7 overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Bucket</th>
                    <th className="py-2.5 px-4 font-semibold">Object Key</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {store.s3Objects.map((obj) => (
                    <tr
                      key={`${obj.bucket}-${obj.key}`}
                      onClick={() => setSelectedS3(obj)}
                      className={`cursor-pointer transition-colors ${
                        selectedS3?.key === obj.key ? 'bg-amber-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-700">{obj.bucket}</td>
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-900">{obj.key}</td>
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-600 text-right tabular-nums">
                        {obj.sizeBytes} B
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="lg:col-span-5 p-5">
              <h3 className="text-xs font-semibold text-slate-600 mb-2">Object Body Preview</h3>
              {selectedS3 ? (
                <pre className="p-3.5 rounded-lg bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto">
                  {JSON.stringify(selectedS3.body, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-slate-500">Click an S3 object row to inspect its JSON body.</p>
              )}
            </div>
          </div>
        )}

        {inspectorTab === 'dynamodb' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            <div className="lg:col-span-7 overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">PK</th>
                    <th className="py-2.5 px-4 font-semibold">SK</th>
                    <th className="py-2.5 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {store.dynamoItems.map((item) => (
                    <tr
                      key={`${item.pk}-${item.sk}`}
                      onClick={() => setSelectedDynamo(item)}
                      className={`cursor-pointer transition-colors ${
                        selectedDynamo?.pk === item.pk ? 'bg-amber-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-900">{item.pk}</td>
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-600">{item.sk}</td>
                      <td className="py-2.5 px-4 text-xs font-medium text-slate-800">{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="lg:col-span-5 p-5">
              <h3 className="text-xs font-semibold text-slate-600 mb-2">DynamoDB Attribute Map</h3>
              {selectedDynamo ? (
                <pre className="p-3.5 rounded-lg bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto">
                  {JSON.stringify(selectedDynamo, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-slate-500">Click a DynamoDB row to inspect its attributes.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
