import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STYLE =
  "Ets el speaker oficial d'un camp de futbol català. Parla en català, amb veu masculina potent, molt enèrgica i emocionant, amb entonació d'estadi, allargant els noms amb passió. Digues exactament: ";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const auth = req.headers.get("Authorization") || "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return json({ error: "No autoritzat" }, 401);

    const { text } = await req.json().catch(() => ({}));
    if (typeof text !== "string" || !text.trim() || text.length > 1500) return json({ error: "Text no vàlid" }, 400);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "Falta LOVABLE_API_KEY" }, 500);

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-tts-preview",
        contents: [{ role: "user", parts: [{ text: STYLE + text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Fenrir" } } },
        },
        stream_format: "audio",
      }),
    });

    if (!upstream.ok) {
      const details = await upstream.text();
      console.error(`TTS failed [${upstream.status}]: ${details}`);
      return json({ error: "Error de síntesi de veu", status: upstream.status, details }, upstream.status);
    }
    return new Response(upstream.body, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": upstream.headers.get("Content-Type") || "audio/wav", "Cache-Control": "no-cache" },
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Error" }, 500);
  }
});
