import * as THREE from "three";

/**
 * Creates a high-resolution cartoon eye texture matching Pingu Tiwari reference:
 * Dark espresso iris, amber edge gradient, crisp black pupil, and dual specular highlights.
 */
export function createEyeTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.46;

  // Clear background (white sclera)
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Subtle outer shadow ring
  const scleraGrad = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r);
  scleraGrad.addColorStop(0, "rgba(255, 255, 255, 1)");
  scleraGrad.addColorStop(0.85, "rgba(240, 243, 248, 1)");
  scleraGrad.addColorStop(1, "rgba(200, 208, 220, 1)");
  ctx.fillStyle = scleraGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Dark Iris
  const irisRadius = r * 0.82;
  const irisGrad = ctx.createRadialGradient(cx, cy, irisRadius * 0.2, cx, cy, irisRadius);
  irisGrad.addColorStop(0, "#483224"); // warm deep brown center
  irisGrad.addColorStop(0.65, "#2a1c14");
  irisGrad.addColorStop(0.9, "#18100b");
  irisGrad.addColorStop(1, "#0d0906"); // dark outer ring

  ctx.fillStyle = irisGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, irisRadius, 0, Math.PI * 2);
  ctx.fill();

  // Iris subtle radial striations
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = "rgba(245, 184, 46, 0.12)"; // subtle golden hint
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * (irisRadius * 0.4), Math.sin(angle) * (irisRadius * 0.4));
    ctx.lineTo(Math.cos(angle) * (irisRadius * 0.85), Math.sin(angle) * (irisRadius * 0.85));
    ctx.stroke();
  }
  ctx.restore();

  // Pupil (Deep black)
  const pupilRadius = irisRadius * 0.52;
  ctx.fillStyle = "#07080a";
  ctx.beginPath();
  ctx.arc(cx, cy, pupilRadius, 0, Math.PI * 2);
  ctx.fill();

  // Primary Specular Reflection Highlight (top-left, large crisp white oval)
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(255, 255, 255, 0.6)";
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.ellipse(cx - pupilRadius * 0.5, cy - pupilRadius * 0.5, pupilRadius * 0.42, pupilRadius * 0.35, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  // Secondary Specular Reflection Highlight (bottom-right, small round dot)
  ctx.beginPath();
  ctx.arc(cx + pupilRadius * 0.52, cy + pupilRadius * 0.48, pupilRadius * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates soft radial contact shadow texture for ground placement.
 */
export function createShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.45;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, "rgba(0, 0, 0, 0.65)");
  grad.addColorStop(0.35, "rgba(0, 0, 0, 0.42)");
  grad.addColorStop(0.7, "rgba(0, 0, 0, 0.15)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates high-res golden feather crest texture with 3 sweeping curves.
 */
export function createCrestTexture(isFlipped: boolean = false): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  ctx.clearRect(0, 0, w, h);

  if (isFlipped) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }

  // 3 Curved golden feather strokes
  const drawFeather = (
    startX: number,
    startY: number,
    cp1X: number,
    cp1Y: number,
    tipX: number,
    tipY: number,
    cp2X: number,
    cp2Y: number,
  ) => {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(cp1X, cp1Y, tipX, tipY);
    ctx.quadraticCurveTo(cp2X, cp2Y, startX, startY + 28);
    ctx.closePath();

    const grad = ctx.createLinearGradient(startX, startY, tipX, tipY);
    grad.addColorStop(0, "#d99018");
    grad.addColorStop(0.4, "#f5b82e");
    grad.addColorStop(1, "#ffd55e");

    ctx.fillStyle = grad;
    ctx.fill();

    // Subtle edge highlight
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  // Top feather (longest)
  drawFeather(100, 160, 260, 120, 440, 220, 260, 210);

  // Middle feather
  drawFeather(120, 230, 250, 210, 410, 310, 250, 300);

  // Bottom feather
  drawFeather(140, 300, 240, 290, 360, 390, 230, 380);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
