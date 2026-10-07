type ResponsesInput = {
  model: string;
  input: any;
  max_output_tokens?: number;
  temperature?: number;
  response_format?: any;
};

export type OpenAIJsonResult<T> = {
  ok: true;
  data: T;
  raw_text: string;
} | {
  ok: false;
  error: string;
};

export type OpenAIEmbeddingResult = {
  ok: true;
  embedding: number[];
  model: string;
} | {
  ok: false;
  error: string;
};

function getEnv(name: string) {
  return process.env[name] && String(process.env[name]).trim() ? String(process.env[name]).trim() : undefined;
}

export async function openaiResponsesJson<T>(payload: ResponsesInput): Promise<OpenAIJsonResult<T>> {
  const apiKey = getEnv("OPENAI_API_KEY");
  if (!apiKey) return { ok: false, error: "OPENAI_API_KEY is not set" };

  const url = "https://api.openai.com/v1/responses";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (!res.ok) {
      return { ok: false, error: `OpenAI error ${res.status}: ${text.slice(0, 4000)}` };
    }

    const json = JSON.parse(text);
    // Responses API returns an array of output items; easiest is to read output_text convenience field when present.
    const raw_text: string = (json.output_text && typeof json.output_text === "string")
      ? json.output_text
      : JSON.stringify(json);

    // Try to parse the first JSON object in the output_text.
    const match = raw_text.match(/\{[\s\S]*\}/);
    if (!match) return { ok: false, error: "Model did not return JSON" };
    const data = JSON.parse(match[0]) as T;
    return { ok: true, data, raw_text };
  } catch (e: any) {
    return { ok: false, error: e?.message ? String(e.message) : "Unknown error" };
  }
}

export function getDefaultOpenAIModel() {
  return getEnv("OPENAI_MODEL") ?? "gpt-5-mini";
}

export function getOpenAIEmbeddingModel() {
  return getEnv("OPENAI_EMBEDDING_MODEL") ?? "text-embedding-3-small";
}

export function getOpenAIVisionModel() {
  return getEnv("OPENAI_VISION_MODEL") ?? getEnv("OPENAI_IMAGE_MODEL") ?? "gpt-4o-mini";
}

export async function openaiEmbedText(input: string, model?: string): Promise<OpenAIEmbeddingResult> {
  const apiKey = getEnv("OPENAI_API_KEY");
  if (!apiKey) return { ok: false, error: "OPENAI_API_KEY is not set" };

  const payload = {
    model: model ?? getOpenAIEmbeddingModel(),
    input,
  };

  const url = "https://api.openai.com/v1/embeddings";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (!res.ok) {
      return { ok: false, error: `OpenAI error ${res.status}: ${text.slice(0, 4000)}` };
    }

    const json = JSON.parse(text);
    const raw = json?.data?.[0]?.embedding;
    if (!Array.isArray(raw) || raw.length === 0) {
      return { ok: false, error: "Embedding missing from response" };
    }

    const embedding = raw.map((v: any) => Number(v));
    if (embedding.some((v: number) => !Number.isFinite(v))) {
      return { ok: false, error: "Embedding contains non-numeric values" };
    }

    return { ok: true, embedding, model: payload.model };
  } catch (e: any) {
    return { ok: false, error: e?.message ? String(e.message) : "Unknown error" };
  }
}
