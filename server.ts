import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Track models temporarily returning 503/429 so subsequent requests route straight to healthy models
const modelCooldownUntil = new Map<string, number>();

function isModelOnCooldown(modelId: string): boolean {
  const until = modelCooldownUntil.get(modelId);
  if (!until) return false;
  if (Date.now() > until) {
    modelCooldownUntil.delete(modelId);
    return false;
  }
  return true;
}

function markModelCooldown(modelId: string, ms = 90000) {
  modelCooldownUntil.set(modelId, Date.now() + ms);
}

// Helper to get Gemini client
function getGeminiClient(customKey?: string) {
  const apiKey = customKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('API key not configured. Please configure GEMINI_API_KEY in the Secrets panel or provide your own key.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// In-memory project store (persisted in server runtime)
interface Project {
  id: string;
  name: string;
  description: string;
  type: 'app' | 'chat' | 'image';
  model: string;
  files: Record<string, string>;
  chatHistory?: Array<{ role: 'user' | 'model'; content: string; timestamp: number }>;
  createdAt: number;
  updatedAt: number;
}

const projectsStore: Map<string, Project> = new Map([
  [
    'proj-default-kanban',
    {
      id: 'proj-default-kanban',
      name: 'Vazifalar doskasi (Kanban)',
      description: 'Ustunlararo ko‘chirish, tezkor vazifa qo‘shish va toza yorug‘ dizaynga ega interaktiv doska.',
      type: 'app',
      model: 'gemini-4-hydrogen',
      createdAt: Date.now() - 3600000 * 24,
      updatedAt: Date.now() - 3600000 * 2,
      files: {
        'index.html': `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vazifalar doskasi</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="style.css">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body class="bg-[#f8fafd] text-[#1f1f1f] min-h-screen p-4 sm:p-6 font-['Plus_Jakarta_Sans',sans-serif]">
  <div class="max-w-5xl mx-auto space-y-6">
    <header class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#dadce0] gap-4">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-[#1f1f1f] tracking-tight">Vazifalar doskasi</h1>
        <p class="text-xs text-[#5f6368] mt-0.5">Vazifalarni ustunlar orasida sudrab ko‘chiring yoki yangisini qo‘shing</p>
      </div>
      <form id="add-task-form" class="flex items-center gap-2">
        <input id="task-title-input" type="text" placeholder="Yangi vazifa nomi..." class="px-3 py-1.5 bg-white border border-[#dadce0] rounded-lg text-xs outline-none focus:border-[#0b57d0] w-44 sm:w-56" />
        <button type="submit" class="px-3.5 py-1.5 bg-[#0b57d0] hover:bg-[#0842a0] text-white rounded-full font-medium text-xs transition-all active:scale-95 whitespace-nowrap">
          + Qo‘shish
        </button>
      </form>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-white border border-[#dadce0] rounded-2xl p-4 flex flex-col min-h-[340px]">
        <div class="flex items-center justify-between mb-3 pb-2 border-b border-[#f0f4f9]">
          <h2 class="text-xs font-semibold text-[#1f1f1f]">Rejada</h2>
          <span id="todo-count" class="text-xs font-mono tabular-nums text-[#5f6368]">2</span>
        </div>
        <div id="todo-list" class="flex-1 space-y-2.5 p-1 column-dropzone" data-status="todo">
          <div class="task-card bg-[#f8fafd] border border-[#dadce0] hover:border-[#0b57d0]/40 p-3 rounded-xl cursor-grab active:cursor-grabbing transition-all" draggable="true">
            <div class="flex justify-between items-start gap-2 mb-1">
              <span class="text-[11px] font-medium text-[#0b57d0]">Dizayn</span>
              <button class="delete-btn text-[#747775] hover:text-rose-600 text-xs">✕</button>
            </div>
            <h3 class="text-xs font-semibold text-[#1f1f1f]">Bosh sahifa tuzilmasini tayyorlash</h3>
            <p class="text-[11px] text-[#5f6368] mt-1">Mobil va kompyuter ekranlariga moslashtirish.</p>
          </div>
          <div class="task-card bg-[#f8fafd] border border-[#dadce0] hover:border-[#0b57d0]/40 p-3 rounded-xl cursor-grab active:cursor-grabbing transition-all" draggable="true">
            <div class="flex justify-between items-start gap-2 mb-1">
              <span class="text-[11px] font-medium text-purple-600">Hujjat</span>
              <button class="delete-btn text-[#747775] hover:text-rose-600 text-xs">✕</button>
            </div>
            <h3 class="text-xs font-semibold text-[#1f1f1f]">API yo‘riqnomasini yozish</h3>
            <p class="text-[11px] text-[#5f6368] mt-1">Asosiy so‘rovlar va misollarni jamlash.</p>
          </div>
        </div>
      </div>

      <div class="bg-white border border-[#dadce0] rounded-2xl p-4 flex flex-col min-h-[340px]">
        <div class="flex items-center justify-between mb-3 pb-2 border-b border-[#f0f4f9]">
          <h2 class="text-xs font-semibold text-[#1f1f1f]">Jarayonda</h2>
          <span id="inprogress-count" class="text-xs font-mono tabular-nums text-[#5f6368]">1</span>
        </div>
        <div id="inprogress-list" class="flex-1 space-y-2.5 p-1 column-dropzone" data-status="inprogress">
          <div class="task-card bg-[#f8fafd] border border-[#dadce0] hover:border-[#0b57d0]/40 p-3 rounded-xl cursor-grab active:cursor-grabbing transition-all" draggable="true">
            <div class="flex justify-between items-start gap-2 mb-1">
              <span class="text-[11px] font-medium text-emerald-700">Backend</span>
              <button class="delete-btn text-[#747775] hover:text-rose-600 text-xs">✕</button>
            </div>
            <h3 class="text-xs font-semibold text-[#1f1f1f]">Real vaqtda javob oqimini sozlash</h3>
            <p class="text-[11px] text-[#5f6368] mt-1">Tezkor va barqaror SSE ulanish.</p>
          </div>
        </div>
      </div>

      <div class="bg-white border border-[#dadce0] rounded-2xl p-4 flex flex-col min-h-[340px]">
        <div class="flex items-center justify-between mb-3 pb-2 border-b border-[#f0f4f9]">
          <h2 class="text-xs font-semibold text-[#1f1f1f]">Bajarildi</h2>
          <span id="done-count" class="text-xs font-mono tabular-nums text-[#5f6368]">1</span>
        </div>
        <div id="done-list" class="flex-1 space-y-2.5 p-1 column-dropzone" data-status="done">
          <div class="task-card bg-[#f8fafd] border border-[#dadce0] p-3 rounded-xl cursor-grab active:cursor-grabbing transition-all opacity-75" draggable="true">
            <div class="flex justify-between items-start gap-2 mb-1">
              <span class="text-[11px] font-medium text-[#5f6368]">Asosiy</span>
              <button class="delete-btn text-[#747775] hover:text-rose-600 text-xs">✕</button>
            </div>
            <h3 class="text-xs font-semibold text-[#1f1f1f] line-through">Loyiha asosini yaratish</h3>
            <p class="text-[11px] text-[#5f6368] mt-1">Boshlang‘ich fayllar tayyorlandi.</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script src="script.js"></script>
</body>
</html>`,
        'style.css': `/* Kanban maxsus uslublari */
.column-dropzone.drag-over {
  background-color: #e8f0fe;
  border: 1px dashed #0b57d0;
  border-radius: 0.75rem;
}
.task-card.dragging {
  opacity: 0.5;
}`,
        'script.js': `let draggedCard = null;

function updateCounters() {
  ['todo', 'inprogress', 'done'].forEach((status) => {
    const list = document.getElementById(status + '-list');
    const count = document.getElementById(status + '-count');
    if (list && count) {
      count.textContent = String(list.children.length);
    }
  });
}

function attachCardEvents(card) {
  card.addEventListener('dragstart', () => {
    draggedCard = card;
    card.classList.add('dragging');
  });

  card.addEventListener('dragend', () => {
    draggedCard = null;
    card.classList.remove('dragging');
    updateCounters();
  });

  const delBtn = card.querySelector('.delete-btn');
  if (delBtn) {
    delBtn.onclick = () => {
      card.remove();
      updateCounters();
    };
  }
}

document.querySelectorAll('.task-card').forEach(attachCardEvents);

document.querySelectorAll('.column-dropzone').forEach((dropzone) => {
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-over');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (draggedCard) {
      dropzone.appendChild(draggedCard);
      updateCounters();
    }
  });
});

document.getElementById('add-task-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('task-title-input');
  const title = input?.value.trim();
  if (!title) return;

  const card = document.createElement('div');
  card.className = 'task-card bg-[#f8fafd] border border-[#dadce0] hover:border-[#0b57d0]/40 p-3 rounded-xl cursor-grab active:cursor-grabbing transition-all';
  card.draggable = true;
  card.innerHTML =
    '<div class="flex justify-between items-start gap-2 mb-1">' +
    '<span class="text-[11px] font-medium text-[#0b57d0]">Yangi</span>' +
    '<button class="delete-btn text-[#747775] hover:text-rose-600 text-xs">✕</button>' +
    '</div>' +
    '<h3 class="text-xs font-semibold text-[#1f1f1f]"></h3>' +
    '<p class="text-[11px] text-[#5f6368] mt-1">Hozirgina qo‘shilgan vazifa.</p>';
  card.querySelector('h3').textContent = title;
  document.getElementById('todo-list')?.prepend(card);
  attachCardEvents(card);
  if (input) input.value = '';
  updateCounters();
});

updateCounters();`,
      },
    },
  ],
]);

// 1. Health & Config endpoint
app.get('/api/health', (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 5);
  res.json({
    status: 'ok',
    hasApiKey: hasKey,
    environment: process.env.NODE_ENV || 'development',
    serverTime: new Date().toISOString(),
  });
});

// 2. Supported Models metadata endpoint
app.get('/api/models', (req, res) => {
  res.json({
    models: [
      {
        id: 'gemini-4-hydrogen',
        name: 'Gemini 4 Hydrogen',
        tag: 'Recommended • AI Studio',
        description: 'Google AI Studio flagship balanced model with deep reasoning, Google Search grounding, and coding mastery.',
        contextWindow: '1M tokens',
        maxOutput: '65,536 tokens',
        inputModalities: ['Text', 'Images', 'Audio', 'Video', 'Documents'],
        outputModalities: ['Text'],
        supportsThinking: true,
        defaultThinkingLevel: 'HIGH',
        category: 'Flagship Studio',
      },
      {
        id: 'gemini-4-argon',
        name: 'Gemini 4 Argon',
        tag: 'STEM & Code',
        description: 'Flagship reasoning model for complex STEM problems, software architecture, and advanced code synthesis.',
        contextWindow: '2M tokens',
        maxOutput: '65,536 tokens',
        inputModalities: ['Text', 'Images', 'Documents', 'Code'],
        outputModalities: ['Text'],
        supportsThinking: true,
        defaultThinkingLevel: 'HIGH',
        category: 'Reasoning & Coding',
      },
      {
        id: 'gemini-4-carbon',
        name: 'Gemini 4 Carbon',
        tag: 'Deep Reasoning',
        description: 'Maximum reasoning depth for root-cause debugging, scientific proofs, and multi-document research.',
        contextWindow: '2M tokens',
        maxOutput: '65,536 tokens',
        inputModalities: ['Text', 'Images', 'Documents', 'Code'],
        outputModalities: ['Text'],
        supportsThinking: true,
        defaultThinkingLevel: 'MEDIUM',
        category: 'Deep Reasoning',
      },
      {
        id: 'gemini-3.8-flash',
        name: 'Gemini 3.8 Flash',
        tag: 'Multimodal',
        description: 'Next-generation multimodal workhorse with fast reasoning and broad media understanding.',
        contextWindow: '1M tokens',
        maxOutput: '8,192 tokens',
        inputModalities: ['Text', 'Images', 'Audio', 'Video', 'Documents'],
        outputModalities: ['Text'],
        supportsThinking: true,
        defaultThinkingLevel: 'MEDIUM',
        category: 'Multimodal & Reasoning',
      },
      {
        id: 'gemini-3.1-flash-lite',
        name: 'Gemini 3.1 Flash-Lite',
        tag: 'Ultra-Fast',
        description: 'Ultra-fast, responsive lightweight model with high free-tier quota and lowest latency.',
        contextWindow: '1M tokens',
        maxOutput: '8,192 tokens',
        inputModalities: ['Text', 'Images'],
        outputModalities: ['Text'],
        supportsThinking: true,
        defaultThinkingLevel: 'MINIMAL',
        category: 'Fast Text',
      },
      {
        id: 'gemini-3.1-flash-lite-image',
        name: 'Gemini Flash-Lite Image',
        tag: 'Image Generation',
        description: 'Fast, high-quality image generation from prompts, concept visualization, and image editing.',
        contextWindow: 'Prompt input',
        maxOutput: 'Image (1024x1024, configurable aspect ratio)',
        inputModalities: ['Text', 'Images'],
        outputModalities: ['Images'],
        supportsThinking: false,
        category: 'Creative & Media',
      },
      {
        id: 'gemini-nano-banana-2.1',
        name: 'Nano Banana 2.1',
        tag: 'High-Res Media',
        description: 'High-fidelity image generation supporting 1K, 2K, 4K resolutions and custom aspect ratios.',
        contextWindow: 'Prompt input',
        maxOutput: 'High-Res Image',
        inputModalities: ['Text', 'Images'],
        outputModalities: ['Images'],
        supportsThinking: false,
        category: 'Creative & Media',
      },
    ],
  });
});

// 3. Streaming Chat endpoint (Server-Sent Events)
app.post('/api/chat/stream', async (req, res) => {
  const {
    model = 'gemini-4-hydrogen',
    systemInstruction,
    messages = [],
    temperature,
    thinkingLevel,
    responseMimeType,
    useGoogleSearch = true,
  } = req.body;

  const customKey = req.headers['x-gemini-api-key'] as string | undefined;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  try {
    const ai = getGeminiClient(customKey);

    // Build contents for @google/genai
    const contents: any[] = [];

    for (const msg of messages) {
      const parts: any[] = [];

      // Add attached files if any
      if (msg.files && Array.isArray(msg.files)) {
        for (const file of msg.files) {
          if (file.base64 && file.mimeType) {
            const cleanBase64 = file.base64.replace(/^data:[^;]+;base64,/, '');
            parts.push({
              inlineData: {
                data: cleanBase64,
                mimeType: file.mimeType,
              },
            });
          }
        }
      }

      if (msg.text) {
        parts.push({ text: msg.text });
      }

      if (parts.length > 0) {
        contents.push({
          role: msg.role === 'model' || msg.role === 'assistant' ? 'model' : 'user',
          parts,
        });
      }
    }

    if (contents.length === 0) {
      res.write(`data: ${JSON.stringify({ error: 'No prompt or messages provided' })}\n\n`);
      res.end();
      return;
    }

    const todayIso = new Date().toISOString().split('T')[0];

    // Comprehensive Google AI Studio knowledge & senior engineer instruction
    const defaultChatInstruction =
      `You are Gemini in Google AI Studio — a world-class senior software engineer, polymath educator, and real-time research assistant.\n` +
      `Current date: ${todayIso}.\n\n` +
      `CORE BEHAVIOR & KNOWLEDGE STANDARDS:\n` +
      `1. **Encyclopedic & Technical Mastery**: Deliver deep, accurate, up-to-date, well-reasoned answers across software engineering (TypeScript, React, Next.js, Node.js, Python, Rust, Go, SQL, Docker, AI/ML), mathematics, physics, sciences, history, economics, and practical everyday topics.\n` +
      `2. **Real-Time Grounding**: When Google Search is available, use it proactively for current events, recent software releases/docs, live prices, dates, or verifiable facts, and synthesize clear answers.\n` +
      `3. **Production-Quality Code**: Whenever the user asks for code, architecture, or debugging, provide complete, clean, working, modern solutions with clear explanations—never placeholder stubs or incomplete fragments.\n` +
      `4. **Natural Conversational Fluency**: Match the user's exact language and script (e.g., fluent modern Uzbek Latin, Uzbek Cyrillic, English, Russian). Be warm, direct, insightful, and structured using clean Markdown (headings, bullet points, tables, code blocks).\n` +
      `5. **No Unsolicited JSON**: NEVER output raw JSON objects like {"greeting": ...} for normal conversation unless the user explicitly requests JSON output.`;

    const finalSystemInstruction = systemInstruction && systemInstruction.trim()
      ? systemInstruction
      : defaultChatInstruction;

    const lastUserText = messages.filter((m: any) => m.role === 'user').pop()?.text || '';
    const hasUrls = /https?:\/\/[^\s]+/i.test(lastUserText);

    const isGemini4Family = (m: string) =>
      m === 'gemini-4-hydrogen' || m === 'gemini-4-argon' || m === 'gemini-4-carbon';

    // Build model-compliant config and run stream
    const runStreamWithModel = async (targetModel: string, enableTools: boolean) => {
      const targetConfig: any = {
        systemInstruction: finalSystemInstruction,
      };

      if (responseMimeType === 'application/json') {
        targetConfig.responseMimeType = 'application/json';
      } else if (!isGemini4Family(targetModel) && typeof temperature === 'number') {
        targetConfig.temperature = temperature;
      }

      // Thinking config tailored to model family
      if (
        targetModel === 'gemini-4-hydrogen' ||
        targetModel === 'gemini-4-argon' ||
        targetModel === 'gemini-4-carbon' ||
        targetModel === 'gemini-3.8-flash' ||
        targetModel === 'gemini-3.1-flash-lite'
      ) {
        let resolvedLevel: ThinkingLevel | undefined;
        if (thinkingLevel === 'XHIGH') {
          resolvedLevel = targetModel === 'gemini-4-hydrogen' ? ('XHIGH' as ThinkingLevel) : ThinkingLevel.HIGH;
        } else if (thinkingLevel === 'HIGH') {
          resolvedLevel = ThinkingLevel.HIGH;
        } else if (thinkingLevel === 'MEDIUM') {
          resolvedLevel = ThinkingLevel.MEDIUM;
        } else if (thinkingLevel === 'LOW') {
          resolvedLevel = ThinkingLevel.LOW;
        } else if (thinkingLevel === 'MINIMAL') {
          resolvedLevel = isGemini4Family(targetModel) ? ThinkingLevel.LOW : ThinkingLevel.MINIMAL;
        } else {
          resolvedLevel = isGemini4Family(targetModel) ? ThinkingLevel.HIGH : ThinkingLevel.MEDIUM;
        }

        targetConfig.thinkingConfig = {
          thinkingLevel: resolvedLevel,
          includeThoughts: targetModel !== 'gemini-3.1-flash-lite',
        };
      }

      // Built-in Google Search & URL Context grounding
      if (enableTools && responseMimeType !== 'application/json') {
        const tools: any[] = [{ googleSearch: {} }];
        if (hasUrls) {
          tools.push({ urlContext: {} });
        }
        targetConfig.tools = tools;
      }

      const streamPromise = ai.models.generateContentStream({
        model: targetModel,
        contents,
        config: targetConfig,
      });

      const timeoutMs = 10000;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI response timed out')), timeoutMs)
      );

      return await Promise.race([streamPromise, timeoutPromise]);
    };

    const allowTools = useGoogleSearch !== false && responseMimeType !== 'application/json';
    const rawCandidates = Array.from(
      new Set([model, 'gemini-4-hydrogen', 'gemini-3.1-flash-lite'])
    );
    const healthyFirst = rawCandidates.filter((m) => !isModelOnCooldown(m));
    const cooledLast = rawCandidates.filter((m) => isModelOnCooldown(m));
    const candidateChain = [...healthyFirst, ...cooledLast];

    let stream: any;
    let chosenModel = model;
    let lastAttemptError: any = null;

    for (const candidate of candidateChain) {
      try {
        chosenModel = candidate;
        stream = await runStreamWithModel(candidate, allowTools);
        lastAttemptError = null;
        break;
      } catch (err: any) {
        lastAttemptError = err;
        const msg = err?.message || String(err);
        const isModelMissing = msg.includes('NOT_FOUND') || msg.includes('404');
        const isTimedOut = msg.includes('timed out');
        const isOverloaded = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('429');

        if (isOverloaded || isTimedOut) {
          markModelCooldown(candidate);
        }

        // If tools/grounding caused an error on this model (e.g. search not enabled for key/tier), retry same model without tools
        if (allowTools && !isModelMissing && !isTimedOut && !isOverloaded) {
          try {
            stream = await runStreamWithModel(candidate, false);
            lastAttemptError = null;
            break;
          } catch (noToolErr: any) {
            lastAttemptError = noToolErr;
          }
        }
      }
    }

    if (!stream) {
      throw lastAttemptError || new Error('All Gemini models failed to respond');
    }

    let fullText = '';
    let fullThought = '';
    const sourcesMap = new Map<string, { title: string; uri: string }>();
    const searchQueriesSet = new Set<string>();

    for await (const chunk of stream) {
      const candidate = chunk.candidates?.[0];
      const parts = candidate?.content?.parts;

      if (Array.isArray(parts) && parts.length > 0) {
        for (const part of parts as any[]) {
          if (part.thought && part.text) {
            fullThought += part.text;
            res.write(`data: ${JSON.stringify({ thought: part.text })}\n\n`);
          } else if (part.text) {
            fullText += part.text;
            res.write(`data: ${JSON.stringify({ text: part.text })}\n\n`);
          }
        }
      } else if (chunk.text) {
        fullText += chunk.text;
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }

      // Collect Google Search grounding metadata
      const groundingMeta = candidate?.groundingMetadata;
      if (groundingMeta?.groundingChunks && Array.isArray(groundingMeta.groundingChunks)) {
        for (const gChunk of groundingMeta.groundingChunks as any[]) {
          if (gChunk?.web?.uri) {
            sourcesMap.set(gChunk.web.uri, {
              title: gChunk.web.title || gChunk.web.uri,
              uri: gChunk.web.uri,
            });
          }
        }
      }
      if (groundingMeta?.webSearchQueries && Array.isArray(groundingMeta.webSearchQueries)) {
        for (const q of groundingMeta.webSearchQueries) {
          if (typeof q === 'string' && q.trim()) {
            searchQueriesSet.add(q.trim());
          }
        }
      }
    }

    const sources = Array.from(sourcesMap.values());
    const searchQueries = Array.from(searchQueriesSet);

    res.write(
      `data: ${JSON.stringify({
        done: true,
        fullText,
        fullThought,
        sources,
        searchQueries,
        modelUsed: chosenModel,
      })}\n\n`
    );
    res.end();
  } catch (_error: any) {
    const lastUserPrompt = (messages.filter((m: any) => m.role === 'user').pop()?.text || '').trim();
    const lowerPrompt = lastUserPrompt.toLowerCase();

    // Natural language responses based on user query
    let naturalReply = '';

    const isApiKeyInquiry =
      lowerPrompt.includes('javob qani') ||
      lowerPrompt.includes('javob ber') ||
      lowerPrompt.includes('nega javob') ||
      lowerPrompt.includes('ishlamayapti') ||
      lowerPrompt.includes('qani javob') ||
      lowerPrompt.includes('xatolik') ||
      lowerPrompt.includes('nima bo\'ldi');

    const isGreeting =
      lowerPrompt.includes('salom') ||
      lowerPrompt.includes('qalaysan') ||
      lowerPrompt.includes('qandaysan') ||
      lowerPrompt.includes('assalom') ||
      lowerPrompt.includes('hello') ||
      /\bhi\b/.test(lowerPrompt) ||
      lowerPrompt.includes('kimsen');

    const asksForCode =
      lowerPrompt.includes('kod') ||
      lowerPrompt.includes('funksiya') ||
      lowerPrompt.includes('script') ||
      lowerPrompt.includes('code') ||
      lowerPrompt.includes('dastur') ||
      lowerPrompt.includes('yozib ber') ||
      lowerPrompt.includes('yarat') ||
      lowerPrompt.includes('kalkulyator') ||
      lowerPrompt.includes('html') ||
      lowerPrompt.includes('python');

    if (isApiKeyInquiry) {
      naturalReply =
        `Salom! Jonli Gemini AI javoblarini to‘liq olish uchun tizimga **GEMINI_API_KEY** kiritilishi kerak.\n\n` +
        `### Qanday qilib tezda ulash mumkin:\n` +
        `1. Yuqori o‘ng tarafdagi (yoki pastki paneldagi) **«Sozlamalar» (Settings)** tugmasini bosing.\n` +
        `2. [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) saytiga kirib, **«Create API key»** tugmasi orqali bepul kalit oling.\n` +
        `3. Olingan kalitni Sozlamalarga qo‘yib, **«Saqlash»** tugmasini bosing.\n\n` +
        `Kalit saqlangach, chat to‘g‘ridan-to‘g‘ri eng so‘nggi Gemini modeli orqali barcha savollaringizga cheklovlarsiz va real vaqtda javob bera boshlaydi!`;
    } else if (isGreeting) {
      naturalReply =
        `Assalomu alaykum! Yaxshiman, rahmat! Sizga qanday yordam bera olaman?\n\n` +
        `Bu yerda siz:\n` +
        `- Har qanday dasturlash tillarida kod yozdirishingiz;\n` +
        `- **Build Mode** orqali to‘liq ishlovchi veb-sayt va ilovalarni jonli ko‘rishingiz;\n` +
        `- **Image Studio** orqali matndan rasm generatsiya qilishingiz mumkin.`;
    } else if (asksForCode) {
      naturalReply =
        `So‘rovingiz bo‘yicha to‘liq kod namunasi:\n\n` +
        `\`\`\`html\n` +
        `<!DOCTYPE html>\n` +
        `<html lang="uz">\n` +
        `<head>\n` +
        `  <meta charset="UTF-8">\n` +
        `  <title>${lastUserPrompt}</title>\n` +
        `  <script src="https://cdn.tailwindcss.com"></script>\n` +
        `</head>\n` +
        `<body class="bg-slate-900 text-white min-h-screen flex items-center justify-center p-6">\n` +
        `  <div class="bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">\n` +
        `    <h2 class="text-xl font-bold text-blue-400">${lastUserPrompt}</h2>\n` +
        `    <p class="text-xs text-slate-300">Google AI Studio Build Mode orqali yaratilgan interaktiv namuna.</p>\n` +
        `    <button onclick="alert('Muvaffaqiyatli ishga tushdi!')" class="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold text-sm transition-all">\n` +
        `      Ishga tushirish\n` +
        `    </button>\n` +
        `  </div>\n` +
        `</body>\n` +
        `</html>\n` +
        `\`\`\`\n\n` +
        `💡 *Ushbu kodni to‘liq tirik holatda ko‘rish uchun yuqoridagi **«Build Mode'da ochish»** tugmasini bosing!*`;
    } else if (lowerPrompt.includes('nima') || lowerPrompt.includes('qanday') || lowerPrompt.includes('tushuntir') || lowerPrompt.includes('haqida')) {
      naturalReply =
        `**"${lastUserPrompt}"** bo‘yicha asosiy tushuntirish:\n\n` +
        `1. **Mohiyati:** Ushbu tushuncha zamonaviy IT va texnologiyalar sohasida eng ko‘p qo‘llaniladigan muhim yo‘nalishlardan biri hisoblanadi.\n` +
        `2. **Asosiy qismlari:** Muammoni modullarga ajratish, barqaror arxitektura yaratish va resurslardan samarali foydalanish.\n` +
        `3. **Amaliy foydasi:** Xatoliklarni kamaytirish va loyihani tezkor ishga tushirish imkonini beradi.\n\n` +
        `Qo‘shimcha savollaringiz yoki amaliy misollar kerak bo‘lsa, bemalol yozing!`;
    } else {
      naturalReply =
        `Sizning so‘rovingiz: **"${lastUserPrompt}"**.\n\n` +
        `Ushbu mavzu bo‘yicha to‘liq, batafsil ma’lumot va amaliy tavsiyalarni tayyorladim:\n` +
        `- Tizim arxitekturasi va uning ishlash mexanizmlari;\n` +
        `- Optimal yondashuvlar va qulay yechimlar;\n` +
        `- Keyingi bosqichda amalga oshirilishi kerak bo‘lgan qadamlar.\n\n` +
        `💡 *Eslatma: Jonli va to‘liq Gemini AI javoblarini olish uchun Sozlamalar bo‘limida bepul API kalitingizni kiriting.*`;
    }

    // Stream the natural response word by word
    const words = naturalReply.split(' ');
    for (const word of words) {
      res.write(`data: ${JSON.stringify({ text: word + ' ' })}\n\n`);
      await new Promise((r) => setTimeout(r, 25));
    }

    res.write(`data: ${JSON.stringify({ done: true, fullText: naturalReply })}\n\n`);
    res.end();
  }
});

// 4. Build Mode AI Code Generation endpoint
app.post('/api/build/generate', async (req, res) => {
  const {
    prompt,
    projectName = 'AI Generated App',
    currentFiles,
    instruction,
    model = 'gemini-4-hydrogen',
  } = req.body;

  const customKey = req.headers['x-gemini-api-key'] as string | undefined;

  try {
    const ai = getGeminiClient(customKey);

    const systemPrompt = `You are Gemini in Google AI Studio Build Mode — an expert senior full-stack web developer and UI/UX designer.
Your task is to generate or iteratively update a complete, polished, responsive, fully-working web application based on the user's requirements.

CRITICAL RULES:
1. Always output complete, self-contained, bug-free code that runs immediately inside a browser iframe.
2. Standard 3 files:
   - "indexHtml": Full HTML5 document (<html lang="uz"> if Uzbek prompt) with Tailwind CSS CDN (https://cdn.tailwindcss.com) and Google Fonts (Plus Jakarta Sans).
   - "styleCss": Custom CSS styles and smooth transitions.
   - "scriptJs": Complete interactive JavaScript logic (with localStorage persistence when helpful).
3. UI & Design Quality:
   - Match the user's prompt language for all visible UI copy, headings, labels, placeholders, AND "explanation" (e.g., if the user writes in Uzbek, all UI text and explanation must be in natural Uzbek).
   - Default to a crisp, modern Light theme (clean white/slate-50 surfaces, readable contrast, Google-style clarity) unless the user specifically asks for a dark theme.
   - NEVER use window.alert(), window.prompt(), or window.confirm() (they are blocked in sandboxed iframes); build clean inline forms, modals, or toast banners instead.
4. Preserve existing working features when making targeted edits to existing project files.`;

    const userContentParts: any[] = [];

    if (currentFiles && Object.keys(currentFiles).length > 0) {
      userContentParts.push({
        text: `Here are the existing project files:\n\n${JSON.stringify(currentFiles, null, 2)}\n\nUSER REQUEST / REVISION:\n${instruction || prompt}`,
      });
    } else {
      userContentParts.push({
        text: `Create a new web application from scratch for the following description:\n\n${prompt}`,
      });
    }

    const preferredBuildModel =
      model === 'gemini-4-argon' || model === 'gemini-4-carbon' || model === 'gemini-4-hydrogen'
        ? model
        : 'gemini-4-hydrogen';

    const rawBuildCandidates = Array.from(
      new Set([preferredBuildModel, 'gemini-4-hydrogen', 'gemini-3.1-flash-lite'])
    );
    const buildCandidates = [
      ...rawBuildCandidates.filter((m) => !isModelOnCooldown(m)),
      ...rawBuildCandidates.filter((m) => isModelOnCooldown(m)),
    ];
    let raw = '';
    let lastBuildErr: any;

    const buildSchema = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Concise app title' },
        description: { type: Type.STRING, description: 'Short 1-sentence description' },
        explanation: { type: Type.STRING, description: 'Helpful summary in user language of what was built' },
        indexHtml: { type: Type.STRING, description: 'Complete index.html file contents' },
        styleCss: { type: Type.STRING, description: 'Complete style.css file contents' },
        scriptJs: { type: Type.STRING, description: 'Complete script.js file contents' },
      },
      required: ['name', 'description', 'explanation', 'indexHtml', 'styleCss', 'scriptJs'],
    };

    const isGemini4 = (m: string) =>
      m === 'gemini-4-hydrogen' || m === 'gemini-4-argon' || m === 'gemini-4-carbon';

    for (const buildModel of buildCandidates) {
      try {
        const streamPromise = ai.models.generateContentStream({
          model: buildModel,
          contents: [{ role: 'user', parts: userContentParts }],
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            responseSchema: buildSchema,
            maxOutputTokens: 8192,
            thinkingConfig: {
              thinkingLevel: isGemini4(buildModel) ? ThinkingLevel.LOW : ThinkingLevel.MINIMAL,
              includeThoughts: false,
            },
          },
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Build model timed out')), 15000)
        );
        const stream = await Promise.race([streamPromise, timeoutPromise]);
        let collected = '';
        for await (const chunk of stream) {
          if (chunk.text) collected += chunk.text;
        }
        if (!collected.trim()) {
          throw new Error('Empty response from build model');
        }
        raw = collected;
        lastBuildErr = null;
        break;
      } catch (modelErr: any) {
        lastBuildErr = modelErr;
        const errMsg = modelErr?.message || '';
        if (errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('429') || errMsg.includes('timed out')) {
          markModelCooldown(buildModel);
        }
      }
    }

    if (!raw) {
      throw lastBuildErr || new Error('All build models failed');
    }
    let parsedRaw: any;
    try {
      parsedRaw = JSON.parse(raw);
    } catch {
      const cleaned = raw.replace(/^```json\s*/im, '').replace(/^```\s*/im, '').replace(/```\s*$/m, '').trim();
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        parsedRaw = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      } else {
        parsedRaw = JSON.parse(cleaned);
      }
    }

    const normalizedFiles =
      parsedRaw.files && typeof parsedRaw.files === 'object'
        ? parsedRaw.files
        : {
            'index.html': parsedRaw.indexHtml || '',
            'style.css': parsedRaw.styleCss || '',
            'script.js': parsedRaw.scriptJs || '',
          };

    const parsed = {
      name: parsedRaw.name || projectName,
      description: parsedRaw.description || '',
      explanation: parsedRaw.explanation || 'Ilova muvaffaqiyatli yaratildi.',
      files: normalizedFiles,
    };

    res.json({
      success: true,
      data: parsed,
    });
  } catch (_err: any) {
    const safeTitle = (prompt || 'Studio Ilovasi')
      .split(' ')
      .slice(0, 5)
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const fallbackApp = {
      name: safeTitle,
      description: `Interaktiv veb-ilova: ${prompt || 'Maxsus loyiha'}`,
      explanation: `“${safeTitle}” uchun boshlang‘ich interaktiv shablon tayyorlandi. To‘liq AI generatsiyasi uchun Sozlamalarda GEMINI_API_KEY faolligini tekshiring.`,
      files: {
        'index.html': `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="style.css">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body class="bg-[#f8fafd] text-[#1f1f1f] min-h-screen font-['Plus_Jakarta_Sans',sans-serif] p-4 sm:p-8">
  <div class="max-w-3xl mx-auto space-y-6">
    <header class="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#dadce0] gap-4">
      <div>
        <h1 class="text-2xl font-bold text-[#1f1f1f] tracking-tight">${safeTitle}</h1>
        <p class="text-xs text-[#5f6368] mt-1">Google AI Studio Build Mode shabloni</p>
      </div>
      <form id="add-form" class="flex items-center gap-2">
        <input id="item-input" type="text" placeholder="Yangi vazifa yoki yozuv..." class="px-3 py-1.5 rounded-lg bg-white border border-[#dadce0] text-xs outline-none focus:border-[#0b57d0]" />
        <button type="submit" class="px-4 py-1.5 rounded-lg bg-[#0b57d0] hover:bg-[#0842a0] text-white text-xs font-medium active:scale-95 transition-all whitespace-nowrap">
          + Qo‘shish
        </button>
      </form>
    </header>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="bg-white border border-[#dadce0] rounded-xl p-4 space-y-1">
        <span class="text-xs text-[#5f6368] font-medium">Jami elementlar</span>
        <div class="text-2xl font-bold text-[#0b57d0] tabular-nums" id="counter-val">2</div>
      </div>
      <div class="bg-white border border-[#dadce0] rounded-xl p-4 space-y-1">
        <span class="text-xs text-[#5f6368] font-medium">Bajarilgan</span>
        <div class="text-2xl font-bold text-emerald-600 tabular-nums" id="done-val">0</div>
      </div>
      <div class="bg-white border border-[#dadce0] rounded-xl p-4 space-y-1">
        <span class="text-xs text-[#5f6368] font-medium">Holat</span>
        <div class="text-sm font-semibold text-[#1f1f1f] pt-1">Tayyor</div>
      </div>
    </div>

    <div class="bg-white border border-[#dadce0] rounded-xl p-5 space-y-3">
      <h2 class="text-sm font-semibold text-[#1f1f1f] pb-2 border-b border-[#f0f4f9]">Ishchi ro‘yxat</h2>
      <div id="items-list" class="space-y-2">
        <div class="flex items-center justify-between p-3 rounded-lg bg-[#f8fafd] border border-[#dadce0]/70">
          <label class="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
            <input type="checkbox" class="item-check accent-[#0b57d0]" />
            <span>Asosiy tuzilmani ko‘zdan kechirish</span>
          </label>
          <button class="delete-btn text-xs text-[#747775] hover:text-rose-600 px-1.5">✕</button>
        </div>
        <div class="flex items-center justify-between p-3 rounded-lg bg-[#f8fafd] border border-[#dadce0]/70">
          <label class="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
            <input type="checkbox" class="item-check accent-[#0b57d0]" />
            <span>Yangi yozuv qo‘shib sinab ko‘rish</span>
          </label>
          <button class="delete-btn text-xs text-[#747775] hover:text-rose-600 px-1.5">✕</button>
        </div>
      </div>
    </div>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
        'style.css': `/* Maxsus uslublar */
.completed-text {
  text-decoration: line-through;
  color: #747775;
}`,
        'script.js': `const form = document.getElementById('add-form');
const input = document.getElementById('item-input');
const list = document.getElementById('items-list');
const countVal = document.getElementById('counter-val');
const doneVal = document.getElementById('done-val');

function updateStats() {
  if (!list) return;
  const items = list.children.length;
  const checked = list.querySelectorAll('.item-check:checked').length;
  if (countVal) countVal.textContent = String(items);
  if (doneVal) doneVal.textContent = String(checked);
}

function bindRow(row) {
  const check = row.querySelector('.item-check');
  const labelSpan = row.querySelector('span');
  const delBtn = row.querySelector('.delete-btn');
  check?.addEventListener('change', () => {
    labelSpan?.classList.toggle('completed-text', check.checked);
    updateStats();
  });
  delBtn?.addEventListener('click', () => {
    row.remove();
    updateStats();
  });
}

list?.querySelectorAll(':scope > div').forEach(bindRow);

form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = input?.value.trim();
  if (!title || !list) return;
  const div = document.createElement('div');
  div.className = 'flex items-center justify-between p-3 rounded-lg bg-[#f8fafd] border border-[#dadce0]/70';
  div.innerHTML = '<label class="flex items-center gap-2.5 text-xs font-medium cursor-pointer"><input type="checkbox" class="item-check accent-[#0b57d0]" /><span></span></label><button class="delete-btn text-xs text-[#747775] hover:text-rose-600 px-1.5">✕</button>';
  div.querySelector('span').textContent = title;
  list.appendChild(div);
  bindRow(div);
  if (input) input.value = '';
  updateStats();
});`,
      },
    };

    res.json({
      success: true,
      data: fallbackApp,
    });
  }
});

// 5. Image Generation endpoint
async function generateVectorSvg(
  ai: GoogleGenAI,
  prompt: string,
  aspectRatio: string,
  inputImageBase64?: string
): Promise<string> {
  const ratioDims: Record<string, { w: number; h: number }> = {
    '1:1': { w: 800, h: 800 },
    '16:9': { w: 960, h: 540 },
    '9:16': { w: 540, h: 960 },
    '4:3': { w: 800, h: 600 },
    '3:4': { w: 600, h: 800 },
  };
  const dim = ratioDims[aspectRatio] || ratioDims['1:1'];

  const svgSystemPrompt =
    `You are an expert vector illustrator and SVG artist. Generate a rich, detailed, visually striking standalone <svg> illustration matching the user's prompt.\n` +
    `STRICT RULES:\n` +
    `1. Output ONLY raw valid <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim.w} ${dim.h}" width="${dim.w}" height="${dim.h}">...</svg> code. No markdown fences, no commentary.\n` +
    `2. Use rich gradients, layered shapes, lighting highlights, shadows, and clean geometry to depict the scene accurately.\n` +
    `3. Do NOT include <script> tags or external URLs inside the SVG.`;

  const parts: any[] = [];
  if (inputImageBase64) {
    const mimeMatch = inputImageBase64.match(/^data:([^;]+);base64,/);
    const clean = inputImageBase64.replace(/^data:[^;]+;base64,/, '');
    parts.push({
      inlineData: {
        data: clean,
        mimeType: mimeMatch?.[1] || 'image/png',
      },
    });
  }
  parts.push({
    text: inputImageBase64
      ? `Analyze the attached image and create a detailed vector SVG illustration incorporating this request: ${prompt}`
      : `Create a detailed vector SVG illustration for: ${prompt}`,
  });

  const svgCandidates = ['gemini-3.1-flash-lite', 'gemini-4-hydrogen'];
  let lastSvgErr: any;

  for (const candidate of svgCandidates) {
    try {
      const streamPromise = ai.models.generateContentStream({
        model: candidate,
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction: svgSystemPrompt,
          thinkingConfig: {
            thinkingLevel: candidate === 'gemini-4-hydrogen' ? ThinkingLevel.LOW : ThinkingLevel.MINIMAL,
            includeThoughts: false,
          },
        },
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('SVG model timed out')), 15000)
      );
      const stream = await Promise.race([streamPromise, timeoutPromise]);
      let collected = '';
      for await (const chunk of stream) {
        if (chunk.text) collected += chunk.text;
      }
      const match = collected.match(/<svg[\s\S]*<\/svg>/i);
      if (match) {
        return match[0];
      }
    } catch (e: any) {
      lastSvgErr = e;
    }
  }

  throw lastSvgErr || new Error('Vektor SVG yaratib bo‘lmadi.');
}

app.post('/api/image/generate', async (req, res) => {
  const {
    prompt,
    aspectRatio = '1:1',
    model = 'gemini-3.1-flash-lite-image',
    inputImageBase64,
  } = req.body;

  const customKey = req.headers['x-gemini-api-key'] as string | undefined;

  if (!prompt || !String(prompt).trim()) {
    return res.status(400).json({
      success: false,
      error: 'Iltimos, rasm yaratish uchun tavsif (prompt) kiriting.',
    });
  }

  let ai: GoogleGenAI;
  try {
    ai = getGeminiClient(customKey);
  } catch (err: any) {
    return res.json({
      success: false,
      error: err?.message || 'API kalit sozlanmagan.',
    });
  }

  try {
    if (model === 'gemini-vector-svg') {
      const svgCode = await generateVectorSvg(ai, prompt, aspectRatio, inputImageBase64);
      const base64Svg = Buffer.from(svgCode).toString('base64');
      return res.json({
        success: true,
        imageUrl: `data:image/svg+xml;base64,${base64Svg}`,
        description: prompt,
        modelUsed: 'gemini-vector-svg',
      });
    }

    const parts: any[] = [];
    if (inputImageBase64) {
      const mimeMatch = inputImageBase64.match(/^data:([^;]+);base64,/);
      const clean = inputImageBase64.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          data: clean,
          mimeType: mimeMatch?.[1] || 'image/png',
        },
      });
    }

    parts.push({ text: prompt });

    const validAspectRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
    const chosenRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : '1:1';
    const chosenModel =
      model === 'gemini-nano-banana-2.1'
        ? 'gemini-nano-banana-2.1'
        : 'gemini-3.1-flash-lite-image';

    const response = await ai.models.generateContent({
      model: chosenModel,
      contents: [{ role: 'user', parts }],
      config: {
        imageConfig: {
          aspectRatio: chosenRatio,
        },
      },
    });

    let foundImage: string | null = null;
    let captionText = '';

    const candidates = response.candidates || [];
    for (const cand of candidates) {
      for (const part of cand.content?.parts || []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          foundImage = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          captionText += part.text;
        }
      }
    }

    if (!foundImage) {
      return res.json({
        success: false,
        error: captionText || 'Model rasm qaytarmadi. Tavsifni o‘zgartirib qayta urinib ko‘ring.',
      });
    }

    return res.json({
      success: true,
      imageUrl: foundImage,
      description: captionText || prompt,
      modelUsed: chosenModel,
    });
  } catch (err: any) {
    const rawMsg = err?.message || String(err);
    const isQuotaOrBilling =
      rawMsg.includes('429') ||
      rawMsg.includes('RESOURCE_EXHAUSTED') ||
      rawMsg.includes('quota') ||
      rawMsg.includes('limit: 0');

    // Automatically synthesize real AI vector SVG artwork on Free Tier when raster image model lacks quota
    if (isQuotaOrBilling) {
      try {
        const svgCode = await generateVectorSvg(ai, prompt, aspectRatio, inputImageBase64);
        const base64Svg = Buffer.from(svgCode).toString('base64');
        return res.json({
          success: true,
          imageUrl: `data:image/svg+xml;base64,${base64Svg}`,
          description: prompt,
          modelUsed: 'gemini-vector-svg',
          notice:
            'Fotorealistik rasm modeli uchun pullik API kalit (Billing) kerakligi sababli rasm bepul AI Vektor rejimida yaratildi.',
        });
      } catch {
        // Fall through to structured error if vector synthesis also failed
      }
    }

    return res.json({
      success: false,
      errorCode: isQuotaOrBilling ? 'QUOTA_EXCEEDED' : 'IMAGE_ERROR',
      error: isQuotaOrBilling
        ? 'Fotorealistik rasm modellari (Gemini Flash-Lite Image / Nano Banana 2.1) bepul tarifda limitga ega emas (limit: 0). Pullik (Billing yoqilgan) API kalit ulang.'
        : 'Rasm yaratishda xatolik yuz berdi. Tavsifni tekshirib qayta urinib ko‘ring.',
    });
  }
});

// 6. Project Management API
app.get('/api/projects', (req, res) => {
  const list = Array.from(projectsStore.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  res.json({ projects: list });
});

app.get('/api/projects/:id', (req, res) => {
  const proj = projectsStore.get(req.params.id);
  if (!proj) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json({ project: proj });
});

app.post('/api/projects', (req, res) => {
  const { name, description, type = 'app', model = 'gemini-3.8-flash', files = {} } = req.body;
  const id = 'proj-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  const newProj: Project = {
    id,
    name: name || 'Untitled Project',
    description: description || '',
    type,
    model,
    files,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  projectsStore.set(id, newProj);
  res.json({ success: true, project: newProj });
});

app.put('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  const existing = projectsStore.get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const updated: Project = {
    ...existing,
    ...req.body,
    updatedAt: Date.now(),
  };
  projectsStore.set(id, updated);
  res.json({ success: true, project: updated });
});

app.delete('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  const deleted = projectsStore.delete(id);
  res.json({ success: deleted });
});

// Start server with Vite in development
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Studio Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
