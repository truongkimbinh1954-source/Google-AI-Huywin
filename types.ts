
export interface AdScene {
  id: string;
  title: string;
  subtitle: string;
  prompt: string;
  imageUrl?: string;
  status: 'idle' | 'generating' | 'completed' | 'error';
}

export interface VideoScript {
  duration: number;
  content: string;
  scenes: {
    time: string;
    description: string;
    dialogue: string;
    veoPrompt: string;
  }[];
}

export type AspectRatio = '9:16' | '3:4' | '1:1' | '4:3' | '16:9';

export interface ProductionRow {
  id: number;
  bgImage: string | null;
  boxImage: string | null;
  bagImage: string | null;
  conceptImages: AdScene[];
  videoScript: VideoScript | null;
  videoUrl: string | null;
  isRendering: boolean;
  progress: number;
}

export interface GlobalState {
  style: string;
  aspectRatio: AspectRatio;
  rows: ProductionRow[];
  isGlobalRendering: boolean;
}
