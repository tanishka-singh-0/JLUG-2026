export const HERO_BLOCK_CONFIG = {
  // Internal Grid Resolution
  internalWidth: 1200,
  internalHeight: 500,
  cellSize: 20,
  cellGap: 3,
  letterSpacing: 280,
  startX: 70,
  startY: 160,

  // Sequence Timing (ms)
  buildDuration: 10000,
  holdDuration: 4000,
  resetDuration: 2500,
  get totalLoopDuration() {
    return this.buildDuration + this.holdDuration + this.resetDuration;
  },

  // Physics Tuning
  gravity: 0.12,
  horizontalSpeedBase: 2.5,
  horizontalSpeedVariance: 2.0,
  hardDropSpeed: 18,
  correctionSpeed: 1.5,

  // Human-player movement
  overshootMin: 60,
  overshootMax: 180,
  spawnOffsetMin: 80,
  spawnOffsetMax: 200,
  spawnHeightMin: 450,
  spawnHeightMax: 650,

  // Block chunking
  maxChunkWidth: 5,
  maxChunkHeight: 4,

  // Visuals
  gridOpacity: 0.06,
  colors: [
    { color: "#F2F0E8", weight: 70 },
    { color: "#E8E6DF", weight: 12 },
    { color: "#D7D5CE", weight: 10 },
    { color: "#777770", weight: 5 },
    { color: "#B7F34A", weight: 3 },
  ],
};
