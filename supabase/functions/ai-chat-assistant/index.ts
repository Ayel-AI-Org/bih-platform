import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatPayload = {
  messages: ChatMessage[];
};

type ProviderConfig = {
  name: "gemini" | "groq" | "openai";
  kind: "gemini" | "openai-compatible";
  apiKey: string;
  endpoint: string;
  model: string;
  fallbackModels?: string[];
};

const resolveGeminiProvider = (): ProviderConfig | null => {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (geminiKey) {
    const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.0-flash";
    return {
      name: "gemini",
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

  return null;
};

const resolveGroqProvider = (): ProviderConfig | null => {
  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (groqKey) {
    return {
      name: "groq",
      kind: "openai-compatible",
      apiKey: groqKey,
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      model: Deno.env.get("GROQ_MODEL") || "llama-3.1-8b-instant",
    };
  }

  return null;
};

const resolveOpenAiProvider = (): ProviderConfig | null => {
  const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
  if (openAiApiKey) {
    return {
      name: "openai",
      kind: "openai-compatible",
      apiKey: openAiApiKey,
      endpoint: "https://api.openai.com/v1/chat/completions",
      model: Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini",
    };
  }

  return null;
};

const resolveProviderChain = (): ProviderConfig[] => {
  const chain = [resolveGeminiProvider(), resolveGroqProvider(), resolveOpenAiProvider()].filter(
    (provider): provider is ProviderConfig => provider !== null,
  );
  return chain;
};

const assistantInstruction =
  "You are BIH Assistant for Bridge for Impact Hub. Help users with registration, project suggestions, donations, and admin workflow. Keep responses short, practical, and friendly.";

const localFallbackReply =
  "I can still help right now. Share your goal and I will guide you step-by-step: project suggestion drafting, donation flow, registration flow, or admin review actions.";

const normalizeMessagesForGemini = (messages: ChatMessage[]) => {
  const sanitized = messages
    .filter((message) => typeof message.content === "string" && message.content.trim().length > 0)
    .map((message) => ({ role: message.role, content: message.content.trim() }));

  while (sanitized.length > 0 && sanitized[0].role !== "user") {
    sanitized.shift();
  }

  return sanitized;
};

const callGemini = async (provider: ProviderConfig, messages: ChatMessage[]) => {
  const normalizedMessages = normalizeMessagesForGemini(messages);

  if (normalizedMessages.length === 0) {
    return "Tell me what you want help with, and I’ll guide you.";
  }

  const contents = normalizedMessages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

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
          parts: [{ text: assistantInstruction }],
        },
        contents,
        generationConfig: {
          temperature: 0.5,
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
    const reply = parts?.map((item) => item.text ?? "").join("\n").trim();
    if (reply) {
      return reply;
    }
  }

  throw new Error(lastError);
};

const callOpenAiCompatible = async (provider: ProviderConfig, messages: ChatMessage[]) => {
  const response = await fetch(provider.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content: assistantInstruction,
        },
        ...messages,
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "AI request failed");
  }

  const responseBody = await response.json();
  const reply = responseBody?.choices?.[0]?.message?.content?.trim();
  return reply;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const providers = resolveProviderChain();
    if (providers.length === 0) {
      return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as ChatPayload;
    const messages = payload?.messages ?? [];

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let reply = "";
    let lastProviderError = "AI request failed";

    for (const provider of providers) {
      try {
        if (provider.kind === "gemini") {
          reply = (await callGemini(provider, messages)) || "";
        } else {
          reply = (await callOpenAiCompatible(provider, messages)) || "";
        }

        if (reply) {
          break;
        }
      } catch (providerError) {
        const reason = providerError instanceof Error ? providerError.message : "Unknown provider error";
        lastProviderError = `${provider.name}: ${reason}`;
      }
    }

    if (!reply) {
      throw new Error(lastProviderError);
    }

    return new Response(JSON.stringify({ reply: reply || "I can help with projects, donations, and registrations." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({
      reply: localFallbackReply,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
