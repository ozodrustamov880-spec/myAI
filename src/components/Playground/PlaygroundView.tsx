import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Square,
  Paperclip,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  FileText,
  X,
  Code,
  Info,
  BrainCircuit,
  Settings2,
  FileJson,
  Zap,
  Layers,
  FolderKanban,
  ArrowRight,
  Key,
  Globe,
  ExternalLink,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { ChatMessage, GenerationSettings, ModelInfo, PromptAttachment, StudioMode } from '../../types';
import { streamChat } from '../../services/api';

interface PlaygroundViewProps {
  models: ModelInfo[];
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  onOpenGetCode: () => void;
  onSelectMode?: (mode: StudioMode) => void;
  onOpenCodeInBuild?: (code: string, language: string, title?: string) => void;
  apiConnected?: boolean;
  onOpenSettings?: () => void;
}

export const PlaygroundView: React.FC<PlaygroundViewProps> = ({
  models,
  selectedModel,
  onSelectModel,
  onOpenGetCode,
  onSelectMode,
  onOpenCodeInBuild,
  apiConnected,
  onOpenSettings,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [attachments, setAttachments] = useState<PromptAttachment[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSystemInstruction, setShowSystemInstruction] = useState(false);
  const [showParameters, setShowParameters] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({});
  const [artifactModes, setArtifactModes] = useState<Record<string, 'code' | 'preview'>>({});

  const [settings, setSettings] = useState<GenerationSettings>({
    model: selectedModel,
    temperature: 0.7,
    thinkingLevel: 'MEDIUM',
    maxOutputTokens: 8192,
    responseMimeType: 'text/plain',
    systemInstruction: '',
    useGoogleSearch: true,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync model selection
  useEffect(() => {
    setSettings((prev) => ({ ...prev, model: selectedModel }));
  }, [selectedModel]);

  // Auto-resize textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 40), 200)}px`;
    }
  }, [inputPrompt]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Handle file uploads (images & text files)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      const isImage = file.type.startsWith('image/');

      reader.onload = () => {
        const base64 = reader.result as string;
        const newAttachment: PromptAttachment = {
          id: 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          name: file.name,
          mimeType: file.type || (isImage ? 'image/png' : 'text/plain'),
          base64: base64,
          size: file.size,
          previewUrl: isImage ? base64 : undefined,
        };
        setAttachments((prev) => [...prev, newAttachment]);
      };

      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Send Prompt / Run Stream
  const handleSendMessage = async () => {
    const trimmed = inputPrompt.trim();
    if ((!trimmed && attachments.length === 0) || isStreaming) return;

    const userMessageId = 'usr-' + Date.now();
    const newUserMsg: ChatMessage = {
      id: userMessageId,
      role: 'user',
      text: trimmed,
      attachments: attachments.length > 0 ? [...attachments] : undefined,
      timestamp: Date.now(),
    };

    const modelMessageId = 'mod-' + Date.now();
    const newModelMsg: ChatMessage = {
      id: modelMessageId,
      role: 'model',
      text: '',
      timestamp: Date.now(),
      isStreaming: true,
      modelUsed: settings.model,
    };

    setMessages((prev) => [...prev, newUserMsg, newModelMsg]);
    setInputPrompt('');
    setAttachments([]);
    setIsStreaming(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Build chat history payload
    const allMsgs = [...messages, newUserMsg].map((m) => ({
      role: m.role,
      text: m.text,
      files: m.attachments?.map((a) => ({
        name: a.name,
        mimeType: a.mimeType,
        base64: a.base64,
      })),
    }));

    await streamChat({
      model: settings.model,
      systemInstruction: settings.systemInstruction,
      messages: allMsgs,
      temperature: settings.temperature,
      thinkingLevel: settings.thinkingLevel,
      responseMimeType: settings.responseMimeType,
      useGoogleSearch: settings.useGoogleSearch,
      signal: controller.signal,
      onThought: (thoughtChunk) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === modelMessageId ? { ...m, thought: (m.thought || '') + thoughtChunk } : m
          )
        );
      },
      onChunk: (chunk) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === modelMessageId ? { ...m, text: m.text + chunk } : m))
        );
      },
      onDone: (full, meta) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === modelMessageId
              ? {
                  ...m,
                  text: full,
                  thought: meta?.fullThought ?? m.thought,
                  sources: meta?.sources,
                  searchQueries: meta?.searchQueries,
                  modelUsed: meta?.modelUsed || m.modelUsed,
                  isStreaming: false,
                }
              : m
          )
        );
        setIsStreaming(false);
        abortControllerRef.current = null;
      },
      onError: (err) => {
        const isAuthError =
          err.includes('PERMISSION_DENIED') ||
          err.includes('API_KEY_INVALID') ||
          err.includes('403') ||
          err.includes('400') ||
          err.includes('insufficient');
        const formattedErr = isAuthError
          ? `${err}\n\n💡 **Tavsiya:** AI Studio Secrets bo'limida o'zingizning **GEMINI_API_KEY** kalitingizni o'rnatishingiz mumkin.`
          : err;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === modelMessageId
              ? {
                  ...m,
                  text: m.text
                    ? `${m.text}\n\n⚠️ **Notice:** ${formattedErr}`
                    : `⚠️ **Notice:** ${formattedErr}`,
                  isStreaming: false,
                }
              : m
          )
        );
        setIsStreaming(false);
        abortControllerRef.current = null;
      },
    });
  };

  const handleRegenerateLast = async () => {
    if (isStreaming || messages.length < 2) return;
    const lastUserIndex = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserIndex === -1) return;
    const actualUserIdx = messages.length - 1 - lastUserIndex;
    const historyUpToUser = messages.slice(0, actualUserIdx + 1);

    const modelMessageId = 'mod-' + Date.now();
    const newModelMsg: ChatMessage = {
      id: modelMessageId,
      role: 'model',
      text: '',
      timestamp: Date.now(),
      isStreaming: true,
      modelUsed: settings.model,
    };

    setMessages([...historyUpToUser, newModelMsg]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const allMsgs = historyUpToUser.map((m) => ({
      role: m.role,
      text: m.text,
      files: m.attachments?.map((a) => ({
        name: a.name,
        mimeType: a.mimeType,
        base64: a.base64,
      })),
    }));

    await streamChat({
      model: settings.model,
      systemInstruction: settings.systemInstruction,
      messages: allMsgs,
      temperature: settings.temperature,
      thinkingLevel: settings.thinkingLevel,
      responseMimeType: settings.responseMimeType,
      useGoogleSearch: settings.useGoogleSearch,
      signal: controller.signal,
      onThought: (thoughtChunk) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === modelMessageId ? { ...m, thought: (m.thought || '') + thoughtChunk } : m
          )
        );
      },
      onChunk: (chunk) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === modelMessageId ? { ...m, text: m.text + chunk } : m))
        );
      },
      onDone: (full, meta) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === modelMessageId
              ? {
                  ...m,
                  text: full,
                  thought: meta?.fullThought ?? m.thought,
                  sources: meta?.sources,
                  searchQueries: meta?.searchQueries,
                  modelUsed: meta?.modelUsed || m.modelUsed,
                  isStreaming: false,
                }
              : m
          )
        );
        setIsStreaming(false);
        abortControllerRef.current = null;
      },
      onError: (err) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === modelMessageId
              ? { ...m, text: `⚠️ **Xatolik:** ${err}`, isStreaming: false }
              : m
          )
        );
        setIsStreaming(false);
        abortControllerRef.current = null;
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setInputPrompt('');
    setAttachments([]);
    setSettings((prev) => ({
      ...prev,
      responseMimeType: 'text/plain',
      systemInstruction: '',
    }));
    setShowSystemInstruction(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Render markdown with syntax code blocks, inline live artifact preview, tables, and lists
  const renderFormattedContent = (content: string, msgKey: string = 'msg') => {
    const trimmed = content.trim();

    // If the model output a conversational JSON object instead of natural prose, extract speech cleanly
    if (trimmed.startsWith('{') && trimmed.endsWith('}') && !trimmed.includes('```')) {
      try {
        const obj = JSON.parse(trimmed);
        const naturalParts: string[] = [];
        if (typeof obj.greeting === 'string') naturalParts.push(obj.greeting);
        if (typeof obj.status === 'string') naturalParts.push(obj.status);
        if (typeof obj.message === 'string') naturalParts.push(obj.message);
        if (typeof obj.text === 'string') naturalParts.push(obj.text);
        if (typeof obj.response === 'string') naturalParts.push(obj.response);
        if (typeof obj.reply === 'string') naturalParts.push(obj.reply);
        if (typeof obj.answer === 'string') naturalParts.push(obj.answer);

        if (naturalParts.length === 0) {
          for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string' && !['language', 'model', 'status_code', 'id'].includes(key.toLowerCase())) {
              naturalParts.push(value);
            }
          }
        }

        if (naturalParts.length > 0) {
          return (
            <div className="space-y-2 text-[13px] sm:text-sm leading-relaxed text-[#1f1f1f] dark:text-[#e3e3e3]">
              <p className="font-normal">{naturalParts.join(' ')}</p>
            </div>
          );
        }
      } catch (e) {
        // Not standard conversational JSON, proceed to standard markdown formatting
      }
    }

    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const firstLineBreak = part.indexOf('\n');
        const language = firstLineBreak !== -1 ? part.substring(3, firstLineBreak).trim() : '';
        const code =
          firstLineBreak !== -1
            ? part.substring(firstLineBreak + 1, part.length - 3)
            : part.substring(3, part.length - 3);

        const codeBlockId = `${msgKey}-code-${index}`;
        const lowerLang = language.toLowerCase();
        const isPreviewable =
          lowerLang === 'html' ||
          lowerLang === 'htm' ||
          lowerLang === 'svg' ||
          code.trim().startsWith('<!DOCTYPE') ||
          code.trim().startsWith('<html') ||
          code.trim().startsWith('<svg');

        const activeTab = artifactModes[codeBlockId] || 'code';
        const previewSrcDoc =
          lowerLang === 'svg' || code.trim().startsWith('<svg')
            ? `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#ffffff;">${code}</body></html>`
            : code.includes('<html')
              ? code
              : `<!DOCTYPE html><html lang="uz"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-white text-slate-900 p-4 flex items-center justify-center min-h-screen">${code}</body></html>`;

        return (
          <div
            key={index}
            className="my-3 rounded-xl overflow-hidden border border-[#dadce0] dark:border-[#333538] bg-[#1e1e24] text-slate-100 shadow-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#17171c] border-b border-white/10 text-xs text-slate-400 font-mono">
              <div className="flex items-center gap-2">
                <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-300">
                  {language || 'code'}
                </span>
                {isPreviewable && (
                  <div className="flex items-center p-0.5 rounded-lg bg-white/5 border border-white/10">
                    <button
                      onClick={() => setArtifactModes((prev) => ({ ...prev, [codeBlockId]: 'code' }))}
                      className={`px-2 py-0.5 rounded text-[11px] font-sans font-medium transition-colors whitespace-nowrap ${
                        activeTab === 'code'
                          ? 'bg-white/15 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Kod
                    </button>
                    <button
                      onClick={() => setArtifactModes((prev) => ({ ...prev, [codeBlockId]: 'preview' }))}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-sans font-medium transition-colors whitespace-nowrap ${
                        activeTab === 'preview'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      Preview
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {(onOpenCodeInBuild || onSelectMode) && (
                  <button
                    onClick={() => {
                      if (onOpenCodeInBuild) {
                        onOpenCodeInBuild(code, language);
                      } else if (onSelectMode) {
                        onSelectMode('build');
                      }
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 hover:text-white transition-colors text-[11px] font-sans whitespace-nowrap"
                    title="Ushbu kodni Build Mode muharririda ochish va tahrirlash"
                  >
                    <Layers className="w-3 h-3 text-indigo-400" />
                    <span>Build Mode'da ochish</span>
                  </button>
                )}
                <button
                  onClick={() => copyToClipboard(code, codeBlockId)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors text-[11px] font-sans whitespace-nowrap"
                >
                  {copiedId === codeBlockId ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Nusxa olindi</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Nusxa olish</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {isPreviewable && activeTab === 'preview' ? (
              <div className="bg-white">
                <iframe
                  title={`Artifact Preview ${codeBlockId}`}
                  srcDoc={previewSrcDoc}
                  sandbox="allow-scripts"
                  className="w-full h-64 sm:h-72 border-0 bg-white"
                />
              </div>
            ) : (
              <pre className="p-4 text-xs font-mono overflow-x-auto leading-relaxed text-slate-200">
                <code>{code}</code>
              </pre>
            )}
          </div>
        );
      }

      // Render markdown lines including tables, blockquotes, lists, headings
      const lines = part.split('\n');
      const renderedBlocks: React.ReactNode[] = [];
      let i = 0;

      while (i < lines.length) {
        const line = lines[i];

        // Markdown Table detection
        if (line.trim().startsWith('|') && i + 1 < lines.length && lines[i + 1].trim().match(/^\|[\s\-:|]+\|$/)) {
          const headerCells = line
            .trim()
            .slice(1, -1)
            .split('|')
            .map((c) => c.trim());
          i += 2; // Skip header & separator
          const rows: string[][] = [];
          while (i < lines.length && lines[i].trim().startsWith('|')) {
            const rowCells = lines[i]
              .trim()
              .slice(1, -1)
              .split('|')
              .map((c) => c.trim());
            rows.push(rowCells);
            i++;
          }
          renderedBlocks.push(
            <div key={`tbl-${i}`} className="my-2.5 overflow-x-auto rounded-xl border border-[#dadce0] dark:border-[#333538]">
              <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
                <thead className="bg-[#f8fafd] dark:bg-[#282a2c] border-b border-[#dadce0] dark:border-[#333538]">
                  <tr>
                    {headerCells.map((cell, cIdx) => (
                      <th key={cIdx} className="px-3 py-2 font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                        {formatInlineMarkdown(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dadce0]/60 dark:divide-[#333538]">
                  {rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-[#f8fafd]/60 dark:hover:bg-[#282a2c]/40">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-2 text-[#444746] dark:text-[#c4c7c5]">
                          {formatInlineMarkdown(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          continue;
        }

        if (line.startsWith('### ')) {
          renderedBlocks.push(
            <h4 key={i} className="font-semibold text-sm sm:text-base mt-2.5 mb-1 text-[#1f1f1f] dark:text-[#e3e3e3]">
              {formatInlineMarkdown(line.replace('### ', ''))}
            </h4>
          );
        } else if (line.startsWith('## ')) {
          renderedBlocks.push(
            <h3 key={i} className="font-bold text-base sm:text-lg mt-3 mb-1.5 text-[#1f1f1f] dark:text-[#e3e3e3]">
              {formatInlineMarkdown(line.replace('## ', ''))}
            </h3>
          );
        } else if (line.startsWith('# ')) {
          renderedBlocks.push(
            <h2 key={i} className="font-extrabold text-lg sm:text-xl mt-4 mb-2 text-[#1f1f1f] dark:text-[#e3e3e3]">
              {formatInlineMarkdown(line.replace('# ', ''))}
            </h2>
          );
        } else if (line.startsWith('> ')) {
          renderedBlocks.push(
            <div
              key={i}
              className="my-1.5 px-3.5 py-2 rounded-xl bg-[#f8fafd] dark:bg-[#282a2c]/60 border border-[#dadce0] dark:border-[#333538] text-[#444746] dark:text-[#c4c7c5] text-xs sm:text-[13px]"
            >
              {formatInlineMarkdown(line.substring(2))}
            </div>
          );
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          renderedBlocks.push(
            <div key={i} className="flex items-start gap-2 pl-2">
              <span className="text-[#0b57d0] font-bold">•</span>
              <span>{formatInlineMarkdown(line.substring(2))}</span>
            </div>
          );
        } else {
          const numberedMatch = line.match(/^(\d+\.)\s+(.*)$/);
          if (numberedMatch) {
            renderedBlocks.push(
              <div key={i} className="flex items-start gap-2 pl-2">
                <span className="text-[#0b57d0] font-semibold min-w-[1.2rem] tabular-nums">{numberedMatch[1]}</span>
                <span>{formatInlineMarkdown(numberedMatch[2])}</span>
              </div>
            );
          } else if (!line.trim()) {
            renderedBlocks.push(<div key={i} className="h-1.5" />);
          } else {
            renderedBlocks.push(<p key={i}>{formatInlineMarkdown(line)}</p>);
          }
        }
        i++;
      }

      return (
        <div key={index} className="space-y-1.5 text-[13px] sm:text-sm leading-relaxed text-[#1f1f1f] dark:text-[#e3e3e3]">
          {renderedBlocks}
        </div>
      );
    });
  };

  const formatInlineMarkdown = (text: string) => {
    // Process **bold**, `code`, and [label](url)
    const tokens = text.split(/(\*\*.*?\*\*|`.*?`|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g);
    return tokens.map((token, i) => {
      if (token.startsWith('**') && token.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-[#1f1f1f] dark:text-[#f8fafd]">
            {token.slice(2, -2)}
          </strong>
        );
      }
      if (token.startsWith('`') && token.endsWith('`')) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded bg-[#f0f4f9] dark:bg-[#282a2c] text-[#0b57d0] dark:text-[#a8c7fa] font-mono text-[12px] border border-[#dadce0] dark:border-[#333538]"
          >
            {token.slice(1, -1)}
          </code>
        );
      }
      const linkMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (linkMatch) {
        return (
          <a
            key={i}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            className="text-[#0b57d0] dark:text-[#a8c7fa] underline underline-offset-2 hover:opacity-80"
          >
            {linkMatch[1]}
          </a>
        );
      }
      return token;
    });
  };

  // Preset Starters
  const applyPreset = (prompt: string, sysPrompt: string = '') => {
    setInputPrompt(prompt);
    if (sysPrompt) {
      setSettings((prev) => ({ ...prev, systemInstruction: sysPrompt }));
      setShowSystemInstruction(true);
    }
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const sampleSuggestions = [
    {
      title: 'Dasturlash va kod',
      desc: 'TypeScriptda LRU kesh yaratish yoki Python algoritmlari',
      prompt: 'TypeScriptda eng samarali LRU (Least Recently Used) kesh algoritmini tushuntiring va kodini yozib bering.',
    },
    {
      title: 'Tushuntirish va oʻrganish',
      desc: 'Deep Learning va Transformer arxitekturasi',
      prompt: 'Transformer modelidagi Self-Attention mexanizmini oddiy misollar bilan tushuntirib bering.',
    },
    {
      title: 'G‘oya va rejalashtirish',
      desc: 'Startup yoki yangi loyiha texnik rejasi',
      prompt: 'Zamonaviy SaaS platformasi uchun arxitektura va texnologiyalar stekini rejalashtirib bering.',
    },
    {
      title: 'JSON tuzilmasi',
      desc: 'Qat’iy sxemaga mos ma’lumotlar generatsiyasi',
      prompt: 'O‘zbekiston shaharlari haqida (nomi, aholisi, mashhur joylari) to‘liq va chiroyli JSON formatida ma’lumot tayyorlab bering.',
    },
  ];

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full min-h-0 overflow-hidden bg-white dark:bg-[#131314]">
      {/* Main Chat Stream Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Top Chat Bar: Clear, Model info, Tune, Get Code */}
        <div className="h-12 border-b border-[#dadce0] dark:border-[#333538] bg-white dark:bg-[#1e1f20] px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] border border-[#dadce0] dark:border-[#333538] transition-colors whitespace-nowrap shrink-0"
              title="Yangi suhbat boshlash"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#0b57d0] shrink-0" />
              <span>Yangi chat</span>
            </button>

            <button
              onClick={() => setShowSystemInstruction(!showSystemInstruction)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium transition-colors border whitespace-nowrap shrink-0 ${
                showSystemInstruction || settings.systemInstruction.trim()
                  ? 'bg-[#e8f0fe] dark:bg-[#1b2d4b] border-[#a8c7fa] dark:border-[#2b4c7e] text-[#0b57d0] dark:text-[#a8c7fa]'
                  : 'hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] border-[#dadce0] dark:border-[#333538] text-[#444746] dark:text-[#c4c7c5]'
              }`}
              title="System Prompt (Model ko‘rsatmalari)"
            >
              <BrainCircuit className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">System Prompt</span>
            </button>

            <button
              onClick={() =>
                setSettings((prev) => ({ ...prev, useGoogleSearch: !prev.useGoogleSearch }))
              }
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium transition-colors border whitespace-nowrap shrink-0 ${
                settings.useGoogleSearch
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] border-[#dadce0] dark:border-[#333538] text-[#444746] dark:text-[#c4c7c5]'
              }`}
              title="Google Qidiruv orqali jonli bilim va manbalar"
            >
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">Google Qidiruv</span>
            </button>

            {settings.responseMimeType === 'application/json' && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs whitespace-nowrap shrink-0">
                <FileJson className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline font-medium">JSON Mode</span>
                <button
                  onClick={() =>
                    setSettings((prev) => ({ ...prev, responseMimeType: 'text/plain' }))
                  }
                  className="p-0.5 hover:text-amber-900 rounded font-bold ml-0.5"
                  title="Oddiy matn rejimiga o'tish"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onSelectMode && (
              <div className="hidden sm:flex items-center p-0.5 rounded-full bg-[#f0f4f9] dark:bg-[#282a2c] border border-[#dadce0] dark:border-[#333538]">
                <button
                  onClick={() => onSelectMode('playground')}
                  className="px-2.5 py-1 rounded-full bg-white dark:bg-[#1e1f20] text-[#0b57d0] dark:text-[#a8c7fa] text-xs font-semibold shadow-2xs whitespace-nowrap"
                >
                  Chat
                </button>
                <button
                  onClick={() => onSelectMode('build')}
                  className="px-2.5 py-1 rounded-full text-xs font-medium text-[#444746] dark:text-[#c4c7c5] hover:text-[#1f1f1f] dark:hover:text-white whitespace-nowrap transition-colors"
                  title="Veb-sayt va ilova yaratish (Build / Preview)"
                >
                  Preview
                </button>
                <button
                  onClick={() => onSelectMode('projects')}
                  className="px-2.5 py-1 rounded-full text-xs font-medium text-[#444746] dark:text-[#c4c7c5] hover:text-[#1f1f1f] dark:hover:text-white whitespace-nowrap transition-colors"
                  title="Saqlangan loyihalar (Artifacts)"
                >
                  Artifacts
                </button>
              </div>
            )}

            <button
              onClick={onOpenGetCode}
              className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-full hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-xs font-medium text-[#444746] dark:text-[#c4c7c5] transition-colors whitespace-nowrap shrink-0"
            >
              <Code className="w-3.5 h-3.5 text-[#0b57d0]" />
              <span>Kod olish</span>
            </button>

            <button
              onClick={() => setShowParameters(!showParameters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border whitespace-nowrap shrink-0 ${
                showParameters
                  ? 'bg-[#e8f0fe] dark:bg-[#1b2d4b] border-[#a8c7fa] text-[#0b57d0] dark:text-[#a8c7fa]'
                  : 'hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] border-[#dadce0] dark:border-[#333538] text-[#444746] dark:text-[#c4c7c5]'
              }`}
              title="Sozlamalar paneli (model, fikrlash darajasi, qidiruv)"
            >
              <Sliders className="w-3.5 h-3.5 shrink-0" />
              <span>Parametrlar</span>
            </button>
          </div>
        </div>

        {/* System Instruction Drawer (Collapsible) */}
        {showSystemInstruction && (
          <div className="border-b border-[#dadce0] dark:border-[#333538] bg-[#f8fafd] dark:bg-[#1a1b1e] px-4 py-3 shrink-0 max-h-[30dvh] overflow-y-auto animate-fadeIn">
            <div className="max-w-3xl mx-auto space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                <span className="flex items-center gap-1.5">
                  <BrainCircuit className="w-4 h-4 text-[#0b57d0]" />
                  System Instructions (Model uchun qoida va uslub)
                </span>
                <button
                  onClick={() => setShowSystemInstruction(false)}
                  className="text-[#747775] hover:text-[#1f1f1f]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                value={settings.systemInstruction}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, systemInstruction: e.target.value }))
                }
                placeholder="Model qanday javob qaytarishi kerak (masalan: 'Siz professional dasturchisiz, doim aniq va qisqa javob bering')..."
                className="w-full h-20 p-2.5 rounded-xl bg-white dark:bg-[#282a2c] border border-[#dadce0] dark:border-[#333538] focus:border-[#0b57d0] text-xs text-[#1f1f1f] dark:text-[#e3e3e3] outline-none resize-none font-sans placeholder:text-[#747775]"
              />
            </div>
          </div>
        )}

        {/* API Key Status Notice */}
        {!apiConnected && onOpenSettings && (
          <div className="border-b border-amber-200 dark:border-amber-900/40 bg-amber-50/90 dark:bg-amber-950/30 px-4 py-2 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <Key className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Jonli Gemini AI rejimi:</strong> To‘liq sun’iy intellektga ulanish uchun bepul API kalitingizni kiriting.
              </span>
            </div>
            <button
              onClick={onOpenSettings}
              className="px-3 py-1 rounded-full bg-amber-600 hover:bg-amber-500 text-white font-medium text-[11px] shrink-0 ml-3 transition-colors shadow-2xs"
            >
              Kalitni kiritish
            </button>
          </div>
        )}

        {/* Message Thread Scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* If no messages, render clean Google AI Studio Sections */}
            {messages.length === 0 && (
              <div className="py-6 sm:py-10 max-w-2xl mx-auto space-y-8">
                {/* Section 1: Studio Hero */}
                <div className="text-center space-y-2.5">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-[#f0f4f9] dark:bg-[#282a2c] border border-[#dadce0] dark:border-[#333538] flex items-center justify-center">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"
                        fill="url(#hero-gemini-gradient)"
                      />
                      <defs>
                        <linearGradient id="hero-gemini-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#4285F4" />
                          <stop offset="0.33" stopColor="#9B51E0" />
                          <stop offset="0.66" stopColor="#EA4335" />
                          <stop offset="1" stopColor="#FBBC05" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold text-[#1f1f1f] dark:text-[#f8fafd] tracking-tight">
                    Salom! Bugun nimani yaratamiz?
                  </h2>
                  <p className="text-xs sm:text-sm text-[#444746] dark:text-[#c4c7c5] max-w-md mx-auto leading-relaxed">
                    Google AI Studio bo‘limlari orqali muloqot qiling, veb-ilova quring, rasm yarating yoki loyihalaringizni boshqaring.
                  </p>
                </div>

                {/* Section 2: Studio Bo'limlari (Clean single-elevation grid, no nested cards) */}
                {onSelectMode && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-xs font-semibold text-[#444746] dark:text-[#c4c7c5]">
                        Asosiy bo‘limlar
                      </h3>
                      <span className="text-[11px] text-[#747775]">
                        Chat · Preview · Artifacts
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <button
                        onClick={() => textareaRef.current?.focus()}
                        className="p-3.5 rounded-xl bg-[#f8fafd] dark:bg-[#1e1f20] border border-[#0b57d0]/30 dark:border-blue-500/30 hover:border-[#0b57d0] transition-colors text-left"
                      >
                        <Sparkles className="w-4 h-4 text-[#0b57d0] mb-2" />
                        <div className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">AI Chat</div>
                        <div className="text-[11px] text-[#747775] mt-0.5 line-clamp-1">
                          Suhbat va Google Qidiruv
                        </div>
                      </button>

                      <button
                        onClick={() => onSelectMode('build')}
                        className="p-3.5 rounded-xl bg-white dark:bg-[#1e1f20] border border-[#dadce0] dark:border-[#333538] hover:border-indigo-400 transition-colors text-left"
                      >
                        <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mb-2" />
                        <div className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">Build Mode</div>
                        <div className="text-[11px] text-[#747775] mt-0.5 line-clamp-1">
                          Kod va jonli Preview
                        </div>
                      </button>

                      <button
                        onClick={() => onSelectMode('image')}
                        className="p-3.5 rounded-xl bg-white dark:bg-[#1e1f20] border border-[#dadce0] dark:border-[#333538] hover:border-purple-400 transition-colors text-left"
                      >
                        <ImageIcon className="w-4 h-4 text-purple-600 dark:text-purple-400 mb-2" />
                        <div className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">Image Studio</div>
                        <div className="text-[11px] text-[#747775] mt-0.5 line-clamp-1">
                          Matndan AI rasmlar
                        </div>
                      </button>

                      <button
                        onClick={() => onSelectMode('projects')}
                        className="p-3.5 rounded-xl bg-white dark:bg-[#1e1f20] border border-[#dadce0] dark:border-[#333538] hover:border-amber-400 transition-colors text-left"
                      >
                        <FolderKanban className="w-4 h-4 text-amber-600 dark:text-amber-400 mb-2" />
                        <div className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">Loyihalar</div>
                        <div className="text-[11px] text-[#747775] mt-0.5 line-clamp-1">
                          Artifacts va ZIP eksport
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Section 3: Starter Prompts */}
                <div className="space-y-2.5">
                  <div className="px-1 text-xs font-semibold text-[#444746] dark:text-[#c4c7c5]">
                    Tezkor boshlash uchun g‘oyalar
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                    {sampleSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => applyPreset(item.prompt)}
                        className="p-3.5 rounded-xl bg-white dark:bg-[#1e1f20] hover:bg-[#f8fafd] dark:hover:bg-[#282a2c] border border-[#dadce0] dark:border-[#333538] hover:border-[#a8c7fa] transition-all text-left group"
                      >
                        <div className="font-semibold text-xs text-[#1f1f1f] dark:text-[#e3e3e3] group-hover:text-[#0b57d0] transition-colors">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-[#747775] mt-1 line-clamp-1">
                          {item.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Chat Messages */}
            {messages.map((message) => {
              const isUser = message.role === 'user';
              if (!isUser && !message.isStreaming && !message.text && (!message.attachments || message.attachments.length === 0)) {
                return null;
              }

              return (
                <div
                  key={message.id}
                  className={`flex gap-2.5 sm:gap-3.5 ${isUser ? 'justify-end' : 'justify-start items-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1e1f20] border border-[#dadce0] dark:border-[#333538] flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"
                          fill="url(#msg-gemini-gradient)"
                        />
                        <defs>
                          <linearGradient id="msg-gemini-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#4285F4" />
                            <stop offset="0.33" stopColor="#9B51E0" />
                            <stop offset="0.66" stopColor="#EA4335" />
                            <stop offset="1" stopColor="#FBBC05" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  )}

                  <div
                    className={`max-w-[88%] sm:max-w-[82%] rounded-2xl p-3.5 sm:p-4.5 transition-all ${
                      isUser
                        ? 'bg-[#e8f0fe] dark:bg-[#1b2d4b] border border-[#d3e3fd] dark:border-[#2b4c7e] text-[#1f1f1f] dark:text-[#f8fafd] rounded-tr-xs shadow-2xs'
                        : 'bg-white dark:bg-[#1e1f20] border border-[#dadce0] dark:border-[#333538] text-[#1f1f1f] dark:text-[#e3e3e3] rounded-tl-xs shadow-xs'
                    }`}
                  >
                    {/* Attachments if any */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2.5">
                        {message.attachments.map((att) => (
                          <div
                            key={att.id}
                            className="flex items-center gap-2 p-1.5 rounded-lg text-xs bg-white dark:bg-[#1e1f20] border border-[#dadce0] dark:border-[#333538] text-[#444746] dark:text-[#c4c7c5]"
                          >
                            {att.previewUrl ? (
                              <img
                                src={att.previewUrl}
                                alt={att.name}
                                className="w-10 h-10 object-cover rounded"
                              />
                            ) : (
                              <FileText className="w-5 h-5 text-[#0b57d0]" />
                            )}
                            <div className="max-w-[120px] truncate font-medium">
                              {att.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Content */}
                    {isUser ? (
                      <div className="text-[13px] sm:text-sm whitespace-pre-wrap leading-relaxed font-normal">
                        {message.text}
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {/* Collapsible AI Thinking Process */}
                        {message.thought && (
                          <div className="rounded-xl border border-[#dadce0] dark:border-[#333538] bg-[#f8fafd] dark:bg-[#17181b] overflow-hidden">
                            <button
                              onClick={() =>
                                setExpandedThoughts((prev) => ({
                                  ...prev,
                                  [message.id]: !(prev[message.id] ?? (message.isStreaming && !message.text)),
                                }))
                              }
                              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f0f4f9] dark:hover:bg-[#222428] transition-colors"
                            >
                              <span className="flex items-center gap-1.5">
                                <BrainCircuit className={`w-3.5 h-3.5 text-[#0b57d0] ${message.isStreaming && !message.text ? 'animate-pulse' : ''}`} />
                                <span>
                                  {message.isStreaming && !message.text
                                    ? 'Fikrlash jarayoni (Reasoning)...'
                                    : 'Fikrlash jarayoni (Thinking)'}
                                </span>
                              </span>
                              {(expandedThoughts[message.id] ?? (message.isStreaming && !message.text)) ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                            {(expandedThoughts[message.id] ?? (message.isStreaming && !message.text)) && (
                              <div className="px-3 pb-3 pt-1 text-[12px] leading-relaxed text-[#5f6368] dark:text-[#9aa0a6] whitespace-pre-wrap border-t border-[#dadce0]/60 dark:border-[#333538]/60 max-h-60 overflow-y-auto">
                                {message.thought}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="prose prose-sm dark:prose-invert max-w-none text-[13px] sm:text-sm leading-relaxed">
                          {message.text ? (
                            renderFormattedContent(message.text, message.id)
                          ) : message.isStreaming ? (
                            <div className="flex items-center gap-1.5 py-1 text-[#747775]">
                              <span className="w-2 h-2 rounded-full bg-[#0b57d0] animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-2 h-2 rounded-full bg-[#0b57d0] animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 rounded-full bg-[#0b57d0] animate-bounce" style={{ animationDelay: '300ms' }} />
                              <span className="text-xs text-[#747775] ml-1">
                                {message.thought ? 'Javob yozilmoqda...' : 'Javob tayyorlanmoqda...'}
                              </span>
                            </div>
                          ) : null}
                          {message.isStreaming && message.text && (
                            <span className="inline-block w-1.5 h-3.5 bg-[#0b57d0] animate-pulse ml-1 translate-y-0.5" />
                          )}
                        </div>

                        {/* Google Search Grounding Sources */}
                        {!message.isStreaming && message.sources && message.sources.length > 0 && (
                          <div className="pt-2.5 mt-2 border-t border-[#dadce0]/70 dark:border-[#333538]">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#444746] dark:text-[#c4c7c5] mb-2">
                              <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Google Qidiruv manbalari</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {message.sources.slice(0, 6).map((src, idx) => (
                                <a
                                  key={idx}
                                  href={src.uri}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#f0f4f9] dark:bg-[#282a2c] hover:bg-[#e8f0fe] dark:hover:bg-[#1b2d4b] border border-[#dadce0] dark:border-[#333538] text-[11px] text-[#1f1f1f] dark:text-[#e3e3e3] transition-colors max-w-[220px]"
                                  title={src.title}
                                >
                                  <span className="truncate">{src.title}</span>
                                  <ExternalLink className="w-3 h-3 text-[#0b57d0] shrink-0" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions Toolbar for Model Responses */}
                    {!isUser && !message.isStreaming && message.text && (
                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#dadce0] dark:border-[#333538] text-[11px] text-[#747775]">
                        <span className="flex items-center gap-1.5 font-mono text-[10px] sm:text-[11px]">
                          <Zap className="w-3 h-3 text-[#0b57d0]" />
                          {message.modelUsed || selectedModel}
                        </span>

                        <div className="flex items-center gap-1">
                          {messages[messages.length - 1]?.id === message.id && (
                            <button
                              onClick={handleRegenerateLast}
                              className="px-2 py-1 rounded hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[#444746] dark:text-[#c4c7c5] transition-colors flex items-center gap-1 whitespace-nowrap"
                              title="Javobni qayta yaratish"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span className="hidden sm:inline text-[11px]">Qayta yaratish</span>
                            </button>
                          )}
                          <button
                            onClick={() => copyToClipboard(message.text, message.id)}
                            className="p-1 rounded hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[#444746] dark:text-[#c4c7c5] transition-colors flex items-center gap-1"
                            title="Nusxa olish"
                          >
                            {copiedId === message.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Bar Area - Ergonomic & Modern (never collapses on resize/keyboard) */}
        <div className="p-3 sm:p-4 border-t border-[#dadce0] dark:border-[#333538] bg-white dark:bg-[#1e1f20] shrink-0">
          <div className="max-w-3xl mx-auto space-y-2">
            {/* Attachment preview chips */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-1">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-lg bg-[#f0f4f9] dark:bg-[#282a2c] border border-[#dadce0] dark:border-[#333538] text-xs text-[#1f1f1f] dark:text-[#e3e3e3]"
                  >
                    {att.previewUrl ? (
                      <img
                        src={att.previewUrl}
                        alt={att.name}
                        className="w-6 h-6 object-cover rounded"
                      />
                    ) : (
                      <FileText className="w-4 h-4 text-[#0b57d0]" />
                    )}
                    <span className="max-w-[140px] truncate font-medium">{att.name}</span>
                    <button
                      onClick={() => removeAttachment(att.id)}
                      className="p-1 hover:text-rose-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input pill card */}
            <div className="relative rounded-2xl sm:rounded-3xl border border-[#dadce0] dark:border-[#333538] bg-[#f8fafd] dark:bg-[#282a2c] shadow-xs focus-within:shadow-md focus-within:border-[#0b57d0] focus-within:bg-white dark:focus-within:bg-[#1e1f20] transition-all p-2 sm:p-3">
              <div className="flex items-end gap-2">
                {/* File input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,text/*,application/json,.py,.ts,.js,.md,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-full hover:bg-[#e8f0fe] dark:hover:bg-[#333538] text-[#444746] dark:text-[#c4c7c5] hover:text-[#0b57d0] transition-colors shrink-0 mb-0.5"
                  title="Rasm yoki fayl biriktirish"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Auto-growing Textarea */}
                <textarea
                  ref={textareaRef}
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Xabar yozing... (Enter — yuborish, Shift+Enter — yangi qator)"
                  rows={1}
                  className="flex-1 bg-transparent text-xs sm:text-sm text-[#1f1f1f] dark:text-[#e3e3e3] placeholder:text-[#747775] outline-none resize-none leading-relaxed min-h-[38px] max-h-[160px] py-1.5"
                />

                {/* Send / Stop button */}
                {isStreaming ? (
                  <button
                    onClick={handleStopStreaming}
                    className="p-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-all active:scale-95 shrink-0 mb-0.5"
                    title="To'xtatish"
                  >
                    <Square className="w-4 h-4 fill-current" />
                  </button>
                ) : (
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputPrompt.trim() && attachments.length === 0}
                    className={`p-2.5 rounded-full text-white shadow-sm transition-all active:scale-95 shrink-0 mb-0.5 ${
                      inputPrompt.trim() || attachments.length > 0
                        ? 'bg-[#0b57d0] hover:bg-[#0842a0]'
                        : 'bg-[#0b57d0]/40 cursor-not-allowed'
                    }`}
                    title="Yuborish (Enter)"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Bottom helper hints */}
              <div className="flex items-center justify-between pt-1.5 px-2 text-[11px] text-[#747775]">
                <span className="hidden sm:inline">
                  <kbd className="px-1 py-0.5 rounded bg-white dark:bg-[#1e1f20] border border-[#dadce0] dark:border-[#333538] font-mono text-[10px]">
                    Enter
                  </kbd>{' '}
                  yuborish &nbsp;•&nbsp;{' '}
                  <kbd className="px-1 py-0.5 rounded bg-white dark:bg-[#1e1f20] border border-[#dadce0] dark:border-[#333538] font-mono text-[10px]">
                    Shift+Enter
                  </kbd>{' '}
                  yangi qator
                </span>
                <span className="font-mono text-[10px] ml-auto">
                  {inputPrompt.length > 0 && `${inputPrompt.length} belgi`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side Parameters Panel */}
      {showParameters && (
        <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-[#dadce0] dark:border-[#333538] bg-[#f8fafd] dark:bg-[#1e1f20] p-4 sm:p-5 overflow-y-auto space-y-6 shrink-0 max-h-[38dvh] lg:max-h-full animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-[#dadce0] dark:border-[#333538]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#0b57d0]" />
              Model Parametrlari
            </h3>
            <button
              onClick={() => setShowParameters(false)}
              className="p-1 rounded hover:bg-[#e8f0fe] dark:hover:bg-[#282a2c] text-[#747775] hover:text-[#1f1f1f]"
              title="Yopish"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#444746] dark:text-[#c4c7c5]">
              Modelni tanlang
            </label>
            <select
              value={settings.model}
              onChange={(e) => {
                const newModel = e.target.value;
                setSettings((prev) => ({ ...prev, model: newModel }));
                onSelectModel(newModel);
              }}
              className="w-full p-2.5 rounded-xl bg-white dark:bg-[#282a2c] border border-[#dadce0] dark:border-[#333538] text-xs text-[#1f1f1f] dark:text-[#e3e3e3] font-medium outline-none focus:border-[#0b57d0]"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.contextWindow})
                </option>
              ))}
            </select>
          </div>

          {/* Thinking Level (Gemini 3/4) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#444746] dark:text-[#c4c7c5] flex items-center gap-1.5">
                <BrainCircuit className="w-3.5 h-3.5 text-indigo-500" />
                Thinking Level
              </label>
              <span className="text-[11px] font-mono text-[#0b57d0] font-semibold">
                {settings.thinkingLevel}
              </span>
            </div>
            <div className={`grid gap-1.5 ${settings.model === 'gemini-4-hydrogen' ? 'grid-cols-4' : 'grid-cols-3'}`}>
              {(settings.model === 'gemini-4-hydrogen'
                ? (['LOW', 'MEDIUM', 'HIGH', 'XHIGH'] as const)
                : (['LOW', 'MEDIUM', 'HIGH'] as const)
              ).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setSettings((prev) => ({ ...prev, thinkingLevel: lvl }))}
                  className={`py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    settings.thinkingLevel === lvl
                      ? 'bg-[#0b57d0] text-white shadow-xs'
                      : 'bg-white dark:bg-[#282a2c] text-[#444746] dark:text-[#c4c7c5] border border-[#dadce0] dark:border-[#333538] hover:border-[#a8c7fa]'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[#747775]">
              Model javob berishdan oldin qanchalik chuqur fikrlashi (reasoning) darajasi.
            </p>
          </div>

          {/* Google Search Grounding Toggle */}
          <div className="space-y-2 pt-2 border-t border-[#dadce0] dark:border-[#333538]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#444746] dark:text-[#c4c7c5] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-500" />
                Google Qidiruv (Jonli bilim)
              </label>
              <button
                onClick={() =>
                  setSettings((prev) => ({ ...prev, useGoogleSearch: !prev.useGoogleSearch }))
                }
                className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                  settings.useGoogleSearch ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.useGoogleSearch ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-[10px] text-[#747775]">
              Internet va Google Search orqali eng so‘nggi ma’lumotlar hamda manbalarni tekshirish.
            </p>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#444746] dark:text-[#c4c7c5]">
                Harorat (Temperature)
              </label>
              <span className="text-[11px] font-mono text-[#1f1f1f] dark:text-[#e3e3e3] font-bold">
                {settings.temperature.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={settings.temperature}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, temperature: parseFloat(e.target.value) }))
              }
              className="w-full accent-[#0b57d0] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#747775]">
              <button
                onClick={() => setSettings((prev) => ({ ...prev, temperature: 0.2 }))}
                className="hover:text-[#0b57d0]"
              >
                Aniq (0.2)
              </button>
              <button
                onClick={() => setSettings((prev) => ({ ...prev, temperature: 0.7 }))}
                className="hover:text-[#0b57d0]"
              >
                Muvozanatli (0.7)
              </button>
              <button
                onClick={() => setSettings((prev) => ({ ...prev, temperature: 1.2 }))}
                className="hover:text-[#0b57d0]"
              >
                Ijodiy (1.2)
              </button>
            </div>
          </div>

          {/* Max Output Tokens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#444746] dark:text-[#c4c7c5]">
                Maksimal tokenlar
              </label>
              <span className="text-[11px] font-mono text-[#1f1f1f] dark:text-[#e3e3e3] font-bold">
                {settings.maxOutputTokens}
              </span>
            </div>
            <input
              type="range"
              min="256"
              max="8192"
              step="256"
              value={settings.maxOutputTokens}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, maxOutputTokens: parseInt(e.target.value, 10) }))
              }
              className="w-full accent-[#0b57d0] cursor-pointer"
            />
          </div>

          {/* Structured Output / Response MIME type */}
          <div className="space-y-2 pt-2 border-t border-[#dadce0] dark:border-[#333538]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#444746] dark:text-[#c4c7c5] flex items-center gap-1.5">
                <FileJson className="w-3.5 h-3.5 text-amber-500" />
                JSON Mode
              </label>
              <button
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    responseMimeType:
                      prev.responseMimeType === 'application/json' ? 'text/plain' : 'application/json',
                  }))
                }
                className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                  settings.responseMimeType === 'application/json' ? 'bg-[#0b57d0]' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.responseMimeType === 'application/json' ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-[10px] text-[#747775]">
              Javobni qat’iy JSON formatida qaytarishni majburlash.
            </p>
          </div>

          {/* Model Capability Badges */}
          <div className="pt-2 border-t border-[#dadce0] dark:border-[#333538] space-y-2">
            <span className="text-[11px] font-semibold text-[#444746] dark:text-[#c4c7c5]">
              Imkoniyatlar
            </span>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#e8f0fe] text-[#0b57d0] border border-[#d3e3fd]">
                Multimodal Input
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                1M Context
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Function Calling
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                Code Execution
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

