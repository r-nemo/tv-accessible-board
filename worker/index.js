export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        }
      });
    }

    const url = new URL(request.url);
    const text = url.searchParams.get("text") || "こんにちは";
    const voiceName = url.searchParams.get("voice") || "ja-JP-Neural2-D";

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    };

    if (!env.GOOGLE_TTS_API_KEY) {
      return new Response("Missing GOOGLE_TTS_API_KEY in environment variables", {
        status: 500,
        headers: corsHeaders
      });
    }

    const googleUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${env.GOOGLE_TTS_API_KEY}`;
    const payload = {
      input: { text: text },
      voice: {
        languageCode: "ja-JP",
        name: voiceName
      },
      audioConfig: {
        audioEncoding: "MP3"
      }
    };

    const googleRes = await fetch(googleUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!googleRes.ok) {
      const err = await googleRes.text();
      return new Response(`Google TTS Error: ${err}`, { status: 500, headers: corsHeaders });
    }

    const data = await googleRes.json();
    const binary = Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0));

    return new Response(binary, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=604800"
      }
    });
  }
};
