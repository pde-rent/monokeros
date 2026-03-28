import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Decode a `data:image/svg+xml;base64,...` URI back to raw SVG text.
 */
function decodeSvgDataUri(dataUri: string): string {
  const prefix = "data:image/svg+xml;base64,";
  if (!dataUri.startsWith(prefix)) throw new Error("Expected SVG data URI");
  return Buffer.from(dataUri.slice(prefix.length), "base64").toString("utf-8");
}

export interface SaveAvatarResult {
  svgPath: string;
  pngPath: string;
}

/**
 * Save an avatar data-URI to disk as both SVG and PNG.
 * PNG is rendered at 160×160 using sharp.
 */
export async function saveAvatarFiles(dataUri: string, dir: string): Promise<SaveAvatarResult> {
  mkdirSync(dir, { recursive: true });

  const svg = decodeSvgDataUri(dataUri);
  const svgPath = join(dir, "avatar.svg");
  const pngPath = join(dir, "avatar.png");

  writeFileSync(svgPath, svg, "utf-8");

  // Use sharp for SVG → PNG conversion
  const sharp = (await import("sharp")).default;
  await sharp(Buffer.from(svg)).resize(160, 160).png().toFile(pngPath);

  return { svgPath, pngPath };
}
