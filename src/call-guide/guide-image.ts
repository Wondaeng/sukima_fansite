import { cueNames, portableLines } from "./portable-data";
import type { LyricToken, PublishedSongSync, SongGuideData } from "./song-types";
import "@fontsource-variable/noto-sans-kr";
import "@fontsource-variable/noto-sans-jp";

const FONT = '"Noto Sans KR Variable", "Noto Sans JP Variable", sans-serif';
const JAPANESE_FONT = '"Noto Sans JP Variable", "Noto Sans KR Variable", sans-serif';
const INK = "#29211e", MUTED = "#776c61", CALL = "#ad3b13", PAPER = "#fff9ed";
type Run = { text: string; bold: boolean; color: string };
type Row = { runs: Run[]; size: number; height: number; family: string };
type Block = { rows: Row[]; height: number; sing: boolean; number: number };

function font(size: number, bold = false, family = FONT) { return `${bold ? 700 : 400} ${size}px ${family}`; }

function fitLine(ctx: CanvasRenderingContext2D, tokens: LyricToken[], width: number, size: number, color: string, family = FONT): Row[] {
  const runs: Run[] = [];
  for (const token of tokens) {
    const bold = Boolean(token.call);
    const text = token.text.replace(/[\r\n\u2028\u2029]+/g, " ");
    const last = runs.at(-1);
    if (last && last.bold === bold) last.text += text;
    else runs.push({ text, bold, color: bold ? CALL : color });
  }
  if (!runs.some(run => run.text)) return [];
  const measure = (value: number) => runs.reduce((sum, run) => {
    ctx.font = font(value, run.bold, family);
    return sum + ctx.measureText(run.text).width;
  }, 0);
  // Fit the complete styled line, without clipping, wrapping, or dropping text.
  let fitted = size;
  while (measure(fitted) > width) fitted *= Math.min(.99, (width - 2) / measure(fitted));
  return [{ runs, size: fitted, height: size * 1.6, family }];
}

export async function renderGuideImage(song: SongGuideData, sync: PublishedSongSync | undefined, translation: boolean): Promise<Blob> {
  const lines = portableLines(song, sync);
  const text = JSON.stringify({ title: song.title, reading: song.reading, lines, cueNames });
  await Promise.all([FONT, JAPANESE_FONT].flatMap(family => [false, true].map(bold => document.fonts.load(font(29, bold, family), text))));
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지 생성 기능을 사용할 수 없습니다.");
  const width = 2400, margin = 100, gap = 70, columns = 3;
  const columnWidth = (width - margin * 2 - gap * 2) / columns;
  const contentWidth = columnWidth - 26;
  const blocks: Block[] = lines.map((line, index) => {
    const sing = line.cues.some(cue => cue.kind === "sing");
    const rows: Row[] = [];
    for (const cue of line.cues) {
      const annotation = `[${cueNames[cue.kind]}] ${cue.title}${cue.detail ? ` · ${cue.detail}` : ""}${cue.pattern ? ` (${cue.pattern})` : ""}`;
      rows.push(...fitLine(ctx, [{ text: annotation, call: true }], contentWidth, 21, CALL));
    }
    rows.push(...fitLine(ctx, line.original, contentWidth, 24, MUTED, JAPANESE_FONT));
    rows.push(...fitLine(ctx, line.pronunciation, contentWidth, 29, INK));
    if (translation) rows.push(...fitLine(ctx, line.translation, contentWidth, 22, MUTED));
    return { rows, sing, number: index + 1, height: rows.reduce((sum, row) => sum + row.height, 0) + (line.breakBefore ? 30 : 20) };
  });
  // Contiguous, balanced columns; keep every lyric block and its cues together.
  const groups: Block[][] = [];
  let cursor = 0;
  for (let col = 0; col < columns; col++) {
    const remaining = blocks.slice(cursor).reduce((sum, block) => sum + block.height, 0);
    const target = remaining / (columns - col);
    const group: Block[] = [];
    let height = 0;
    while (cursor < blocks.length) {
      const block = blocks[cursor];
      if (col < columns - 1 && group.length && height + block.height > target && Math.abs(height - target) < Math.abs(height + block.height - target)) break;
      group.push(block); height += block.height; cursor++;
      if (col < columns - 1 && height >= target) break;
    }
    groups.push(group);
  }
  const titleRows = fitLine(ctx, [{text: song.title, call: true}], width - margin * 2, 76, INK, JAPANESE_FONT);
  const headerHeight = 260 + titleRows.length * 114;
  const bodyHeight = Math.max(...groups.map(group => group.reduce((sum, block) => sum + block.height, 0)));
  canvas.width = width;
  canvas.height = Math.ceil(headerHeight + bodyHeight + 145);
  if (canvas.height > 14000) throw new Error("가사가 너무 길어 이미지를 만들 수 없습니다. 번역 포함을 해제해 주세요.");
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, width, canvas.height);
  ctx.fillStyle = CALL; ctx.fillRect(0, 0, width, 20);
  ctx.textBaseline = "top";
  ctx.font = font(24, true); ctx.fillStyle = CALL;
  ctx.fillText("SUKIMA SWITCH  /  CALL GUIDE", margin, 70);
  let titleY = 128;
  for (const row of titleRows) {
    ctx.font = font(row.size, true, row.family); ctx.fillStyle = INK;
    ctx.fillText(row.runs.map(run => run.text).join(""), margin, titleY); titleY += row.height;
  }
  ctx.font = font(24); ctx.fillStyle = MUTED;
  ctx.fillText(`${song.reading}  ·  ${translation ? "원문 / 발음 / 번역" : "원문 / 발음"}`, margin, titleY + 16);
  ctx.font = font(23, true); ctx.fillStyle = CALL;
  ctx.fillText("■ 붉은색 굵은 글씨: 떼창 / 콜    [동작] 타월·손동작    ↓ 각 열을 위에서 아래로", margin, titleY + 65);
  ctx.strokeStyle = "#d8caba"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(margin, headerHeight - 36); ctx.lineTo(width - margin, headerHeight - 36); ctx.stroke();
  groups.forEach((group, col) => {
    const x = margin + col * (columnWidth + gap);
    let y = headerHeight;
    if (col > 0) { ctx.beginPath(); ctx.moveTo(x - gap / 2, y); ctx.lineTo(x - gap / 2, headerHeight + bodyHeight); ctx.stroke(); }
    for (const block of group) {
      if (block.sing) { ctx.fillStyle = "#fcebdd"; ctx.fillRect(x - 8, y - 5, columnWidth + 12, block.height - 10); }
      ctx.fillStyle = MUTED; ctx.font = font(15);
      ctx.fillText(String(block.number).padStart(2, "0"), x, y + 7);
      let rowY = y;
      for (const row of block.rows) {
        let runX = x + 26;
        for (const run of row.runs) {
          ctx.font = font(row.size, run.bold, row.family); ctx.fillStyle = run.color;
          ctx.fillText(run.text, runX, rowY);
          runX += ctx.measureText(run.text).width;
        }
        rowY += row.height;
      }
      y += block.height;
    }
  });
  ctx.fillStyle = MUTED; ctx.font = font(21);
  ctx.fillText(`UNOFFICIAL FAN GUIDE  ·  ${song.slug}  ·  가사 r${song.revision} / 콜 r${sync?.revision ?? 0}`, margin, canvas.height - 65);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("이미지 생성에 실패했습니다.")), "image/png"));
}
