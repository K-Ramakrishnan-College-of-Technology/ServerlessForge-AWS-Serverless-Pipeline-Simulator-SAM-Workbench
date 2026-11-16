import { Check, Layers } from 'lucide-react';
import type { ServerlessProject, WorkspaceTab } from '../types/serverless';

interface SidebarProps {
  projects: ServerlessProject[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
}

const REQUIRED_SERVICES = [
  'Amazon API Gateway',
  'AWS Lambda',
  'AWS Step Functions',
  'Amazon DynamoDB',
  'Amazon S3',
];

export function Sidebar({
  projects,
  activeProjectId,
  onSelectProject,
  activeTab,
  onSelectTab,
}: SidebarProps) {
  const active = projects.find((p) => p.id === activeProjectId) || projects[0];
  const titleLen = active.submission.title.length;
  const descLen = active.submission.description.length;
  const tagCount = active.submission.tags.length;

  return (
    <aside className="w-full lg:w-[264px] shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-5 flex flex-col gap-6">
      <div className="md:hidden flex items-center gap-1 overflow-x-auto pb-2 border-b border-slate-200">
        {(['overview', 'architecture', 'simulator', 'iac', 'submission'] as WorkspaceTab[]).map(
          (tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onSelectTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 capitalize cursor-pointer ${
                activeTab === tab
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab === 'iac' ? 'IaC Bundle' : tab}
            </button>
          ),
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-semibold text-slate-500">Project Blueprints</h2>
          <span className="text-xs text-slate-400 tabular-nums">{projects.length}</span>
        </div>
        <div className="space-y-1.5">
          {projects.map((project) => {
            const isSelected = project.id === activeProjectId;
            return (
              <button
                key={project.id}
                type="button"
                onClick={() => onSelectProject(project.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 ${
                  isSelected
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                }`}
              >
                <div className="text-sm font-semibold leading-snug truncate">{project.name}</div>
                <div
                  className={`text-xs mt-0.5 truncate ${
                    isSelected ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {project.region} · {project.configs.stepfunctions.states.length} states
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-200 pt-5">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-slate-500" aria-hidden="true" />
          <h2 className="text-xs font-semibold text-slate-500">Managed Stack</h2>
        </div>
        <ul className="space-y-2">
          {REQUIRED_SERVICES.map((service) => (
            <li
              key={service}
              className="flex items-center justify-between text-sm text-slate-700"
            >
              <span>{service}</span>
              <Check className="w-4 h-4 text-emerald-600 shrink-0" aria-label="Configured" />
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-slate-200 pt-5">
        <h2 className="text-xs font-semibold text-slate-500 mb-3">Builder Readiness</h2>
        <dl className="space-y-2 text-xs text-slate-600 tabular-nums">
          <div className="flex items-center justify-between">
            <dt>Title</dt>
            <dd className={titleLen > 0 && titleLen <= 255 ? 'text-slate-900 font-medium' : 'text-amber-700'}>
              {titleLen}/255
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>Description</dt>
            <dd className={descLen > 0 && descLen <= 512 ? 'text-slate-900 font-medium' : 'text-amber-700'}>
              {descLen}/512
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>Tags</dt>
            <dd className="text-slate-900 font-medium">{tagCount}/5</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>Terms Accepted</dt>
            <dd className={active.submission.termsAccepted ? 'text-emerald-700 font-medium' : 'text-amber-700'}>
              {active.submission.termsAccepted ? 'Yes' : 'Pending'}
            </dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}
