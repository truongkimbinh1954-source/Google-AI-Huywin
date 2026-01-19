
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

/**
 * Creates 3 concept images in a sequence.
 */
export const generateConceptImages = async (
  bgImg: string,
  boxImg: string,
  bagImg: string,
  aspectRatio: string
): Promise<string[]> => {
  const ai = getAI();
  const imageUrls: string[] = [];

  const prompt1 = `Luxury commercial photography. Composite the gift box and the handbag from the provided images into the background scene. Add a girl's hand resting on the table. Professional lighting, 8k resolution. Aspect ratio: ${aspectRatio}.`;
  
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
    config: { imageConfig: { aspectRatio: aspectRatio as any } }
  });

  const baseImage = extractImage(response1);
  if (!baseImage) throw new Error("Failed to generate base concept image.");
  imageUrls.push(baseImage);

  const prompt2 = `Same scene. The girl's hand is now gracefully grasping the handle of the handbag. Maintain consistent lighting and model features.`;
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
    config: { imageConfig: { aspectRatio: aspectRatio as any } }
  });
  imageUrls.push(extractImage(response2) || baseImage);

  const prompt3 = `Same girl and bag. The girl is now wearing the handbag on her shoulder, posing for high-fashion commercial. Background is the same desk/room.`;
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
    config: { imageConfig: { aspectRatio: aspectRatio as any } }
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
        { text: `Based on these 3 images, create a professional 24-second video script (3 scenes x 8s). Style: ${style}. For each scene, provide a descriptive technical prompt for the Veo 3 video model.` }
      ] 
    }],
    config: {
      systemInstruction: "You are an expert creative director for short video ads. Return ONLY a JSON object. For 'veoPrompt', write a cinematic, detailed English prompt focusing on camera movement and model action. For 'dialogue', write natural Vietnamese. Ensure NO loop or repetition.",
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
    // Return high-quality fallback if parsing fails
    return {
      duration: 24,
      content: "Quảng cáo sản phẩm thời trang cao cấp",
      scenes: [
        {
          time: "0-8s",
          description: "Mở hộp và giới thiệu sản phẩm",
          dialogue: "Chào mọi người, hôm nay mình sẽ unbox chiếc túi siêu xinh này nhé!",
          veoPrompt: "Close-up cinematic shot of a luxury gift box opening on a desk, soft studio lighting, revealing a stylish blue leather handbag, 4k, realistic."
        },
        {
          time: "8-16s",
          description: "Chi tiết sản phẩm và tương tác",
          dialogue: "Chất liệu da cực kỳ cao cấp, cầm rất chắc tay luôn.",
          veoPrompt: "A girl's hand gracefully touching and lifting a blue handbag, macro shot of the texture and gold zipper, elegant camera slide, bokeh background."
        },
        {
          time: "16-24s",
          description: "Model phối đồ cùng túi",
          dialogue: "Phối với đồ nào cũng hợp, cực kỳ sang chảnh nhé.",
          veoPrompt: "Fashion model wearing a blue handbag over her shoulder, walking confidently in a modern interior, cinematic tracking shot, high-end fashion commercial style."
        }
      ]
    };
  }
};
