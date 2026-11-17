export type StudioMode = 'playground' | 'build' | 'image' | 'projects' | 'settings';

export interface ModelInfo {
  id: string;
  name: string;
  tag: string;
  description: string;
  contextWindow: string;
  maxOutput: string;
  inputModalities: string[];
  outputModalities: string[];
  supportsThinking: boolean;
  defaultThinkingLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'MINIMAL' | 'XHIGH';
  category: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface PromptAttachment {
  id: string;
  name: string;
  mimeType: string;
  base64: string;
  size: number;
  previewUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  thought?: string;
  sources?: GroundingSource[];
  searchQueries?: string[];
  attachments?: PromptAttachment[];
  timestamp: number;
  isStreaming?: boolean;
  modelUsed?: string;
}

export interface GenerationSettings {
  model: string;
  temperature: number;
  thinkingLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'MINIMAL' | 'XHIGH';
  maxOutputTokens: number;
  responseMimeType: 'text/plain' | 'application/json';
  systemInstruction: string;
  useGoogleSearch: boolean;
  topP?: number;
  topK?: number;
}

export interface AppProject {
  id: string;
  name: string;
  description: string;
  type: 'app' | 'chat' | 'image';
  model: string;
  files: Record<string, string>;
  chatHistory?: Array<{
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: number;
  }>;
  createdAt: number;
  updatedAt: number;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  aspectRatio: string;
  model: string;
  timestamp: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  tier: 'Free Tier' | 'Developer Pro' | 'Enterprise';
  apiKeyCount: number;
}

export type DeviceMode = 'desktop' | 'tablet' | 'mobile' | 'fullscreen';
