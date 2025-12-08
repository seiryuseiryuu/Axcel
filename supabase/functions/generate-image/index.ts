import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, referenceImages, assetCount = 0, ownChannelCount = 0, competitorCount = 0, editMode = false, originalImage = null } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    // Build message content with optional reference images
    const messageContent: any[] = [];

    // For edit mode, add the original image first
    if (editMode && originalImage) {
      console.log('Edit mode: Including original image for modification');
      messageContent.push({
        type: 'image_url',
        image_url: {
          url: originalImage,
        },
      });
    }

    // Add reference images first if provided
    // Order: registered assets first, then own channel thumbnails, then competitor thumbnails
    if (referenceImages && Array.isArray(referenceImages) && referenceImages.length > 0) {
      console.log(`Including ${referenceImages.length} reference images (assets: ${assetCount}, own channel: ${ownChannelCount}, competitor: ${competitorCount})`);
      
      for (const imageUrl of referenceImages) {
        if (imageUrl && typeof imageUrl === 'string') {
          messageContent.push({
            type: 'image_url',
            image_url: {
              url: imageUrl,
            },
          });
        }
      }
    }

    // Create detailed prompt for YouTube thumbnail generation with registered assets and person consistency
    const assetNote = assetCount > 0
      ? `
CRITICAL - Registered Channel Assets (HIGHEST PRIORITY):
- The first ${assetCount} reference image(s) are registered channel assets
- These include the channel's main person(s), characters, and icons
- You MUST use these people/characters EXACTLY as they appear
- Match their: face shape, facial features, hair style, skin tone, clothing style, and overall appearance PERFECTLY
- These are the channel's identity - they must be recognizable across all thumbnails
- If there's a "自分" (self) image, that person MUST be the main character in the thumbnail
`
      : '';

    const ownChannelNote = ownChannelCount > 0
      ? `
Own Channel Thumbnails (${ownChannelCount} images after assets):
- These are from the creator's OWN channel
- Use the SAME PERSON who appears in these thumbnails
- Match their face, appearance, and style consistently
- These images define the channel's visual identity
`
      : '';

    const competitorNote = competitorCount > 0
      ? `
Competitor Channel Thumbnails (${competitorCount} images at the end):
- These are from COMPETITOR channels - for STYLE REFERENCE ONLY
- DO NOT copy or use any people/faces from these images
- ONLY reference: layout, composition, color schemes, visual effects, typography style
- The people in competitor thumbnails are NOT the creator - never use their likeness
`
      : '';

    // Edit mode prompt - preserve unchanged parts
    const editModePrompt = editMode && originalImage
      ? `You are editing an existing YouTube thumbnail image. The FIRST image provided is the ORIGINAL thumbnail that needs modification.

CRITICAL EDITING RULES:
1. ONLY modify the specific elements mentioned in the user's request
2. PRESERVE EVERYTHING ELSE EXACTLY AS IT IS in the original image:
   - Keep the same background if not mentioned
   - Keep the same person/face if not mentioned
   - Keep the same colors if not mentioned
   - Keep the same layout/composition if not mentioned
   - Keep the same text position and style if not mentioned
3. The output should look like a minor edit of the original, NOT a completely new image
4. Maintain the exact same aspect ratio (16:9, 1280x720)

User's modification request: ${prompt}

Remember: ONLY change what the user specifically asked to change. Everything else must remain IDENTICAL to the original image.`
      : null;

    const enhancedPrompt = editModePrompt 
      ? editModePrompt
      : referenceImages && referenceImages.length > 0
      ? `You are a professional YouTube thumbnail designer. Study the reference images provided carefully.
${assetNote}${ownChannelNote}${competitorNote}
CRITICAL - COMPOSITION AND LAYOUT ADHERENCE:
- You MUST follow the EXACT same composition and layout as the reference thumbnails
- Copy the EXACT positioning: where text is placed, where people are positioned, background arrangement
- Match the visual hierarchy and element placement PRECISELY
- If references show person on left with text on right, do the SAME
- If references show centered face with text overlay, do the SAME
- The composition must be IMMEDIATELY recognizable as being from the same channel

Based on these references, create a NEW YouTube thumbnail with these specifications:
- Aspect ratio: 16:9 (1280x720)
- Main content/theme: ${prompt}
- COPY the EXACT composition, layout, and element positioning from reference thumbnails
- Style: Match the visual style, energy, and color palette of the reference thumbnails
- Make it eye-catching, high contrast, and professional
- The people in the registered assets or own channel thumbnails MUST appear in the thumbnail with EXACT likeness

CRITICAL TEXT RULES:
- Do NOT include long text or full video titles on the thumbnail
- Text should be minimal: 1-3 impactful words MAXIMUM
- Use short, punchy keywords or emotional phrases only (e.g., "衝撃", "最強", "ヤバい", "!?")
- Place text in the EXACT same position as shown in reference thumbnails
- Let the visual imagery convey the message, not text

IMPORTANT: 
- The person(s) from registered assets or own channel must be the MAIN focus
- Their face must be clearly visible and recognizable
- Position people in the SAME location as in reference thumbnails
- DO NOT use faces from competitor thumbnails - only use their style/composition
- Create an original composition that STRICTLY follows the reference layout`
      : `Create a professional YouTube thumbnail image in 16:9 aspect ratio (1280x720). 
Theme: ${prompt}. 
Style: High contrast, vibrant colors, eye-catching design suitable for YouTube. 
Make it visually striking and attention-grabbing. Wide landscape format.
CRITICAL: Do NOT put long text or video titles on the thumbnail. Use minimal text only - 1-3 impactful words maximum.`;

    // Add the text prompt
    messageContent.push({
      type: 'text',
      text: enhancedPrompt,
    });

    console.log('Generating image with', referenceImages?.length || 0, 'total reference images');
    console.log('Edit mode:', editMode, 'Has original:', !!originalImage);
    console.log('Prompt preview:', enhancedPrompt.substring(0, 400) + '...');

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{
          parts: messageContent.map(item => {
            if (item.type === 'text') {
              return { text: item.text };
            } else if (item.type === 'image_url') {
              // For base64 images
              if (item.image_url.url.startsWith('data:')) {
                const matches = item.image_url.url.match(/^data:([^;]+);base64,(.+)$/);
                if (matches) {
                  return {
                    inline_data: {
                      mime_type: matches[1],
                      data: matches[2]
                    }
                  };
                }
              }
              // For URLs, we need to fetch and convert to base64
              return { text: `[Reference image: ${item.image_url.url}]` };
            }
            return null;
          }).filter(Boolean)
        }],
        generationConfig: {
          responseModalities: ['Text', 'Image']
        }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'レート制限に達しました。しばらくお待ちください。' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error('Gemini API error: ' + errorText);
    }

    const data = await response.json();
    console.log('Gemini API response received');

    // Extract image from Gemini response
    let imageUrl = null;
    const candidates = data.candidates;
    if (candidates && candidates[0] && candidates[0].content && candidates[0].content.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!imageUrl) {
      console.error('No image in response:', JSON.stringify(data));
      throw new Error('画像の生成に失敗しました');
    }

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Image generation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
