import React, { useEffect, useRef, useState } from 'react';
import {
  RotateCcw,
  Download,
  Monitor,
  Tablet,
  Smartphone,
  Maximize2,
  Terminal,
  AlertCircle,
  Minimize2,
  Wand2,
} from 'lucide-react';
import { DeviceMode } from '../../types';

interface LivePreviewProps {
  files: Record<string, string>;
  projectName: string;
  onFixRuntimeError?: (errorText: string) => void;
}

export const LivePreview: React.FC<LivePreviewProps> = ({
  files,
  projectName,
  onFixRuntimeError,
}) => {
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [logs, setLogs] = useState<Array<{ type: 'log' | 'error' | 'warn'; text: string; time: string }>>([]);
  const [showConsole, setShowConsole] = useState(false);
  const [key, setKey] = useState(0);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Reset runtime logs whenever files change
  useEffect(() => {
    setLogs([]);
  }, [files]);

  // Generate self-contained bundle for the iframe
  const generateBundle = () => {
    let html =
      files['index.html'] ||
      '<!DOCTYPE html><html lang="uz"><body><div style="font-family:sans-serif;padding:24px;">Preview tayyor</div></body></html>';
    const css = files['style.css'] || '';
    const js = files['script.js'] || '';

    const consoleTrap = `
      <script>
        (function() {
          const send = (type, args) => {
            try {
              const text = Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
              window.parent.postMessage({ source: 'ais-preview-console', type, text }, '*');
            } catch(e) {}
          };
          const origLog = console.log;
          const origErr = console.error;
          const origWarn = console.warn;
          console.log = function() { origLog.apply(console, arguments); send('log', arguments); };
          console.error = function() { origErr.apply(console, arguments); send('error', arguments); };
          console.warn = function() { origWarn.apply(console, arguments); send('warn', arguments); };
          window.onerror = function(msg, url, line) {
            send('error', ['Xato: ' + msg + ' (qator ' + line + ')']);
          };
        })();
      </script>
    `;

    if (css.trim()) {
      if (html.includes('</head>')) {
        html = html.replace('</head>', `<style>\n${css}\n</style></head>`);
      } else {
        html = `<style>\n${css}\n</style>\n` + html;
      }
    }

    const scriptTag = js.trim() ? `<script>\n${js}\n</script>` : '';
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${consoleTrap}\n${scriptTag}\n</body>`);
    } else {
      html += `\n${consoleTrap}\n${scriptTag}`;
    }

    return html;
  };

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.source === 'ais-preview-console') {
        const time = new Date().toLocaleTimeString();
        setLogs((prev) => [...prev.slice(-49), { type: e.data.type, text: e.data.text, time }]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleRefresh = () => {
    setLogs([]);
    setKey((prev) => prev + 1);
  };

  const handleDownloadHtml = () => {
    const bundle = generateBundle();
    const blob = new Blob([bundle], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(projectName || 'app').toLowerCase().replace(/[^a-z0-9]/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleFullscreen = () => {
    if (!previewContainerRef.current) return;
    if (!document.fullscreenElement) {
      previewContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const errorLogs = logs.filter((l) => l.type === 'error');

  const getDeviceWidthClass = () => {
    switch (device) {
      case 'mobile':
        return 'w-[375px] max-w-full h-[667px] max-h-full shadow-lg rounded-3xl border-[6px] border-[#3c4043] my-auto';
      case 'tablet':
        return 'w-[768px] max-w-full h-[95%] shadow-lg rounded-2xl border-4 border-[#3c4043] my-auto';
      default:
        return 'w-full h-full';
    }
  };

  return (
    <div
      ref={previewContainerRef}
      className={`flex flex-col h-full min-h-0 bg-white dark:bg-[#0e0f11] text-[#1f1f1f] dark:text-slate-100 overflow-hidden relative ${
        isFullscreen ? 'p-4' : ''
      }`}
    >
      {/* Clean Google AI Studio Preview Control Bar */}
      <div className="h-11 px-3 sm:px-4 bg-white dark:bg-[#1e1f20] border-b border-[#dadce0] dark:border-[#333538] flex items-center justify-between gap-2 shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] truncate max-w-[140px] sm:max-w-[200px]">
            {projectName || 'Jonli Preview'}
          </span>
          <span className="hidden sm:inline text-[11px] text-[#747775]">· Preview</span>
        </div>

        {/* Device Switcher */}
        <div className="flex items-center gap-0.5 bg-[#f0f4f9] dark:bg-[#282a2c] p-0.5 rounded-full border border-[#dadce0] dark:border-[#333538] shrink-0">
          <button
            onClick={() => setDevice('desktop')}
            className={`p-1.5 rounded-full text-xs transition-colors ${
              device === 'desktop'
                ? 'bg-white dark:bg-[#1e1f20] text-[#0b57d0] dark:text-[#a8c7fa] shadow-2xs'
                : 'text-[#5f6368] hover:text-[#1f1f1f] dark:hover:text-white'
            }`}
            title="Kompyuter ko‘rinishi"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDevice('tablet')}
            className={`p-1.5 rounded-full text-xs transition-colors ${
              device === 'tablet'
                ? 'bg-white dark:bg-[#1e1f20] text-[#0b57d0] dark:text-[#a8c7fa] shadow-2xs'
                : 'text-[#5f6368] hover:text-[#1f1f1f] dark:hover:text-white'
            }`}
            title="Planshet ko‘rinishi"
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDevice('mobile')}
            className={`p-1.5 rounded-full text-xs transition-colors ${
              device === 'mobile'
                ? 'bg-white dark:bg-[#1e1f20] text-[#0b57d0] dark:text-[#a8c7fa] shadow-2xs'
                : 'text-[#5f6368] hover:text-[#1f1f1f] dark:hover:text-white'
            }`}
            title="Telefon ko‘rinishi"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action Tools */}
        <div className="flex items-center gap-1 shrink-0">
          {errorLogs.length > 0 && onFixRuntimeError && (
            <button
              onClick={() => onFixRuntimeError(errorLogs.map((e) => e.text).join('\n'))}
              className="px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] font-medium flex items-center gap-1 whitespace-nowrap hover:bg-rose-100 transition-colors"
              title="Aniqlangan xatoni AI yordamida tuzatish"
            >
              <Wand2 className="w-3 h-3" />
              <span className="hidden md:inline">Xatoni tuzatish</span>
            </button>
          )}

          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-full hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[#5f6368] hover:text-[#1f1f1f] dark:hover:text-white transition-colors"
            title="Qayta yuklash"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowConsole(!showConsole)}
            className={`p-1.5 rounded-full transition-colors flex items-center gap-1 text-xs ${
              errorLogs.length > 0
                ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-semibold'
                : showConsole
                ? 'bg-[#e8f0fe] dark:bg-[#1b2d4b] text-[#0b57d0] dark:text-[#a8c7fa] font-semibold'
                : 'hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[#5f6368] hover:text-[#1f1f1f] dark:hover:text-white'
            }`}
            title="Konsol xabarlari"
          >
            <Terminal className="w-3.5 h-3.5" />
            {logs.length > 0 && (
              <span className="text-[10px] font-mono tabular-nums px-1">{logs.length}</span>
            )}
          </button>

          <button
            onClick={handleDownloadHtml}
            className="p-1.5 rounded-full hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[#5f6368] hover:text-[#1f1f1f] dark:hover:text-white transition-colors"
            title="HTML fayl sifatida yuklab olish"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="hidden sm:flex p-1.5 rounded-full hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[#5f6368] hover:text-[#1f1f1f] dark:hover:text-white transition-colors"
            title="To‘liq ekran"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-2 sm:p-3 bg-[#f8fafd] dark:bg-[#131314]">
        <div className={`transition-all duration-200 relative ${getDeviceWidthClass()}`}>
          <iframe
            key={key}
            ref={iframeRef}
            srcDoc={generateBundle()}
            title="Ilova ko‘rinishi"
            sandbox="allow-scripts allow-forms allow-same-origin"
            className="w-full h-full bg-white border border-[#dadce0] dark:border-[#333538] rounded-xl overflow-auto shadow-xs"
          />
        </div>
      </div>

      {/* Interactive Console Drawer */}
      {showConsole && (
        <div className="h-40 bg-[#141518] border-t border-[#2a2c30] flex flex-col shrink-0 font-mono text-xs">
          <div className="px-3 py-1.5 bg-[#1b1c20] border-b border-[#2a2c30] flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5 font-semibold text-slate-200">
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              Konsol ({logs.length})
            </span>
            <div className="flex items-center gap-3">
              {errorLogs.length > 0 && onFixRuntimeError && (
                <button
                  onClick={() => onFixRuntimeError(errorLogs.map((e) => e.text).join('\n'))}
                  className="text-rose-300 hover:text-rose-200 text-[11px] font-sans font-medium"
                >
                  AI bilan tuzatish
                </button>
              )}
              <button onClick={() => setLogs([])} className="hover:text-white text-[11px] font-sans">
                Tozalash
              </button>
              <button onClick={() => setShowConsole(false)} className="hover:text-white text-[11px] font-sans">
                Yopish
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {logs.length === 0 ? (
              <div className="text-slate-500 p-2 font-sans">Hozircha konsol yozuvlari yoki xatolar yo‘q.</div>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 py-0.5 px-1.5 rounded ${
                    log.type === 'error'
                      ? 'bg-rose-500/10 text-rose-400'
                      : log.type === 'warn'
                      ? 'bg-amber-500/10 text-amber-300'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="text-[10px] text-slate-500 shrink-0 tabular-nums">{log.time}</span>
                  {log.type === 'error' && <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />}
                  <span className="break-all whitespace-pre-wrap">{log.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
