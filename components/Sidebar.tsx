
import React from 'react';
import { Settings, Image as ImageIcon, Video, Layers, ChevronDown } from 'lucide-react';
import { AspectRatio } from '../types';

interface SidebarProps {
  onImageUpload: (type: 'bg' | 'box' | 'bag', file: File) => void;
  images: { bg: string | null; box: string | null; bag: string | null };
  aspectRatio: AspectRatio;
  setAspectRatio: (ar: AspectRatio) => void;
  style: string;
  setStyle: (s: string) => void;
  onRender: () => void;
  isRendering: boolean;
  progress: number;
}

const Sidebar: React.FC<SidebarProps> = ({
  onImageUpload,
  images,
  aspectRatio,
  setAspectRatio,
  style,
  setStyle,
  onRender,
  isRendering,
  progress
}) => {
  const ratios: AspectRatio[] = ['9:16', '3:4', '1:1', '4:3', '16:9'];

  return (
    <div className="w-80 h-screen flex flex-col glass-panel p-6 overflow-y-auto custom-scrollbar border-r border-slate-800">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Layers className="text-white w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          VEO AD CREATOR
        </h1>
      </div>

      <div className="space-y-6">
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
            CHỌN PHONG CÁCH
          </label>
          <div className="relative">
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
            >
              <option value="Unbox Đồ, Show Dáng">Unbox Đồ, Show Dáng</option>
              <option value="Hôm Nay Mặc Gì?">Hôm Nay Mặc Gì?</option>
              <option value="Cinematic Fashion">Cinematic Fashion</option>
              <option value="Street Style Reel">Street Style Reel</option>
            </select>
            <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
            TỶ LỆ KHUNG HÌNH
          </label>
          <div className="flex flex-wrap gap-2">
            {ratios.map((r) => (
              <button
                key={r}
                onClick={() => setAspectRatio(r)}
                className={`flex-1 py-2 px-1 text-xs font-bold rounded-lg border transition-all ${
                  aspectRatio === r
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            HÌNH ẢNH ĐẦU VÀO
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['bg', 'box', 'bag'] as const).map((type) => (
              <label key={type} className="group cursor-pointer relative aspect-[3/4] bg-slate-900 border-2 border-dashed border-slate-700 rounded-xl overflow-hidden hover:border-blue-500 transition-all">
                {images[type] ? (
                  <img src={images[type]!} className="w-full h-full object-cover" alt={type} />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
                    <ImageIcon className="w-5 h-5 text-slate-500 group-hover:text-blue-400 mb-1" />
                    <span className="text-[9px] text-slate-500 group-hover:text-slate-300 font-bold uppercase leading-tight">
                      {type === 'bg' ? 'BACKGROUND' : type === 'box' ? 'HỘP QUÀ' : 'TÚI XÁCH'}
                    </span>
                  </div>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onImageUpload(type, file);
                  }}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="pt-4 mt-auto">
          <button
            onClick={onRender}
            disabled={isRendering || !images.bg || !images.box || !images.bag}
            className={`w-full py-4 rounded-xl font-bold text-sm tracking-wide transition-all shadow-lg flex flex-col items-center justify-center gap-1 ${
              isRendering || !images.bg || !images.box || !images.bag
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white hover:scale-[1.02] active:scale-[0.98] neon-glow-blue'
            }`}
          >
            {isRendering ? (
              <div className="flex flex-col items-center">
                <span className="animate-pulse">ĐANG RENDER...</span>
                <span className="text-[10px] opacity-70">{progress}%</span>
              </div>
            ) : (
              <>
                <span>RUN BATCH RENDER</span>
                <span className="text-[10px] opacity-70 font-medium">Auto-generate 3 Concept + Script</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
