# @monokeros/avatar

Deterministic pixel-art avatar generator with diverse skin tones.

Based on [bit-face](https://github.com/Nemethe/bit-face) by Nemethe (MIT License). Rewritten for server-side SVG generation with Fitzpatrick-scale inspired skin tones.

## Usage

```ts
import { generateAvatar } from "@monokeros/avatar";

// Random skin tone (deterministic from seed)
const url = generateAvatar({ seed: "member_abc123" });

// Explicit skin tone
const url2 = generateAvatar({ seed: "member_abc123", skinTone: "golden" });

// Explicit gender (1=male, 2=female)
const url3 = generateAvatar({ seed: "member_abc123", gender: 2 });
```

Returns a `data:image/svg+xml;base64,...` data URL.

## Skin Tones

12 tones inspired by the Fitzpatrick scale:

| Key        | Hex       | Description                   |
| ---------- | --------- | ----------------------------- |
| `light`    | `#fde0c5` | Very fair                     |
| `fair`     | `#f5ba81` | Fair (original bit-face tone) |
| `sand`     | `#e8a96d` | Light-medium warm             |
| `peach`    | `#dba070` | Light-medium pink undertone   |
| `golden`   | `#c8944e` | Warm golden                   |
| `honey`    | `#c6873a` | Medium warm                   |
| `olive`    | `#b07840` | Mediterranean                 |
| `tan`      | `#a0653a` | Medium                        |
| `caramel`  | `#8d5534` | Medium-deep warm              |
| `brown`    | `#714228` | Deep warm                     |
| `umber`    | `#5a3420` | Very deep                     |
| `espresso` | `#3b1f0f` | Deepest                       |
