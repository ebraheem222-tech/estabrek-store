import sharp from "sharp";

export async function createBlurDataUrlFromFile(filePath: string): Promise<string | null> {
  try {
    const buffer = await sharp(filePath, { failOnError: false })
      .rotate()
      .resize({ width: 24, height: 24, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 58, progressive: false, mozjpeg: true })
      .toBuffer();

    return `data:image/jpeg;base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}
