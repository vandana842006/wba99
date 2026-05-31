import { Game } from "../engine";
import type { PoseEngine } from "../pose";
import { LM } from "../pose";

interface Boulder {
  x: number; y: number; r: number; vx: number;
}

export class LeanDodger extends Game {
  private playerX = 0.5;
  private boulders: Boulder[] = [];
  private spawnT = 0;
  private lives = 3;
  private flashT = 0;
  private elapsed = 0;
  private readonly DURATION = 90;
  private readonly PLAYER_R = 0.038;

  constructor(canvas: HTMLCanvasElement, pose: PoseEngine) { super(canvas, pose); }

  reset() {
    this.playerX = 0.5;
    this.boulders = [];
    this.spawnT = 0;
    this.lives = 3;
    this.flashT = 0;
    this.elapsed = 0;
    this.score = 0;
  }

  update(dt: number) {
    this.elapsed += dt;
    if (this.elapsed >= this.DURATION || this.lives <= 0) { this.finish(); return; }
    if (this.flashT > 0) this.flashT -= dt;

    const mid = this.pose.mid(LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER);
    this.playerX += (mid.x - this.playerX) * 0.1;
    this.playerX = Math.max(0.05, Math.min(0.95, this.playerX));

    const speed = 0.3 + this.elapsed * 0.002;
    this.spawnT += dt;
    const interval = Math.max(0.7, 1.5 - this.elapsed * 0.01);
    if (this.spawnT >= interval) {
      this.spawnT = 0;
      const x = 0.08 + Math.random() * 0.84;
      const vx = (Math.random() - 0.5) * 0.15;
      const r = 0.04 + Math.random() * 0.035;
      this.boulders.push({ x, y: -0.05, r, vx });
    }

    for (const b of this.boulders) {
      b.y += speed * dt;
      b.x += b.vx * dt;
      if (b.x < b.r) { b.x = b.r; b.vx *= -1; }
      if (b.x > 1 - b.r) { b.x = 1 - b.r; b.vx *= -1; }
    }
    this.boulders = this.boulders.filter((b) => b.y < 1.1);

    const py = 0.82;
    for (const b of this.boulders) {
      const dx = (this.playerX - b.x), dy = (py - b.y);
      if (Math.sqrt(dx * dx + dy * dy) < this.PLAYER_R + b.r) {
        this.lives--;
        this.flashT = 0.5;
        this.boulders = this.boulders.filter((x) => x !== b);
      } else if (b.y > 0.9 && !( b as Boulder & { passed?: boolean }).passed) {
        (b as Boulder & { passed?: boolean }).passed = true;
        this.score++;
      }
    }
  }

  render() {
    const { ctx, W, H } = this;
    this.drawBg();

    // Boulders
    for (const b of this.boulders) {
      const bx = b.x * W, by = b.y * H, br = b.r * W;
      ctx.fillStyle = "#78716c";
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#a8a29e";
      ctx.beginPath(); ctx.arc(bx - br * 0.25, by - br * 0.25, br * 0.4, 0, Math.PI * 2); ctx.fill();
    }

    // Player
    const px = this.playerX * W;
    const py = H * 0.82;
    if (this.flashT > 0 && Math.floor(this.flashT * 10) % 2 === 0) {
      // blink on hit
    } else {
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.arc(px, py, this.PLAYER_R * W, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff3";
      ctx.beginPath(); ctx.arc(px - 6, py - 8, 6, 0, Math.PI * 2); ctx.fill();
    }

    if (this.flashT > 0) {
      ctx.fillStyle = `rgba(239,68,68,${this.flashT * 0.4})`;
      ctx.fillRect(0, 0, W, H);
    }

    // HUD
    this.text(`Dodged: ${this.score}`, 20, 44, 28, "#fff");
    this.text(`❤ `.repeat(this.lives) || "☠", W - 20, 44, 26, "#ef4444", "right");
    const rem = Math.ceil(Math.max(0, this.DURATION - this.elapsed));
    this.text(`${rem}s`, W / 2, 44, 28, "#fbbf24", "center");
    this.text("Lean left/right to dodge", W / 2, H - 16, 16, "rgba(255,255,255,0.5)", "center");
  }
}
