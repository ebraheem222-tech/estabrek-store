// src/lib/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";

/**
 * Cloudinary is optional. If env vars are missing, the app falls back to LOCAL disk uploads.
 */
export function isCloudinaryEnabled() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

export function getCloudinary() {
  if (!isCloudinaryEnabled()) return null;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
}

export type CloudinaryUploadResult = {
  url: string;
  publicId: string;
  bytes: number;
  width?: number;
  height?: number;
  format?: string;
};

export async function uploadImageToCloudinary(params: {
  filePath: string;
  folder?: string | null;
  displayName?: string | null;
  tags?: string[];
}): Promise<CloudinaryUploadResult> {
  const cld = getCloudinary();
  if (!cld) {
    throw new Error("CLOUDINARY_NOT_CONFIGURED");
  }

  const { filePath, folder, displayName, tags } = params;

  const res = await cld.uploader.upload(filePath, {
    folder: folder ? String(folder).trim() : undefined,
    resource_type: "image",
    use_filename: true,
    unique_filename: true,
    overwrite: false,
    tags: (tags ?? []).filter(Boolean),
    context: displayName ? { caption: displayName } : undefined,
  });

  return {
    url: res.secure_url,
    publicId: res.public_id,
    bytes: res.bytes,
    width: res.width,
    height: res.height,
    format: res.format,
  };
}

export async function deleteFromCloudinary(publicId: string) {
  const cld = getCloudinary();
  if (!cld) return { ok: false, reason: "CLOUDINARY_NOT_CONFIGURED" };
  const res = await cld.uploader.destroy(publicId, { resource_type: "image" });
  // res.result can be: "ok", "not found"
  return { ok: res.result === "ok" || res.result === "not found", result: res.result };
}
