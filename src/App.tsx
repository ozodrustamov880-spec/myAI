import React, { useState, useEffect } from 'react';
import { AppProject, ModelInfo, StudioMode, UserProfile } from './types';
import {
  fetchHealth,
  fetchModels,
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
} from './services/api';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { PlaygroundView } from './components/Playground/PlaygroundView';
import { BuildModeView } from './components/BuildMode/BuildModeView';
import { ImageStudioView } from './components/ImageStudio/ImageStudioView';
import { ProjectsGalleryView } from './components/Projects/ProjectsGalleryView';
import { GetCodeModal } from './components/Modals/GetCodeModal';
import { SettingsModal } from './components/Modals/SettingsModal';
import { AuthModal } from './components/Modals/AuthModal';

export default function App() {
  const [currentMode, setCurrentMode] = useState<StudioMode>('playground');
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-4-hydrogen');
  const [apiConnected, setApiConnected] = useState<boolean>(false);

  // Projects state
  const [projects, setProjects] = useState<AppProject[]>([]);
  const [currentProject, setCurrentProject] = useState<AppProject | null>(null);

  // User state
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem('ais_user_session');
      return stored
        ? JSON.parse(stored)
        : {
            id: 'usr-default',
            name: 'AI Studio Engineer',
            email: 'developer@google.dev',
            avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=studio-dev',
            tier: 'Developer Pro',
            apiKeyCount: 2,
          };
    } catch {
      return null;
    }
  });

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Modals state
  const [isGetCodeOpen, setIsGetCodeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Theme synchronization
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Load backend status, models, and projects
  const refreshData = async () => {
    try {
      const health = await fetchHealth();
      setApiConnected(health.hasApiKey);

      const modelsList = await fetchModels();
      if (modelsList.length > 0) {
        setModels(modelsList);
        if (!modelsList.some((m) => m.id === selectedModel)) {
          setSelectedModel(modelsList[0].id);
        }
      }

      const projectsList = await fetchProjects();
      setProjects(projectsList);
      if (projectsList.length > 0 && !currentProject) {
        setCurrentProject(projectsList[0]);
      }
    } catch (e) {
      console.error('Initialization error:', e);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleSelectProject = (proj: AppProject) => {
    setCurrentProject(proj);
    if (proj.type === 'app') {
      setCurrentMode('build');
    } else if (proj.type === 'image') {
      setCurrentMode('image');
    } else {
      setCurrentMode('playground');
    }
  };

  const handleNewChat = () => {
    setCurrentProject(null);
    setCurrentMode('playground');
  };

  const handleNewApp = async () => {
    try {
      const created = await createProject({
        name: 'Yangi ilova loyihasi',
        description: 'Build Mode yordamida yaratilgan interaktiv veb-ilova',
        type: 'app',
        model: selectedModel,
        files: {
          'index.html': `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Yangi ilova</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="style.css" />
</head>
<body class="bg-[#f8fafd] text-[#1f1f1f] min-h-screen flex items-center justify-center p-6">
  <div class="max-w-lg w-full bg-white border border-[#dadce0] rounded-2xl p-6 text-center space-y-3">
    <h1 class="text-xl font-bold">Yangi loyiha tayyor</h1>
    <p class="text-sm text-[#5f6368]">Chap panelda nima yaratmoqchi ekanligingizni yozing va jonli natijani ko‘ring.</p>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
          'style.css': 'body { font-family: system-ui, -apple-system, sans-serif; }',
          'app.js': '// Interaktiv mantiq shu yerda yoziladi',
        },
      });
      setProjects((prev) => [created, ...prev]);
      setCurrentProject(created);
      setCurrentMode('build');
    } catch (e) {
      setCurrentProject(null);
      setCurrentMode('build');
    }
  };

  const handleNewImage = () => {
    setCurrentMode('image');
  };

  const handleSaveProject = (saved: AppProject) => {
    setCurrentProject(saved);
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === saved.id);
      if (exists) {
        return prev.map((p) => (p.id === saved.id ? saved : p));
      }
      return [saved, ...prev];
    });
  };

  const handleDeleteProject = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (currentProject?.id === id) {
        setCurrentProject(null);
      }
    } catch (err) {
      console.error('Delete project failed:', err);
    }
  };

  const handleDuplicateProject = async (proj: AppProject, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const duplicated = await createProject({
        name: `${proj.name} (nusxa)`,
        description: proj.description,
        type: proj.type,
        model: proj.model,
        files: { ...(proj.files || {}) },
      });
      setProjects((prev) => [duplicated, ...prev]);
    } catch (err) {
      console.error('Duplicate project failed:', err);
    }
  };

  const handleUpdateProjectName = async (id: string, newName: string) => {
    try {
      const updated = await updateProject(id, { name: newName });
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
      if (currentProject?.id === id) {
        setCurrentProject(updated);
      }
    } catch (err) {
      console.error('Rename project failed:', err);
    }
  };

  const handleOpenCodeInBuild = async (code: string, language: string, title?: string) => {
    const isFullHtml = code.trim().toLowerCase().startsWith('<!doctype') || code.includes('<html');
    const files: Record<string, string> = isFullHtml
      ? {
          'index.html': code,
          'style.css': '/* Chatdan ko‘chirilgan uslublar */',
          'app.js': '// Chatdan ko‘chirilgan skript',
        }
      : language === 'css'
      ? {
          'index.html': `<!DOCTYPE html><html lang="uz"><head><meta charset="UTF-8"><link rel="stylesheet" href="style.css"></head><body><div class="preview-box">CSS Preview</div></body></html>`,
          'style.css': code,
          'app.js': '',
        }
      : language === 'javascript' || language === 'js'
      ? {
          'index.html': `<!DOCTYPE html><html lang="uz"><head><meta charset="UTF-8"><script src="https://cdn.tailwindcss.com"></script></head><body class="p-6"><div id="app"></div><script src="app.js"></script></body></html>`,
          'style.css': '',
          'app.js': code,
        }
      : {
          'index.html': `<!DOCTYPE html><html lang="uz"><head><meta charset="UTF-8"><script src="https://cdn.tailwindcss.com"></script></head><body class="p-6 bg-[#f8fafd]">${code}</body></html>`,
          'style.css': '',
          'app.js': '',
        };

    try {
      const created = await createProject({
        name: title || 'Chat kodi ilovasi',
        description: 'Playground chatidan Build Mode’ga yuborilgan kod',
        type: 'app',
        model: selectedModel,
        files,
      });
      setProjects((prev) => [created, ...prev]);
      setCurrentProject(created);
      setCurrentMode('build');
    } catch {
      setCurrentMode('build');
    }
  };

  const handleLoginSuccess = (newUser: UserProfile) => {
    setUser(newUser);
    try {
      localStorage.setItem('ais_user_session', JSON.stringify(newUser));
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem('ais_user_session');
    } catch {
      // ignore
    }
  };

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header
        currentMode={currentMode}
        onSelectMode={setCurrentMode}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        models={models}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenGetCode={() => setIsGetCodeOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        user={user}
        onLogout={handleLogout}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        apiConnected={apiConnected}
      />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <Sidebar
          currentMode={currentMode}
          onSelectMode={setCurrentMode}
          recentProjects={projects}
          currentProjectId={currentProject?.id || null}
          onSelectProject={handleSelectProject}
          onNewChat={handleNewChat}
          onNewApp={handleNewApp}
          onNewImage={handleNewImage}
          onDeleteProject={handleDeleteProject}
          onDuplicateProject={handleDuplicateProject}
          isOpen={sidebarOpen}
          onCloseMobile={() => setSidebarOpen(false)}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />

        <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          {currentMode === 'playground' && (
            <PlaygroundView
              models={models}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              onOpenGetCode={() => setIsGetCodeOpen(true)}
              onSelectMode={setCurrentMode}
              onOpenCodeInBuild={handleOpenCodeInBuild}
              apiConnected={apiConnected}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          )}

          {currentMode === 'build' && (
            <BuildModeView
              currentProject={currentProject}
              onSaveProject={handleSaveProject}
              models={models}
              selectedModel={selectedModel}
              theme={theme}
            />
          )}

          {currentMode === 'image' && (
            <ImageStudioView models={models} selectedModel={selectedModel} />
          )}

          {currentMode === 'projects' && (
            <ProjectsGalleryView
              projects={projects}
              onOpenProject={handleSelectProject}
              onNewApp={handleNewApp}
              onNewChat={handleNewChat}
              onDuplicateProject={handleDuplicateProject}
              onDeleteProject={handleDeleteProject}
              onUpdateProjectName={handleUpdateProjectName}
            />
          )}
        </main>
      </div>

      <GetCodeModal
        isOpen={isGetCodeOpen}
        onClose={() => setIsGetCodeOpen(false)}
        model={selectedModel}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        models={models}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onRefreshHealth={refreshData}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
