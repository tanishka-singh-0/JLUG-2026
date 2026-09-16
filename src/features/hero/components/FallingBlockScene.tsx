"use client";

import { useEffect, useRef } from "react";
import { HERO_BLOCK_CONFIG } from "../data/config";
import { spawnBlocks } from "../engine/blockSpawner";
import { updateBlockPhysics } from "../engine/blockPhysics";
import { BlockPiece } from "../engine/types";

const C = HERO_BLOCK_CONFIG;

export default function FallingBlockScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let blocks: BlockPiece[] = spawnBlocks(prefersReducedMotion);

    // ── Resize ──
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // ── Mouse ──
    const mouse = { x: -9999, y: -9999, active: false };
    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * C.internalWidth;
      mouse.y = ((e.clientY - r.top) / r.height) * C.internalHeight;
      mouse.active = true;
    };
    const onLeave = () => {
      mouse.active = false;
    };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);

    // ── Animation state ──
    let raf: number;
    let lastTime = performance.now();
    let seqTime = prefersReducedMotion ? C.buildDuration : 0;

    // ── Render ──
    const render = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;

      if (!prefersReducedMotion) {
        seqTime += dt;
        if (seqTime >= C.totalLoopDuration) {
          seqTime = 0;
          blocks = spawnBlocks(false);
        }
      }

      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      const sx = rect.width / C.internalWidth;
      const sy = rect.height / C.internalHeight;
      ctx.save();
      ctx.scale(sx, sy);

      // ── Very subtle construction grid (barely visible) ──
      const cell = C.cellSize + C.cellGap;
      ctx.strokeStyle = `rgba(242, 240, 232, ${C.gridOpacity})`;
      ctx.lineWidth = 0.5;
      // Only draw grid in the letter construction zone
      const gridLeft = C.startX - cell;
      const gridRight = C.startX + 4 * C.letterSpacing;
      const gridTop = C.startY - cell;
      const gridBottom = C.startY + 7 * cell + cell;
      for (let x = gridLeft; x <= gridRight; x += cell) {
        ctx.beginPath();
        ctx.moveTo(x, gridTop);
        ctx.lineTo(x, gridBottom);
        ctx.stroke();
      }
      for (let y = gridTop; y <= gridBottom; y += cell) {
        ctx.beginPath();
        ctx.moveTo(gridLeft, y);
        ctx.lineTo(gridRight, y);
        ctx.stroke();
      }

      // ── Physics ──
      updateBlockPhysics(blocks, seqTime, prefersReducedMotion);

      // ── Render blocks ──
      for (const b of blocks) {
        // Skip pieces that haven't spawned yet
        if (b.state === "WAITING") continue;
        // Skip pieces that have fallen far off screen
        if (b.currentY > C.internalHeight + 200) continue;

        // Mouse displacement for settled blocks
        if (b.state === "SETTLED" && mouse.active) {
          const cx = b.currentX + b.width / 2;
          const cy = b.currentY + b.height / 2;
          const dx = mouse.x - cx;
          const dy = mouse.y - cy;
          const dist = Math.hypot(dx, dy);
          if (dist < 80 && dist > 0) {
            const force = ((80 - dist) / 80) * 4;
            b.interactiveDx = -(dx / dist) * force;
            b.interactiveDy = -(dy / dist) * force;
          } else {
            b.interactiveDx *= 0.85;
            b.interactiveDy *= 0.85;
          }
        } else {
          b.interactiveDx *= 0.85;
          b.interactiveDy *= 0.85;
        }

        const drawX = b.currentX + b.interactiveDx;
        const drawY = b.currentY + b.interactiveDy;

        // ── Block fill ──
        if (b.flashPhase > 0) {
          // Landing flash
          const flashAlpha = b.flashPhase;
          ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
          b.flashPhase -= 0.04;
        } else {
          ctx.globalAlpha = b.brightness;
          ctx.fillStyle = b.color;
        }

        ctx.fillRect(drawX, drawY, b.width, b.height);
        ctx.globalAlpha = 1;

        // ── Subtle physical depth: top highlight + bottom shadow ──
        // Top edge highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.fillRect(drawX, drawY, b.width, 1.5);
        // Left edge highlight
        ctx.fillRect(drawX, drawY, 1.5, b.height);
        // Bottom edge shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
        ctx.fillRect(drawX, drawY + b.height - 1.5, b.width, 1.5);
        // Right edge shadow
        ctx.fillRect(drawX + b.width - 1.5, drawY, 1.5, b.height);

        // ── Internal seam lines for multi-cell blocks ──
        if (b.widthCells > 1 || b.heightCells > 1) {
          ctx.strokeStyle = "rgba(7, 7, 7, 0.12)";
          ctx.lineWidth = 0.5;
          // Vertical seams
          for (let i = 1; i < b.widthCells; i++) {
            const seamX = drawX + i * (C.cellSize + C.cellGap) - C.cellGap / 2;
            ctx.beginPath();
            ctx.moveTo(seamX, drawY + 2);
            ctx.lineTo(seamX, drawY + b.height - 2);
            ctx.stroke();
          }
          // Horizontal seams
          for (let i = 1; i < b.heightCells; i++) {
            const seamY = drawY + i * (C.cellSize + C.cellGap) - C.cellGap / 2;
            ctx.beginPath();
            ctx.moveTo(drawX + 2, seamY);
            ctx.lineTo(drawX + b.width - 2, seamY);
            ctx.stroke();
          }
        }

        // ── Active piece indicator: thin accent outline on the currently falling piece ──
        if (
          b.state !== "SETTLED" &&
          b.state !== "RESETTING"
        ) {
          ctx.strokeStyle = "rgba(183, 243, 74, 0.35)";
          ctx.lineWidth = 1;
          ctx.strokeRect(drawX - 0.5, drawY - 0.5, b.width + 1, b.height + 1);
        }
      }

      ctx.restore();
      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair touch-none"
      style={{ display: "block" }}
    />
  );
}
