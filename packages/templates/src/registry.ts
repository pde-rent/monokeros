import type { TemplateManifest } from "./types";
import { lawFirmTemplate } from "./templates/law-firm";
import { webDevAgencyTemplate } from "./templates/web-dev-agency";
import { mobileDevAgencyTemplate } from "./templates/mobile-dev-agency";
import { articleWritingTemplate } from "./templates/article-writing";

export const TEMPLATE_REGISTRY = new Map<string, TemplateManifest>([
  ["law-firm", lawFirmTemplate],
  ["web-dev-agency", webDevAgencyTemplate],
  ["mobile-dev-agency", mobileDevAgencyTemplate],
  ["article-writing", articleWritingTemplate],
]);
