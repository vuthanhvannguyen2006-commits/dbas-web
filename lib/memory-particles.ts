export type Particle = {
  x: number; y: number; vx: number; vy: number;
  driftX: number; driftY: number; phase: number;
  spawnX: number; spawnY: number; fade: number;
};
export type ParticlePointer = { x: number; y: number; vx: number; vy: number; active: boolean };

// Positions persist after an encounter: friction eases velocity back to a slow
// drift, rather than pulling the particle back to an invisible starting point.
export function stepParticle(p: Particle, pointer: ParticlePointer, seconds: number, width: number, height: number) {
  const dt = Math.max(0, Math.min(seconds, 0.05));
  if (!dt) return;
  const dx = p.x - pointer.x, dy = p.y - pointer.y;
  p.fade = Math.min(1, p.fade + dt / 1.4);
  const distance = Math.hypot(dx, dy), radius = 125;
  if (pointer.active && distance < radius) {
    const influence = (1 - distance / radius) ** 2;
    const nx = distance > 0.01 ? dx / distance : Math.cos(p.phase);
    const ny = distance > 0.01 ? dy / distance : Math.sin(p.phase);
    p.vx += (nx * 550 + Math.max(-900, Math.min(900, pointer.vx)) * 0.25) * influence * dt;
    p.vy += (ny * 550 + Math.max(-900, Math.min(900, pointer.vy)) * 0.25) * influence * dt;
  }
  const friction = Math.exp(-2 * dt);
  p.vx = p.driftX + (p.vx - p.driftX) * friction;
  p.vy = p.driftY + (p.vy - p.driftY) * friction;
  const speed = Math.hypot(p.vx, p.vy);
  if (speed > 100) { p.vx *= 100 / speed; p.vy *= 100 / speed; }
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  const margin = 12;
  if (p.x < -margin || p.x > width + margin || p.y < -margin || p.y > height + margin) {
    // Each particle replenishes its own distributed region, rather than
    // collecting on the opposite edge and leaving the middle empty.
    p.x = p.spawnX * width;
    p.y = p.spawnY * height;
    p.vx = p.driftX; p.vy = p.driftY;
    p.fade = 0;
  }
}
