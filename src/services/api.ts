import { AppProject, GenerationSettings, GroundingSource, ModelInfo, PromptAttachment } from '../types';

export function getCustomApiKey(): string {
  try {
    return localStorage.getItem('gemini_custom_api_key') || '';
  } catch {
    return '';
  }
}

export function setCustomApiKey(key: string): void {
  try {
    if (key) {
      localStorage.setItem('gemini_custom_api_key', key.trim());
    } else {
      localStorage.removeItem('gemini_custom_api_key');
    }
  } catch (e) {
    console.error('Failed to save API key to localStorage', e);
  }
}

function getHeaders(extraHeaders: Record<string, string> = {}) {
  const customKey = getCustomApiKey();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  if (customKey) {
    headers['x-gemini-api-key'] = customKey;
  }
  return headers;
}

export async function fetchHealth(): Promise<{ status: string; hasApiKey: boolean }> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('Health check failed');
    return await res.json();
  } catch (err) {
    return { status: 'error', hasApiKey: false };
  }
}

export async function fetchModels(): Promise<ModelInfo[]> {
  try {
    const res = await fetch('/api/models');
    if (!res.ok) throw new Error('Failed to load models');
    const data = await res.json();
    return data.models || [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

export interface StreamChatParams {
  model: string;
  systemInstruction?: string;
  messages: Array<{
    role: 'user' | 'model';
    text: string;
    files?: Array<{ name: string; mimeType: string; base64: string }>;
  }>;
  temperature?: number;
  thinkingLevel?: string;
  responseMimeType?: string;
  useGoogleSearch?: boolean;
  onChunk: (chunk: string) => void;
  onThought?: (thoughtChunk: string) => void;
  onDone: (
    fullText: string,
    meta?: {
      fullThought?: string;
      sources?: GroundingSource[];
      searchQueries?: string[];
      modelUsed?: string;
    }
  ) => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

export async function streamChat({
  model,
  systemInstruction,
  messages,
  temperature,
  thinkingLevel,
  responseMimeType,
  useGoogleSearch = true,
  onChunk,
  onThought,
  onDone,
  onError,
  signal,
}: StreamChatParams): Promise<void> {
  try {
    const res = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        model,
        systemInstruction,
        messages,
        temperature,
        thinkingLevel,
        responseMimeType,
        useGoogleSearch,
      }),
      signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      onError(`Request failed (${res.status}): ${errText}`);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      onError('Response body is not readable');
      return;
    }

    const decoder = new TextDecoder();
    let accumulatedText = '';
    let accumulatedThought = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          try {
            const data = JSON.parse(jsonStr);
            if (data.error) {
              onError(data.error);
              return;
            }
            if (data.thought) {
              accumulatedThought += data.thought;
              onThought?.(data.thought);
            }
            if (data.text) {
              accumulatedText += data.text;
              onChunk(data.text);
            }
            if (data.done) {
              onDone(data.fullText || accumulatedText, {
                fullThought: data.fullThought || accumulatedThought,
                sources: data.sources,
                searchQueries: data.searchQueries,
                modelUsed: data.modelUsed,
              });
              return;
            }
          } catch (e) {
            // Ignore parse errors on incomplete frames
          }
        }
      }
    }

    onDone(accumulatedText, { fullThought: accumulatedThought });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      onDone('');
      return;
    }
    onError(err?.message || 'Error occurred during streaming');
  }
}

export async function generateAppProject(params: {
  prompt: string;
  projectName?: string;
  currentFiles?: Record<string, string>;
  instruction?: string;
  model?: string;
}): Promise<{
  success: boolean;
  data?: {
    name: string;
    description: string;
    files: Record<string, string>;
    explanation: string;
  };
  error?: string;
}> {
  const res = await fetch('/api/build/generate', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(params),
  });
  return await res.json();
}

export async function generateImageStudio(params: {
  prompt: string;
  aspectRatio?: string;
  model?: string;
  inputImageBase64?: string;
}): Promise<{
  success: boolean;
  imageUrl?: string;
  description?: string;
  modelUsed?: string;
  notice?: string;
  errorCode?: string;
  error?: string;
}> {
  const res = await fetch('/api/image/generate', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(params),
  });
  return await res.json();
}

export async function fetchProjects(): Promise<AppProject[]> {
  try {
    const res = await fetch('/api/projects');
    if (!res.ok) throw new Error('Failed to load projects');
    const data = await res.json();
    return data.projects || [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function createProject(project: Partial<AppProject>): Promise<AppProject> {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(project),
  });
  const data = await res.json();
  return data.project;
}

export async function updateProject(id: string, updates: Partial<AppProject>): Promise<AppProject> {
  const res = await fetch(`/api/projects/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  return data.project;
}

export async function deleteProject(id: string): Promise<boolean> {
  const res = await fetch(`/api/projects/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const data = await res.json();
  return Boolean(data.success);
}
