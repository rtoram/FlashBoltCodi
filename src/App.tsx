/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  Download, 
  ExternalLink, 
  Code2, 
  Eye, 
  Maximize2, 
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Camera,
  Square,
  RectangleVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as htmlToImage from 'html-to-image';
import { cn } from './lib/utils';

type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'full' | 'social-square' | 'social-story';

const DEFAULT_CODE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; }
        .gradient-bg {
            background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
        }
    </style>
</head>
<body class="bg-slate-50 min-h-screen flex items-center justify-center p-8">
    <div class="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all hover:scale-[1.02]">
        <div class="gradient-bg h-32 flex items-center justify-center">
            <h1 class="text-white text-3xl font-bold tracking-tight">Hello World</h1>
        </div>
        <div class="p-8">
            <p class="text-slate-600 leading-relaxed mb-6">
                This is a responsive preview of your application code. You can edit the code on the left and see changes instantly!
            </p>
            <button class="w-full gradient-bg text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-200 active:scale-95 transition-transform">
                Get Started
            </button>
        </div>
    </div>
</body>
</html>`;

export default function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [isCopied, setIsCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'preview' | 'code'>('split');
  const [error, setError] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState('');
  const [modal, setModal] = useState<{title: string, message: string, type: 'alert' | 'confirm', action?: () => void} | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const handleReset = () => {
    setModal({
      title: 'Restaurar Padrão',
      message: 'Tem certeza que deseja restaurar o código padrão?',
      type: 'confirm',
      action: () => {
        setCode(DEFAULT_CODE);
        setError(null);
      }
    });
  };

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'CAPTURE_RESULT') {
        const link = document.createElement('a');
        link.download = `flashboltcodi-${e.data.fullPage ? 'full' : 'view'}-${Date.now()}.jpg`;
        link.href = e.data.dataUrl;
        link.click();
      } else if (e.data?.type === 'CAPTURE_ERROR') {
        console.error('Capture error:', e.data.error);
        setModal({
          title: 'Erro na Exportação',
          message: 'Não foi possível capturar a imagem. Isso geralmente ocorre devido a restrições de segurança (CORS) com imagens ou fontes externas no seu código.',
          type: 'alert'
        });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const errorScript = `
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js"></script>
        <script>
          window.addEventListener('message', async function(e) {
            if (e.data && e.data.type === 'CAPTURE') {
              try {
                if (!window.htmlToImage) {
                  throw new Error('html-to-image library not loaded');
                }
                var body = document.body;
                var html = document.documentElement;
                
                // Calculate maximum possible dimensions to prevent cutoff
                var width = e.data.fullPage 
                  ? Math.max(body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth) 
                  : html.clientWidth;
                var height = e.data.fullPage 
                  ? Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight) 
                  : html.clientHeight;
                
                // Temporarily adjust styles to ensure everything is visible for full page capture
                var originalHtmlOverflow = html.style.overflow;
                var originalBodyOverflow = body.style.overflow;
                
                if (e.data.fullPage) {
                  html.style.overflow = 'visible';
                  body.style.overflow = 'visible';
                }

                // Use documentElement (html) as the target to capture everything
                var dataUrl = await window.htmlToImage.toJpeg(html, {
                  quality: 0.95,
                  backgroundColor: '#ffffff',
                  width: width,
                  height: height,
                  windowWidth: width,
                  windowHeight: height,
                  style: { 
                    margin: '0', 
                    padding: '0',
                    transform: 'none'
                  }
                });
                
                // Restore original styles
                if (e.data.fullPage) {
                  html.style.overflow = originalHtmlOverflow;
                  body.style.overflow = originalBodyOverflow;
                }

                window.parent.postMessage({ type: 'CAPTURE_RESULT', dataUrl: dataUrl, fullPage: e.data.fullPage }, '*');
              } catch (err) {
                window.parent.postMessage({ type: 'CAPTURE_ERROR', error: err.message }, '*');
              }
            }
          });
          window.onerror = function(msg, url, lineNo, columnNo, error) {
            console.error('Preview Error:', msg, 'at', lineNo + ':' + columnNo);
            return false;
          };
        </script>
      `;
      setPreviewContent(errorScript + (code || '<html><body></body></html>'));
    }, 300);
    return () => clearTimeout(timer);
  }, [code]);

  const handleCapture = (fullPage: boolean) => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) {
      setModal({
        title: 'Erro',
        message: 'A prévia não está pronta para captura.',
        type: 'alert'
      });
      return;
    }
    iframe.contentWindow.postMessage({ type: 'CAPTURE', fullPage }, '*');
  };

  const handleClear = () => {
    setModal({
      title: 'Limpar Código',
      message: 'Tem certeza que deseja apagar todo o código?',
      type: 'confirm',
      action: () => setCode('')
    });
  };

  const handleExternalView = () => {
    try {
      const blob = new Blob([code], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) {
        setModal({
          title: 'Pop-up Bloqueado',
          message: 'Por favor, permita pop-ups para visualizar a aplicação externamente.',
          type: 'alert'
        });
      }
    } catch (err) {
      console.error('External view error:', err);
      setModal({
        title: 'Erro',
        message: 'Falha ao abrir a visualização externa.',
        type: 'alert'
      });
    }
  };

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(code).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }).catch(err => {
        console.error('Clipboard copy error:', err);
        setModal({
          title: 'Erro',
          message: 'Falha ao copiar o código para a área de transferência.',
          type: 'alert'
        });
      });
    } catch (err) {
      console.error('Copy error:', err);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0f172a] text-slate-200 overflow-hidden font-sans">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-[#1e293b]/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Code2 className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-white leading-none">FlashBoltCodi</h1>
            <p className="text-xs text-slate-400 mt-1">Responsive Design Sandbox</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
          <button 
            onClick={() => setViewMode('code')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
              viewMode === 'code' ? "bg-indigo-500 text-white shadow-md" : "hover:bg-slate-800 text-slate-400"
            )}
          >
            <Code2 size={16} /> Code
          </button>
          <button 
            onClick={() => setViewMode('split')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
              viewMode === 'split' ? "bg-indigo-500 text-white shadow-md" : "hover:bg-slate-800 text-slate-400"
            )}
          >
            <Maximize2 size={16} /> Split
          </button>
          <button 
            onClick={() => setViewMode('preview')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
              viewMode === 'preview' ? "bg-indigo-500 text-white shadow-md" : "hover:bg-slate-800 text-slate-400"
            )}
          >
            <Eye size={16} /> Preview
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleReset}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
            title="Reset to Default"
          >
            <RefreshCw size={18} />
          </button>
          <button 
            onClick={() => handleCapture(false)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors text-sm font-medium border border-slate-700"
            title="Capturar área visível"
          >
            <Download size={16} />
            <span>Export JPEG</span>
          </button>
          <button 
            onClick={() => handleCapture(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-lg shadow-emerald-600/20 text-sm font-medium"
            title="Capturar página inteira"
          >
            <Camera size={16} />
            <span>Full Page</span>
          </button>
          <button 
            onClick={handleExternalView}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-600/20 text-sm font-medium"
          >
            <ExternalLink size={16} />
            <span>Open External</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Editor Section */}
        <AnimatePresence mode="wait">
          {(viewMode === 'code' || viewMode === 'split') && (
            <motion.div 
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              className={cn(
                "flex flex-col border-r border-slate-800 bg-[#0f172a]",
                viewMode === 'split' ? "w-1/2" : "w-full"
              )}
            >
              <div className="h-10 px-4 flex items-center justify-between bg-slate-900/80 border-b border-slate-800">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Source Code (HTML/CSS/JS)</span>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={handleClear}
                    className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-md transition-colors"
                    title="Clear Code"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button 
                    onClick={handleCopy}
                    className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 transition-colors"
                    title="Copy Code"
                  >
                    {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                className="flex-1 p-6 font-mono text-sm bg-transparent resize-none focus:outline-none text-indigo-300 leading-relaxed selection:bg-indigo-500/30"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Preview Section */}
        <AnimatePresence mode="wait">
          {(viewMode === 'preview' || viewMode === 'split') && (
            <motion.div 
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className={cn(
                "flex flex-col bg-slate-950 relative",
                viewMode === 'split' ? "w-1/2" : "w-full"
              )}
            >
              {/* Device Controls */}
              <div className="h-12 flex items-center justify-center gap-2 bg-slate-900/80 border-b border-slate-800 shrink-0 px-4 overflow-x-auto">
                <button 
                  onClick={() => setDevice('mobile')}
                  className={cn(
                    "p-2 rounded-lg transition-all flex items-center gap-2",
                    device === 'mobile' ? "bg-indigo-500/20 text-indigo-400" : "text-slate-500 hover:text-slate-300"
                  )}
                  title="Mobile (375x667)"
                >
                  <Smartphone size={18} />
                </button>
                <button 
                  onClick={() => setDevice('tablet')}
                  className={cn(
                    "p-2 rounded-lg transition-all flex items-center gap-2",
                    device === 'tablet' ? "bg-indigo-500/20 text-indigo-400" : "text-slate-500 hover:text-slate-300"
                  )}
                  title="Tablet (768x1024)"
                >
                  <Tablet size={18} />
                </button>
                <button 
                  onClick={() => setDevice('desktop')}
                  className={cn(
                    "p-2 rounded-lg transition-all flex items-center gap-2",
                    device === 'desktop' ? "bg-indigo-500/20 text-indigo-400" : "text-slate-500 hover:text-slate-300"
                  )}
                  title="Desktop (1280x800)"
                >
                  <Monitor size={18} />
                </button>
                
                <div className="w-px h-6 bg-slate-800 mx-1" />
                
                <button 
                  onClick={() => setDevice('social-square')}
                  className={cn(
                    "p-2 rounded-lg transition-all flex items-center gap-2",
                    device === 'social-square' ? "bg-indigo-500/20 text-indigo-400" : "text-slate-500 hover:text-slate-300"
                  )}
                  title="Instagram Post (1080x1080)"
                >
                  <Square size={16} />
                </button>
                <button 
                  onClick={() => setDevice('social-story')}
                  className={cn(
                    "p-2 rounded-lg transition-all flex items-center gap-2",
                    device === 'social-story' ? "bg-indigo-500/20 text-indigo-400" : "text-slate-500 hover:text-slate-300"
                  )}
                  title="Instagram Story (1080x1920)"
                >
                  <RectangleVertical size={16} />
                </button>

                <div className="w-px h-6 bg-slate-800 mx-1" />

                <button 
                  onClick={() => setDevice('full')}
                  className={cn(
                    "p-2 rounded-lg transition-all flex items-center gap-2",
                    device === 'full' ? "bg-indigo-500/20 text-indigo-400" : "text-slate-500 hover:text-slate-300"
                  )}
                  title="Responsive / Full Size"
                >
                  <Maximize2 size={18} />
                </button>
                <div className="w-px h-6 bg-slate-800 mx-1" />
                <button 
                  onClick={() => {
                    // Force a re-render of the iframe by slightly modifying the content
                    setPreviewContent(prev => prev + ' ');
                  }}
                  className="p-2 text-slate-500 hover:text-indigo-400 transition-all"
                  title="Refresh Preview"
                >
                  <RefreshCw size={18} />
                </button>
              </div>

              {/* Iframe Container */}
              <div className={cn(
                "flex-1 overflow-auto flex justify-center bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]",
                device === 'full' ? "p-0" : "p-8",
                (device === 'full' || device === 'desktop') ? "items-stretch" : "items-start"
              )}>
                <div 
                  ref={previewContainerRef}
                  className={cn(
                    "transition-all duration-500 ease-in-out bg-white overflow-hidden flex flex-col",
                    device === 'full' ? "w-full rounded-none border-none shadow-none" : "shadow-2xl rounded-sm border border-slate-800",
                    device === 'desktop' ? "w-full max-w-[1280px]" : "",
                    device === 'mobile' ? "w-[375px] h-[667px] shrink-0" : "",
                    device === 'tablet' ? "w-[768px] h-[1024px] shrink-0" : "",
                    device === 'social-square' ? "w-[1080px] h-[1080px] shrink-0" : "",
                    device === 'social-story' ? "w-[1080px] h-[1920px] shrink-0" : ""
                  )}
                >
                  <iframe
                    ref={iframeRef}
                    title="App Preview"
                    srcDoc={previewContent}
                    className="w-full flex-1 border-none"
                    sandbox="allow-scripts allow-forms allow-popups allow-modals"
                  />
                </div>
              </div>

              {/* Dimensions Indicator */}
              <div className="absolute bottom-4 right-4 px-3 py-1 bg-slate-900/90 border border-slate-700 rounded-full text-[10px] font-mono text-slate-400 backdrop-blur-sm">
                {device === 'mobile' ? '375 x 667' : 
                 device === 'tablet' ? '768 x 1024' : 
                 device === 'desktop' ? '1280 x 800' : 
                 device === 'social-square' ? '1080 x 1080 (Post)' :
                 device === 'social-story' ? '1080 x 1920 (Story)' :
                 'Responsive'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer / Status Bar */}
      <footer className="h-8 border-t border-slate-800 bg-slate-900 flex items-center justify-between px-4 text-[10px] text-slate-500 font-medium uppercase tracking-widest">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Preview Active
          </span>
          <span>UTF-8 Encoding</span>
        </div>
        <div>
          Built with Gemini AI & React
        </div>
      </footer>

      {/* Custom Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4"
            >
              <h3 className="text-lg font-semibold text-white mb-3">{modal.title}</h3>
              <p className="text-slate-300 mb-6 text-sm leading-relaxed">{modal.message}</p>
              <div className="flex justify-end gap-3">
                {modal.type === 'confirm' && (
                  <button 
                    onClick={() => setModal(null)}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
                <button 
                  onClick={() => {
                    if (modal.action) modal.action();
                    setModal(null);
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors shadow-lg",
                    modal.type === 'confirm' 
                      ? "bg-red-600 hover:bg-red-500 shadow-red-600/20" 
                      : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20"
                  )}
                >
                  {modal.type === 'confirm' ? 'Confirmar' : 'OK'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
