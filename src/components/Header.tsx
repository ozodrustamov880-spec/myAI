import React, { useState } from 'react';
import {
  Code,
  Sparkles,
  Layers,
  Image as ImageIcon,
  FolderKanban,
  Sun,
  Moon,
  Key,
  ChevronDown,
  Menu,
  Check,
  User,
  LogOut,
  Settings,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { ModelInfo, StudioMode, UserProfile } from '../types';

interface HeaderProps {
  currentMode: StudioMode;
  onSelectMode: (mode: StudioMode) => void;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  models: ModelInfo[];
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenGetCode: () => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  user: UserProfile | null;
  onLogout: () => void;
  onToggleSidebar: () => void;
  apiConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onSelectMode,
  selectedModel,
  onSelectModel,
  models,
  theme,
  onToggleTheme,
  onOpenGetCode,
  onOpenSettings,
  onOpenAuth,
  user,
  onLogout,
  onToggleSidebar,
  apiConnected,
}) => {
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const activeModelObj = models.find((m) => m.id === selectedModel) || {
    id: selectedModel,
    name: selectedModel,
    contextWindow: '1M tokens',
    tag: 'Active',
  };

  return (
    <header className="h-14 shrink-0 border-b border-[var(--border-color)] bg-[var(--bg-primary)] px-3 sm:px-4 flex items-center justify-between sticky top-0 z-40 select-none">
      {/* Left: Mobile hamburger & Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-surface-variant)] text-[var(--text-secondary)] transition-colors md:hidden"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div
          onClick={() => onSelectMode('playground')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          {/* Authentic Google AI 4-color Sparkle Gem */}
          <div className="w-8 h-8 rounded-lg bg-white border border-[#dadce0] shadow-xs flex items-center justify-center group-hover:shadow-md transition-all">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"
                fill="url(#google-gemini-gradient)"
              />
              <defs>
                <linearGradient id="google-gemini-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#4285F4" />
                  <stop offset="0.33" stopColor="#9B51E0" />
                  <stop offset="0.66" stopColor="#EA4335" />
                  <stop offset="1" stopColor="#FBBC05" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-base tracking-tight text-[#444746] dark:text-[#c4c7c5]">
              Google
            </span>
            <span className="font-semibold text-base tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3]">
              AI Studio
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#e8f0fe] text-[#0b57d0] dark:bg-blue-500/10 dark:text-blue-400 font-mono">
              4.0
            </span>
          </div>
        </div>

        {/* Navigation Tabs (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1 ml-6 border-l border-[var(--border-color)] pl-4">
          <button
            onClick={() => onSelectMode('playground')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
              currentMode === 'playground'
                ? 'bg-[#e8f0fe] text-[#0b57d0] dark:bg-blue-500/15 dark:text-blue-400 font-semibold'
                : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#0b57d0] dark:text-blue-400" />
            Playground
          </button>
          <button
            onClick={() => onSelectMode('build')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
              currentMode === 'build'
                ? 'bg-[#e8f0fe] text-[#0b57d0] dark:bg-blue-500/15 dark:text-blue-400 font-semibold'
                : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Build Mode
          </button>
          <button
            onClick={() => onSelectMode('image')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
              currentMode === 'image'
                ? 'bg-[#e8f0fe] text-[#0b57d0] dark:bg-blue-500/15 dark:text-blue-400 font-semibold'
                : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c]'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            Image Studio
          </button>
          <button
            onClick={() => onSelectMode('projects')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
              currentMode === 'projects'
                ? 'bg-[#e8f0fe] text-[#0b57d0] dark:bg-blue-500/15 dark:text-blue-400 font-semibold'
                : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c]'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Projects
          </button>
        </nav>
      </div>

      {/* Center: Model Selector Dropdown */}
      <div className="relative shrink-0">
        <button
          onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
          className="h-8 max-h-8 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 rounded-full border border-[#dadce0] dark:border-[#333538] bg-[#f0f4f9] dark:bg-[#1e1f20] hover:bg-[#e8eaed] dark:hover:bg-[#282a2c] text-[11px] sm:text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] whitespace-nowrap transition-all shadow-2xs max-w-[125px] sm:max-w-none shrink-0"
        >
          <div className="w-2 h-2 rounded-full bg-[#188038] dark:bg-[#81c995] shrink-0" />
          <span className="font-semibold truncate max-w-[70px] sm:max-w-none">{activeModelObj.name}</span>
          <span className="hidden sm:inline text-[#747775] text-[11px]">
            {activeModelObj.contextWindow}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-[#747775] ml-0.5 shrink-0" />
        </button>

        {modelDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setModelDropdownOpen(false)}
            />
            <div className="absolute right-0 sm:left-1/2 sm:-translate-x-1/2 mt-2 w-72 sm:w-96 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] shadow-2xl p-2 z-40 max-h-[80vh] overflow-y-auto">
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-color)]">
                Available Gemini Models
              </div>
              <div className="py-1 space-y-1">
                {models.map((model) => {
                  const isSelected = model.id === selectedModel;
                  return (
                    <div
                      key={model.id}
                      onClick={() => {
                        onSelectModel(model.id);
                        setModelDropdownOpen(false);
                      }}
                      className={`p-2.5 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-500/10 border border-blue-500/30'
                          : 'hover:bg-[var(--bg-surface-variant)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                          {model.name}
                          {model.tag && (
                            <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                              {model.tag}
                            </span>
                          )}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-blue-500" />}
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-1 line-clamp-2">
                        {model.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--text-tertiary)]">
                        <span>Context: {model.contextWindow}</span>
                        <span>•</span>
                        <span>Output: {model.maxOutput}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right Tools: Get Code, API Status, Theme, Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Get Code button */}
        <button
          onClick={onOpenGetCode}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-variant)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)] transition-all active:scale-95 shadow-xs"
          title="Export code in cURL, Python, TypeScript"
        >
          <Code className="w-3.5 h-3.5 text-blue-500" />
          <span>Get Code</span>
        </button>

        {/* API Connection Indicator */}
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-[var(--bg-surface-variant)] text-xs font-medium text-[var(--text-secondary)] transition-colors"
          title={apiConnected ? 'API Key Active' : 'Configure API Key'}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              apiConnected ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-amber-500'
            }`}
          />
          <Key className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <span className="hidden xl:inline text-[11px]">
            {apiConnected ? 'Connected' : 'Setup Key'}
          </span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-lg hover:bg-[var(--bg-surface-variant)] text-[var(--text-secondary)] transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
        </button>

        {/* User Profile / Auth */}
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-blue-500/40 transition-all"
          >
            {user ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-7 h-7 rounded-full object-cover ring-1 ring-[var(--border-color)]"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
                U
              </div>
            )}
          </button>

          {userDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setUserDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] shadow-2xl p-2 z-40 text-xs">
                {user ? (
                  <div className="p-3 border-b border-[var(--border-color)] mb-1">
                    <div className="font-semibold text-[var(--text-primary)]">{user.name}</div>
                    <div className="text-[11px] text-[var(--text-tertiary)] truncate">{user.email}</div>
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-medium">
                      <ShieldCheck className="w-3 h-3" />
                      {user.tier}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 border-b border-[var(--border-color)] mb-1">
                    <div className="font-semibold text-[var(--text-primary)]">Guest Session</div>
                    <div className="text-[11px] text-[var(--text-tertiary)]">Sign in to sync your prompts and projects</div>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onOpenAuth();
                      }}
                      className="mt-2 w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs text-center"
                    >
                      Sign In / Register
                    </button>
                  </div>
                )}

                <div className="py-1 space-y-0.5">
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onOpenSettings();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--bg-surface-variant)] text-[var(--text-secondary)] text-left"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Settings &amp; API Keys</span>
                  </button>
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onOpenGetCode();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--bg-surface-variant)] text-[var(--text-secondary)] text-left"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>SDK &amp; API Export</span>
                  </button>
                  <a
                    href="https://ai.google.dev/gemini-api/docs"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[var(--bg-surface-variant)] text-[var(--text-secondary)] text-left"
                  >
                    <span className="flex items-center gap-2">
                      <HelpCircle className="w-3.5 h-3.5" />
                      Gemini Documentation
                    </span>
                    <ExternalLink className="w-3 h-3 text-[var(--text-tertiary)]" />
                  </a>
                </div>

                {user && (
                  <div className="pt-1 mt-1 border-t border-[var(--border-color)]">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-rose-500/10 text-rose-500 text-left font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
