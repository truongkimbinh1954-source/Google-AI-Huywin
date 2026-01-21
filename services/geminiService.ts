
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

/**
 * Tạo 3 hình ảnh concept theo yêu cầu cụ thể của người dùng
 */
export const generateConceptImages = async (
  bgImg: string,
  boxImg: string,
  bagImg: string,
  aspectRatio: string
): Promise<string[]> => {
  const ai = getAI();
  const imageUrls: string[] = [];

  // Ảnh 1: Ghép hộp và túi vào nền + bàn tay để trên bàn
  const prompt1 = `Professional luxury commercial photography, 8k resolution, super realistic, high detail. 
  TASK: Composite the gift box (from image 2) and the handbag (from image 3) into the background (image 1). 
  ADDITION: A girl's hand is resting gracefully on the table next to the products. 
  LIGHTING: Cinematic studio lighting, sharp focus on products. Aspect ratio: 9:16.`;
  
  const response1 = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [
      {
        parts: [
          { text: prompt1 },
          { inlineData: { data: bgImg.split(',')[1], mimeType: 'image/png' } },
          { inlineData: { data: boxImg.split(',')[1], mimeType: 'image/png' } },
          { inlineData: { data: bagImg.split(',')[1], mimeType: 'image/png' } },
        ]
      }
    ],
    config: { imageConfig: { aspectRatio: '9:16' as any } }
  });

  const baseImage = extractImage(response1);
  if (!baseImage) throw new Error("Không thể tạo hình ảnh Concept 1.");
  imageUrls.push(baseImage);

  // Ảnh 2: Như ảnh 1 nhưng tay nắm túi xách
  const prompt2 = `Continuation of the previous scene. Super realistic, high detail, professional photoshoot. 
  CHANGE: The girl's hand is now gracefully grasping the handle of the handbag. 
  Keep everything else (lighting, background, products) consistent. Aspect ratio: 9:16.`;
  
  const response2 = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [
      {
        parts: [
          { text: prompt2 },
          { inlineData: { data: baseImage.split(',')[1], mimeType: 'image/png' } }
        ]
      }
    ],
    config: { imageConfig: { aspectRatio: '9:16' as any } }
  });
  imageUrls.push(extractImage(response2) || baseImage);

  // Ảnh 3: Cô gái mang túi lên vai, không lộ mặt
  const prompt3 = `High-end fashion commercial photography. Super realistic, high detail. 
  SCENE: The same girl from before is now wearing the handbag over her shoulder. 
  CAMERA ANGLE: Shot from the shoulders down to the feet, ensuring NO face is visible. 
  The girl is posing elegantly with the bag. Professional lighting. Aspect ratio: 9:16.`;
  
  const response3 = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [
      {
        parts: [
          { text: prompt3 },
          { inlineData: { data: baseImage.split(',')[1], mimeType: 'image/png' } }
        ]
      }
    ],
    config: { imageConfig: { aspectRatio: '9:16' as any } }
  });
  imageUrls.push(extractImage(response3) || baseImage);

  return imageUrls;
};

const extractImage = (response: GenerateContentResponse): string | null => {
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};

/**
 * Tạo kịch bản video 24s và Prompt VEO 3
 */
export const generateVideoFlow = async (
  imageUrls: string[],
  style: string
): Promise<any> => {
  const ai = getAI();
  const imageParts = imageUrls.map(url => ({
    inlineData: { data: url.split(',')[1], mimeType: 'image/png' }
  }));

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ 
      parts: [
        ...imageParts, 
        { text: `Based on these 3 concept images, create a 24-second professional commercial video script (3 scenes x 8 seconds).
        THEME: High-end Handbag Product Introduction.
        CAMERA STYLE: Shot from shoulders down to feet, NO face visible.
        REQUIREMENTS:
        1. Write a Vietnamese dialogue script for the voiceover.
        2. Convert each scene into a detailed English production prompt for VEO 3 (AI Video Model).
        3. Ensure prompts describe cinematic movements, textures, and high-end fashion aesthetics.` }
      ] 
    }],
    config: {
      systemInstruction: `You are a Creative Director for high-end fashion commercials. 
      Return ONLY a JSON object. 
      For 'veoPrompt', provide a detailed, technical English prompt for the VEO 3 video model focusing on lighting, textures, and cinematic camera movement. 
      For 'dialogue', provide natural, engaging Vietnamese voiceover text.
      Strictly follow the 'no face' and 'shoulder-down' camera direction.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          duration: { type: Type.NUMBER },
          content: { type: Type.STRING },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.STRING },
                description: { type: Type.STRING },
                dialogue: { type: Type.STRING },
                veoPrompt: { type: Type.STRING }
              },
              required: ["time", "description", "dialogue", "veoPrompt"]
            }
          }
        },
        required: ["duration", "content", "scenes"]
      }
    }
  });

  try {
    const text = response.text.trim();
    const cleanedJson = text.replace(/^```json\s*|\s*```$/g, '');
    return JSON.parse(cleanedJson);
  } catch (e) {
    console.error("Parse error:", e);
    return {
      duration: 24,
      content: "Giới thiệu túi xách cao cấp - No Face Style",
      scenes: [
        {
          time: "0-8s",
          description: "Mở hộp và tay chạm túi xách trên bàn",
          dialogue: "Một món quà tinh tế dành riêng cho phái đẹp, hãy cùng mình khám phá nhé.",
          veoPrompt: "Cinematic close-up of a luxury gift box opening on a marble table, a girl's hand gently reaching out and touching a premium leather handbag. Soft morning light, shallow depth of field, 4k, hyper-realistic, elegant camera glide."
        },
        {
          time: "8-16s",
          description: "Tay nhấc túi xách lên, tập trung vào chất liệu",
          dialogue: "Chất liệu da cao cấp với đường may tỉ mỉ, chiếc túi này thực sự là một tác phẩm nghệ thuật.",
          veoPrompt: "Macro shot of a girl's hand grasping the handle of a leather handbag and lifting it gracefully. Focus on the rich texture of the leather and the gold hardware. Cinematic slow motion, bokeh background, fashion commercial lighting."
        },
        {
          time: "16-24s",
          description: "Model mang túi trên vai, quay từ vai xuống chân",
          dialogue: "Dù đi làm hay dạo phố, đây chính là người bạn đồng hành hoàn hảo để tôn lên vẻ sang trọng của bạn.",
          veoPrompt: "Full body tracking shot from shoulders down to feet, NO face visible. A stylish woman walking elegantly while wearing the handbag over her shoulder. High-end interior setting, cinematic lighting, fluid camera movement, capturing the swing of the bag and the model's outfit."
        }
      ]
    };
  }
};
