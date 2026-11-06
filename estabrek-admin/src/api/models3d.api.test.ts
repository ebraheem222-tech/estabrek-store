import axios, { type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";
import { uploadModel } from "./models3d.api";

const originalAdapter = api.defaults.adapter;
const routes = ENDPOINTS.admin.mediaModels;
const saved = { id: "model", displayName: "Chair", url: "https://cdn.example.com/chair.glb", size: 20, provider: "LOCAL", createdAt: "2026-11-07T00:00:00.000Z" };
const signature = { cloudName: "demo", apiKey: "key", timestamp: 1, signature: "signed", folder: "estabrek/models", uploadUrl: "https://api.cloudinary.com/v1_1/demo/raw/upload", expiresAt: "2026-11-07T01:00:00.000Z", maxBytes: 25 * 1024 * 1024 };
const response = (config: InternalAxiosRequestConfig, data: unknown, status = 200) => ({ config, data, status, statusText: String(status), headers: {} });
afterEach(() => { api.defaults.adapter = originalAdapter; vi.unstubAllGlobals(); });

describe("model upload requests", () => {
  it("does not request an upload signature after the picker has already been cancelled", async () => {
    const requests: string[] = [];
    api.defaults.adapter = (async (config) => {
      requests.push(config.url!);
      throw new axios.AxiosError("No Cloudinary", "ERR_BAD_REQUEST", config, undefined, response(config, {}, 409));
    }) satisfies AxiosAdapter;
    const controller = new AbortController();
    controller.abort();
    await expect(uploadModel(new File(["model"], "chair.glb"), { signal: controller.signal })).rejects.toThrow();
    expect(requests).toEqual([]);
  });

  it("sends local fallback as multipart data with the original file and cancellation signal", async () => {
    const requests: InternalAxiosRequestConfig[] = [];
    api.defaults.adapter = (async (config) => {
      requests.push(config);
      if (config.url === routes.sign) throw new axios.AxiosError("No Cloudinary", "ERR_BAD_REQUEST", config, undefined, response(config, {}, 409));
      return response(config, saved, 201);
    }) satisfies AxiosAdapter;
    const controller = new AbortController();
    const file = new File(["model"], "chair.glb");
    expect(await uploadModel(file, { signal: controller.signal })).toEqual(saved);
    expect(requests.map((r) => r.url)).toEqual([routes.sign, routes.local]);
    expect(requests[1].data.get("file")).toBe(file);
    expect(requests[1].data.get("displayName")).toBe("chair");
    expect(requests[1].headers.get("Content-Type")).toBe("multipart/form-data");
    expect(requests[1].signal).toBe(controller.signal);
  });

  it("carries cancellation through signing and Cloudinary completion requests", async () => {
    class UploadedRequest {
      upload = { onprogress: null };
      status = 201;
      responseText = '{"public_id":"estabrek/models/chair.glb"}';
      onload?: () => void;
      onerror?: () => void;
      onabort?: () => void;
      open() {}
      send() { this.onload?.(); }
      abort() { this.onabort?.(); }
    }
    vi.stubGlobal("XMLHttpRequest", UploadedRequest);
    const requests: InternalAxiosRequestConfig[] = [];
    api.defaults.adapter = (async (config) => {
      requests.push(config);
      return response(config, config.url === routes.sign ? signature : saved);
    }) satisfies AxiosAdapter;
    const controller = new AbortController();
    expect(await uploadModel(new File(["model"], "chair.glb"), { signal: controller.signal })).toEqual(saved);
    expect(requests.map((r) => r.url)).toEqual([routes.sign, routes.base]);
    expect(requests[0].signal).toBe(controller.signal);
    expect(requests[1].signal).toBe(controller.signal);
    expect(JSON.parse(requests[1].data)).toEqual({ publicId: "estabrek/models/chair.glb", displayName: "chair" });
  });
});
