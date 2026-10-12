import sharp from "sharp";

const CLOUDINARY_SAFE_BYTES = 9 * 1024 * 1024;

export async function prepareCloudinaryImage(input: Buffer): Promise<Buffer> {
  if (input.length <= CLOUDINARY_SAFE_BYTES) {
    return input;
  }

  let quality = 88;
  let width = 6000;

  while (true) {
    let pipeline = sharp(input, {
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
        mozjpeg: true,
        progressive: true,
      });

    const output = await pipeline.toBuffer();

    if (output.length <= CLOUDINARY_SAFE_BYTES) {
      return output;
    }

    if (quality > 50) {
      quality -= 10;
    } else if (width > 1600) {
      width = Math.max(1600, Math.floor(width * 0.8));
      quality = 75;
    } else {
      throw new Error(
        "Image could not be compressed below 9 MB. Please choose a smaller image.",
      );
    }
  }
}
