import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Sparkles,
  Download,
  Copy,
  Check,
  Trash2,
  X,
  RefreshCw,
  Eye,
  AlertCircle,
  Paperclip,
  Info,
} from 'lucide-react';
import { GeneratedImage, ModelInfo } from '../../types';
import { generateImageStudio } from '../../services/api';

interface ImageStudioViewProps {
  models: ModelInfo[];
  selectedModel: string;
}

export const ImageStudioView: React.FC<ImageStudioViewProps> = () => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');
  const [chosenModel, setChosenModel] = useState('gemini-3.1-flash-lite-image');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ message: string; isQuota?: boolean } | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [selectedLightboxImage, setSelectedLightboxImage] = useState<GeneratedImage | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [gallery, setGallery] = useState<GeneratedImage[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const stylePresets = [
    { label: 'Fotorealistik', suffix: ', highly detailed photograph, cinematic lighting, 8k resolution, crisp focus' },
    { label: 'Minimalist 3D', suffix: ', clean minimalist 3D studio render, soft daylight shadows, smooth geometry' },
    { label: 'Akvarel', suffix: ', delicate watercolor painting, soft pigment washes, textured paper art' },
    { label: 'Illyustratsiya', suffix: ', modern editorial flat vector illustration, balanced color palette, crisp shapes' },
    { label: 'Futuristik', suffix: ', sleek architectural concept art, atmospheric daylight, ultra detailed' },
  ];

  const starterPrompts = [
    {
      title: 'Kosmik issiqxona',
      prompt: 'Oy yuzasidagi shaffof gumbaz ichida joylashgan zamonaviy botanika bog‘i, yorug‘ quyosh nuri, realist uslubda',
    },
    {
      title: 'Toshkent ko‘chalari tongda',
      prompt: 'Zamonaviy Toshkent shahri tonggi quyosh nurida, yam-yashil xiyobonlar va shisha binolar, kinematografik surat',
    },
    {
      title: 'Texnologik logotip',
      prompt: 'Toza geometrik shakllardan tuzilgan zamonaviy sun’iy intellekt startapi emblemasi, ko‘k va binafsha ranglar uyg‘unligi',
    },
  ];

  const handleApplyPreset = (suffix: string) => {
    setPrompt((prev) => (prev.trim() ? `${prev.trim()}${suffix}` : suffix.replace(/^,\s*/, '')));
  };

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setReferenceImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleGenerate = async (customPrompt?: string, overrideModel?: string) => {
    const promptToUse = (customPrompt || prompt).trim();
    const modelToUse = overrideModel || chosenModel;
    if (!promptToUse || isGenerating) return;

    if (overrideModel) {
      setChosenModel(overrideModel);
    }

    setIsGenerating(true);
    setErrorInfo(null);
    setNoticeMessage(null);

    try {
      const res = await generateImageStudio({
        prompt: promptToUse,
        aspectRatio,
        model: modelToUse,
        inputImageBase64: referenceImage || undefined,
      });

      if (res.success && res.imageUrl) {
        const newImage: GeneratedImage = {
          id: 'gen-' + Date.now(),
          url: res.imageUrl,
          prompt: promptToUse,
          aspectRatio,
          model: res.modelUsed || modelToUse,
          timestamp: Date.now(),
        };
        setGallery((prev) => [newImage, ...prev]);
        if (res.notice) {
          setNoticeMessage(res.notice);
        }
      } else {
        setErrorInfo({
          message: res.error || 'Rasm yaratishda xatolik yuz berdi.',
          isQuota: res.errorCode === 'QUOTA_EXCEEDED',
        });
      }
    } catch (err: any) {
      setErrorInfo({
        message: err?.message || 'Rasm serveri bilan bog‘lanishda xatolik yuz berdi.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Export any image (raster or SVG rendered onto canvas as PNG)
  const handleDownloadPng = (img: GeneratedImage) => {
    if (!img.url.startsWith('data:image/svg+xml')) {
      const a = document.createElement('a');
      a.href = img.url;
      a.download = `ai-studio-${img.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    const imageEl = new Image();
    imageEl.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = imageEl.naturalWidth || 1024;
      canvas.height = imageEl.naturalHeight || 1024;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(imageEl, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `ai-studio-${img.id}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    };
    imageEl.src = img.url;
  };

  const copyPromptText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteImage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setGallery((prev) => prev.filter((img) => img.id !== id));
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full min-h-0 overflow-hidden bg-white dark:bg-[#131314]">
      {/* Left Control Panel: Prompt & Options */}
      <div className="w-full lg:w-[370px] border-b lg:border-b-0 lg:border-r border-[#dadce0] dark:border-[#333538] bg-[#f8fafd] dark:bg-[#1e1f20] p-4 sm:p-5 flex flex-col shrink-0 overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
              Image Studio
            </h2>
          </div>
          <span className="text-[11px] text-[#747775]">
            AI Rasm yaratish
          </span>
        </div>

        {/* Prompt Input + Reference Image Upload */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#444746] dark:text-[#c4c7c5]">
              Rasm tavsifi
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleReferenceUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] font-medium text-[#0b57d0] dark:text-[#a8c7fa] hover:underline flex items-center gap-1"
            >
              <Paperclip className="w-3 h-3" />
              <span>Namuna rasm yuklash</span>
            </button>
          </div>

          <div className="rounded-2xl border border-[#dadce0] dark:border-[#333538] bg-white dark:bg-[#282a2c] p-3 focus-within:border-[#0b57d0] transition-colors space-y-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder="Qanday rasm yaratmoqchi ekanligingizni batafsil yozing..."
              rows={3}
              className="w-full bg-transparent text-xs sm:text-[13px] text-[#1f1f1f] dark:text-[#e3e3e3] placeholder:text-[#747775] outline-none resize-none leading-relaxed"
            />
            {referenceImage && (
              <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[#f0f4f9] dark:bg-[#1e1f20] text-xs">
                <img src={referenceImage} alt="Namuna" className="w-9 h-9 rounded-lg object-cover" />
                <span className="text-[11px] text-[#444746] dark:text-[#c4c7c5] truncate flex-1">
                  Namuna rasm biriktirildi
                </span>
                <button
                  onClick={() => setReferenceImage(null)}
                  className="p-1 text-[#747775] hover:text-rose-600"
                  title="Olib tashlash"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Style Presets */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#444746] dark:text-[#c4c7c5]">
            Uslub qo‘shimchalari
          </label>
          <div className="flex flex-wrap gap-1.5">
            {stylePresets.map((preset, i) => (
              <button
                key={i}
                onClick={() => handleApplyPreset(preset.suffix)}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-[#282a2c] hover:bg-[#e8f0fe] hover:border-[#d3e3fd] hover:text-[#0b57d0] text-[11px] text-[#444746] dark:text-[#c4c7c5] border border-[#dadce0] dark:border-[#333538] transition-colors whitespace-nowrap"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Aspect Ratio Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#444746] dark:text-[#c4c7c5]">
            O‘lcham nisbati
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {(['1:1', '16:9', '9:16', '4:3', '3:4'] as const).map((ratio) => (
              <button
                key={ratio}
                onClick={() => setAspectRatio(ratio)}
                className={`py-1.5 rounded-full text-xs font-medium tabular-nums transition-all ${
                  aspectRatio === ratio
                    ? 'bg-[#0b57d0] text-white font-semibold'
                    : 'bg-white dark:bg-[#282a2c] text-[#444746] dark:text-[#c4c7c5] border border-[#dadce0] dark:border-[#333538] hover:text-[#1f1f1f]'
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>

        {/* Model Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#444746] dark:text-[#c4c7c5]">
            Rasm modeli
          </label>
          <select
            value={chosenModel}
            onChange={(e) => {
              setChosenModel(e.target.value);
              setErrorInfo(null);
            }}
            className="w-full p-2.5 rounded-xl bg-white dark:bg-[#282a2c] border border-[#dadce0] dark:border-[#333538] text-xs text-[#1f1f1f] dark:text-[#e3e3e3] outline-none focus:border-[#0b57d0]"
          >
            <option value="gemini-3.1-flash-lite-image">
              Gemini Flash-Lite Image (Avto + Vektor zaxira)
            </option>
            <option value="gemini-nano-banana-2.1">
              Nano Banana 2.1 (Yuqori sifat, pullik API)
            </option>
            <option value="gemini-vector-svg">
              Vektor SVG illyustratsiya (Tezkor bepul rejim)
            </option>
          </select>
        </div>

        {noticeMessage && (
          <div className="p-3 rounded-2xl bg-[#e8f0fe] dark:bg-[#1b2d4b] border border-[#d3e3fd] dark:border-[#2b4c7e] text-[#0b57d0] dark:text-[#a8c7fa] text-xs flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{noticeMessage}</p>
          </div>
        )}

        {errorInfo && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{errorInfo.message}</p>
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={() => handleGenerate()}
          disabled={!prompt.trim() || isGenerating}
          className="w-full py-2.5 rounded-full bg-[#0b57d0] hover:bg-[#0842a0] disabled:opacity-40 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Rasm yaratilmoqda...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Rasm yaratish</span>
            </>
          )}
        </button>
      </div>

      {/* Right Gallery: Generated Images Grid or Clean Empty State */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto p-4 sm:p-6 bg-white dark:bg-[#131314]">
        <div className="flex items-center justify-between pb-4 border-b border-[#dadce0] dark:border-[#333538] mb-6">
          <div>
            <h3 className="text-base font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
              Yaratilgan rasmlar
            </h3>
            <p className="text-xs text-[#747775] tabular-nums">
              Joriy sessiyada {gallery.length} ta rasm
            </p>
          </div>
        </div>

        {gallery.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8 max-w-xl mx-auto text-center space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-[#f0f4f9] dark:bg-[#282a2c] border border-[#dadce0] dark:border-[#333538] flex items-center justify-center text-[#0b57d0]">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-base font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                Hozircha rasm yaratilmagan
              </h4>
              <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] max-w-md leading-relaxed">
                Chap tarafga tavsif yozing yoki quyidagi tayyor g‘oyalardan birini tanlang. Rasm tayyor bo‘lgach, uni PNG sifatida yuklab olishingiz mumkin.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full text-left">
              {starterPrompts.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(item.prompt)}
                  className="p-3.5 rounded-xl bg-[#f8fafd] dark:bg-[#1e1f20] hover:bg-[#e8f0fe] dark:hover:bg-[#282a2c] border border-[#dadce0] dark:border-[#333538] transition-colors"
                >
                  <div className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-[#747775] mt-1 line-clamp-2">
                    {item.prompt}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {gallery.map((img) => (
              <div
                key={img.id}
                onClick={() => setSelectedLightboxImage(img)}
                className="group relative rounded-2xl overflow-hidden border border-[#dadce0] dark:border-[#333538] bg-white dark:bg-[#1e1f20] hover:shadow-md transition-all cursor-pointer flex flex-col"
              >
                <div className="relative aspect-square bg-[#f8fafd] dark:bg-[#18191c] overflow-hidden flex items-center justify-center">
                  <img
                    src={img.url}
                    alt={img.prompt}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3.5 flex flex-col justify-between">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPng(img);
                        }}
                        className="p-2 rounded-lg bg-black/60 hover:bg-black text-white transition-colors"
                        title="PNG yuklab olish"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteImage(img.id, e)}
                        className="p-2 rounded-lg bg-black/60 hover:bg-rose-600 text-white transition-colors"
                        title="O‘chirish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-white text-xs">
                      <span className="font-mono text-[11px] tabular-nums">{img.aspectRatio}</span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Eye className="w-3.5 h-3.5" /> Kattalashtirish
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 flex flex-col justify-between flex-1 space-y-2">
                  <p className="text-xs text-[#444746] dark:text-[#c4c7c5] line-clamp-2 leading-relaxed">
                    {img.prompt}
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-[#f0f4f9] dark:border-[#282a2c] text-[11px] text-[#747775] tabular-nums">
                    <span>{new Date(img.timestamp).toLocaleTimeString()}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrompt(img.prompt);
                        }}
                        className="hover:text-[#0b57d0] font-medium"
                      >
                        Qayta qo‘llash
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyPromptText(img.prompt, img.id);
                        }}
                        className="hover:text-[#0b57d0]"
                      >
                        {copiedId === img.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedLightboxImage && (
        <div
          onClick={() => setSelectedLightboxImage(null)}
          className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl w-full bg-white dark:bg-[#1e1f20] border border-[#dadce0] dark:border-[#333538] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="p-3 px-4 border-b border-[#dadce0] dark:border-[#333538] flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                Rasm ko‘rinishi
              </span>
              <button
                onClick={() => setSelectedLightboxImage(null)}
                className="p-1 rounded-lg hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[#747775]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 bg-[#f8fafd] dark:bg-[#131314] overflow-auto flex items-center justify-center p-4 min-h-[300px]">
              <img
                src={selectedLightboxImage.url}
                alt={selectedLightboxImage.prompt}
                referrerPolicy="no-referrer"
                className="max-h-[70vh] object-contain rounded-lg"
              />
            </div>
            <div className="p-4 border-t border-[#dadce0] dark:border-[#333538] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-[#444746] dark:text-[#c4c7c5] max-w-xl">
                {selectedLightboxImage.prompt}
              </p>
              <button
                onClick={() => handleDownloadPng(selectedLightboxImage)}
                className="px-4 py-2 rounded-full bg-[#0b57d0] hover:bg-[#0842a0] text-white font-medium text-xs flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PNG yuklab olish</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
