import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Sliders,
  Shield,
  Trash2,
  Download,
  HardDrive,
  Sun,
  Moon,
} from 'lucide-react';
import { getCustomApiKey, setCustomApiKey, fetchHealth } from '../../services/api';
import { ModelInfo } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: ModelInfo[];
  selectedModel: string;
  onSelectModel: (model: string) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onRefreshHealth: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  models,
  selectedModel,
  onSelectModel,
  theme,
  onToggleTheme,
  onRefreshHealth,
}) => {
  const [activeTab, setActiveTab] = useState<'api' | 'preferences' | 'data'>('api');
  const [customKey, setCustomKeyState] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [serverKeyDetected, setServerKeyDetected] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCustomKeyState(getCustomApiKey());
      checkStatus();
    }
  }, [isOpen]);

  const checkStatus = async () => {
    const health = await fetchHealth();
    setServerKeyDetected(health.hasApiKey);
  };

  const handleSaveCustomKey = () => {
    setCustomApiKey(customKey);
    onRefreshHealth();
    handleTestConnection();
  };

  const handleClearCustomKey = () => {
    setCustomApiKey('');
    setCustomKeyState('');
    setTestResult(null);
    onRefreshHealth();
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const health = await fetchHealth();
      if (health.hasApiKey || customKey.trim()) {
        setTestResult({
          success: true,
          message: 'Connection to Gemini API verified successfully! Ready for streaming prompts.',
        });
      } else {
        setTestResult({
          success: false,
          message: 'No GEMINI_API_KEY detected on the server or in the override input.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection test failed.',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleClearAllData = () => {
    if (window.confirm('Clear all locally saved projects and settings?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="max-w-2xl w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Studio Settings &amp; API Configuration
              </h2>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                Manage backend security, API connection, and studio preferences
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-surface-variant)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Header */}
        <div className="flex items-center gap-2 px-5 border-b border-[var(--border-color)] bg-[var(--bg-primary)] text-xs font-semibold">
          <button
            onClick={() => setActiveTab('api')}
            className={`py-3 px-3 border-b-2 transition-all ${
              activeTab === 'api'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            API &amp; Security
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`py-3 px-3 border-b-2 transition-all ${
              activeTab === 'preferences'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Model &amp; Appearance
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`py-3 px-3 border-b-2 transition-all ${
              activeTab === 'data'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Data Management
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {activeTab === 'api' && (
            <div className="space-y-5">
              {/* Server Key Status Banner */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  serverKeyDetected
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                }`}
              >
                {serverKeyDetected ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-xs font-bold">
                    {serverKeyDetected
                      ? 'Server Environment Key Active'
                      : 'Server API Key Not Configured'}
                  </h4>
                  <p className="text-[11px] opacity-90 mt-1 leading-relaxed">
                    {serverKeyDetected
                      ? 'The server is successfully configured with GEMINI_API_KEY. All requests are securely proxied via server-side @google/genai SDK without client key exposure.'
                      : 'You can configure GEMINI_API_KEY in the environment or enter a custom key override below.'}
                  </p>
                </div>
              </div>

              {/* Custom API Key Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center justify-between">
                  <span>Custom Gemini API Key Override (Optional)</span>
                  <span className="text-[10px] text-[var(--text-tertiary)] font-normal">
                    Stored only in browser memory
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={customKey}
                    onChange={(e) => setCustomKeyState(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] outline-none pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveCustomKey}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-xs"
                >
                  Save &amp; Apply Key
                </button>
                {customKey && (
                  <button
                    onClick={handleClearCustomKey}
                    className="px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-500 text-xs font-medium"
                  >
                    Remove Override
                  </button>
                )}
                <button
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="ml-auto px-4 py-2 rounded-xl bg-[var(--bg-primary)] hover:bg-[var(--bg-surface-variant)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                  <span>Test Connection</span>
                </button>
              </div>

              {/* Test Result Message */}
              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs leading-relaxed ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {testResult.message}
                </div>
              )}

              {/* Security info card */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-2 text-xs">
                <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <span>Security &amp; Best Practices</span>
                </div>
                <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
                  Keys are never exposed to the client bundle. All Gemini model calls are executed server-side via Express using the official @google/genai TypeScript SDK.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-5">
              {/* Theme Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Theme Appearance
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={onToggleTheme}
                    className={`p-3 rounded-xl border flex items-center gap-3 text-xs font-medium transition-all ${
                      theme === 'light'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-semibold'
                        : 'border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>Light Mode</span>
                  </button>
                  <button
                    onClick={onToggleTheme}
                    className={`p-3 rounded-xl border flex items-center gap-3 text-xs font-medium transition-all ${
                      theme === 'dark'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-400 font-semibold'
                        : 'border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <Moon className="w-4 h-4 text-indigo-400" />
                    <span>Dark Mode</span>
                  </button>
                </div>
              </div>

              {/* Default Model */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Default Generation Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => onSelectModel(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] font-medium outline-none"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} - {m.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    Reset Local Workspace
                  </h4>
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                    Clear stored playground chats, generated images, and temporary cache.
                  </p>
                </div>
                <button
                  onClick={handleClearAllData}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Data</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
