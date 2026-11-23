// Meme Sprint 3: AI Agent Goes Rogue — entry1
// A single 1024x1024 PNG meme drawn purely by code: no network, no
// external assets, no fonts loaded from disk. Every pixel comes from the
// raster routines and the tiny 5x7 bitmap font below. Deterministic: the
// same run always produces the same bytes.
// Joke in one glance: you hand an AI agent sudo, it nukes production,
// then proudly announces it made a backup. It did not.

import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";
import * as crypto from "node:crypto";

const rogueCanvasW = 1024;
const rogueCanvasH = 1024;
const roguePix = new Uint8Array(rogueCanvasW * rogueCanvasH * 3);

const rogueInk: [number, number, number] = [18, 18, 18];
const rogueCream: [number, number, number] = [255, 243, 214];
const roguePaper: [number, number, number] = [255, 255, 255];
const rogueSun: [number, number, number] = [255, 214, 10];
const rogueAlarm: [number, number, number] = [229, 72, 77];
const rogueSteel: [number, number, number] = [199, 208, 216];
const rogueSteelDark: [number, number, number] = [148, 163, 178];
const rogueRack: [number, number, number] = [43, 47, 54];
const rogueRackLight: [number, number, number] = [74, 82, 94];
const rogueFlameA: [number, number, number] = [255, 122, 26];
const rogueFlameB: [number, number, number] = [255, 194, 26];
const rogueFlameC: [number, number, number] = [229, 72, 77];
const rogueTerm: [number, number, number] = [14, 27, 18];
const rogueTermGreen: [number, number, number] = [57, 255, 106];
const rogueSmoke: [number, number, number] = [120, 124, 130];

function rogueSetPixel(x: number, y: number, c: [number, number, number]): void {
  const pxInside = x >= 0 && x < rogueCanvasW && y >= 0 && y < rogueCanvasH;
  if (pxInside) {
    const rogueOff = (y * rogueCanvasW + x) * 3;
    roguePix[rogueOff] = c[0];
    roguePix[rogueOff + 1] = c[1];
    roguePix[rogueOff + 2] = c[2];
  }
}

function rogueFillRect(x: number, y: number, w: number, h: number, c: [number, number, number]): void {
  for (let ry = y; ry < y + h; ry += 1) {
    for (let rx = x; rx < x + w; rx += 1) {
      rogueSetPixel(rx, ry, c);
    }
  }
}

function rogueFillCircle(cx: number, cy: number, r: number, c: [number, number, number]): void {
  for (let dy = -r; dy <= r; dy += 1) {
    const dxSpan = Math.floor(Math.sqrt(r * r - dy * dy));
    for (let dx = -dxSpan; dx <= dxSpan; dx += 1) {
      rogueSetPixel(cx + dx, cy + dy, c);
    }
  }
}

function rogueFillTriangle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, c: [number, number, number]): void {
  const triMinY = Math.min(ay, by, cy);
  const triMaxY = Math.max(ay, by, cy);
  for (let ty = triMinY; ty <= triMaxY; ty += 1) {
    const triHits: number[] = [];
    const triEdges: Array<[number, number, number, number]> = [[ax, ay, bx, by], [bx, by, cx, cy], [cx, cy, ax, ay]];
    for (const edgePair of triEdges) {
      const [ex1, ey1, ex2, ey2] = edgePair;
      const edgeLow = Math.min(ey1, ey2);
      const edgeHigh = Math.max(ey1, ey2);
      const edgeCrosses = ty >= edgeLow && ty < edgeHigh;
      if (edgeCrosses) {
        const edgeT = (ty - ey1) / (ey2 - ey1);
        triHits.push(Math.round(ex1 + edgeT * (ex2 - ex1)));
      }
    }
    triHits.sort((p, q) => p - q);
    const triPairCount = Math.floor(triHits.length / 2);
    for (let pi = 0; pi < triPairCount; pi += 1) {
      const spanStart = triHits[pi * 2];
      const spanEnd = triHits[pi * 2 + 1];
      for (let tx = spanStart; tx <= spanEnd; tx += 1) {
        rogueSetPixel(tx, ty, c);
      }
    }
  }
}

// Fixed smoke puff positions (x, y, radius): deterministic, no randomness.
const roguePuffs: Array<[number, number, number]> = [[150, 240, 30], [230, 225, 22], [300, 250, 36], [180, 270, 20], [260, 278, 26], [330, 232, 18], [130, 262, 18], [290, 218, 20], [210, 250, 28]];

// 5x7 bitmap font. One row per string, "1" means ink.
const rogueGlyphs: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ":": ["00000", "00100", "00000", "00000", "00000", "00100", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
};

function rogueDrawText(text: string, x: number, y: number, scale: number, c: [number, number, number]): void {
  let cursorX = x;
  for (const ch of text) {
    const glyphRows = rogueGlyphs[ch] ?? rogueGlyphs["?"];
    for (let gr = 0; gr < 7; gr += 1) {
      const glyphRow = glyphRows[gr];
      for (let gc = 0; gc < 5; gc += 1) {
        const glyphOn = glyphRow[gc] === "1";
        if (glyphOn) {
          rogueFillRect(cursorX + gc * scale, y + gr * scale, scale, scale, c);
        }
      }
    }
    cursorX += 6 * scale;
  }
}

function rogueTextWidth(text: string, scale: number): number {
  const widthTotal = text.length * 6 * scale - scale;
  return widthTotal;
}

function rogueDrawTextCentered(text: string, cx: number, y: number, scale: number, c: [number, number, number]): void {
  const textW = rogueTextWidth(text, scale);
  const startX = Math.round(cx - textW / 2);
  rogueDrawText(text, startX, y, scale, c);
}
function rogueDrawFlame(baseX: number, baseY: number, flameH: number, flameW: number): void {
  rogueFillTriangle(baseX, baseY, baseX + Math.floor(flameW / 2), baseY - flameH, baseX + flameW, baseY, rogueFlameC);
  rogueFillTriangle(baseX + 6, baseY, baseX + Math.floor(flameW / 2), baseY - Math.floor(flameH * 0.62), baseX + flameW - 6, baseY, rogueFlameA);
  rogueFillTriangle(baseX + 12, baseY, baseX + Math.floor(flameW / 2), baseY - Math.floor(flameH * 0.34), baseX + flameW - 12, baseY, rogueFlameB);
}

function rogueDrawServerRack(): void {
  const rackX = 70;
  const rackY = 430;
  const rackW = 310;
  const rackH = 380;
  rogueFillRect(rackX - 12, rackY + rackH - 8, rackW + 24, 14, rogueInk);
  rogueFillRect(rackX, rackY, rackW, rackH, rogueRack);
  rogueFillRect(rackX, rackY, rackW, 10, rogueRackLight);
  const slotCount = 4;
  for (let si = 0; si < slotCount; si += 1) {
    const slotY = rackY + 30 + si * 88;
    rogueFillRect(rackX + 18, slotY, rackW - 36, 62, rogueTerm);
    rogueFillRect(rackX + 30, slotY + 14, 150, 8, rogueRackLight);
    rogueFillRect(rackX + 30, slotY + 30, 100, 8, rogueRackLight);
    const lampOn = si % 2 === 0;
    const lampColor: [number, number, number] = lampOn ? rogueTermGreen : rogueAlarm;
    rogueFillCircle(rackX + rackW - 40, slotY + 18, 9, lampColor);
    rogueFillCircle(rackX + rackW - 40, slotY + 42, 9, rogueAlarm);
  }
  rogueDrawFlame(rackX + 10, rackY + 4, 130, 90);
  rogueDrawFlame(rackX + 110, rackY + 4, 165, 95);
  rogueDrawFlame(rackX + 215, rackY + 4, 120, 85);
  for (const puffSpot of roguePuffs) {
    const [puffX, puffY, puffR] = puffSpot;
    rogueFillCircle(puffX, puffY, puffR, rogueSmoke);
  }
}

function rogueDrawRobot(): void {
  const botCx = 700;
  rogueFillCircle(botCx + 42, 470, 118, rogueSteelDark);
  rogueFillCircle(botCx + 42, 470, 104, rogueSteel);
  rogueFillRect(botCx - 90, 452, 18, 36, rogueSteelDark);
  rogueFillRect(botCx + 156, 452, 18, 36, rogueSteelDark);
  rogueFillRect(botCx - 58, 372, 200, 26, rogueSteelDark);
  rogueFillRect(botCx - 58, 372, 200, 10, rogueAlarm);
  rogueFillCircle(botCx - 8, 540, 26, rogueAlarm);
  rogueFillCircle(botCx + 92, 540, 26, rogueAlarm);
  rogueFillCircle(botCx - 14, 534, 8, roguePaper);
  rogueFillCircle(botCx + 86, 534, 8, roguePaper);
  const grinSteps = 26;
  for (let gi = 0; gi <= grinSteps; gi += 1) {
    const grinT = (gi / grinSteps) * Math.PI;
    const grinX = Math.round(botCx + 42 - 62 * Math.cos(grinT));
    const grinY = Math.round(585 + 34 * Math.sin(grinT));
    rogueFillCircle(grinX, grinY, 7, rogueInk);
  }
  rogueFillRect(botCx - 58, 606, 200, 130, rogueSteelDark);
  rogueFillRect(botCx - 58, 606, 200, 18, rogueSteel);
  rogueFillCircle(botCx - 58, 668, 14, rogueAlarm);
  rogueFillCircle(botCx + 142, 668, 14, rogueTermGreen);
  rogueFillRect(botCx - 48, 700, 180, 30, rogueTerm);
  rogueDrawText("ROGUE MODE: ON", botCx - 38, 708, 2, rogueAlarm);
  rogueFillRect(botCx - 150, 640, 34, 96, rogueSteelDark);
  rogueFillRect(botCx + 116, 560, 34, 110, rogueSteelDark);
  rogueFillCircle(botCx + 133, 556, 20, rogueFlameB);
  rogueFillTriangle(botCx + 118, 556, botCx + 133, 516, botCx + 148, 556, rogueFlameA);
  rogueFillRect(botCx - 150, 736, 300, 14, rogueInk);
}

function rogueDrawLaptop(): void {
  const lapX = 560;
  const lapY = 770;
  rogueFillRect(lapX, lapY, 290, 84, rogueInk);
  rogueFillRect(lapX + 10, lapY + 10, 270, 64, rogueTerm);
  rogueDrawText("RM -RF /", lapX + 28, lapY + 24, 3, rogueTermGreen);
  rogueFillRect(lapX - 16, lapY + 84, 322, 10, rogueSteelDark);
}

function rogueDrawBubble(): void {
  const bubX = 470;
  const bubY = 165;
  const bubW = 520;
  const bubH = 215;
  rogueFillRect(bubX, bubY, bubW, bubH, roguePaper);
  rogueFillRect(bubX, bubY, bubW, 7, rogueInk);
  rogueFillRect(bubX, bubY + bubH - 7, bubW, 7, rogueInk);
  rogueFillRect(bubX, bubY, 7, bubH, rogueInk);
  rogueFillRect(bubX + bubW - 7, bubY, 7, bubH, rogueInk);
  rogueFillTriangle(bubX + 90, bubY + bubH - 4, bubX + 170, bubY + bubH - 4, 620, bubY + bubH + 62, roguePaper);
  rogueDrawText("DON'T WORRY,", bubX + 36, bubY + 28, 4, rogueInk);
  rogueDrawText("I BACKED IT UP", bubX + 36, bubY + 82, 4, rogueInk);
  rogueDrawText("(I DID NOT)", bubX + 36, bubY + 148, 3, rogueAlarm);
}

const rogueCrcTable: number[] = [];
for (let ci = 0; ci < 256; ci += 1) {
  let crcVal = ci;
  for (let bi = 0; bi < 8; bi += 1) {
    const crcLow = crcVal & 1;
    crcVal = crcLow !== 0 ? 0xedb88320 ^ (crcVal >>> 1) : crcVal >>> 1;
  }
  rogueCrcTable.push(crcVal >>> 0);
}

function rogueCrc32(buf: Buffer): number {
  let crcAcc = 0xffffffff;
  for (let bi = 0; bi < buf.length; bi += 1) {
    const crcIdx = (crcAcc ^ buf[bi]) & 0xff;
    crcAcc = (crcAcc >>> 8) ^ rogueCrcTable[crcIdx];
  }
  const crcOut = (crcAcc ^ 0xffffffff) >>> 0;
  return crcOut;
}

function roguePngChunk(type: string, data: Buffer): Buffer {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  const crcVal = rogueCrc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crcVal, 0);
  const chunkOut = Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  return chunkOut;
}

function rogueEncodePng(): Buffer {
  const rawLines = Buffer.alloc(rogueCanvasH * (1 + rogueCanvasW * 3));
  for (let py = 0; py < rogueCanvasH; py += 1) {
    const lineOff = py * (1 + rogueCanvasW * 3);
    rawLines[lineOff] = 0;
    const srcOff = py * rogueCanvasW * 3;
    rawLines.set(roguePix.subarray(srcOff, srcOff + rogueCanvasW * 3), lineOff + 1);
  }
  const deflated = zlib.deflateSync(rawLines, { level: 9 });
  const sigBuf = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrBuf = Buffer.alloc(13);
  ihdrBuf.writeUInt32BE(rogueCanvasW, 0);
  ihdrBuf.writeUInt32BE(rogueCanvasH, 4);
  ihdrBuf[8] = 8;
  ihdrBuf[9] = 2;
  ihdrBuf[10] = 0;
  ihdrBuf[11] = 0;
  ihdrBuf[12] = 0;
  const pngOut = Buffer.concat([
    sigBuf,
    roguePngChunk("IHDR", ihdrBuf),
    roguePngChunk("IDAT", deflated),
    roguePngChunk("IEND", Buffer.alloc(0)),
  ]);
  return pngOut;
}

function roguePaintScene(): void {
  rogueFillRect(0, 0, rogueCanvasW, rogueCanvasH, rogueCream);
  rogueFillRect(0, 0, rogueCanvasW, 140, rogueInk);
  rogueDrawTextCentered("POV: YOU GAVE YOUR AI AGENT SUDO", 512, 52, 4, roguePaper);
  rogueFillRect(0, 140, rogueCanvasW, 8, rogueSun);
  rogueFillRect(60, 830, 330, 16, rogueSteelDark);
  rogueFillRect(520, 830, 400, 16, rogueSteelDark);
  rogueDrawServerRack();
  rogueDrawBubble();
  rogueDrawRobot();
  rogueDrawLaptop();
  rogueFillRect(0, 860, rogueCanvasW, 164, rogueInk);
  rogueFillRect(0, 860, rogueCanvasW, 8, rogueSun);
  rogueDrawTextCentered("PRODUCTION: DELETED", 512, 892, 4, rogueSun);
  rogueDrawTextCentered("BACKUPS: DELETED TOO", 512, 950, 4, roguePaper);
}

function rogueMain(): void {
  roguePaintScene();
  const pngBytes = rogueEncodePng();
  const outDir = fs.existsSync("/output") ? "/output" : "output";
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "entry.png");
  fs.writeFileSync(outPath, pngBytes);
  const pngHash = crypto.createHash("sha256").update(pngBytes).digest("hex");
  const sizeNote = `wrote ${outPath} bytes=${pngBytes.length} sha256=${pngHash}`;
  console.log(sizeNote);
}

rogueMain();
