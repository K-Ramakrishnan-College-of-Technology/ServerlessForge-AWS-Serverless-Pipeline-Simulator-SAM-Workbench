import { useRef, useState } from 'react';
import { Check, Copy, Download, FileText, Image as ImageIcon, Plus, Upload, X } from 'lucide-react';
import { BUILTIN_COVER_IMAGES, SUGGESTED_AWS_TAGS, generateAslJson } from '../data/blueprints';
import type { ServerlessProject, SubmissionDraft } from '../types/serverless';
import { MarkdownPreview } from './MarkdownPreview';

interface SubmissionViewProps {
  project: ServerlessProject;
  onUpdateSubmission: (patch: Partial<SubmissionDraft>) => void;
  onDraftBodyWithAi: () => Promise<void>;
  draftingBody: boolean;
  draftError: string | null;
}

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export function SubmissionView({
  project,
  onUpdateSubmission,
  onDraftBodyWithAi,
  draftingBody,
  draftError,
}: SubmissionViewProps) {
  const { submission } = project;
  const [bodyMode, setBodyMode] = useState<'edit' | 'preview'>('edit');
  const [tagInput, setTagInput] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const titleRepeats =
    submission.title.trim().length > 4 &&
    submission.description.toLowerCase().includes(submission.title.trim().toLowerCase());

  const insertBlock = (blockType: string) => {
    if (!blockType) return;
    let snippet = '';
    if (blockType === 'heading') {
      snippet = '\n\n## Section Heading\n\nExplain how this serverless step solves a real operational bottleneck.\n';
    } else if (blockType === 'architecture') {
      snippet = `\n\n### Service Data Flow\n\n\`\`\`text\nClient -> API Gateway (${project.configs.apigateway.apiName}) -> Lambda (${project.configs.lambda.ingestFunctionName}) -> S3 (${project.configs.s3.rawBucketName}) -> Step Functions (${project.configs.stepfunctions.stateMachineName}) -> DynamoDB (${project.configs.dynamodb.tableName})\n\`\`\`\n`;
    } else if (blockType === 'asl') {
      snippet = `\n\n### Step Functions State Machine\n\n\`\`\`json\n${generateAslJson(project).slice(0, 650)}\n\`\`\`\n`;
    } else if (blockType === 'dynamodb') {
      snippet = `\n\n### DynamoDB Access Patterns\n\n| Access Pattern | Key Condition | Index |\n| :--- | :--- | :--- |\n| Fetch record by ID | \`${project.configs.dynamodb.partitionKey} = ITEM#<id>\` | Primary Table |\n| Query by status | \`gsi1pk = STATUS#VERIFIED\` | \`${project.configs.dynamodb.gsi1Name}\` |\n`;
    } else if (blockType === 'checklist') {
      snippet = `\n\n### Deployment Checklist\n\n- Configure \`sam build && sam deploy --guided\`\n- Verify API Gateway burst limits (${project.configs.apigateway.throttleBurst})\n- Confirm S3 public access block is enabled\n`;
    }
    onUpdateSubmission({ body: `${submission.body}${snippet}` });
  };

  const handleAddTag = (rawTag: string) => {
    const clean = rawTag
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    if (!clean) return;
    if (submission.tags.length >= 5) return;
    if (submission.tags.includes(clean)) {
      setTagInput('');
      return;
    }
    onUpdateSubmission({ tags: [...submission.tags, clean] });
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateSubmission({
      tags: submission.tags.filter((t) => t !== tagToRemove),
    });
  };

  const processImageFile = (file: File) => {
    setUploadError(null);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadError('Unsupported image format. Please choose a JPG, PNG, or WebP file.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError('Image exceeds the 2 MB maximum file size.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      const img = new window.Image();
      img.onload = () => {
        onUpdateSubmission({
          coverImageUrl: dataUrl,
          coverImageName: file.name,
          coverImageWidth: img.naturalWidth,
          coverImageHeight: img.naturalHeight,
          coverImageBytes: file.size,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleDownload1200x675 = () => {
    if (!submission.coverImageUrl) return;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 675;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const scale = Math.max(1200 / img.width, 675 / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (1200 - w) / 2;
      const y = (675 - h) / 2;
      ctx.drawImage(img, x, y, w, h);

      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${project.slug}-cover-1200x675.jpg`;
          a.click();
          URL.revokeObjectURL(url);
        },
        'image/jpeg',
        0.9,
      );
    };
    img.src = submission.coverImageUrl;
  };

  const handleCopyFullSubmission = async () => {
    const compiled = `# ${submission.title}

> ${submission.description}

Tags: ${submission.tags.join(', ')}
Repository: ${submission.repoUrl || 'N/A'}
Live Demo: ${submission.demoUrl || 'N/A'}
${submission.notebookUrl ? `Notebook: ${submission.notebookUrl}\n` : ''}
---

${submission.body}
`;
    await navigator.clipboard.writeText(compiled);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900">
            AWS Builder Center Submission Composer
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Draft, validate, and export every required field for your weekend serverless project writeup.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopyFullSubmission}
          className="inline-flex items-center gap-2 py-2 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
        >
          {copiedAll ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              <span>Copied Full Submission</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Copy Full Submission</span>
            </>
          )}
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        {/* Title */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="sub-title" className="text-sm font-semibold text-slate-900">
              Title
            </label>
            <span
              className={`text-xs font-mono tabular-nums ${
                submission.title.length > 255 ? 'text-red-600' : 'text-slate-500'
              }`}
            >
              {submission.title.length}/255 characters
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-2">
            This appears in search results and in feeds. It should be short, descriptive, and unique.
          </p>
          <input
            id="sub-title"
            type="text"
            maxLength={255}
            value={submission.title}
            onChange={(e) => onUpdateSubmission({ title: e.target.value })}
            placeholder="Enter a short, descriptive project title"
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
          />
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="sub-desc" className="text-sm font-semibold text-slate-900">
              Description
            </label>
            <span
              className={`text-xs font-mono tabular-nums ${
                submission.description.length > 512 ? 'text-red-600' : 'text-slate-500'
              }`}
            >
              {submission.description.length}/512 characters
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-2">
            One or two sentences summarizing your project without repeating the title. This appears in search results and feeds.
          </p>
          <textarea
            id="sub-desc"
            rows={3}
            maxLength={512}
            value={submission.description}
            onChange={(e) => onUpdateSubmission({ description: e.target.value })}
            placeholder="Summarize the problem solved and the AWS serverless architecture"
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
          />
          {titleRepeats && (
            <p className="mt-1.5 text-xs text-amber-700">
              Heads up: Description appears to repeat the Title verbatim. Consider rephrasing for feeds.
            </p>
          )}
        </div>

        {/* AWS Builder Terms */}
        <div className="pt-2 pb-1 border-y border-slate-200 py-3.5">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={submission.termsAccepted}
              onChange={(e) => onUpdateSubmission({ termsAccepted: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-600"
            />
            <span className="text-sm text-slate-700">
              Please read and understand the AWS Builder Terms before creating content.
            </span>
          </label>
        </div>

        {/* Body (Markdown) */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div>
              <span className="text-sm font-semibold text-slate-900">Body</span>
              <span className="text-xs text-slate-500 ml-2">Markdown</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Select block type"
                defaultValue=""
                onChange={(e) => {
                  insertBlock(e.target.value);
                  e.target.value = '';
                }}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 cursor-pointer"
              >
                <option value="" disabled>
                  Select block type
                </option>
                <option value="heading">Section Heading (H2)</option>
                <option value="architecture">Service Data Flow Block</option>
                <option value="asl">Step Functions ASL Snippet</option>
                <option value="dynamodb">DynamoDB Access Patterns Table</option>
                <option value="checklist">Deployment Checklist</option>
              </select>

              <button
                type="button"
                onClick={onDraftBodyWithAi}
                disabled={draftingBody}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-medium text-slate-800 whitespace-nowrap cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{draftingBody ? 'Drafting...' : 'Draft Body with AI'}</span>
              </button>

              <div className="flex items-center p-0.5 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setBodyMode('edit')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                    bodyMode === 'edit' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Markdown
                </button>
                <button
                  type="button"
                  onClick={() => setBodyMode('preview')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                    bodyMode === 'preview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Preview
                </button>
              </div>
            </div>
          </div>

          {draftError && (
            <p role="alert" className="mb-2 text-xs text-red-600">
              {draftError}
            </p>
          )}

          {bodyMode === 'edit' ? (
            <textarea
              rows={13}
              value={submission.body}
              onChange={(e) => onUpdateSubmission({ body: e.target.value })}
              placeholder="Write your architecture walkthrough in Markdown..."
              className="w-full p-4 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
          ) : (
            <div className="p-5 rounded-lg border border-slate-200 bg-white min-h-[280px]">
              <MarkdownPreview markdown={submission.body} />
            </div>
          )}
        </div>

        {/* Cover Image */}
        <div className="border-t border-slate-200 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <span className="text-sm font-semibold text-slate-900">
              Upload a cover image <span className="font-normal text-slate-500">- optional</span>
            </span>
            {submission.coverImageUrl && (
              <button
                type="button"
                onClick={handleDownload1200x675}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-800 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Download 1200×675 JPG</span>
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 mb-3">
            The recommended size is 1200px x 675px. The maximum file size is 2 MB. Text in images is not recommended.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) processImageFile(file);
              }}
              className={`lg:col-span-6 border border-dashed rounded-xl p-5 text-center transition-colors ${
                dragging ? 'border-amber-600 bg-amber-50/50' : 'border-slate-300 bg-slate-50/60'
              }`}
            >
              <Upload className="w-5 h-5 mx-auto text-slate-400 mb-2" aria-hidden="true" />
              <p className="text-xs text-slate-600 mb-3">
                Drag and drop an image file (jpg, png, webp) or select from below.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processImageFile(file);
                }}
                className="hidden"
              />
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-800 cursor-pointer"
                >
                  Choose file
                </button>
                {BUILTIN_COVER_IMAGES.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      onUpdateSubmission({
                        coverImageUrl: preset.url,
                        coverImageName: `${preset.id}.jpg`,
                        coverImageWidth: 1200,
                        coverImageHeight: 675,
                        coverImageBytes: 245000,
                      })
                    }
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs text-slate-700 cursor-pointer"
                  >
                    Use {preset.label.split(' ')[0]} Cover
                  </button>
                ))}
              </div>
              {uploadError && (
                <p role="alert" className="mt-2.5 text-xs text-red-600">
                  {uploadError}
                </p>
              )}
            </div>

            <div className="lg:col-span-6 border border-slate-200 rounded-xl overflow-hidden bg-slate-100">
              {submission.coverImageUrl ? (
                <div>
                  <div className="aspect-video bg-slate-200 overflow-hidden">
                    <img
                      src={submission.coverImageUrl}
                      alt="Selected AWS Builder project cover"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="px-3.5 py-2 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 tabular-nums">
                    <span className="truncate">{submission.coverImageName}</span>
                    <span>
                      {submission.coverImageWidth}×{submission.coverImageHeight} px ·{' '}
                      {Math.round(submission.coverImageBytes / 1024)} KB
                    </span>
                  </div>
                </div>
              ) : (
                <div className="aspect-video flex flex-col items-center justify-center text-slate-400">
                  <ImageIcon className="w-6 h-6 mb-1" aria-hidden="true" />
                  <span className="text-xs">No cover image selected</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="border-t border-slate-200 pt-6">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="sub-tag-input" className="text-sm font-semibold text-slate-900">
              Tags
            </label>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              {submission.tags.length}/5 maximum
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Relevant tags help readers discover and search for your project.
          </p>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            {submission.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-300 bg-slate-50 text-xs font-mono text-slate-800"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  aria-label={`Remove tag ${tag}`}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              id="sub-tag-input"
              type="text"
              value={tagInput}
              disabled={submission.tags.length >= 5}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag(tagInput);
                }
              }}
              placeholder={
                submission.tags.length >= 5
                  ? 'Maximum 5 tags reached'
                  : 'Type a tag and press Enter (e.g., aws-sam)'
              }
              className="flex-1 px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white disabled:bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
            <button
              type="button"
              disabled={submission.tags.length >= 5 || !tagInput.trim()}
              onClick={() => handleAddTag(tagInput)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-medium text-slate-800 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Add Tag</span>
            </button>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500 mr-1">Quick add:</span>
            {SUGGESTED_AWS_TAGS.filter((t) => !submission.tags.includes(t))
              .slice(0, 6)
              .map((tag) => (
                <button
                  key={tag}
                  type="button"
                  disabled={submission.tags.length >= 5}
                  onClick={() => handleAddTag(tag)}
                  className="px-2 py-1 rounded text-xs font-mono text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                >
                  + {tag}
                </button>
              ))}
          </div>
        </div>

        {/* Repository, Live Demo, Notebook Links */}
        <div className="border-t border-slate-200 pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="sub-repo" className="block text-sm font-semibold text-slate-900 mb-1">
              GitHub or GitLab Repository
            </label>
            <p className="text-xs text-slate-500 mb-2">Link to your source code repository.</p>
            <input
              id="sub-repo"
              type="url"
              value={submission.repoUrl}
              onChange={(e) => onUpdateSubmission({ repoUrl: e.target.value })}
              placeholder="https://github.com/..."
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 bg-white text-slate-900"
            />
          </div>

          <div>
            <label htmlFor="sub-demo" className="block text-sm font-semibold text-slate-900 mb-1">
              Endpoint or live demo
            </label>
            <p className="text-xs text-slate-500 mb-2">Link to your deployed application or demo.</p>
            <input
              id="sub-demo"
              type="url"
              value={submission.demoUrl}
              onChange={(e) => onUpdateSubmission({ demoUrl: e.target.value })}
              placeholder="https://..."
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 bg-white text-slate-900"
            />
          </div>

          <div>
            <label htmlFor="sub-notebook" className="block text-sm font-semibold text-slate-900 mb-1">
              Jupyter or SageMaker notebook
            </label>
            <p className="text-xs text-slate-500 mb-2">Link to your project notebook.</p>
            <input
              id="sub-notebook"
              type="url"
              value={submission.notebookUrl}
              onChange={(e) => onUpdateSubmission({ notebookUrl: e.target.value })}
              placeholder="https://... (optional)"
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 bg-white text-slate-900"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
