import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import {
  Layers,
  Sparkles,
  Save,
  Check,
  Send,
  Wand2,
  Bug,
  Palette,
  Smartphone,
  HardDrive,
  SplitSquareHorizontal,
  Monitor,
  Code2,
  RefreshCw,
  FolderDown,
  Undo2,
  FileCode2,
  MessageSquare,
  ChevronDown,
  Eye,
} from 'lucide-react';
import { AppProject, ModelInfo } from '../../types';
import { generateAppProject, updateProject, createProject } from '../../services/api';
import { CodeEditorView } from './CodeEditorView';
import { LivePreview } from './LivePreview';

interface BuildModeViewProps {
  currentProject: AppProject | null;
  onSaveProject: (project: AppProject) => void;
  models: ModelInfo[];
  selectedModel: string;
  theme: 'dark' | 'light';
}

interface BuildLogItem {
  role: 'user' | 'model';
  text: string;
  files?: string[];
  timestamp: number;
  isError?: boolean;
}

export const BuildModeView: React.FC<BuildModeViewProps> = ({
  currentProject,
  onSaveProject,
  models,
  selectedModel,
  theme,
}) => {
  // Clean Light-first default starter app matching Google AI Studio aesthetic
  const defaultFiles: Record<string, string> = {
    'index.html': `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Studio Ilovasi</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="style.css">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body class="bg-[#f8fafd] text-[#1f1f1f] min-h-screen font-['Plus_Jakarta_Sans',sans-serif] p-6 flex flex-col items-center justify-center">
  <div id="app-card" class="max-w-lg w-full bg-white border border-[#dadce0] rounded-2xl p-7 shadow-sm text-center space-y-5">
    <div class="w-12 h-12 rounded-2xl bg-[#e8f0fe] border border-[#d3e3fd] flex items-center justify-center mx-auto text-[#0b57d0]">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
      </svg>
    </div>
    <div class="space-y-1.5">
      <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-[#1f1f1f]">Google AI Studio Build</h1>
      <p class="text-xs sm:text-sm text-[#5f6368] leading-relaxed">
        Chap tarafdagi yordamchiga o‘zingiz istagan sayt, o‘yin yoki dastur g‘oyasini yozing — kod va jonli ko‘rinish bir zumda yaratiladi.
      </p>
    </div>
    <div class="flex flex-wrap justify-center gap-2 pt-1">
      <button id="counter-btn" class="px-4 py-2 rounded-full bg-[#0b57d0] hover:bg-[#0842a0] text-white font-medium text-xs transition-all active:scale-95">
        Sinab ko‘rish: <span id="count">0</span>
      </button>
      <button id="accent-btn" class="px-4 py-2 rounded-full bg-[#f0f4f9] hover:bg-[#e8eaed] text-[#1f1f1f] border border-[#dadce0] font-medium text-xs transition-all active:scale-95">
        Rangni o‘zgartirish
      </button>
    </div>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
    'style.css': `/* Ilova uslublari */
.highlight-card {
  border-color: #0b57d0;
  box-shadow: 0 8px 28px rgba(11, 87, 208, 0.12);
}`,
    'script.js': `let count = 0;
const countSpan = document.getElementById('count');
const counterBtn = document.getElementById('counter-btn');
const accentBtn = document.getElementById('accent-btn');
const card = document.getElementById('app-card');

counterBtn?.addEventListener('click', () => {
  count++;
  if (countSpan) countSpan.textContent = String(count);
});

accentBtn?.addEventListener('click', () => {
  card?.classList.toggle('highlight-card');
});`,
  };

  const [projectName, setProjectName] = useState(
    currentProject?.name || 'Yangi veb-ilova'
  );
  const [projectDescription, setProjectDescription] = useState(
    currentProject?.description || 'Google AI Studio Build Mode loyihasi'
  );
  const [files, setFiles] = useState<Record<string, string>>(
    currentProject?.files && Object.keys(currentProject.files).length > 0
      ? currentProject.files
      : defaultFiles
  );
  const [activeFile, setActiveFile] = useState<string>('index.html');

  // Desktop view mode ('split' | 'preview' | 'code') and Mobile active tab ('chat' | 'preview' | 'code')
  const [desktopView, setDesktopView] = useState<'preview' | 'code' | 'split'>('split');
  const [mobileTab, setMobileTab] = useState<'chat' | 'preview' | 'code'>('chat');

  const [promptInput, setPromptInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [history, setHistory] = useState<Record<string, string>[]>([]);
  const [runtimeErrorText, setRuntimeErrorText] = useState<string | null>(null);

  const [generationLogs, setGenerationLogs] = useState<BuildLogItem[]>([
    {
      role: 'model',
      text: 'Build bo‘limi tayyor! Qanday veb-sayt, kalkulyator, boshqaruv paneli yoki interaktiv ilova yaratmoqchi ekanligingizni yozing.',
      timestamp: Date.now(),
    },
  ]);

  const [isSaved, setIsSaved] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  // Sync external project selection (from Chat artifact or Projects gallery)
  useEffect(() => {
    if (currentProject) {
      setProjectName(currentProject.name || 'Yangi veb-ilova');
      setProjectDescription(currentProject.description || 'Google AI Studio Build Mode loyihasi');
      if (currentProject.files && Object.keys(currentProject.files).length > 0) {
        setFiles(currentProject.files);
        const firstFile = currentProject.files['index.html']
          ? 'index.html'
          : Object.keys(currentProject.files)[0];
        setActiveFile(firstFile);
        if (currentProject.id?.startsWith('proj-chat-')) {
          setMobileTab('preview');
        }
      } else {
        setFiles(defaultFiles);
        setActiveFile('index.html');
      }
    } else {
      setProjectName('Yangi veb-ilova');
      setProjectDescription('Google AI Studio Build Mode loyihasi');
      setFiles(defaultFiles);
      setActiveFile('index.html');
    }
    setHistory([]);
    setRuntimeErrorText(null);
  }, [currentProject?.id, currentProject?.updatedAt]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [generationLogs, isGenerating]);

  const starterTemplates = [
    {
      name: 'Kanban vazifalar doskasi',
      desc: 'Ustunlar, qidiruv va LocalStorage saqlash',
      prompt:
        'O‘zbek tilida zamonaviy Kanban vazifalar doskasi yarat: "Rejada", "Jarayonda", "Bajarildi" ustunlari, yangi vazifa qo‘shish, ustunlar orasida ko‘chirish va LocalStorage da saqlash bo‘lsin.',
    },
    {
      name: 'Pomodoro diqqat taymeri',
      desc: '25/5/15 daqiqalik taymer va statistika',
      prompt:
        'O‘zbek tilida toza va chiroyli Pomodoro fokus taymeri yarat: aylana progress indikatori, Ish/Qisqa tanaffus/Uzoq tanaffus rejimlari, tugallangan sessiyalar hisoblagichi.',
    },
    {
      name: 'Xarajatlar va byudjet kalkulyatori',
      desc: 'Kirim-chiqim jadvali va grafik',
      prompt:
        'Shaxsiy moliya va kunlik xarajatlarni hisoblaydigan ilova yarat: kirim/chiqim qo‘shish, toifalar bo‘yicha taqsimot, umumiy balans va LocalStorage saqlash.',
    },
    {
      name: 'Markdown qaydlar muharriri',
      desc: 'Chapda yozuv, o‘ngda jonli ko‘rinish',
      prompt:
        'Ikki panelli Markdown qaydlar muharriri yarat: chapda matn kiritish, o‘ngda jonli ko‘rinish, so‘zlar sanog‘i va .md fayl qilib yuklab olish tugmasi.',
    },
  ];

  const handleGenerate = async (customPrompt?: string) => {
    const promptToUse = (customPrompt || promptInput).trim();
    if (!promptToUse || isGenerating) return;

    setTemplatesOpen(false);
    setRuntimeErrorText(null);
    setIsGenerating(true);
    setGenerationLogs((prev) => [
      ...prev,
      { role: 'user', text: promptToUse, timestamp: Date.now() },
    ]);
    if (!customPrompt) setPromptInput('');

    // Save undo snapshot before modifying files
    setHistory((prev) => [...prev.slice(-9), { ...files }]);

    try {
      const result = await generateAppProject({
        prompt: promptToUse,
        projectName,
        currentFiles: files,
        instruction: promptToUse,
        model: selectedModel,
      });

      if (result.success && result.data) {
        if (result.data.name) setProjectName(result.data.name);
        if (result.data.description) setProjectDescription(result.data.description);
        let updatedKeys: string[] = [];
        if (result.data.files && Object.keys(result.data.files).length > 0) {
          setFiles(result.data.files);
          updatedKeys = Object.keys(result.data.files);
          if (!result.data.files[activeFile]) {
            setActiveFile(updatedKeys[0]);
          }
        }

        setGenerationLogs((prev) => [
          ...prev,
          {
            role: 'model',
            text:
              result.data?.explanation ||
              'Ilova kodi muvaffaqiyatli yaratildi va jonli Preview yangilandi.',
            files: updatedKeys,
            timestamp: Date.now(),
          },
        ]);
      } else {
        throw new Error(result.error || 'Kod generatsiya qilishda xatolik yuz berdi.');
      }
    } catch (err: any) {
      setGenerationLogs((prev) => [
        ...prev,
        {
          role: 'model',
          text: `Xatolik yuz berdi: ${err.message || 'API kalitini tekshirib qayta urinib ko‘ring.'}`,
          timestamp: Date.now(),
          isError: true,
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUndo = () => {
    if (history.length === 0 || isGenerating) return;
    const previousFiles = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setFiles(previousFiles);
    if (!previousFiles[activeFile]) {
      setActiveFile(Object.keys(previousFiles)[0] || 'index.html');
    }
    setGenerationLogs((prev) => [
      ...prev,
      {
        role: 'model',
        text: 'Oldingi fayl holati muvaffaqiyatli tiklandi.',
        timestamp: Date.now(),
      },
    ]);
  };

  const handleDownloadZip = async () => {
    try {
      const zip = new JSZip();
      Object.entries(files).forEach(([name, content]) => {
        zip.file(name, content);
      });
      zip.file(
        'README.md',
        `# ${projectName}\n\n${projectDescription}\n\nGoogle AI Studio Build Mode orqali yaratilgan.`
      );

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'studio-app'}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('ZIP yaratishda xatolik:', e);
      setGenerationLogs((prev) => [
        ...prev,
        {
          role: 'model',
          text: 'ZIP arxivini tayyorlashda xatolik yuz berdi.',
          timestamp: Date.now(),
          isError: true,
        },
      ]);
    }
  };

  const handleSave = async () => {
    const proj: AppProject = {
      id: currentProject?.id || 'proj-' + Date.now(),
      name: projectName,
      description: projectDescription,
      type: 'app',
      model: selectedModel,
      files,
      updatedAt: Date.now(),
      createdAt: currentProject?.createdAt || Date.now(),
    };

    if (currentProject?.id) {
      await updateProject(currentProject.id, proj);
    } else {
      await createProject(proj);
    }

    onSaveProject(proj);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleFileChange = (fileName: string, content: string) => {
    setFiles((prev) => ({ ...prev, [fileName]: content }));
  };

  const handleCreateFile = (fileName: string) => {
    setFiles((prev) => ({ ...prev, [fileName]: '' }));
  };

  const handleDeleteFile = (fileName: string) => {
    setHistory((prev) => [...prev.slice(-9), { ...files }]);
    setFiles((prev) => {
      const copy = { ...prev };
      delete copy[fileName];
      return copy;
    });
    const remaining = Object.keys(files).filter((f) => f !== fileName);
    if (remaining.length > 0) setActiveFile(remaining[0]);
  };

  const handleOpenFileInEditor = (fileName: string) => {
    setActiveFile(fileName);
    setDesktopView('code');
    setMobileTab('code');
  };

  const handleFixRuntimeError = (errText: string) => {
    setRuntimeErrorText(errText);
    setMobileTab('chat');
    handleGenerate(`Preview konsolida quyidagi xatolik chiqdi, shuni tuzatib ber:\n\n${errText}`);
  };

  const activeModelLabel =
    models.find((m) => m.id === selectedModel)?.name || selectedModel;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-white dark:bg-[#131314]">
      {/* Top Project Sub-Header (Clean 1-row Google AI Studio bar) */}
      <div className="h-12 px-3 sm:px-4 bg-white dark:bg-[#1e1f20] border-b border-[#dadce0] dark:border-[#333538] flex items-center justify-between gap-2 shrink-0 select-none">
        {/* Left: Project title + unboxed file count + Undo */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#e8f0fe] dark:bg-[#1b2d4b] text-[#0b57d0] dark:text-[#a8c7fa] flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="text-xs sm:text-sm font-semibold bg-transparent border-b border-transparent hover:border-[#dadce0] focus:border-[#0b57d0] text-[#1f1f1f] dark:text-[#e3e3e3] outline-none px-1 py-0.5 transition-colors max-w-[125px] sm:max-w-[210px] truncate"
            placeholder="Loyiha nomi..."
          />
          <span className="hidden md:inline text-[11px] text-[#747775] tabular-nums whitespace-nowrap">
            · {Object.keys(files).length} fayl
          </span>

          {history.length > 0 && (
            <button
              onClick={handleUndo}
              disabled={isGenerating}
              className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[11px] font-medium text-[#444746] dark:text-[#c4c7c5] transition-colors whitespace-nowrap shrink-0"
              title="Oldingi holatga qaytarish"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Bekor qilish</span>
            </button>
          )}
        </div>

        {/* Center: Mobile Tab Switcher (Chat | Preview | Kod) — ALWAYS accessible on phones */}
        <div className="flex lg:hidden items-center bg-[#f0f4f9] dark:bg-[#282a2c] p-0.5 rounded-full border border-[#dadce0] dark:border-[#333538] shrink-0">
          <button
            onClick={() => setMobileTab('chat')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 transition-all whitespace-nowrap ${
              mobileTab === 'chat'
                ? 'bg-white dark:bg-[#1e1f20] text-[#0b57d0] dark:text-[#a8c7fa] font-semibold shadow-2xs'
                : 'text-[#444746] dark:text-[#c4c7c5]'
            }`}
          >
            <MessageSquare className="w-3 h-3" />
            <span>Chat</span>
          </button>
          <button
            onClick={() => setMobileTab('preview')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 transition-all whitespace-nowrap ${
              mobileTab === 'preview'
                ? 'bg-white dark:bg-[#1e1f20] text-[#0b57d0] dark:text-[#a8c7fa] font-semibold shadow-2xs'
                : 'text-[#444746] dark:text-[#c4c7c5]'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Preview</span>
          </button>
          <button
            onClick={() => setMobileTab('code')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 transition-all whitespace-nowrap ${
              mobileTab === 'code'
                ? 'bg-white dark:bg-[#1e1f20] text-[#0b57d0] dark:text-[#a8c7fa] font-semibold shadow-2xs'
                : 'text-[#444746] dark:text-[#c4c7c5]'
            }`}
          >
            <Code2 className="w-3 h-3" />
            <span>Kod</span>
          </button>
        </div>

        {/* Center: Desktop View Mode Switcher (Preview | Kod | Split) */}
        <div className="hidden lg:flex items-center gap-0.5 bg-[#f0f4f9] dark:bg-[#282a2c] p-0.5 rounded-full border border-[#dadce0] dark:border-[#333538] shrink-0">
          <button
            onClick={() => setDesktopView('preview')}
            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
              desktopView === 'preview'
                ? 'bg-white dark:bg-[#1e1f20] text-[#0b57d0] dark:text-[#a8c7fa] font-semibold shadow-2xs'
                : 'text-[#444746] dark:text-[#c4c7c5] hover:text-[#1f1f1f] dark:hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>
          <button
            onClick={() => setDesktopView('code')}
            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
              desktopView === 'code'
                ? 'bg-white dark:bg-[#1e1f20] text-[#0b57d0] dark:text-[#a8c7fa] font-semibold shadow-2xs'
                : 'text-[#444746] dark:text-[#c4c7c5] hover:text-[#1f1f1f] dark:hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Kod</span>
          </button>
          <button
            onClick={() => setDesktopView('split')}
            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
              desktopView === 'split'
                ? 'bg-white dark:bg-[#1e1f20] text-[#0b57d0] dark:text-[#a8c7fa] font-semibold shadow-2xs'
                : 'text-[#444746] dark:text-[#c4c7c5] hover:text-[#1f1f1f] dark:hover:text-white'
            }`}
          >
            <SplitSquareHorizontal className="w-3.5 h-3.5" />
            <span>Yonma-yon</span>
          </button>
        </div>

        {/* Right Tools: Click-opened Templates, ZIP, Save */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="relative">
            <button
              onClick={() => setTemplatesOpen(!templatesOpen)}
              className="px-2.5 sm:px-3 py-1.5 rounded-full border border-[#dadce0] dark:border-[#333538] bg-white dark:bg-[#1e1f20] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-xs text-[#444746] dark:text-[#c4c7c5] flex items-center gap-1.5 transition-colors whitespace-nowrap"
              title="Tayyor boshlang‘ich shablonlar"
            >
              <Wand2 className="w-3.5 h-3.5 text-[#0b57d0]" />
              <span className="hidden sm:inline font-medium">Shablonlar</span>
              <ChevronDown className="w-3 h-3 hidden sm:inline" />
            </button>

            {templatesOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setTemplatesOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-72 rounded-2xl border border-[#dadce0] dark:border-[#333538] bg-white dark:bg-[#1e1f20] shadow-xl p-2 z-50 text-xs">
                  <div className="px-2.5 py-1.5 text-[11px] font-semibold text-[#5f6368] border-b border-[#f0f4f9] dark:border-[#282a2c] mb-1">
                    Tayyor shablonlar
                  </div>
                  {starterTemplates.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setMobileTab('chat');
                        handleGenerate(item.prompt);
                      }}
                      className="w-full p-2.5 rounded-xl hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-left transition-colors"
                    >
                      <div className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-[#747775] line-clamp-1 mt-0.5">
                        {item.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleDownloadZip}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#1e1f20] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] border border-[#dadce0] dark:border-[#333538] text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] transition-colors whitespace-nowrap"
            title="Loyihani ZIP qilib yuklab olish"
          >
            <FolderDown className="w-3.5 h-3.5 text-[#0b57d0]" />
            <span className="hidden md:inline">ZIP</span>
          </button>

          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
              isSaved
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'bg-[#0b57d0] hover:bg-[#0842a0] text-white shadow-2xs active:scale-95'
            }`}
          >
            {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isSaved ? 'Saqlandi' : 'Saqlash'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Split */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left: AI Build Agent Panel */}
        <div
          className={`${
            mobileTab === 'chat' ? 'flex' : 'hidden lg:flex'
          } w-full lg:w-[370px] xl:w-[400px] border-r border-[#dadce0] dark:border-[#333538] bg-[#f8fafd] dark:bg-[#18191c] flex-col shrink-0 h-full min-h-0`}
        >
          {/* Agent Header */}
          <div className="px-4 py-2.5 bg-white dark:bg-[#1e1f20] border-b border-[#dadce0] dark:border-[#333538] flex items-center justify-between shrink-0">
            <span className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0b57d0]" />
              <span>Build yordamchi</span>
            </span>
            <span className="text-[11px] text-[#747775] truncate max-w-[160px]">
              {activeModelLabel}
            </span>
          </div>

          {/* Agent Conversation Thread */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3">
            {generationLogs.map((log, i) => (
              <div
                key={i}
                className={`rounded-2xl p-3.5 text-xs leading-relaxed ${
                  log.role === 'user'
                    ? 'bg-[#e8f0fe] dark:bg-[#1b2d4b] border border-[#d3e3fd] dark:border-[#2b4c7e] text-[#1f1f1f] dark:text-[#f8fafd] ml-6'
                    : log.isError
                    ? 'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 mr-2'
                    : 'bg-white dark:bg-[#1e1f20] border border-[#dadce0] dark:border-[#333538] text-[#1f1f1f] dark:text-[#e3e3e3] mr-2'
                }`}
              >
                <p className="whitespace-pre-wrap">{log.text}</p>

                {/* Created/Updated Files Chips */}
                {log.files && log.files.length > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-[#f0f4f9] dark:border-[#282a2c] space-y-2">
                    <div className="text-[11px] font-medium text-[#5f6368] dark:text-[#9aa0a6]">
                      Yangilangan fayllar:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {log.files.map((fname) => (
                        <button
                          key={fname}
                          onClick={() => handleOpenFileInEditor(fname)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#f8fafd] dark:bg-[#282a2c] hover:bg-[#e8f0fe] dark:hover:bg-[#1b2d4b] border border-[#dadce0] dark:border-[#333538] text-[11px] font-mono text-[#0b57d0] dark:text-[#a8c7fa] transition-colors"
                        >
                          <FileCode2 className="w-3 h-3" />
                          <span>{fname}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setMobileTab('preview')}
                      className="lg:hidden w-full mt-1 py-1.5 rounded-xl bg-[#e8f0fe] dark:bg-[#1b2d4b] text-[#0b57d0] dark:text-[#a8c7fa] font-semibold text-xs flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Previewni ko‘rish</span>
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Quick Starter Cards shown when thread has only initial greeting */}
            {generationLogs.length === 1 && !isGenerating && (
              <div className="space-y-2 pt-1">
                <div className="text-[11px] font-semibold text-[#5f6368] dark:text-[#9aa0a6] px-1">
                  Tezkor boshlash g‘oyalari
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {starterTemplates.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleGenerate(item.prompt)}
                      className="p-3 rounded-xl bg-white dark:bg-[#1e1f20] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] border border-[#dadce0] dark:border-[#333538] hover:border-[#a8c7fa] text-left transition-all"
                    >
                      <div className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-[#747775] mt-0.5 line-clamp-1">
                        {item.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isGenerating && (
              <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1e1f20] border border-[#d3e3fd] dark:border-[#2b4c7e] text-[#0b57d0] dark:text-[#a8c7fa] text-xs flex items-center gap-2.5">
                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                <span>Ilova fayllari yaratilmoqda...</span>
              </div>
            )}
            <div ref={logsEndRef} />
          </div>

          {/* Quick Refinement Toolbar + Composer */}
          <div className="p-3 border-t border-[#dadce0] dark:border-[#333538] bg-white dark:bg-[#1e1f20] space-y-2.5 shrink-0">
            {/* Compact One-Row Action Suggestions */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {runtimeErrorText && (
                <button
                  onClick={() => handleFixRuntimeError(runtimeErrorText)}
                  disabled={isGenerating}
                  className="px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] font-medium flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <Bug className="w-3 h-3" />
                  <span>Xatoni tuzatish</span>
                </button>
              )}
              <button
                onClick={() =>
                  handleGenerate(
                    'Ilovadagi barcha sintaksis, JavaScript va dizayn xatoliklarini tekshirib tuzat.'
                  )
                }
                disabled={isGenerating}
                className="px-2.5 py-1 rounded-full bg-[#f8fafd] dark:bg-[#282a2c] hover:bg-[#e8f0fe] hover:text-[#0b57d0] text-[11px] font-medium text-[#444746] dark:text-[#c4c7c5] border border-[#dadce0] dark:border-[#333538] flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
              >
                <Bug className="w-3 h-3 text-rose-500" />
                <span>Xatolarni tuzatish</span>
              </button>
              <button
                onClick={() =>
                  handleGenerate(
                    'Ilovaning vizual dizaynini yanada chiroyli, toza, zamonaviy kartochkalar va silliq animatsiyalar bilan yaxshila.'
                  )
                }
                disabled={isGenerating}
                className="px-2.5 py-1 rounded-full bg-[#f8fafd] dark:bg-[#282a2c] hover:bg-[#e8f0fe] hover:text-[#0b57d0] text-[11px] font-medium text-[#444746] dark:text-[#c4c7c5] border border-[#dadce0] dark:border-[#333538] flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
              >
                <Palette className="w-3 h-3 text-purple-600" />
                <span>Dizaynni yaxshilash</span>
              </button>
              <button
                onClick={() =>
                  handleGenerate(
                    'Telefon va planshet ekranlari uchun to‘liq moslashuvchan (responsive) qilib optimallashtir.'
                  )
                }
                disabled={isGenerating}
                className="px-2.5 py-1 rounded-full bg-[#f8fafd] dark:bg-[#282a2c] hover:bg-[#e8f0fe] hover:text-[#0b57d0] text-[11px] font-medium text-[#444746] dark:text-[#c4c7c5] border border-[#dadce0] dark:border-[#333538] flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
              >
                <Smartphone className="w-3 h-3 text-emerald-600" />
                <span>Mobil moslashuv</span>
              </button>
              <button
                onClick={() =>
                  handleGenerate(
                    'Foydalanuvchi kiritgan ma’lumotlar sahifa yangilanganda ham o‘chib ketmasligi uchun localStorage qo‘sh.'
                  )
                }
                disabled={isGenerating}
                className="px-2.5 py-1 rounded-full bg-[#f8fafd] dark:bg-[#282a2c] hover:bg-[#e8f0fe] hover:text-[#0b57d0] text-[11px] font-medium text-[#444746] dark:text-[#c4c7c5] border border-[#dadce0] dark:border-[#333538] flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
              >
                <HardDrive className="w-3 h-3 text-[#0b57d0]" />
                <span>Saqlash (LocalStorage)</span>
              </button>
            </div>

            {/* Prompt Input Box */}
            <div className="rounded-2xl border border-[#dadce0] dark:border-[#333538] bg-[#f8fafd] dark:bg-[#282a2c] focus-within:bg-white dark:focus-within:bg-[#1e1f20] focus-within:border-[#0b57d0] transition-all p-2.5">
              <textarea
                ref={composerRef}
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                placeholder="Ilova g‘oyangizni yozing yoki o‘zgartirish so‘rang..."
                rows={2}
                disabled={isGenerating}
                className="w-full bg-transparent text-xs sm:text-[13px] text-[#1f1f1f] dark:text-[#e3e3e3] placeholder:text-[#747775] outline-none resize-none leading-relaxed"
              />
              <div className="flex items-center justify-between pt-2 border-t border-[#dadce0]/60 dark:border-[#333538] mt-1">
                <span className="text-[11px] text-[#747775]">
                  Enter — yuborish
                </span>
                <button
                  onClick={() => handleGenerate()}
                  disabled={!promptInput.trim() || isGenerating}
                  className="px-3.5 py-1.5 rounded-full bg-[#0b57d0] hover:bg-[#0842a0] disabled:opacity-40 text-white font-medium text-xs flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap"
                >
                  <span>Yaratish</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Code Editor & Live Preview Workspace */}
        <div
          className={`${
            mobileTab !== 'chat' ? 'flex' : 'hidden lg:flex'
          } flex-1 flex-col md:flex-row min-w-0 h-full min-h-0 overflow-hidden`}
        >
          {/* Mobile renders whichever of 'code' or 'preview' is selected; Desktop follows desktopView */}
          <div
            className={`${mobileTab === 'code' ? 'flex' : 'hidden'} ${
              desktopView === 'split' || desktopView === 'code' ? 'lg:flex' : 'lg:hidden'
            } flex-col h-full min-h-0 min-w-0 ${
              desktopView === 'split' ? 'w-full lg:w-1/2' : 'w-full'
            }`}
          >
            <CodeEditorView
              files={files}
              activeFile={activeFile}
              onSelectFile={setActiveFile}
              onFileChange={handleFileChange}
              onCreateFile={handleCreateFile}
              onDeleteFile={handleDeleteFile}
              theme={theme}
            />
          </div>

          <div
            className={`${mobileTab === 'preview' ? 'flex' : 'hidden'} ${
              desktopView === 'split' || desktopView === 'preview' ? 'lg:flex' : 'lg:hidden'
            } flex-col h-full min-h-0 min-w-0 ${
              desktopView === 'split' ? 'w-full lg:w-1/2' : 'w-full'
            }`}
          >
            <LivePreview
              files={files}
              projectName={projectName}
              onFixRuntimeError={handleFixRuntimeError}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
