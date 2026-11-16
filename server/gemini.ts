import { GoogleGenAI, Type } from '@google/genai';

const MODEL_FALLBACK_LADDER = [
  'gemini-4-hydrogen',
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
] as const;

let cachedClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedClient;
}

function isRecoverableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const status = (error as { status?: number; code?: number })?.status ?? (error as { code?: number })?.code;
  if (status && [404, 429, 500, 503].includes(status)) {
    return true;
  }
  return /(503|UNAVAILABLE|429|RESOURCE_EXHAUSTED|404|NOT_FOUND|500|INTERNAL)/i.test(msg);
}

export interface GenerateWithFallbackOptions {
  contents: string;
  systemInstruction?: string;
  responseMimeType?: 'application/json' | 'text/plain';
  responseSchema?: Record<string, unknown>;
}

export async function generateContentWithFallback(
  options: GenerateWithFallbackOptions,
): Promise<{ text: string; modelUsed: string }> {
  const ai = getClient();
  let lastError: unknown = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: {
          ...(options.systemInstruction ? { systemInstruction: options.systemInstruction } : {}),
          ...(options.responseMimeType ? { responseMimeType: options.responseMimeType } : {}),
          ...(options.responseSchema ? { responseSchema: options.responseSchema } : {}),
        },
      });
      const text = (response.text ?? '').trim();
      if (!text) {
        throw new Error(`Empty response returned by ${model}`);
      }
      return { text, modelUsed: model };
    } catch (error) {
      lastError = error;
      if (!isRecoverableError(error)) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('All Gemini models in fallback ladder failed.');
}

export const ARCHITECT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: 'Concise project name (3-6 words).' },
    tagline: { type: Type.STRING, description: 'One concise technical tagline under 90 chars.' },
    problemStatement: { type: Type.STRING, description: '2-3 sentence problem statement and serverless solution summary.' },
    apiName: { type: Type.STRING },
    primaryRoute: { type: Type.STRING, description: 'e.g. POST /v1/orders' },
    secondaryRoute: { type: Type.STRING, description: 'e.g. GET /v1/orders/{id}' },
    ingestFunctionName: { type: Type.STRING },
    workerFunctionName: { type: Type.STRING },
    stateMachineName: { type: Type.STRING },
    states: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '4 to 6 PascalCase Step Functions state names.',
    },
    fallbackState: { type: Type.STRING, description: 'PascalCase error catch state name.' },
    tableName: { type: Type.STRING },
    gsi1Name: { type: Type.STRING },
    rawBucketName: { type: Type.STRING },
    processedBucketName: { type: Type.STRING },
    validSampleLabel: { type: Type.STRING },
    validSampleJson: { type: Type.STRING, description: 'Valid JSON object string representing a realistic input event.' },
    invalidSampleLabel: { type: Type.STRING },
    invalidSampleJson: { type: Type.STRING, description: 'Valid JSON object string representing an invalid payload that triggers Catch.' },
    submissionTitle: { type: Type.STRING, description: 'Short descriptive AWS Builder title under 100 chars.' },
    submissionDescription: { type: Type.STRING, description: '1-2 sentences summarizing the project without repeating the title.' },
    submissionTags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Up to 5 lowercase hyphenated AWS tags.',
    },
  },
  required: [
    'name',
    'tagline',
    'problemStatement',
    'apiName',
    'primaryRoute',
    'secondaryRoute',
    'ingestFunctionName',
    'workerFunctionName',
    'stateMachineName',
    'states',
    'fallbackState',
    'tableName',
    'gsi1Name',
    'rawBucketName',
    'processedBucketName',
    'validSampleLabel',
    'validSampleJson',
    'invalidSampleLabel',
    'invalidSampleJson',
    'submissionTitle',
    'submissionDescription',
    'submissionTags',
  ],
};
