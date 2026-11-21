import { afterEach, describe, expect, test } from "vitest";
import { AiServerSchema, aiServerOf, aiServerView, inlinePicture, ownEmbed, ownEmbedEndpoint, ownEmbedSet, ownJson, ownModelEndpoint, ownPicturesModel, ownServerSet, readJsonAnswer, setOwnModelTransportForTests, setPictureLoaderForTests, type OwnTransport } from "../modules/ai/ownModel.js";
import sharp from "sharp";
import { seal } from "../lib/secretBox.js";

afterEach(() => {
  setOwnModelTransportForTests(null);
  setPictureLoaderForTests(null);
});

describe("the own model server's address", () => {
  test("the chat-completions path is added the OpenAI way; https on the live server, http only elsewhere", () => {
    expect(ownModelEndpoint("https://models.example.com", true).href).toBe("https://models.example.com/v1/chat/completions");
    expect(ownModelEndpoint("https://models.example.com/v1/", true).href).toBe("https://models.example.com/v1/chat/completions");
    expect(ownModelEndpoint("https://gpu.example.com:8443/openai/v1", true).href).toBe("https://gpu.example.com:8443/openai/v1/chat/completions");
    expect(ownModelEndpoint("https://x.example.com/v1/chat/completions", true).href).toBe("https://x.example.com/v1/chat/completions");
    expect(() => ownModelEndpoint("http://models.example.com", true)).toThrow("https://");
    expect(ownModelEndpoint("http://127.0.0.1:11434", false).href).toBe("http://127.0.0.1:11434/v1/chat/completions");
    expect(() => ownModelEndpoint("ftp://models.example.com", false)).toThrow("https://");
    expect(() => ownModelEndpoint("https://me:secret@models.example.com", true)).toThrow("name and password");
    expect(() => ownModelEndpoint("https://models.example.com/v1?key=1", true)).toThrow("? or #");
    expect(() => ownModelEndpoint("not an address", true)).toThrow("isn't one");
  });

  test("what is saved is read calmly, and the admin never sees the key", () => {
    expect(aiServerOf(null)).toEqual({ kind: "openai", url: "", model: "", vision: false, visionModel: "", embedModel: "", key: null });
    expect(aiServerOf({ aiServer: { kind: "nonsense", url: 7, model: "m", vision: "yes" } })).toEqual({ kind: "openai", url: "", model: "m", vision: false, visionModel: "", embedModel: "", key: null });
    const s = AiServerSchema.parse({ kind: "own", url: "https://m.example.com", model: "allam", key: "v1.sealed" });
    expect(ownServerSet(s)).toBe(true);
    expect(ownServerSet({ ...s, model: "" })).toBe(false);
    expect(ownServerSet({ ...s, kind: "openai" })).toBe(false);
    expect(aiServerView(s)).toEqual({ kind: "own", url: "https://m.example.com", model: "allam", vision: false, visionModel: "", embedModel: "", hasKey: true });
    // Pictures: their own model, else the words model when it reads them, else none. Search: its own model.
    expect(ownPicturesModel(s)).toBe("");
    expect(ownPicturesModel({ ...s, vision: true })).toBe("allam");
    expect(ownPicturesModel({ ...s, visionModel: "qwen3-vl:4b" })).toBe("qwen3-vl:4b");
    expect(ownPicturesModel({ ...s, kind: "openai", visionModel: "qwen3-vl:4b" })).toBe("");
    expect(ownEmbedSet(s)).toBe(false);
    expect(ownEmbedSet({ ...s, embedModel: "bge-m3" })).toBe(true);
    expect(ownEmbedEndpoint("https://m.example.com/v1", true).href).toBe("https://m.example.com/v1/embeddings");
  });
});

describe("reading a local model's JSON", () => {
  test("thinking, fences and a sentence around it are dropped; braces inside words don't confuse it", () => {
    expect(readJsonAnswer('{"a":1}')).toEqual({ a: 1 });
    expect(readJsonAnswer('<think>let me see {maybe}</think>\n```json\n{"answer":"تمام"}\n```')).toEqual({ answer: "تمام" });
    expect(readJsonAnswer('Sure! Here it is: {"reply":"say {hi} \\"there\\"","n":[1,{"b":2}]} hope that helps')).toEqual({ reply: 'say {hi} "there"', n: [1, { b: 2 }] });
    expect(readJsonAnswer("{not json} and then {\"ok\": true}")).toEqual({ ok: true });
    expect(readJsonAnswer("no object here")).toBeNull();
  });
});

describe("asking the own model server", () => {
  const server = AiServerSchema.parse({ kind: "own", url: "http://127.0.0.1:11434", model: "allam-7b", key: seal("sk-local-test-value") });
  const asked: Array<{ url: string; headers: Record<string, string>; body: Record<string, unknown> }> = [];
  const stand = (answer: (body: Record<string, unknown>) => { status: number; text: string }): OwnTransport => async (req) => {
    const body = JSON.parse(req.body) as Record<string, unknown>;
    asked.push({ url: req.url.href, headers: req.headers, body });
    return answer(body);
  };
  const reply = (content: unknown) => ({ status: 200, text: JSON.stringify({ choices: [{ message: { role: "assistant", content } }] }) });

  test("the OpenAI chat language: model, words, the key as a bearer, JSON asked for; pictures sent inside, to the pictures model", async () => {
    asked.length = 0;
    const loaded: string[] = [];
    const big = await sharp({ create: { width: 3000, height: 1500, channels: 3, background: "#b03060" } }).png().toBuffer();
    setPictureLoaderForTests(async (url) => {
      loaded.push(url);
      return url.includes("missing") ? null : { buffer: big, mime: "image/png" };
    });
    setOwnModelTransportForTests(stand(() => reply('Here you go: {"answer":"أهلين"}')));
    const r = await ownJson<{ answer: string }>(server, { system: "Be kind.", user: "مرحبا", images: ["https://img.example.com/a.jpg", "https://img.example.com/missing.jpg"], maxTokens: 300 }, { model: "qwen3-vl:4b" });
    expect(r).toMatchObject({ ok: true, data: { answer: "أهلين" } });
    expect(loaded).toEqual(["https://img.example.com/a.jpg", "https://img.example.com/missing.jpg"]);
    expect(asked[0].url).toBe("http://127.0.0.1:11434/v1/chat/completions");
    expect(asked[0].headers.authorization).toBe("Bearer sk-local-test-value");
    expect(asked[0].body).toMatchObject({ model: "qwen3-vl:4b", max_tokens: 300, stream: false, response_format: { type: "json_object" } });
    const messages = asked[0].body.messages as Array<{ role: string; content: unknown }>;
    expect(messages[0].role).toBe("system");
    expect(String(messages[0].content)).toContain("Be kind.");
    expect(String(messages[0].content)).toContain("JSON object only");
    // The picture that could be read, inside the request as a smaller JPEG; the one that couldn't, left out.
    const parts = messages[1].content as Array<{ type: string; text?: string; image_url?: { url: string } }>;
    expect(parts.map((x) => x.type)).toEqual(["text", "image_url"]);
    const sent = parts[1].image_url!.url;
    expect(sent.startsWith("data:image/jpeg;base64,")).toBe(true);
    const meta = await sharp(Buffer.from(sent.split(",")[1], "base64")).metadata();
    expect([meta.width, meta.height]).toEqual([1024, 512]);
    // None could be read: the model isn't asked.
    asked.length = 0;
    expect(await ownJson(server, { system: "s", user: "u", images: ["https://img.example.com/missing.jpg"] })).toEqual({ ok: false, error: "The pictures couldn't be read to send to the model" });
    expect(asked).toHaveLength(0);
    expect(await inlinePicture("data:image/png;base64,AAAA")).toBe("data:image/png;base64,AAAA");
  });

  test("search numbers: the embeddings address, in order, named as the own server's; incomplete answers refused", async () => {
    asked.length = 0;
    const withSearch = { ...server, embedModel: "bge-m3" };
    setOwnModelTransportForTests(stand(() => ({ status: 200, text: JSON.stringify({ data: [{ index: 1, embedding: [0, 1] }, { index: 0, embedding: [1, 0] }] }) })));
    expect(await ownEmbed(withSearch, ["أسود", "أبيض"])).toEqual({ ok: true, vectors: [[1, 0], [0, 1]], model: "own:bge-m3" });
    expect(asked[0]).toMatchObject({ url: "http://127.0.0.1:11434/v1/embeddings", body: { model: "bge-m3", input: ["أسود", "أبيض"] } });
    setOwnModelTransportForTests(stand(() => ({ status: 200, text: JSON.stringify({ data: [{ index: 0, embedding: [1, 0] }] }) })));
    expect(await ownEmbed(withSearch, ["a", "b"])).toEqual({ ok: false, error: "The model server's numbers came back incomplete" });
    expect(await ownEmbed(server, ["a"])).toEqual({ ok: false, error: "No search model is set on the own server" });
  });

  test("a server that doesn't know response_format is asked again without it; answers in parts are joined", async () => {
    asked.length = 0;
    setOwnModelTransportForTests(stand((b) => (b.response_format ? { status: 400, text: '{"error":"unknown field response_format"}' } : reply([{ type: "text", text: '{"ok":' }, { type: "text", text: "true}" }]))));
    expect(await ownJson(server, { system: "s", user: "u" })).toMatchObject({ ok: true, data: { ok: true } });
    expect(asked).toHaveLength(2);
    expect(asked[1].body.response_format).toBeUndefined();
  });

  test("what went wrong is said in words, never thrown", async () => {
    const one = async (answer: { status: number; text: string } | Error) => {
      setOwnModelTransportForTests(async () => {
        if (answer instanceof Error) throw answer;
        return answer;
      });
      return ownJson(server, { system: "s", user: "u" });
    };
    expect(await one({ status: 401, text: "no" })).toEqual({ ok: false, error: "The model server refused the key (401)" });
    expect(await one({ status: 404, text: '{"error":"model \\"allam-7b\\" not found"}' })).toEqual({ ok: false, error: 'The model server doesn\'t have the model "allam-7b"' });
    expect(await one({ status: 404, text: "Not Found" })).toEqual({ ok: false, error: "Nothing answers at that address (404): check the address" });
    expect(await one({ status: 500, text: "boom" })).toEqual({ ok: false, error: "The model server answered 500: boom" });
    expect(await one({ status: 200, text: "<html>" })).toMatchObject({ ok: false, error: expect.stringContaining("isn't JSON") });
    expect(await one(reply("I can't do JSON, sorry"))).toEqual({ ok: false, error: "The model didn't answer with JSON" });
    expect(await one(Object.assign(new Error("x"), { code: "ECONNREFUSED" }))).toEqual({ ok: false, error: "The model server refused the connection (is it running?)" });
    expect(await one(Object.assign(new Error("x"), { code: "PRIVATE_ADDRESS" }))).toEqual({ ok: false, error: "The address points inside the network: it isn't called" });
    expect(await ownJson({ ...server, key: "not-sealed" }, { system: "s", user: "u" })).toEqual({ ok: false, error: "The model server's key can't be read: save it again" });
  });
});
