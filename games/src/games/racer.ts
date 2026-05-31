import { Game } from "../engine";
import type { PoseEngine } from "../pose";
import { LM } from "../pose";

interface Wall {
  y: number;       // 0–1 normalized
  gapX: number;    // gap center 0–1
  passed: boolean;
}

export class Racer extends Game {
  private carX = 0.5;
  private walls: Wall[] = [];
  private spawnT = 0;
  private elapsed = 0;
  private lives = 3;
  private flashT = 0;
  private readonly DURATION = 60;
  private readonly GAP = 0.22;
  private readonly WALL_H = 18;

  constructor(canvas: HTMLCanvasElement, pose: PoseEngine) { super(canvas, pose); }

  reset() {
    this.carX = 0.5;
    this.walls = [];
    this.spawnT = 0;
    this.elapsed = 0;
    this.lives = 3;
    this.score = 0;
    this.flashT = 0;
  }

  update(dt: number) {
    this.elapsed += dt;
    if (this.elapsed >= this.DURATION || this.lives <= 0) { this.finish(); return; }

    const mid = this.pose.mid(LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER);
    this.carX += (mid.x - this.carX) * 0.12;
    this.carX = Math.max(0.05, Math.min(0.95, this.carX));

    const speed = 0.28 + this.elapsed * 0.003;
    this.spawnT += dt;
    const interval = Math.max(1.0, 1.8 - this.elapsed * 0.012);
    if (this.spawnT >= interval) {
      this.spawnT = 0;
      this.walls.push({ y: -0.04, gapX: 0.15 + Math.random() * 0.7, passed: false });
    }

    for (const w of this.walls) w.y += speed * dt;
    this.walls = this.walls.filter((w) => w.y < 1.15);

    for (const w of this.walls) {
      if (!w.passed && w.y >= 0.78 && w.y <= 0.88) {
        if (Math.abs(this.carX - w.gapX) > this.GAP) {
          this.lives--;
          this.flashT = 0.5;
          w.passed = true;
        } else {
          w.passed = true;
          this.score++;
        }
      }
    }
    if (this.flashT > 0) this.flashT -= dt;
  }

  render() {
    const { ctx, W, H } = this;
    this.drawBg();

    // Road lanes
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.setLineDash([24, 28]);
    [0.33, 0.66].forEach((f) => {
      ctx.beginPath(); ctx.moveTo(f * W, 0); ctx.lineTo(f * W, H); ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.restore();

    // Walls
    for (const w of this.walls) {
      const y = w.y * H;
      const lx = (w.gapX - this.GAP) * W;
      const rx = (w.gapX + this.GAP) * W;
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(0, y - this.WALL_H / 2, lx, this.WALL_H);
      ctx.fillRect(rx, y - this.WALL_H / 2, W - rx, this.WALL_H);
      // gap highlight
      ctx.fillStyle = "rgba(34,197,94,0.15)";
      ctx.fillRect(lx, y - this.WALL_H / 2, rx - lx, this.WALL_H);
    }

    // Car
    if (this.flashT > 0 && Math.floor(this.flashT * 10) % 2 === 0) {
      // flash red on hit
    } else {
      const cx = this.carX * W;
      const cy = H * 0.82;
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.roundRect(cx - 18, cy - 32, 36, 64, 7);
      ctx.fill();
      ctx.fillStyle = "#fff3";
      ctx.fillRect(cx - 14, cy - 28, 28, 18);
    }

    // Flash overlay
    if (this.flashT > 0) {
      ctx.fillStyle = `rgba(239,68,68,${this.flashT * 0.4})`;
      ctx.fillRect(0, 0, W, H);
    }

    // HUD
    this.text(`Score: ${this.score}`, 20, 44, 28, "#fff");
    this.text(`❤ `.repeat(this.lives) || "☠", W - 20, 44, 26, "#ef4444", "right");
    const rem = Math.ceil(Math.max(0, this.DURATION - this.elapsed));
    this.text(`${rem}s`, W / 2, 44, 28, "#fbbf24", "center");
    this.text("Lean to steer", W / 2, H - 16, 16, "rgba(255,255,255,0.5)", "center");
  }
}
