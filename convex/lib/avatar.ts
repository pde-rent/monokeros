/**
 * Deterministic pixel-art avatar generator for Convex runtime.
 * Ported from packages/avatar/src/generate.ts — zero Node.js dependencies.
 * Based on bit-face by Nemethe (https://github.com/Nemethe/bit-face) — MIT.
 */
import sprites from "./sprites.json";

export interface AvatarOptions {
  seed: string;
  gender?: 1 | 2;
  backgroundColor?: string;
}

// Skin anchor RGB dark→light for interpolation
const SA = [
  [59, 31, 15],
  [90, 52, 32],
  [113, 66, 40],
  [141, 85, 52],
  [160, 101, 58],
  [176, 120, 64],
  [198, 135, 58],
  [200, 148, 78],
  [219, 160, 112],
  [232, 169, 109],
  [245, 186, 129],
  [253, 224, 197],
];

const HAIR = [
  "#2f2e2b", "#23201b", "#171410", "#090806", "#2C222B",
  "#71635A", "#A56B46", "#B55239", "#91553D", "#533D32",
  "#3B3024", "#554838", "#4E433F", "#504444", "#6A4E42",
  "#D4A769", "#C6A55A", "#E8C97A", "#B89B5E",
];
const NEUTRALS = ["#ffffff", "#e1e1e1", "#1f1f1f", "#000000"];
const COLORS = [
  "#6F1E51", "#833471", "#B53471", "#ED4C67",
  "#5758BB", "#9980FA", "#D980FA", "#FDA7DF",
  "#1B1464", "#0652DD", "#1289A7", "#12CBC4",
  "#006266", "#009432", "#A3CB38", "#C4E538",
  "#EA2027", "#EE5A24", "#F79F1F", "#FFC312",
];
const BGS: [string, string][] = [
  ["#09d2ff", "#ceeff7"],
  ["#1b9e96", "#cdf7f5"],
  ["#b33c96", "#e2b0d6"],
  ["#ccd362", "#e9ecb7"],
  ["#b1ee6f", "#d6f2b8"],
];

type Cat = "skin" | "hair" | "shirt" | "top";
const LAYERS: [string, Cat | null][] = [
  ["body/body", "skin"],
  ["body/shadow", null],
  ["clothes/shirts", "shirt"],
  ["clothes/tops", "top"],
  ["head/head", "skin"],
  ["head/eyes", null],
  ["head/mouth", null],
  ["head/hair_female", "hair"],
  ["head/hair_male", "hair"],
  ["head/beard", "hair"],
  ["head/addons", null],
];
const GENDER_LAYER: Record<string, 1 | 2> = {
  "head/hair_male": 1,
  "head/beard": 1,
  "head/hair_female": 2,
};
const OPTIONAL: Record<string, number> = { "head/beard": 40, "head/addons": 15 };

// PRNG
function djb2(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}
function rng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)];
const rand = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const cl = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

function resolve(path: string): string | Record<string, unknown> | null {
  let c: unknown = sprites;
  for (const p of path.split("/")) {
    if (c && typeof c === "object" && p in c) c = (c as any)[p];
    else return null;
  }
  return c as any;
}

// Color math
const hex2rgb = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
};
const rgb2hex = (c: number[]) => `#${c.map((v) => cl(v).toString(16).padStart(2, "0")).join("")}`;
const lum = (h: string) => {
  const [r, g, b] = hex2rgb(h);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};
function shift(hex: string, amt: number) {
  return rgb2hex(hex2rgb(hex).map((c) => c + Math.round((amt > 0 ? 255 - c : c) * Math.abs(amt))));
}
function rgbDist(a: string, b: string) {
  const [ar, ag, ab] = hex2rgb(a),
    [br, bg, bb] = hex2rgb(b);
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2);
}

function contrastPick(
  color: string,
  ref: string,
  palette: string[],
  r: () => number,
  min = 0.15,
): string {
  if (Math.abs(lum(color) - lum(ref)) >= min) return color;
  const ok = palette.filter((c) => Math.abs(lum(c) - lum(ref)) >= min);
  return ok.length ? pick(r, ok) : color;
}

function gauss(r: () => number, mean: number, std: number) {
  return mean + std * Math.sqrt(-2 * Math.log(r() || 1e-10)) * Math.cos(2 * Math.PI * r());
}

function genSkin(r: () => number): string {
  const t = Math.max(0, Math.min(1, gauss(r, 0.82, 0.14)));
  const idx = t * (SA.length - 1),
    lo = Math.floor(idx),
    hi = Math.min(lo + 1, SA.length - 1),
    f = idx - lo;
  const base = SA[lo].map((v, i) => v + (SA[hi][i] - v) * f);
  const y = gauss(r, 0, 0.06);
  return rgb2hex([cl(base[0] + y * 10), cl(base[1] + y * 60), cl(base[2] - y * 30)]);
}

export function generateAvatar(o: AvatarOptions): string {
  const r = rng(djb2(o.seed));
  const gender = o.gender ?? ((r() < 0.5 ? 1 : 2) as 1 | 2);
  const skinHex = genSkin(r);
  let bg0 = o.backgroundColor ?? BGS[rand(r, 0, BGS.length - 1)][0];
  if (rgbDist(skinHex, bg0) < 80) bg0 = shift(bg0, lum(skinHex) > 0.5 ? -0.35 : 0.4);
  const bg1 = shift(bg0, 0.35);
  const bald = gender === 1 && r() < 0.15;
  const hasTop = r() < 0.33;

  let shirtHex: string, topHex: string;
  if (hasTop) {
    if (r() < 0.5) {
      shirtHex = contrastPick(pick(r, NEUTRALS), bg0, NEUTRALS, r, 0.12);
      topHex = contrastPick(pick(r, COLORS), bg0, COLORS, r, 0.12);
    } else {
      shirtHex = contrastPick(pick(r, COLORS), bg0, COLORS, r, 0.12);
      topHex = contrastPick(pick(r, NEUTRALS), bg0, NEUTRALS, r, 0.12);
    }
  } else {
    shirtHex = contrastPick(pick(r, COLORS), bg0, COLORS, r, 0.12);
    topHex = "#000000";
  }

  const colors: Record<Cat, string> = {
    skin: skinHex,
    hair: contrastPick(pick(r, HAIR), skinHex, HAIR, r, 0.08),
    shirt: shirtHex,
    top: topHex,
  };

  const filters = (Object.entries(colors) as [string, string][])
    .map(
      ([c, hex]) =>
        `<filter id="t-${c}" color-interpolation-filters="sRGB"><feFlood flood-color="${hex}" result="c"/><feComposite in="c" in2="SourceAlpha" operator="in"/></filter>`,
    )
    .join("");

  const imgs: string[] = [];
  for (const [path, cat] of LAYERS) {
    if (path in GENDER_LAYER && GENDER_LAYER[path] !== gender) continue;
    if (path === "head/hair_male" && bald) continue;
    if (path === "clothes/tops" && !hasTop) continue;
    if (path in OPTIONAL && OPTIONAL[path] < rand(r, 1, 100)) continue;
    let data = resolve(path);
    if (!data) continue;
    if (typeof data === "object") {
      const keys = Object.keys(data);
      if (!keys.length) continue;
      data = data[keys[rand(r, 0, keys.length - 1)]] as string;
    }
    if (typeof data !== "string") continue;
    const f = cat ? ` filter="url(#t-${cat})"` : "";
    imgs.push(
      `<image href="data:image/png;base64,${data}" x="-1" y="0" width="40" height="40" image-rendering="pixelated"${f}/>`,
    );
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="160" height="160" shape-rendering="crispEdges" image-rendering="pixelated"><defs><linearGradient id="bg" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="${bg0}"/><stop offset="100%" stop-color="${bg1}"/></linearGradient>${filters}</defs><rect width="40" height="40" fill="url(#bg)"/>${imgs.join("")}</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
