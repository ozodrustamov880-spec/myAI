import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  FileCode,
  FileSpreadsheet,
  FilePlus,
  Save,
  Check,
  Copy,
  FileText,
  X,
} from 'lucide-react';

interface CodeEditorViewProps {
  files: Record<string, string>;
  activeFile: string;
  onSelectFile: (fileName: string) => void;
  onFileChange: (fileName: string, content: string) => void;
  onCreateFile: (fileName: string) => void;
  onDeleteFile: (fileName: string) => void;
  theme: 'dark' | 'light';
}

export const CodeEditorView: React.FC<CodeEditorViewProps> = ({
  files,
  activeFile,
  onSelectFile,
  onFileChange,
  onCreateFile,
  onDeleteFile,
  theme,
}) => {
  const [newFileName, setNewFileName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);

  const fileNames = Object.keys(files);

  const getLanguage = (fileName: string) => {
    if (fileName.endsWith('.html')) return 'html';
    if (fileName.endsWith('.css')) return 'css';
    if (fileName.endsWith('.js')) return 'javascript';
    if (fileName.endsWith('.ts')) return 'typescript';
    if (fileName.endsWith('.json')) return 'json';
    return 'plaintext';
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.html')) return <FileCode className="w-3.5 h-3.5 text-orange-500" />;
    if (fileName.endsWith('.css')) return <FileSpreadsheet className="w-3.5 h-3.5 text-sky-500" />;
    if (fileName.endsWith('.js') || fileName.endsWith('.ts')) return <FileCode className="w-3.5 h-3.5 text-amber-500" />;
    return <FileText className="w-3.5 h-3.5 text-[#747775]" />;
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newFileName.trim();
    if (!clean) return;
    onCreateFile(clean);
    setNewFileName('');
    setIsCreating(false);
    onSelectFile(clean);
  };

  const handleCopyCurrent = () => {
    navigator.clipboard.writeText(files[activeFile] || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveTrigger = () => {
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 2000);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-[#131314] border-r border-[#dadce0] dark:border-[#333538] overflow-hidden">
      {/* File Tab Bar */}
      <div className="h-11 bg-[#f8fafd] dark:bg-[#1e1f20] border-b border-[#dadce0] dark:border-[#333538] flex items-center justify-between px-2 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0">
          {fileNames.map((fileName) => {
            const isActive = fileName === activeFile;
            return (
              <div
                key={fileName}
                onClick={() => onSelectFile(fileName)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono cursor-pointer border-b-2 transition-all shrink-0 whitespace-nowrap ${
                  isActive
                    ? 'bg-white dark:bg-[#131314] border-[#0b57d0] text-[#0b57d0] dark:text-[#a8c7fa] font-semibold'
                    : 'border-transparent text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c]'
                }`}
              >
                {getFileIcon(fileName)}
                <span>{fileName}</span>
                {fileNames.length > 1 && fileName !== 'index.html' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFile(fileName);
                    }}
                    className="p-0.5 hover:text-rose-500 rounded ml-0.5 text-[#747775]"
                    title="Faylni o‘chirish"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {isCreating ? (
            <form onSubmit={handleCreateSubmit} className="flex items-center gap-1 ml-1">
              <input
                type="text"
                autoFocus
                placeholder="fayl.js"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onBlur={() => setIsCreating(false)}
                className="w-24 px-2 py-1 text-xs font-mono rounded bg-white dark:bg-[#1e1f20] border border-[#0b57d0] text-[#1f1f1f] dark:text-[#e3e3e3] outline-none"
              />
            </form>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="p-1.5 rounded hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[#5f6368] hover:text-[#1f1f1f] dark:hover:text-white transition-colors ml-1 shrink-0"
              title="Yangi fayl qo‘shish"
            >
              <FilePlus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* File Actions */}
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <button
            onClick={handleCopyCurrent}
            className="p-1.5 rounded-full hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[#5f6368] hover:text-[#1f1f1f] dark:hover:text-white transition-colors"
            title="Fayldan nusxa olish"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleSaveTrigger}
            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition-all whitespace-nowrap ${
              savedIndicator
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'bg-[#0b57d0] hover:bg-[#0842a0] text-white shadow-2xs'
            }`}
            title="O‘zgarishlarni tasdiqlash"
          >
            {savedIndicator ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Saqlandi</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Saqlash</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Main Canvas */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <Editor
          height="100%"
          language={getLanguage(activeFile)}
          value={files[activeFile] || ''}
          onChange={(val) => onFileChange(activeFile, val || '')}
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          loading={
            <div className="flex items-center justify-center h-full text-xs text-[#747775] font-mono">
              Kod muharriri yuklanmoqda...
            </div>
          }
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
            fontFamily: "'JetBrains Mono', 'Roboto Mono', monospace",
            renderLineHighlight: 'all',
          }}
        />
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-[#f8fafd] dark:bg-[#1e1f20] border-t border-[#dadce0] dark:border-[#333538] px-3 flex items-center justify-between text-[11px] text-[#747775] font-mono shrink-0 select-none">
        <div className="flex items-center gap-2.5 tabular-nums">
          <span>{activeFile}</span>
          <span>·</span>
          <span>{getLanguage(activeFile).toUpperCase()}</span>
          <span>·</span>
          <span>{(files[activeFile] || '').split('\n').length} qator</span>
        </div>
        <div className="flex items-center gap-2">
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  );
};
