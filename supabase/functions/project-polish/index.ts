import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PolishPayload = {
  title: string;
  description: string;
  location: string;
  timeline: string;
};

type ProviderConfig = {
  kind: "gemini" | "openai-compatible";
  apiKey: string;
  endpoint: string;
  model: string;
  fallbackModels?: string[];
};

const resolveProvider = (): ProviderConfig | null => {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (geminiKey) {
    const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.0-flash";
    return {
      kind: "gemini",
      apiKey: geminiKey,
      endpoint: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      model,
      fallbackModels: [
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
        "gemini-1.5-pro",
      ],
    };
  }

  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (groqKey) {
    return {
      kind: "openai-compatible",
      apiKey: groqKey,
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      model: Deno.env.get("GROQ_MODEL") || "llama-3.1-70b-versatile",
    };
  }

  const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
  if (openAiApiKey) {
    return {
      kind: "openai-compatible",
      apiKey: openAiApiKey,
      endpoint: "https://api.openai.com/v1/chat/completions",
      model: Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini",
    };
  }

  return null;
};

const resolveOpenAiCompatibleProvider = (): ProviderConfig | null => {
  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (groqKey) {
    return {
      kind: "openai-compatible",
      apiKey: groqKey,
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      model: Deno.env.get("GROQ_MODEL") || "llama-3.1-70b-versatile",
    };
  }

  const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
  if (openAiApiKey) {
    return {
      kind: "openai-compatible",
      apiKey: openAiApiKey,
      endpoint: "https://api.openai.com/v1/chat/completions",
      model: Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini",
    };
  }

  return null;
};

const polishInstruction =
  "You polish NGO project listings. Return strict JSON with keys: title, description. Make text concise, professional, and trustworthy. Do not invent facts, numbers, partners, budgets, or dates.";

const callGemini = async (provider: ProviderConfig, prompt: string) => {
  const modelsToTry = [provider.model, ...(provider.fallbackModels ?? [])]
    .filter((value, index, array) => Boolean(value) && array.indexOf(value) === index);

  let lastError = "Gemini request failed";

  for (const model of modelsToTry) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const response = await fetch(`${endpoint}?key=${provider.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: polishInstruction }],
        },
        contents: [{
          role: "user",
          parts: [{ text: `${prompt}\n\nReturn only JSON: {\"title\":\"...\",\"description\":\"...\"}` }],
        }],
        generationConfig: {
          temperature: 0.4,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      lastError = errorText || `Gemini request failed for model ${model}`;
      continue;
    }

    const responseBody = await response.json();
    const parts = responseBody?.candidates?.[0]?.content?.parts as Array<{ text?: string }> | undefined;
    const raw = parts?.map((item) => item.text ?? "").join("\n").trim();
    if (raw) {
      return raw;
    }
  }

  throw new Error(lastError);
};

const callOpenAiCompatible = async (provider: ProviderConfig, prompt: string) => {
  const response = await fetch(provider.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content: polishInstruction,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "AI request failed");
  }

  const responseBody = await response.json();
  return responseBody?.choices?.[0]?.message?.content;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const provider = resolveProvider();
    if (!provider) {
      return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as PolishPayload;
    if (!payload?.title || !payload?.description || !payload?.location || !payload?.timeline) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Rewrite the project listing for public display. Keep facts and intent unchanged.\n\nTitle: ${payload.title}\nLocation: ${payload.location}\nTimeline: ${payload.timeline}\nDescription: ${payload.description}`;

    let rawContent = "";

    if (provider.kind === "gemini") {
      try {
        rawContent = (await callGemini(provider, prompt)) || "";
      } catch (geminiError) {
        const errorText = geminiError instanceof Error ? geminiError.message : "Gemini request failed";
        const shouldFallback =
          errorText.includes("API_KEY_INVALID") ||
          errorText.includes("API key not valid") ||
          errorText.includes("NOT_FOUND") ||
          errorText.includes("is not found for API version");

        if (!shouldFallback) {
          throw geminiError;
        }

        const backupProvider = resolveOpenAiCompatibleProvider();
        if (!backupProvider) {
          throw geminiError;
        }

        rawContent = (await callOpenAiCompatible(backupProvider, prompt)) || "";
      }
    } else {
      rawContent = (await callOpenAiCompatible(provider, prompt)) || "";
    }

    if (!rawContent) {
      return new Response(JSON.stringify({ error: "AI response was empty" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let polished: { title?: string; description?: string } = {};
    try {
      polished = JSON.parse(rawContent) as { title?: string; description?: string };
    } catch {
      polished = { description: rawContent };
    }

    return new Response(
      JSON.stringify({
        title: polished.title?.trim() || payload.title,
        description: polished.description?.trim() || payload.description,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
