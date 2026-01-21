
import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, Copy, Play, FileText, 
  Image as ImageIcon, Trash2, Zap, LayoutGrid, CheckCircle2, ChevronRight, Loader2, Sparkles, FolderArchive, Trash, AlertTriangle, X
} from 'lucide-react';
import { GlobalState, ProductionRow, AspectRatio, AdScene } from './types';
import { generateConceptImages, generateVideoFlow } from './services/geminiService';
import JSZip from 'jszip';

const App: React.FC = () => {
  const [state, setState] = useState<GlobalState>({
    style: 'Unbox Đồ, Show Dáng',
    aspectRatio: '9:16',
    isGlobalRendering: false,
    rows: Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      bgImage: null,
      boxImage: null,
      bagImage: null,
      conceptImages: [],
      videoScript: null,
      videoUrl: null,
      isRendering: false,
      progress: 0,
    })),
  });

  // State cho việc xác nhận xóa tất cả (Tránh dùng window.confirm)
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  // Using ReturnType<typeof setTimeout> to avoid NodeJS namespace error in browser environment
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImageUpload = (rowId: number, type: 'bg' | 'box' | 'bag', file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setState(prev => ({
        ...prev,
        rows: prev.rows.map(row => row.id === rowId ? { ...row, [`${type}Image`]: reader.result as string } : row)
      }));
    };
    reader.readAsDataURL(file);
  };

  const clearRow = (rowId: number) => {
    setState(prev => ({
      ...prev,
      rows: prev.rows.map(row => row.id === rowId ? {
        ...row,
        bgImage: null, boxImage: null, bagImage: null,
        conceptImages: [], videoScript: null, videoUrl: null, isRendering: false, progress: 0
      } : row)
    }));
  };

  // Hàm thực thi xóa tất cả - Logic reset state sạch sẽ nhất
  const executeClearAll = () => {
    const resetRows = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      bgImage: null,
      boxImage: null,
      bagImage: null,
      conceptImages: [],
      videoScript: null,
      videoUrl: null,
      isRendering: false,
      progress: 0,
    }));

    setState(prev => ({
      ...prev,
      isGlobalRendering: false,
      rows: resetRows
    }));
    
    setIsConfirmingClear(false);
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
  };

  // Handler cho nút xóa tất cả (Cơ chế 2 bước)
  const handleClearButtonClick = () => {
    if (!isConfirmingClear) {
      setIsConfirmingClear(true);
      // Tự động hủy trạng thái chờ xóa sau 4 giây nếu không bấm lần 2
      confirmTimerRef.current = setTimeout(() => {
        setIsConfirmingClear(false);
      }, 4000);
    } else {
      executeClearAll();
    }
  };

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);

  const renderSingleRow = async (rowId: number) => {
    const row = state.rows.find(r => r.id === rowId);
    if (!row || !row.bgImage || !row.boxImage || !row.bagImage) return;

    setState(prev => ({
      ...prev,
      rows: prev.rows.map(r => r.id === rowId ? { ...r, isRendering: true, progress: 10, videoScript: null } : r)
    }));

    try {
      const imageUrls = await generateConceptImages(row.bgImage, row.boxImage, row.bagImage, state.aspectRatio);
      const conceptScenes: AdScene[] = [
        { id: '1', title: 'IMAGE 1', subtitle: '', prompt: '', imageUrl: imageUrls[0], status: 'completed' },
        { id: '2', title: 'IMAGE 2', subtitle: '', prompt: '', imageUrl: imageUrls[1], status: 'completed' },
        { id: '3', title: 'IMAGE 3', subtitle: '', prompt: '', imageUrl: imageUrls[2], status: 'completed' },
      ];
      
      setState(prev => ({
        ...prev,
        rows: prev.rows.map(r => r.id === rowId ? { ...r, progress: 50, conceptImages: conceptScenes } : r)
      }));

      const scriptData = await generateVideoFlow(imageUrls, state.style);

      setState(prev => ({
        ...prev,
        rows: prev.rows.map(r => r.id === rowId ? {
          ...r, videoScript: scriptData, isRendering: false, progress: 100
        } : r)
      }));
    } catch (error: any) {
      console.error(error);
      setState(prev => ({
        ...prev,
        rows: prev.rows.map(r => r.id === rowId ? { ...r, isRendering: false, progress: 0 } : r)
      }));
    }
  };

  const handleZipDownload = async (row: ProductionRow) => {
    if (row.conceptImages.length === 0 || !row.videoScript) return;
    try {
      const zip = new JSZip();
      const folder = zip.folder(`Túi Xách ${row.id}`);
      if (!folder) return;
      row.conceptImages.forEach((img, i) => {
        if (img.imageUrl) {
          folder.file(`Concept_${i + 1}.png`, img.imageUrl.split(',')[1], { base64: true });
        }
      });
      const promptContent = row.videoScript.scenes.map((scene) => 
        `--- CẢNH ${scene.time} ---\nPROMPT: ${scene.veoPrompt}\nVOICE: ${scene.dialogue}`
      ).join('\n\n');
      folder.file("prompts.txt", promptContent);
      const content = await zip.generateAsync({ type: "blob" });
      downloadBlob(content, `Line_${row.id}.zip`);
    } catch (err) { console.error(err); }
  };

  const downloadAllAssets = async () => {
    const readyRows = state.rows.filter(r => r.conceptImages.length > 0 && r.videoScript);
    if (readyRows.length === 0) return;
    try {
      const zip = new JSZip();
      const mainFolder = zip.folder("VEO_ASSETS_ALL");
      if (!mainFolder) return;
      readyRows.forEach(row => {
        const rowFolder = mainFolder.folder(`Line_${row.id}`);
        if (rowFolder) {
          row.conceptImages.forEach((img, i) => {
            if (img.imageUrl) rowFolder.file(`Concept_${i + 1}.png`, img.imageUrl.split(',')[1], { base64: true });
          });
          const content = row.videoScript!.scenes.map(s => `${s.time}\nPROMPT: ${s.veoPrompt}\nVOICE: ${s.dialogue}`).join('\n\n');
          rowFolder.file("prompts.txt", content);
        }
      });
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `VEO_FACTORY_ALL.zip`);
    } catch (err) { console.error(err); }
  };

  const runBatchRender = async () => {
    const eligibleRows = state.rows.filter(r => r.bgImage && r.boxImage && r.bagImage && !r.isRendering);
    if (eligibleRows.length === 0) {
      alert("Vui lòng tải đủ 3 ảnh cho ít nhất 1 hàng!");
      return;
    }
    setState(prev => ({ ...prev, isGlobalRendering: true }));
    await Promise.allSettled(eligibleRows.map(row => renderSingleRow(row.id)));
    setState(prev => ({ ...prev, isGlobalRendering: false }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Đã sao chép Prompt!");
  };

  const hasAnyCompleted = state.rows.some(r => r.conceptImages.length > 0);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-blue-500/30">
      <header className="sticky top-0 z-50 glass-panel border-b border-white/5 px-8 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Zap className="text-white w-6 h-6 fill-white" />
            </div>
            <div>
              <h1 className="font-black text-lg tracking-tighter text-white uppercase">TÚI XÁCH</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">From by HUYWIN</p>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4 bg-slate-900/50 p-1.5 rounded-2xl border border-white/5">
              <div className="flex flex-col px-3">
                <span className="text-[9px] font-bold text-slate-500 uppercase">Phong cách</span>
                <select value={state.style} onChange={(e) => setState(prev => ({ ...prev, style: e.target.value }))} className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer text-blue-400">
                  <option value="Unbox Đồ, Show Dáng">Unbox Đồ, Show Dáng</option>
                  <option value="Cinematic Commercial">Cinematic Commercial</option>
                  <option value="Review Sản Phẩm">Review Sản Phẩm</option>
                </select>
              </div>
              <div className="w-px h-8 bg-white/5" />
              <div className="flex flex-col px-3">
                <span className="text-[9px] font-bold text-slate-500 uppercase">Tỷ lệ</span>
                <select value={state.aspectRatio} onChange={(e) => setState(prev => ({ ...prev, aspectRatio: e.target.value as AspectRatio }))} className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer text-blue-400">
                  {['9:16', '1:1', '16:9'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={handleClearButtonClick}
                className={`relative group flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs transition-all border shadow-lg active:scale-95 ${isConfirmingClear ? 'bg-rose-600 border-rose-500 text-white animate-pulse' : 'bg-slate-900 border-white/5 text-slate-500 hover:text-rose-400 hover:border-rose-500/30'}`}
                title={isConfirmingClear ? "Bấm thêm lần nữa để xóa" : "Xóa toàn bộ dữ liệu"}
              >
                {isConfirmingClear ? (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    BẤM LẦN NỮA ĐỂ XÓA!
                  </>
                ) : (
                  <>
                    <Trash className="w-5 h-5" />
                    CLEAR ALL
                  </>
                )}
                
                {isConfirmingClear && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsConfirmingClear(false); }} 
                    className="absolute -top-2 -right-2 w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center border border-white/10 hover:bg-slate-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </button>

              {hasAnyCompleted && (
                <button 
                  onClick={downloadAllAssets}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-sm transition-all border border-white/5 shadow-xl active:scale-95"
                >
                  <FolderArchive className="w-4 h-4" /> DOWNLOAD ALL
                </button>
              )}

              <button 
                onClick={runBatchRender} 
                disabled={state.isGlobalRendering} 
                className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-sm transition-all shadow-xl ${state.isGlobalRendering ? 'bg-slate-800 text-slate-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:scale-105 active:scale-95 shadow-blue-500/20'}`}
              >
                <LayoutGrid className="w-4 h-4" /> {state.isGlobalRendering ? 'RUNNING...' : 'RUN ALL LINES'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-8 space-y-8">
        {state.rows.map((row) => (
          <div key={row.id} className="group glass-panel rounded-3xl border border-white/5 overflow-hidden shadow-2xl transition-all hover:border-white/10">
            <div className="flex flex-col lg:flex-row items-stretch">
              
              <div className="w-full lg:w-[380px] p-6 bg-slate-900/40 border-r border-white/5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-600 text-2xl tracking-tighter uppercase">Line #{row.id}</span>
                  <button onClick={() => clearRow(row.id)} className="p-2 text-slate-700 hover:text-rose-500 transition-colors" title="Xóa dòng này"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(['bg', 'box', 'bag'] as const).map(type => (
                    <label key={type} className="flex flex-col gap-2">
                      <span className="text-[8px] font-black text-slate-500 uppercase text-center tracking-widest">{type === 'bg' ? 'Background' : type === 'box' ? 'Box' : 'Product'}</span>
                      <div className="w-full aspect-[3/4] relative cursor-pointer rounded-xl overflow-hidden border border-white/5 bg-slate-950 hover:border-blue-500/50 transition-all">
                        {row[`${type}Image`] ? <img src={row[`${type}Image`]!} className="w-full h-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center"><ImageIcon className="w-5 h-5 text-slate-900" /></div>}
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(row.id, type, e.target.files[0])} />
                      </div>
                    </label>
                  ))}
                </div>
                <button onClick={() => renderSingleRow(row.id)} disabled={row.isRendering || !row.bgImage || !row.boxImage || !row.bagImage} className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${row.isRendering ? 'bg-slate-800 text-slate-500 animate-pulse' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20'}`}>
                  {row.isRendering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                  {row.isRendering ? 'PROCESSING...' : 'GENERATE ASSETS'}
                </button>
              </div>

              <div className="flex-1 p-6 bg-slate-900/10 border-r border-white/5">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className={`w-4 h-4 ${row.conceptImages.length > 0 ? 'text-green-500' : 'text-slate-800'}`} />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Visual Concepts (3 Stages)</span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                  {row.conceptImages.length > 0 ? row.conceptImages.map(img => (
                    <div key={img.id} className="relative w-36 aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 group shadow-xl flex-shrink-0 bg-slate-900">
                      <img src={img.imageUrl} className="w-full h-full object-cover cursor-zoom-in transition-transform duration-500 group-hover:scale-110" onClick={() => window.open(img.imageUrl, '_blank')} />
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm p-2 text-[8px] font-bold text-white text-center uppercase">
                        {img.title}
                      </div>
                    </div>
                  )) : (
                    <div className="flex-1 min-h-[180px] flex flex-col items-center justify-center border border-dashed border-white/5 rounded-3xl text-slate-800 italic text-xs gap-2 text-center px-4">
                      {row.isRendering ? (
                         <>
                            <Loader2 className="w-6 h-6 animate-spin text-blue-500/50" />
                            <span>AI đang tạo 3 tấm hình Concept...</span>
                         </>
                      ) : 'Hình ảnh Concept sẽ hiển thị ở đây'}
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full lg:w-[650px] p-6 bg-slate-900/60 relative flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className={`w-4 h-4 ${row.videoScript ? 'text-blue-500' : 'text-slate-800'}`} />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kịch Bản & Prompt Cho Veo 3</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {row.videoScript && (
                      <button 
                        onClick={() => handleZipDownload(row)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
                      >
                        <Download className="w-4 h-4" /> ZIP
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 space-y-4 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                  {row.videoScript ? (
                    <>
                      <div className="p-4 bg-blue-600/5 rounded-2xl border border-blue-600/10 mb-2">
                         <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest block mb-1">Concept chiến dịch:</span>
                         <p className="text-sm font-bold text-white leading-tight">{row.videoScript.content}</p>
                      </div>
                      
                      <div className="space-y-4">
                        {row.videoScript.scenes.map((scene, idx) => (
                          <div key={idx} className="bg-slate-950/80 rounded-2xl border border-white/5 p-4 group hover:border-blue-500/40 transition-all shadow-inner">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <span className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center text-xs font-black shadow-lg shadow-blue-600/20">
                                  {idx+1}
                                </span>
                                <div>
                                  <p className="text-[10px] font-black text-white uppercase tracking-tighter">Cảnh {idx+1}</p>
                                  <p className="text-[9px] font-bold text-slate-500">{scene.time}</p>
                                </div>
                              </div>
                              <button 
                                onClick={() => copyToClipboard(scene.veoPrompt)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
                              >
                                <Copy className="w-3 h-3" /> Copy Prompt
                              </button>
                            </div>
                            
                            <div className="space-y-3">
                              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Lời thoại / Voiceover:</span>
                                <p className="text-[11px] text-slate-300 italic font-medium">"{scene.dialogue}"</p>
                              </div>
                              
                              <div className="p-3 bg-slate-900 rounded-xl border border-blue-500/20 group-hover:border-blue-500/50 transition-colors">
                                <span className="text-[8px] font-black text-blue-400 uppercase block mb-1">Veo 3 Production Prompt:</span>
                                <p className="text-[11px] text-slate-400 leading-relaxed font-mono select-all">
                                  {scene.veoPrompt}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[250px] opacity-20 gap-4 border-2 border-dashed border-white/5 rounded-[2rem]">
                      {row.isRendering && row.progress >= 50 ? (
                        <div className="flex flex-col items-center gap-3">
                           <div className="relative">
                              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                              <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-yellow-500 animate-pulse" />
                           </div>
                           <span className="text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse">Đang biên soạn kịch bản...</span>
                        </div>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center">
                            <ChevronRight className="w-8 h-8 text-slate-600" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-center max-w-[200px]">
                            Nhấn Generate để tạo Concept & Prompt
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {row.isRendering && (
              <div className="h-1 w-full bg-slate-950 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-400 transition-all duration-1000 ease-out" 
                  style={{ width: `${row.progress}%` }} 
                />
              </div>
            )}
          </div>
        ))}
      </main>

      <footer className="p-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900/50 rounded-full border border-white/5">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Veo Production Factory Hub &copy; 2025</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
