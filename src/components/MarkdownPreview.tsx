import React from 'react';

interface MarkdownPreviewProps {
  markdown: string;
}

export function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
  const lines = markdown.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <div key={`code-${i}`} className="my-3 rounded-lg border border-slate-200 bg-slate-950 overflow-hidden">
          {lang && (
            <div className="px-3 py-1.5 text-xs font-mono text-slate-400 border-b border-slate-800">
              {lang}
            </div>
          )}
          <pre className="p-3.5 text-xs font-mono text-slate-100 overflow-x-auto leading-relaxed">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>,
      );
      i++;
      continue;
    }

    // Markdown Table
    if (line.trim().startsWith('|') && i + 1 < lines.length && lines[i + 1].includes('---')) {
      const headers = line
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean);
      i += 2; // skip separator row
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(
          lines[i]
            .split('|')
            .map((c) => c.trim())
            .filter(Boolean),
        );
        i++;
      }
      elements.push(
        <div key={`table-${i}`} className="my-4 overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {headers.map((h, idx) => (
                  <th key={idx} className="px-3.5 py-2 text-xs font-semibold text-slate-700">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="bg-white">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3.5 py-2 text-slate-700 font-mono text-xs">
                      {cell.replace(/`/g, '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-base font-semibold text-slate-900 mt-5 mb-2">
          {line.slice(4)}
        </h3>,
      );
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-lg font-semibold text-slate-900 mt-6 mb-2.5 pb-1.5 border-b border-slate-200">
          {line.slice(3)}
        </h2>,
      );
      i++;
      continue;
    }

    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-xl font-bold text-slate-900 mt-4 mb-3">
          {line.slice(2)}
        </h1>,
      );
      i++;
      continue;
    }

    if (line.trim().startsWith('- ') || /^\d+\.\s/.test(line.trim())) {
      const listItems: string[] = [];
      const ordered = /^\d+\.\s/.test(line.trim());
      while (
        i < lines.length &&
        (lines[i].trim().startsWith('- ') || /^\d+\.\s/.test(lines[i].trim()))
      ) {
        listItems.push(lines[i].trim().replace(/^(-|\d+\.)\s+/, ''));
        i++;
      }
      const Tag = ordered ? 'ol' : 'ul';
      elements.push(
        <Tag
          key={`list-${i}`}
          className={`my-2.5 pl-5 space-y-1.5 text-sm text-slate-700 ${
            ordered ? 'list-decimal' : 'list-disc'
          }`}
        >
          {listItems.map((item, idx) => (
            <li key={idx}>{renderInlineCode(item)}</li>
          ))}
        </Tag>,
      );
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    elements.push(
      <p key={i} className="text-sm text-slate-700 leading-relaxed my-2.5">
        {renderInlineCode(line)}
      </p>,
    );
    i++;
  }

  return <div className="max-w-none">{elements}</div>;
}

function renderInlineCode(text: string): React.ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-100 text-slate-900 font-mono text-xs"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}
