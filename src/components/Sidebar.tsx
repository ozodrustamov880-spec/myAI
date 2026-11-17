import React, { useState } from 'react';
import {
  Plus,
  Sparkles,
  Layers,
  Image as ImageIcon,
  FolderKanban,
  Search,
  MessageSquare,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Settings,
  X,
  Code2,
} from 'lucide-react';
import { AppProject, StudioMode } from '../types';

interface SidebarProps {
  currentMode: StudioMode;
  onSelectMode: (mode: StudioMode) => void;
  recentProjects: AppProject[];
  currentProjectId: string | null;
  onSelectProject: (project: AppProject) => void;
  onNewChat: () => void;
  onNewApp: () => void;
  onNewImage: () => void;
  onDeleteProject: (id: string, e: React.MouseEvent) => void;
  onDuplicateProject: (project: AppProject, e: React.MouseEvent) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentMode,
  onSelectMode,
  recentProjects,
  currentProjectId,
  onSelectProject,
  onNewChat,
  onNewApp,
  onNewImage,
  onDeleteProject,
  onDuplicateProject,
  isOpen,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [newMenuOpen, setNewMenuOpen] = useState(false);

  const filteredProjects = recentProjects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 bg-[var(--bg-surface)] border-r border-[var(--border-color)] flex flex-col transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-16' : 'w-64 md:w-64'}`}
      >
        {/* Top: New Prompt / App Button */}
        <div className="p-3 border-b border-[var(--border-color)]">
          <div className="relative">
            <button
              onClick={() => setNewMenuOpen(!newMenuOpen)}
              className={`w-full py-2.5 px-3.5 rounded-2xl bg-white dark:bg-[#1e1f20] hover:bg-[#f8fafd] dark:hover:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3] border border-[#dadce0] dark:border-[#333538] font-medium text-xs flex items-center justify-center gap-2.5 transition-all shadow-xs hover:shadow-md active:scale-98 whitespace-nowrap ${
                isCollapsed ? 'px-0' : ''
              }`}
              title="Yangi suhbat yoki loyiha yaratish"
            >
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-base font-bold bg-transparent shrink-0">
                <span className="bg-gradient-to-tr from-[#4285F4] via-[#EA4335] to-[#FBBC05] bg-clip-text text-transparent text-lg leading-none">+</span>
              </div>
              {!isCollapsed && <span className="font-semibold tracking-tight">Yangi yaratish</span>}
            </button>

            {/* Dropdown Options for New */}
            {newMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setNewMenuOpen(false)}
                />
                <div className="absolute left-0 top-full mt-2 w-60 rounded-2xl border border-[#dadce0] dark:border-[#333538] bg-white dark:bg-[#1e1f20] shadow-xl p-2 z-40 text-xs">
                  <button
                    onClick={() => {
                      setNewMenuOpen(false);
                      onNewChat();
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3] text-left transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#e8f0fe] dark:bg-blue-500/10 text-[#0b57d0] dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold">Yangi Chat</div>
                      <div className="text-[10px] text-[#747775] dark:text-[#8e918f]">
                        Gemini 4 suhbat va Qidiruv
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setNewMenuOpen(false);
                      onNewApp();
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3] text-left transition-colors mt-1"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold">Build Mode ilovasi</div>
                      <div className="text-[10px] text-[#747775] dark:text-[#8e918f]">
                        Matndan jonli veb-ilova qurish
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setNewMenuOpen(false);
                      onNewImage();
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3] text-left transition-colors mt-1"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold">Image Studio</div>
                      <div className="text-[10px] text-[#747775] dark:text-[#8e918f]">
                        AI rasm generatsiyasi
                      </div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="p-2.5 space-y-1">
          {!isCollapsed && (
            <div className="px-2.5 pt-1 pb-1 text-[11px] font-semibold text-[var(--text-tertiary)]">
              Studio bo‘limlari
            </div>
          )}
          <button
            onClick={() => {
              onSelectMode('playground');
              onCloseMobile();
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
              currentMode === 'playground'
                ? 'bg-[#e8f0fe] text-[#0b57d0] dark:bg-blue-500/15 dark:text-blue-400 font-semibold'
                : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c]'
            }`}
            title="Chat (Playground)"
          >
            <Sparkles className="w-4 h-4 shrink-0 text-[#0b57d0] dark:text-blue-400" />
            {!isCollapsed && <span>Chat (Playground)</span>}
          </button>

          <button
            onClick={() => {
              onSelectMode('build');
              onCloseMobile();
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
              currentMode === 'build'
                ? 'bg-[#e8f0fe] text-[#0b57d0] dark:bg-blue-500/15 dark:text-blue-400 font-semibold'
                : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c]'
            }`}
            title="Build Mode (Preview)"
          >
            <Layers className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
            {!isCollapsed && <span>Build Mode (Preview)</span>}
          </button>

          <button
            onClick={() => {
              onSelectMode('image');
              onCloseMobile();
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
              currentMode === 'image'
                ? 'bg-[#e8f0fe] text-[#0b57d0] dark:bg-blue-500/15 dark:text-blue-400 font-semibold'
                : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c]'
            }`}
            title="Image Studio"
          >
            <ImageIcon className="w-4 h-4 shrink-0 text-purple-600 dark:text-purple-400" />
            {!isCollapsed && <span>Image Studio</span>}
          </button>

          <button
            onClick={() => {
              onSelectMode('projects');
              onCloseMobile();
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
              currentMode === 'projects'
                ? 'bg-[#e8f0fe] text-[#0b57d0] dark:bg-blue-500/15 dark:text-blue-400 font-semibold'
                : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c]'
            }`}
            title="Loyihalar (Artifacts)"
          >
            <FolderKanban className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            {!isCollapsed && <span>Loyihalar (Artifacts)</span>}
          </button>
        </div>

        {/* Recent Items Section (Expanded Only) */}
        {!isCollapsed && (
          <div className="flex-1 flex flex-col min-h-0 border-t border-[var(--border-color)] mt-1">
            <div className="p-3 pb-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-tertiary)] mb-2">
                <span>So‘nggi loyihalar</span>
                <span className="text-[10px] font-normal tabular-nums">{recentProjects.length} ta</span>
              </div>

              {/* Search recent */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  placeholder="Qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[var(--bg-surface-variant)] border border-transparent focus:border-blue-500 rounded-lg pl-8 pr-2 py-1.5 text-xs text-[var(--text-primary)] outline-none transition-colors"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
              {filteredProjects.length === 0 ? (
                <div className="text-center py-8 text-xs text-[var(--text-tertiary)]">
                  Hozircha loyihalar yo‘q
                </div>
              ) : (
                filteredProjects.map((proj) => {
                  const isCurrent = proj.id === currentProjectId;
                  return (
                    <div
                      key={proj.id}
                      onClick={() => {
                        onSelectProject(proj);
                        onCloseMobile();
                      }}
                      className={`group relative flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs transition-all ${
                        isCurrent
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-variant)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        {proj.type === 'app' ? (
                          <Code2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        ) : proj.type === 'image' ? (
                          <ImageIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        ) : (
                          <MessageSquare className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        )}
                        <span className="truncate">{proj.name}</span>
                      </div>

                      {/* Hover Actions */}
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <button
                          onClick={(e) => onDuplicateProject(proj, e)}
                          className="p-1 hover:text-blue-500 rounded"
                          title="Nusxalash"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => onDeleteProject(proj.id, e)}
                          className="p-1 hover:text-rose-500 rounded"
                          title="O‘chirish"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Footer: Collapse button */}
        <div className="p-2 border-t border-[var(--border-color)] hidden md:flex items-center justify-between">
          {!isCollapsed && (
            <div className="text-[11px] text-[var(--text-tertiary)] px-2">
              Google AI Studio
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-surface-variant)] text-[var(--text-tertiary)] transition-colors ml-auto"
            title={isCollapsed ? 'Yon panelni ochish' : 'Yon panelni yig‘ish'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>
    </>
  );
};
