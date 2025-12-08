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
    const { prompt, referenceImages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    // Build message content with optional reference images
    const messageContent: any[] = [];

    // Add reference images first if provided
    if (referenceImages && Array.isArray(referenceImages) && referenceImages.length > 0) {
      console.log(`Including ${referenceImages.length} reference images`);
      
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

    // Create detailed prompt for YouTube thumbnail generation
    const enhancedPrompt = referenceImages && referenceImages.length > 0
      ? `You are a professional YouTube thumbnail designer. Study the reference thumbnails provided carefully - analyze their composition, color schemes, text placement, and visual style.

Based on these references, create a NEW YouTube thumbnail with these specifications:
- Aspect ratio: 16:9 (1280x720)
- Text to display: "${prompt}"
- Style: Match the visual style, energy, and color palette of the reference thumbnails
- Make it eye-catching, high contrast, and professional
- Incorporate similar design elements (text effects, overlays, color gradients) from the references

Important: Create an original thumbnail inspired by the references, don't copy them exactly.`
      : `Create a professional YouTube thumbnail image in 16:9 aspect ratio (1280x720). ${prompt}. 
Style: High contrast, vibrant colors, eye-catching design suitable for YouTube. 
Make it visually striking and attention-grabbing. Wide landscape format.`;

    // Add the text prompt
    messageContent.push({
      type: 'text',
      text: enhancedPrompt,
    });

    console.log('Generating image with', referenceImages?.length || 0, 'reference images');
    console.log('Prompt:', enhancedPrompt.substring(0, 200) + '...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [
          {
            role: 'user',
            content: messageContent,
          },
        ],
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'レート制限に達しました。しばらくお待ちください。' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'クレジットが不足しています。' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error('AI Gateway error');
    }

    const data = await response.json();
    console.log('AI Gateway response received');

    // Extract image URL from the response
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error('No image URL in response:', JSON.stringify(data));
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
