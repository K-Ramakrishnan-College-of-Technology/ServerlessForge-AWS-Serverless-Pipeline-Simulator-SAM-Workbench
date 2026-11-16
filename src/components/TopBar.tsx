import { Download } from 'lucide-react';
import type { WorkspaceTab } from '../types/serverless';

interface TopBarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onExportBundle: () => void;
  exporting: boolean;
}

const NAV_ITEMS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'simulator', label: 'Simulator' },
  { id: 'iac', label: 'IaC Bundle' },
  { id: 'submission', label: 'Submission' },
];

export function TopBar({ activeTab, onSelectTab, onExportBundle, exporting }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
      <a
        href="#overview"
        onClick={(e) => {
          e.preventDefault();
          onSelectTab('overview');
        }}
        className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 rounded"
      >
        ServerlessForge
      </a>

      <nav aria-label="Workspace sections" className="hidden md:flex items-center gap-6 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`relative py-5 text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 ${
                isActive
                  ? 'text-slate-950'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {item.label}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-amber-600"
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="shrink-0">
        <button
          type="button"
          onClick={onExportBundle}
          disabled={exporting}
          className="inline-flex items-center gap-2 py-2 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          <span>{exporting ? 'Packaging...' : 'Export Bundle'}</span>
        </button>
      </div>
    </header>
  );
}
