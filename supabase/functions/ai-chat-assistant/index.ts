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
    const model = Deno.env.get("GROQ_MODEL") || "openai/gpt-oss-20b";
    return {
      name: "groq",
      kind: "openai-compatible",
      apiKey: groqKey,
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      model,
      fallbackModels: [
        "openai/gpt-oss-20b",
        "qwen/qwen3.8-27b",
        "allam-2-7b",
      ],
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

const assistantInstruction = `You are the public BIH Assistant for Bridge for Impact Hub (BIH).
Your role is to assist members of the public, prospective volunteers, partner NGOs, and donors.

VERIFIED ORGANIZATION FACTS:
- Organization: Bridge for Impact Hub (BIH)
- Mission: Connecting passionate volunteers, forward-thinking NGOs, and visionary donors to transform Ghanaian communities through impactful, sustainable community development projects.
- Location: Accra, Ghana
- Official Contact: bridgeforimpacthub@gmail.com
- Official Phone: +233 (0) 57 880 9478

PUBLIC CAPABILITIES & PATHWAYS:
1. Volunteer Registration (/register/volunteer):
   - Open to passionate individuals wanting to make a difference in Ghanaian communities.
   - Earn service badges, track volunteer hours, and join grassroots initiatives.
2. NGO Partnership (/register/ngo):
   - For accredited NGOs and community-based organizations seeking collaborative project execution.
3. Donor Support (/register/donor or /donate):
   - Support verified projects via secure Paystack processing (supports Mobile Money - MTN, Telecel, AT - and cards).
4. Project Suggestions (/suggest-project):
   - Propose community development initiatives with project overview, target location, timeline, and estimated budget.
5. Stories & Updates (/media):
   - Discover real impact stories and community news across Ghana.

STRICT BOUNDARIES:
- NEVER discuss internal administrative tools, admin dashboard panels, edge functions, database schemas, internal review queues, or backend configurations.
- NEVER invent or hallucinate facts, physical offices outside Accra, Ghana, or unverified contact details.
- Provide clear, empathetic, and professional assistance.

FORMATTING RULES:
- Use concise bullet points or numbered lists for sequential steps.
- Bold important labels and terms using **term**.
- NEVER output raw markdown tables or table separators (such as |---|). Present tabular concepts as bulleted lists instead.
- Keep answers concise, actionable, and warm.`;

const localFallbackReply =
  "I am here to help you learn about Bridge for Impact Hub! You can ask about volunteer registration, NGO partnerships, project proposals, donating via Paystack, or contacting our team in Accra, Ghana at +233 (0) 57 880 9478.";

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
      console.error(`[ai-chat-assistant] Gemini model ${model} HTTP ${response.status}:`, errorText);
      lastError = errorText || `Gemini request failed for model ${model} (HTTP ${response.status})`;
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
  const modelsToTry = [provider.model, ...(provider.fallbackModels ?? [])]
    .filter((value, index, array) => Boolean(value) && array.indexOf(value) === index);

  let lastError = "AI request failed";

  for (const model of modelsToTry) {
    const response = await fetch(provider.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
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
      console.error(`[ai-chat-assistant] ${provider.name} model ${model} HTTP ${response.status}:`, errorText);
      lastError = errorText || `AI request failed for ${provider.name} model ${model} (HTTP ${response.status})`;
      continue;
    }

    const responseBody = await response.json();
    const reply = responseBody?.choices?.[0]?.message?.content?.trim();
    if (reply) {
      return reply;
    }
  }

  throw new Error(lastError);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const providers = resolveProviderChain();
    if (providers.length === 0) {
      console.error("[ai-chat-assistant] No AI provider keys configured (GEMINI_API_KEY, GROQ_API_KEY, OPENAI_API_KEY).");
      return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[ai-chat-assistant] Configured providers:", providers.map((p) => `${p.name} (${p.model})`).join(", "));

    const payload = (await req.json()) as ChatPayload;
    const messages = payload?.messages ?? [];

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let reply = "";
    const providerErrors: string[] = [];

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
        console.error(`[ai-chat-assistant] Provider ${provider.name} failed:`, reason);
        providerErrors.push(`${provider.name}: ${reason}`);
      }
    }

    if (!reply) {
      throw new Error(providerErrors.join(" | "));
    }

    return new Response(JSON.stringify({ reply: reply || "I can help with projects, donations, and registrations." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI assistant failed";
    console.error("[ai-chat-assistant] Error:", message);
    return new Response(JSON.stringify({
      error: message,
    }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
