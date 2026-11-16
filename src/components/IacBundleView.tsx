import { useState } from 'react';
import { Check, Code2, Copy, Download } from 'lucide-react';
import {
  generateAslJson,
  generateLambdaHandler,
  generateProjectReadme,
  generateSamTemplate,
} from '../data/blueprints';
import type { ServerlessProject } from '../types/serverless';

interface IacBundleViewProps {
  project: ServerlessProject;
  onTailorHandler: () => Promise<void>;
  tailoring: boolean;
  tailorError: string | null;
  onExportBundle: () => void;
}

type BundleFileKey = 'sam' | 'asl' | 'handler' | 'readme';

export function IacBundleView({
  project,
  onTailorHandler,
  tailoring,
  tailorError,
  onExportBundle,
}: IacBundleViewProps) {
  const [activeFile, setActiveFile] = useState<BundleFileKey>('sam');
  const [copied, setCopied] = useState(false);

  const files: Record<BundleFileKey, { filename: string; content: string }> = {
    sam: {
      filename: 'template.yaml',
      content: generateSamTemplate(project),
    },
    asl: {
      filename: 'statemachine.asl.json',
      content: generateAslJson(project),
    },
    handler: {
      filename: 'src/handler.ts',
      content: generateLambdaHandler(project),
    },
    readme: {
      filename: 'README.md',
      content: generateProjectReadme(project),
    },
  };

  const current = files[activeFile];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(current.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900">
            Deployable IaC &amp; Handler Bundle
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Generated directly from your active 5-service configuration. Deploy with <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">sam deploy --guided</code>.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onTailorHandler}
            disabled={tailoring}
            className="inline-flex items-center gap-2 py-2 px-3.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-medium text-slate-800 whitespace-nowrap cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{tailoring ? 'Tailoring...' : 'Tailor Handler with AI'}</span>
          </button>
          <button
            type="button"
            onClick={onExportBundle}
            className="inline-flex items-center gap-2 py-2 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Download .zip</span>
          </button>
        </div>
      </div>

      {tailorError && (
        <div role="alert" className="p-3.5 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800">
          {tailorError}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto">
            {(Object.keys(files) as BundleFileKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveFile(key)}
                className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md whitespace-nowrap cursor-pointer ${
                  activeFile === key
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {files[key].filename}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 whitespace-nowrap cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Copy {current.filename}</span>
              </>
            )}
          </button>
        </div>

        <pre className="p-5 bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed overflow-x-auto max-h-[540px]">
          <code>{current.content}</code>
        </pre>
      </div>
    </div>
  );
}
