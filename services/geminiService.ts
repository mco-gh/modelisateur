import { GoogleGenAI } from "@google/genai";

const getPromptForStage = (userDescription: string, stageId: number, hasReference: boolean): string => {
  const baseObject = `a sculpture of '${userDescription}'`;
  
  // If we have a reference image (Stages 1-3), the prompt is an instruction to transform that image.
  // If we don't (Stage 4), it's a generation prompt.
  
  if (hasReference) {
    switch (stageId) {
      case 1:
        return `Transform this image into the very first stage: a single, rough round blob of wet grey clay representing only the general outline of the sculpture. Maintain the same camera angle and lighting.`;
      case 2:
        return `Transform this image into a blocking stage: a wet grey clay construction divided into major geometric sub-blocks and masses (like head, body, limbs) showing the configuration of the subject shown. Remove fine details like eyes or texture. Keep the pose and orientation exactly as in the reference. Constructivist style.`;
      case 3:
        //return `Transform this image into a work-in-progress stage: the wet grey clay sculpture is taking shape. Primary forms are smoothed together. Details are just beginning to emerge but are still rough compared to the reference. Add visible tool marks, rake marks, and fingerprints. Maintain the exact pose and composition.`;
        return `Transform this image into a work-in-progress stage halfway between rough blocks and the final image. Maintain the exact pose and composition.`;
      default:
        return `A clay sculpture of ${userDescription}`;
    }
  }

  // Initial generation (Stage 4)
  if (stageId === 4) {
      return `A finished, highly detailed masterpiece wet grey clay sculpture of ${baseObject}. Intricate textures, lifelike details, perfect proportions. The clay looks wet and malleable. Dramatic studio lighting. Photorealistic studio photography.`;
  }

  // Fallback if something weird happens (e.g. Stage 1 without reference, though app logic prevents this)
  return `A clay sculpture of ${userDescription}`;
};

export const generateStageImage = async (userPrompt: string, stageId: number, referenceImageBase64?: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const hasReference = !!referenceImageBase64;
    const stagePrompt = getPromptForStage(userPrompt, stageId, hasReference);

    const parts: any[] = [];

    // If we have a reference image, add it to the parts
    if (referenceImageBase64) {
        // Strip the data URL prefix if present to get just the base64 string
        const base64Data = referenceImageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
        
        parts.push({
            inlineData: {
                data: base64Data,
                mimeType: 'image/png' // We assume PNG based on previous output, but could be dynamic
            }
        });
    }

    // Add the text prompt
    parts.push({ text: stagePrompt });

    // Using the requested High-Quality model (Gemini 3 Pro Image)
    // Note: To use image input for editing/variation, the model supports it via generateContent
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: parts
      },
      config: {
        imageConfig: {
            aspectRatio: "1:1"
        }
      }
    });

    // Extract image from response
    if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          return `data:image/png;base64,${base64EncodeString}`;
        }
      }
    }

    throw new Error("No image data found in response");
  } catch (error) {
    console.error(`Error generating stage ${stageId}:`, error);
    throw error;
  }
};