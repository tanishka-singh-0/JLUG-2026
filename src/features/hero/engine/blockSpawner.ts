import { HERO_BLOCK_CONFIG } from '../data/config';
import { JLUG_SHAPE_MATRIX } from '../data/jlugShape';
import { BlockPiece } from './types';

const C = HERO_BLOCK_CONFIG;

function pickColor(): string {
  const rand = Math.random() * 100;
  let sum = 0;
  for (const c of C.colors) {
    sum += c.weight;
    if (rand <= sum) return c.color;
  }
  return C.colors[0].color;
}

/**
 * Greedy rectangle packer with randomized expansion direction
 * and higher max sizes to create visible variety in block dimensions.
 */
function chunkLetter(
  bitmap: string[],
  offsetX: number,
  letterIndex: number,
  prefersReducedMotion: boolean,
): BlockPiece[] {
  const pieces: BlockPiece[] = [];
  const rows = bitmap.length;
  const cols = bitmap[0].length;
  const visited: boolean[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(false),
  );

  // Stagger pieces per letter: J starts immediately, L after ~2s, U after ~4s, G after ~6s
  const letterBaseDelay = letterIndex * 2200;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (bitmap[y][x] !== '1' || visited[y][x]) continue;

      // Randomize expansion strategy for natural variety
      const strategy = Math.random();
      let w = 1;
      let h = 1;

      if (strategy < 0.35) {
        // Wide-first: create horizontal bars
        const maxW = Math.min(C.maxChunkWidth, 2 + Math.floor(Math.random() * 4));
        while (x + w < cols && bitmap[y][x + w] === '1' && !visited[y][x + w] && w < maxW) w++;
        const maxH = Math.min(C.maxChunkHeight, 1 + Math.floor(Math.random() * 2));
        outer1: while (y + h < rows && h < maxH) {
          for (let i = 0; i < w; i++) {
            if (bitmap[y + h][x + i] !== '1' || visited[y + h][x + i]) break outer1;
          }
          h++;
        }
      } else if (strategy < 0.7) {
        // Tall-first: create vertical columns
        const maxH = Math.min(C.maxChunkHeight, 2 + Math.floor(Math.random() * 3));
        while (y + h < rows && bitmap[y + h][x] === '1' && !visited[y + h][x] && h < maxH) h++;
        const maxW = Math.min(C.maxChunkWidth, 1 + Math.floor(Math.random() * 2));
        outer2: while (x + w < cols && w < maxW) {
          for (let i = 0; i < h; i++) {
            if (bitmap[y + i][x + w] !== '1' || visited[y + i][x + w]) break outer2;
          }
          w++;
        }
      } else {
        // Square-ish: try to make a bigger square
        const maxSide = 2 + Math.floor(Math.random() * 2);
        while (x + w < cols && y + h < rows && w < maxSide && h < maxSide) {
          // Try expanding both
          let canExpandW = true;
          let canExpandH = true;
          for (let i = 0; i <= h; i++) {
            if (y + i >= rows || bitmap[y + i][x + w] !== '1' || visited[y + i][x + w]) {
              canExpandW = false; break;
            }
          }
          for (let i = 0; i <= w; i++) {
            if (x + i >= cols || bitmap[y + h][x + i] !== '1' || visited[y + h][x + i]) {
              canExpandH = false; break;
            }
          }
          // Corner cell
          if (canExpandW && canExpandH) {
            if (y + h < rows && x + w < cols && bitmap[y + h][x + w] === '1' && !visited[y + h][x + w]) {
              w++; h++;
            } else break;
          } else break;
        }
      }

      // Mark visited
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          visited[y + dy][x + dx] = true;
        }
      }

      const cell = C.cellSize + C.cellGap;
      const finalPixelX = offsetX + x * cell;
      const finalPixelY = C.startY + y * cell;
      const pixelW = w * C.cellSize + (w - 1) * C.cellGap;
      const pixelH = h * C.cellSize + (h - 1) * C.cellGap;

      // --- Human-player trajectory ---
      const overshootDir = Math.random() > 0.5 ? 1 : -1;
      const overshootAmount =
        (C.overshootMin + Math.random() * (C.overshootMax - C.overshootMin)) * overshootDir;
      const overshootX = finalPixelX + overshootAmount;

      // Second overcorrection (smaller, opposite direction)
      const overcorrectAmount =
        (20 + Math.random() * 40) * -overshootDir;
      const overcorrectX = finalPixelX + overcorrectAmount;

      // Spawn position: even further from the overshoot target
      const spawnX =
        overshootX + (C.spawnOffsetMin + Math.random() * (C.spawnOffsetMax - C.spawnOffsetMin)) *
          (overshootX > finalPixelX ? 1 : -1);

      // Per-piece delay within the letter (earlier rows/columns tend to come earlier)
      const withinLetterDelay = (y * cols + x) * 30 + Math.random() * 600;

      pieces.push({
        id: 0, // Will be assigned after sorting
        widthCells: w,
        heightCells: h,
        width: pixelW,
        height: pixelH,
        finalX: finalPixelX,
        finalY: finalPixelY,
        currentX: prefersReducedMotion ? finalPixelX : spawnX,
        currentY: prefersReducedMotion ? finalPixelY : -(C.spawnHeightMin + Math.random() * (C.spawnHeightMax - C.spawnHeightMin)),
        overshootX,
        overcorrectX,
        state: prefersReducedMotion ? 'SETTLED' : 'WAITING',
        spawnDelay: prefersReducedMotion ? 0 : letterBaseDelay + withinLetterDelay,
        hesitateTimer: 0,
        velocityY: 0,
        velocityX: 0,
        horizontalSpeed: C.horizontalSpeedBase + Math.random() * C.horizontalSpeedVariance,
        color: pickColor(),
        brightness: 0.92 + Math.random() * 0.08,
        flashPhase: 0,
        interactiveDx: 0,
        interactiveDy: 0,
        letterIndex,
      });
    }
  }

  return pieces;
}

export function spawnBlocks(prefersReducedMotion: boolean): BlockPiece[] {
  const letters: Array<keyof typeof JLUG_SHAPE_MATRIX> = ['J', 'L', 'U', 'G'];
  const allPieces: BlockPiece[] = [];
  let offsetX = C.startX;

  letters.forEach((char, letterIdx) => {
    const bitmap = JLUG_SHAPE_MATRIX[char];
    const letterPieces = chunkLetter(bitmap, offsetX, letterIdx, prefersReducedMotion);
    allPieces.push(...letterPieces);
    offsetX += C.letterSpacing;
  });

  // Sort by spawn delay and assign sequential IDs
  allPieces.sort((a, b) => a.spawnDelay - b.spawnDelay);
  allPieces.forEach((p, i) => { p.id = i; });

  return allPieces;
}
