
import React from 'react';
import { Copy, Download, CheckCircle2 } from 'lucide-react';
import { AdScene } from '../types';

interface ResultCardProps {
  scene: AdScene;
}

const ResultCard: React.FC<ResultCardProps> = ({ scene }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(scene.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[9/16] glass-panel rounded-2xl overflow-hidden border border-slate-700/50 hover:border-blue-500/50 transition-all group shadow-xl">
        <div className="absolute top-3 left-3 z-10">
          <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-blue-400">{scene.id}.</span>
            <span className="text-[10px] font-bold text-white uppercase tracking-tight">{scene.title} {scene.subtitle}</span>
          </div>
        </div>

        {scene.status === 'generating' ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/50">
            <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-3"></div>
            <p className="text-xs text-slate-400 animate-pulse font-medium">Đang phác thảo...</p>
          </div>
        ) : scene.imageUrl ? (
          <img src={scene.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={scene.title} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-900/50">
            <p className="text-xs text-slate-600 font-medium italic">Chờ xử lý</p>
          </div>
        )}
      </div>

      <div className="glass-panel p-4 rounded-xl border border-slate-800 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex gap-2">
             <button 
                onClick={handleCopy}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[10px] font-bold transition-all flex items-center gap-1"
             >
               {copied ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
               {copied ? 'COPIED' : 'COPY'}
             </button>
             <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[10px] font-bold transition-all flex items-center gap-1">
               <Download className="w-3 h-3" /> DOWNLOAD
             </button>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-4 italic">
          {scene.prompt || "Phần prompt chi tiết cho video sẽ hiển thị ở đây sau khi render..."}
        </p>
      </div>
    </div>
  );
};

export default ResultCard;
