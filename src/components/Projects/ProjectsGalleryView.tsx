import React, { useState } from 'react';
import JSZip from 'jszip';
import {
  FolderKanban,
  Search,
  Plus,
  Trash2,
  Copy,
  FolderDown,
  ExternalLink,
  Code2,
  MessageSquare,
  Image as ImageIcon,
  Edit2,
  Check,
  Calendar,
  Layers,
} from 'lucide-react';
import { AppProject } from '../../types';

interface ProjectsGalleryViewProps {
  projects: AppProject[];
  onOpenProject: (project: AppProject) => void;
  onNewApp: () => void;
  onNewChat: () => void;
  onDuplicateProject: (project: AppProject) => void;
  onDeleteProject: (id: string) => void;
  onUpdateProjectName: (id: string, newName: string) => void;
}

export const ProjectsGalleryView: React.FC<ProjectsGalleryViewProps> = ({
  projects,
  onOpenProject,
  onNewApp,
  onNewChat,
  onDuplicateProject,
  onDeleteProject,
  onUpdateProjectName,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'app' | 'chat' | 'image'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const filtered = projects.filter((p) => {
    const matchesType = filterType === 'all' || p.type === filterType;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleStartRename = (p: AppProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(p.id);
    setEditingName(p.name);
  };

  const handleSaveRename = (id: string, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    if (editingName.trim()) {
      onUpdateProjectName(id, editingName.trim());
    }
    setEditingId(null);
  };

  const handleDownloadZip = async (project: AppProject, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const zip = new JSZip();
      Object.entries(project.files || {}).forEach(([name, content]) => {
        zip.file(name, content);
      });
      zip.file(
        'README.md',
        `# ${project.name}\n\n${project.description}\n\nExported from Google AI Studio Platform.`
      );
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'project'}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Could not export ZIP.');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto p-4 sm:p-8 bg-[var(--bg-primary)]">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Header & New Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[var(--border-color)] gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2.5">
              <FolderKanban className="w-6 h-6 text-amber-500" />
              Project Management &amp; Workspaces
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-tertiary)] mt-1">
              Organize, reopen, edit, export, and manage your AI projects and prompts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNewChat}
              className="px-4 py-2 rounded-full bg-white dark:bg-[#1e1f20] hover:bg-[#f8fafd] border border-[#dadce0] dark:border-[#333538] text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#0b57d0]" />
              <span>New Chat</span>
            </button>
            <button
              onClick={onNewApp}
              className="px-4 py-2 rounded-full bg-[#0b57d0] hover:bg-[#0842a0] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create App</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-[#f0f4f9] dark:bg-[#1e1f20] p-1 rounded-full border border-[#dadce0] dark:border-[#333538]">
            {(['all', 'app', 'chat', 'image'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
                  filterType === type
                    ? 'bg-white dark:bg-[#282a2c] text-[#0b57d0] dark:text-blue-400 font-semibold shadow-xs'
                    : 'text-[#444746] dark:text-[#c4c7c5] hover:text-[#1f1f1f]'
                }`}
              >
                {type === 'all' ? 'All Work' : `${type}s`}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#747775]" />
            <input
              type="text"
              placeholder="Search projects by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-[#1e1f20] border border-[#dadce0] dark:border-[#333538] focus:border-[#0b57d0] rounded-full pl-9 pr-3.5 py-2 text-xs text-[#1f1f1f] dark:text-[#e3e3e3] outline-none shadow-2xs"
            />
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.length === 0 ? (
            <div className="col-span-full text-center py-16 border-2 border-dashed border-[var(--border-color)] rounded-2xl">
              <FolderKanban className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">No projects found</h3>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                Create a new project or adjust your search filter.
              </p>
            </div>
          ) : (
            filtered.map((proj) => (
              <div
                key={proj.id}
                onClick={() => onOpenProject(proj)}
                className="group p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-blue-500/50 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          proj.type === 'app'
                            ? 'bg-indigo-500/10 text-indigo-500'
                            : proj.type === 'image'
                            ? 'bg-purple-500/10 text-purple-500'
                            : 'bg-blue-500/10 text-blue-500'
                        }`}
                      >
                        {proj.type === 'app' ? (
                          <Layers className="w-4 h-4" />
                        ) : proj.type === 'image' ? (
                          <ImageIcon className="w-4 h-4" />
                        ) : (
                          <MessageSquare className="w-4 h-4" />
                        )}
                      </div>
                      <span className="text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded bg-[var(--bg-surface-variant)] text-[var(--text-secondary)]">
                        {proj.type}
                      </span>
                    </div>

                    <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                      {proj.model || 'gemini-3.8-flash'}
                    </span>
                  </div>

                  {/* Name or inline rename */}
                  {editingId === proj.id ? (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 mb-2"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full px-2 py-1 text-xs font-semibold rounded bg-[var(--bg-primary)] border border-blue-500 text-[var(--text-primary)] outline-none"
                      />
                      <button
                        onClick={(e) => handleSaveRename(proj.id, e)}
                        className="p-1 rounded bg-blue-600 text-white"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between group/title mb-1.5">
                      <h3 className="font-semibold text-sm text-[var(--text-primary)] group-hover:text-blue-500 transition-colors truncate">
                        {proj.name}
                      </h3>
                      <button
                        onClick={(e) => handleStartRename(proj, e)}
                        className="opacity-0 group-hover/title:opacity-100 p-1 hover:text-blue-500 transition-opacity"
                        title="Rename"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                    {proj.description || 'Full-featured AI Studio project workspace.'}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-[var(--border-color)] flex items-center justify-between text-[11px] text-[var(--text-tertiary)]">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(proj.updatedAt).toLocaleDateString()}</span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1">
                    {proj.type === 'app' && (
                      <button
                        onClick={(e) => handleDownloadZip(proj, e)}
                        className="p-1.5 rounded hover:bg-[var(--bg-surface-variant)] hover:text-blue-500 transition-colors"
                        title="Export as ZIP"
                      >
                        <FolderDown className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateProject(proj);
                      }}
                      className="p-1.5 rounded hover:bg-[var(--bg-surface-variant)] hover:text-blue-500 transition-colors"
                      title="Duplicate project"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete "${proj.name}"?`)) {
                          onDeleteProject(proj.id);
                        }
                      }}
                      className="p-1.5 rounded hover:bg-[var(--bg-surface-variant)] hover:text-rose-500 transition-colors"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
