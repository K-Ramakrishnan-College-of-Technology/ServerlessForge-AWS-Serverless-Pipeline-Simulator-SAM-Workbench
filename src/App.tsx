/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { useEffect, useState } from 'react';
import { ArchitectureView } from './components/ArchitectureView';
import { IacBundleView } from './components/IacBundleView';
import { OverviewView } from './components/OverviewView';
import { Sidebar } from './components/Sidebar';
import { SimulatorView } from './components/SimulatorView';
import { SubmissionView } from './components/SubmissionView';
import { TopBar } from './components/TopBar';
import {
  BUILTIN_COVER_IMAGES,
  INITIAL_PROJECTS,
  generateAslJson,
  generateLambdaHandler,
  generateProjectReadme,
  generateSamTemplate,
} from './data/blueprints';
import type {
  ExecutionRecord,
  ServerlessProject,
  ServiceConfigs,
  SimulatorStoreState,
  SubmissionDraft,
  WorkspaceTab,
} from './types/serverless';

const LOCAL_PROJECTS_KEY = 'serverlessforge.projects.v1';
const LOCAL_ACTIVE_KEY = 'serverlessforge.activeProject.v1';

function loadInitialProjects(): ServerlessProject[] {
  try {
    const raw = localStorage.getItem(LOCAL_PROJECTS_KEY);
    if (!raw) return INITIAL_PROJECTS;
    const parsed = JSON.parse(raw) as ServerlessProject[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PROJECTS;
  } catch {
    return INITIAL_PROJECTS;
  }
}

export default function App() {
  const [projects, setProjects] = useState<ServerlessProject[]>(loadInitialProjects);
  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    try {
      return localStorage.getItem(LOCAL_ACTIVE_KEY) || INITIAL_PROJECTS[0].id;
    } catch {
      return INITIAL_PROJECTS[0].id;
    }
  });
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');

  const [store, setStore] = useState<SimulatorStoreState>({
    executions: [],
    s3Objects: [],
    dynamoItems: [],
  });
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  const [architectLoading, setArchitectLoading] = useState(false);
  const [architectError, setArchitectError] = useState<string | null>(null);

  const [draftingBody, setDraftingBody] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const [tailoring, setTailoring] = useState(false);
  const [tailorError, setTailorError] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);

  const activeProject =
    projects.find((p) => p.id === activeProjectId) || projects[0];

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects));
      localStorage.setItem(LOCAL_ACTIVE_KEY, activeProject.id);
    } catch {
      // Ignore storage quota errors cleanly
    }
  }, [projects, activeProject.id]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/storage/state')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to fetch simulator state.');
        return (await res.json()) as SimulatorStoreState;
      })
      .then((data) => {
        if (!cancelled) {
          setStore(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setSimError(err instanceof Error ? err.message : 'Unable to reach server.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateActiveProject = (updater: (prev: ServerlessProject) => ServerlessProject) => {
    setProjects((prevList) =>
      prevList.map((p) => (p.id === activeProject.id ? updater(p) : p)),
    );
  };

  const handleUpdateConfigs = (configs: ServiceConfigs) => {
    updateActiveProject((prev) => ({ ...prev, configs }));
  };

  const handleUpdateSubmission = (patch: Partial<SubmissionDraft>) => {
    updateActiveProject((prev) => ({
      ...prev,
      submission: { ...prev.submission, ...patch },
    }));
  };

  const handleRunSimulation = async (
    route: string,
    payload: Record<string, unknown>,
  ): Promise<ExecutionRecord | null> => {
    setSimLoading(true);
    setSimError(null);
    try {
      const res = await fetch('/api/simulate/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: activeProject, route, payload }),
      });
      const data = (await res.json()) as {
        execution?: ExecutionRecord;
        store?: SimulatorStoreState;
        error?: string;
      };
      if (!res.ok || !data.execution || !data.store) {
        throw new Error(data.error || 'Simulation failed.');
      }
      setStore(data.store);
      return data.execution;
    } catch (err) {
      setSimError(err instanceof Error ? err.message : 'Simulation failed.');
      return null;
    } finally {
      setSimLoading(false);
    }
  };

  const handleResetStore = async () => {
    setSimLoading(true);
    setSimError(null);
    try {
      const res = await fetch('/api/storage/reset', { method: 'POST' });
      const data = (await res.json()) as SimulatorStoreState & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset simulator store.');
      }
      setStore({
        executions: data.executions,
        s3Objects: data.s3Objects,
        dynamoItems: data.dynamoItems,
      });
    } catch (err) {
      setSimError(err instanceof Error ? err.message : 'Failed to reset simulator store.');
    } finally {
      setSimLoading(false);
    }
  };

  const handleArchitectIdea = async (idea: string) => {
    setArchitectLoading(true);
    setArchitectError(null);
    try {
      const res = await fetch('/api/architect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea }),
      });
      const data = (await res.json()) as {
        architect?: Record<string, unknown>;
        error?: string;
      };
      if (!res.ok || !data.architect) {
        throw new Error(data.error || 'Unable to generate serverless architecture.');
      }

      const arch = data.architect;
      const slugBase = String(arch.name || 'custom-serverless')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 36);
      const id = `${slugBase}-${Date.now().toString(36)}`;

      let validPayload: Record<string, unknown> = { itemId: 'ITEM-101', status: 'new' };
      let invalidPayload: Record<string, unknown> = { itemId: '' };
      try {
        validPayload = JSON.parse(String(arch.validSampleJson || '{}')) as Record<string, unknown>;
      } catch {
        // Fallback already initialized
      }
      try {
        invalidPayload = JSON.parse(String(arch.invalidSampleJson || '{}')) as Record<string, unknown>;
      } catch {
        // Fallback already initialized
      }

      const rawTags = Array.isArray(arch.submissionTags)
        ? arch.submissionTags.map(String).slice(0, 5)
        : ['serverless', 'aws-lambda', 'step-functions', 'dynamodb', 'amazon-s3'];

      const states =
        Array.isArray(arch.states) && arch.states.length > 0
          ? arch.states.map(String)
          : ['ValidateInput', 'ArchiveRawS3', 'ProcessDomainLogic', 'CommitDynamoDB'];

      const primaryRoute = String(arch.primaryRoute || 'POST /v1/events');
      const secondaryRoute = String(arch.secondaryRoute || 'GET /v1/events/{id}');

      const newProject: ServerlessProject = {
        id,
        slug: slugBase,
        name: String(arch.name || 'Custom Serverless Stack'),
        tagline: String(arch.tagline || 'Event-driven 5-service AWS serverless pipeline.'),
        problemStatement: String(arch.problemStatement || idea),
        region: 'us-east-1',
        configs: {
          apigateway: {
            apiName: String(arch.apiName || `${slugBase}-http-api`),
            stage: 'v1',
            routes: [primaryRoute, secondaryRoute],
            throttleBurst: 100,
            throttleRate: 50,
            corsOrigin: 'https://app.example.com',
          },
          lambda: {
            ingestFunctionName: String(arch.ingestFunctionName || 'IngestHandler'),
            workerFunctionName: String(arch.workerFunctionName || 'DomainWorker'),
            runtime: 'nodejs22.x',
            architecture: 'arm64',
            memoryMb: 256,
            timeoutSec: 15,
          },
          stepfunctions: {
            stateMachineName: String(arch.stateMachineName || 'WeekendWorkflow'),
            type: 'STANDARD',
            states,
            maxRetries: 2,
            backoffRate: 2.0,
            fallbackState: String(arch.fallbackState || 'QuarantineErrorRecord'),
          },
          dynamodb: {
            tableName: String(arch.tableName || 'AppLedgerTable'),
            partitionKey: 'pk',
            sortKey: 'sk',
            gsi1Name: String(arch.gsi1Name || 'GSI1_StatusDate'),
            billingMode: 'PAY_PER_REQUEST',
            ttlAttribute: 'expiresAt',
          },
          s3: {
            rawBucketName: String(arch.rawBucketName || `${slugBase}-raw-bucket`),
            processedBucketName: String(arch.processedBucketName || `${slugBase}-processed-bucket`),
            versioning: true,
            lifecycleDays: 60,
            presignedTtlSec: 300,
          },
        },
        samplePayloads: [
          {
            id: 'ai-valid',
            label: String(arch.validSampleLabel || 'Valid Sample Event'),
            route: primaryRoute,
            payload: validPayload,
          },
          {
            id: 'ai-invalid',
            label: String(arch.invalidSampleLabel || 'Invalid Event (Catch Test)'),
            route: primaryRoute,
            shouldFail: true,
            payload: invalidPayload,
          },
        ],
        submission: {
          title: String(arch.submissionTitle || arch.name || 'Weekend Serverless Project').slice(0, 255),
          description: String(arch.submissionDescription || arch.tagline || '').slice(0, 512),
          body: `## Problem Worth Solving\n\n${String(arch.problemStatement || idea)}\n\n## Serverless Architecture\n\n- **API Gateway**: \`${String(arch.apiName || slugBase)}\` (${primaryRoute})\n- **AWS Lambda**: \`${String(arch.ingestFunctionName || 'IngestHandler')}\` + \`${String(arch.workerFunctionName || 'DomainWorker')}\` (ARM64)\n- **AWS Step Functions**: \`${String(arch.stateMachineName || 'WeekendWorkflow')}\`\n- **Amazon S3**: \`${String(arch.rawBucketName || 'raw-bucket')}\`\n- **Amazon DynamoDB**: \`${String(arch.tableName || 'AppLedgerTable')}\``,
          tags: rawTags,
          coverImageUrl: BUILTIN_COVER_IMAGES[0].url,
          coverImageName: 'serverless_cover_architecture.jpg',
          coverImageWidth: 1200,
          coverImageHeight: 675,
          coverImageBytes: 245000,
          repoUrl: '',
          demoUrl: '',
          notebookUrl: '',
          termsAccepted: false,
        },
      };

      setProjects((prev) => [newProject, ...prev]);
      setActiveProjectId(newProject.id);
      setActiveTab('architecture');
    } catch (err) {
      setArchitectError(
        err instanceof Error ? err.message : 'Unable to architect serverless project.',
      );
    } finally {
      setArchitectLoading(false);
    }
  };

  const handleDraftBodyWithAi = async () => {
    setDraftingBody(true);
    setDraftError(null);
    try {
      const latestExecution =
        store.executions.find((e) => e.projectId === activeProject.id) || store.executions[0] || null;
      const res = await fetch('/api/draft-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: activeProject, latestExecution }),
      });
      const data = (await res.json()) as { markdown?: string; error?: string };
      if (!res.ok || !data.markdown) {
        throw new Error(data.error || 'Failed to draft submission body.');
      }
      handleUpdateSubmission({ body: data.markdown });
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Failed to draft submission body.');
    } finally {
      setDraftingBody(false);
    }
  };

  const handleTailorHandler = async () => {
    setTailoring(true);
    setTailorError(null);
    try {
      const res = await fetch('/api/enhance-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: activeProject }),
      });
      const data = (await res.json()) as { code?: string; error?: string };
      if (!res.ok || !data.code) {
        throw new Error(data.error || 'Failed to tailor Lambda handler.');
      }
      updateActiveProject((prev) => ({ ...prev, customLambdaCode: data.code }));
    } catch (err) {
      setTailorError(err instanceof Error ? err.message : 'Failed to tailor Lambda handler.');
    } finally {
      setTailoring(false);
    }
  };

  const handleExportBundle = async () => {
    setExporting(true);
    try {
      const zip = new JSZip();
      zip.file('template.yaml', generateSamTemplate(activeProject));
      zip.file('statemachine.asl.json', generateAslJson(activeProject));
      zip.file('src/handler.ts', generateLambdaHandler(activeProject));
      zip.file('README.md', generateProjectReadme(activeProject));
      zip.file(
        'submission.md',
        `# ${activeProject.submission.title}\n\n> ${activeProject.submission.description}\n\nTags: ${activeProject.submission.tags.join(', ')}\nRepo: ${activeProject.submission.repoUrl}\nDemo: ${activeProject.submission.demoUrl}\n\n---\n\n${activeProject.submission.body}\n`,
      );

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeProject.slug}-aws-serverless-bundle.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onExportBundle={handleExportBundle}
        exporting={exporting}
      />

      <div className="flex-1 flex flex-col lg:flex-row">
        <Sidebar
          projects={projects}
          activeProjectId={activeProject.id}
          onSelectProject={setActiveProjectId}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />

        <main className="flex-1 min-w-0 p-5 sm:p-6 lg:p-8 max-w-[1200px]">
          {activeTab === 'overview' && (
            <OverviewView
              project={activeProject}
              onNavigate={setActiveTab}
              onArchitectIdea={handleArchitectIdea}
              architectLoading={architectLoading}
              architectError={architectError}
            />
          )}

          {activeTab === 'architecture' && (
            <ArchitectureView
              project={activeProject}
              onUpdateConfigs={handleUpdateConfigs}
            />
          )}

          {activeTab === 'simulator' && (
            <SimulatorView
              project={activeProject}
              store={store}
              loading={simLoading}
              error={simError}
              onRunSimulation={handleRunSimulation}
              onResetStore={handleResetStore}
            />
          )}

          {activeTab === 'iac' && (
            <IacBundleView
              project={activeProject}
              onTailorHandler={handleTailorHandler}
              tailoring={tailoring}
              tailorError={tailorError}
              onExportBundle={handleExportBundle}
            />
          )}

          {activeTab === 'submission' && (
            <SubmissionView
              project={activeProject}
              onUpdateSubmission={handleUpdateSubmission}
              onDraftBodyWithAi={handleDraftBodyWithAi}
              draftingBody={draftingBody}
              draftError={draftError}
            />
          )}
        </main>
      </div>
    </div>
  );
}
