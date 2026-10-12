import sharp from "sharp";

const CLOUDINARY_SAFE_BYTES = 9 * 1024 * 1024;

export async function prepareCloudinaryImage(input: Buffer): Promise<Buffer> {
  // Avoid unnecessary CPU work for images already below the safe limit.
  if (input.length <= CLOUDINARY_SAFE_BYTES) {
    return input;
  }

  // Start with a practical web-upload size and quality.
  let width = 4000;
  let quality = 82;

  while (true) {
    const output = await sharp(input, {
      failOn: "error",
      limitInputPixels: 100_000_000,
    })
      .rotate()
      .flatten({ background: "#ffffff" })
      .resize({
        width,
        height: width,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality,
        progressive: true,
      })
      .toBuffer();

    if (output.length <= CLOUDINARY_SAFE_BYTES) {
      return output;
    }

    // Reduce dimensions before repeatedly spending CPU on quality changes.
    if (width > 1600) {
      width = Math.max(1600, Math.floor(width * 0.75));
      continue;
    }

    if (quality > 50) {
      quality -= 10;
      continue;
    }

    throw new Error(
      "Image could not be compressed below 9 MB. Please choose a smaller image.",
    );
  }
}
