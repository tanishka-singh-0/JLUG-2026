import { BlockPiece } from './types';
import { HERO_BLOCK_CONFIG } from '../data/config';

const C = HERO_BLOCK_CONFIG;

/**
 * Multi-phase "human player" physics.
 *
 * Each piece goes through:
 *   WAITING → FALLING_INITIAL → HESITATING → CORRECTING → OVERCORRECTING → FINAL_ALIGN → HARD_DROP → SETTLED
 *
 * The horizontal path looks like:
 *   spawnX ──→ overshootX ──(pause)──→ overcorrectX ──→ finalX ──↓ LOCK
 *
 * This creates the visual impression of a human deciding where to place the piece.
 */
export function updateBlockPhysics(
  blocks: BlockPiece[],
  sequenceTime: number,
  prefersReducedMotion: boolean,
) {
  const resetStart = C.buildDuration + C.holdDuration;
  const isResetting = sequenceTime > resetStart;

  for (const b of blocks) {
    if (prefersReducedMotion) {
      b.currentX = b.finalX;
      b.currentY = b.finalY;
      b.state = 'SETTLED';
      continue;
    }

    // ── RESET PHASE: pieces fall apart ──
    if (isResetting) {
      if (b.state !== 'RESETTING') {
        b.state = 'RESETTING';
        // Stagger the collapse: top pieces fall first, bottom pieces delay
        const distFromTop = b.finalY - C.startY;
        const collapseDelay = distFromTop * 0.3;
        b.hesitateTimer = collapseDelay;
        b.velocityY = 0;
        // Add slight horizontal drift during collapse
        b.velocityX = (Math.random() - 0.5) * 3;
      }
      if (b.hesitateTimer > 0) {
        b.hesitateTimer--;
        continue;
      }
      b.velocityY += 0.6;
      b.currentY += b.velocityY;
      b.currentX += b.velocityX;
      continue;
    }

    // ── BUILD PHASE ──

    // Stay invisible until spawn delay
    if (b.state === 'WAITING') {
      if (sequenceTime > b.spawnDelay) {
        b.state = 'FALLING_INITIAL';
      }
      continue;
    }

    // ── PHASE 1: Fall + slide toward overshoot target ──
    if (b.state === 'FALLING_INITIAL') {
      // Vertical: gentle gravity
      b.velocityY += C.gravity;
      b.currentY += b.velocityY;

      // Horizontal: move toward overshootX
      const dxToOvershoot = b.overshootX - b.currentX;
      if (Math.abs(dxToOvershoot) < b.horizontalSpeed * 1.5) {
        b.currentX = b.overshootX;
        // Reached the overshoot point — pause to "think"
        b.state = 'HESITATING';
        b.hesitateTimer = 15 + Math.floor(Math.random() * 25); // ~15–40 frames
        b.velocityY = Math.min(b.velocityY, 0.5); // Slow vertical while thinking
      } else {
        b.currentX += Math.sign(dxToOvershoot) * b.horizontalSpeed;
      }

      // Cap vertical position: don't fall past a "hover zone" above the target
      const hoverY = b.finalY - 80 - Math.random() * 60;
      if (b.currentY > hoverY) {
        b.currentY = hoverY;
        b.velocityY = 0;
      }
      continue;
    }

    // ── PHASE 2: Hesitate — the "player" is thinking ──
    if (b.state === 'HESITATING') {
      b.hesitateTimer--;
      // Subtle hover wobble
      b.currentY += Math.sin(b.hesitateTimer * 0.15) * 0.3;
      if (b.hesitateTimer <= 0) {
        b.state = 'CORRECTING';
      }
      continue;
    }

    // ── PHASE 3: Correct toward finalX (but overshoot slightly the other way) ──
    if (b.state === 'CORRECTING') {
      const dxToOvercorrect = b.overcorrectX - b.currentX;
      if (Math.abs(dxToOvercorrect) < C.correctionSpeed * 2) {
        b.currentX = b.overcorrectX;
        b.state = 'OVERCORRECTING';
      } else {
        b.currentX += Math.sign(dxToOvercorrect) * C.correctionSpeed;
      }
      // Very slow drift down
      b.currentY += 0.3;
      continue;
    }

    // ── PHASE 4: Overcorrect back to exact finalX ──
    if (b.state === 'OVERCORRECTING') {
      const dxToFinal = b.finalX - b.currentX;
      if (Math.abs(dxToFinal) < C.correctionSpeed) {
        b.currentX = b.finalX;
        b.state = 'FINAL_ALIGN';
      } else {
        b.currentX += Math.sign(dxToFinal) * (C.correctionSpeed * 0.8);
      }
      b.currentY += 0.2;
      continue;
    }

    // ── PHASE 5: Final alignment pause before hard drop ──
    if (b.state === 'FINAL_ALIGN') {
      b.state = 'HARD_DROP';
      b.velocityY = 0;
      continue;
    }

    // ── PHASE 6: Hard drop straight down ──
    if (b.state === 'HARD_DROP') {
      b.velocityY += 1.2;
      b.currentY += b.velocityY;
      if (b.currentY >= b.finalY) {
        b.currentY = b.finalY;
        b.currentX = b.finalX; // Ensure pixel-perfect alignment
        b.state = 'SETTLED';
        b.flashPhase = 1.0;
        b.velocityY = 0;
      }
      continue;
    }
  }
}
