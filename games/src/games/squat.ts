import { Game } from "../engine";
import type { PoseEngine } from "../pose";
import { LM } from "../pose";

interface Platform { x: number; y: number; w: number; }

export class Squat extends Game {
  private py = 0.0;        // player Y (0=top 1=bottom, rendered as 1-py)
  private velY = 0;
  private grounded = false;
  private charge = 0;
  private inSquat = false;
  private platforms: Platform[] = [];
  private camY = 0;         // camera scroll (world units)
  private maxY = 0;         // highest platform reached (score metric)
  private elapsed = 0;
  private baselineHipY = -1;  // calibrated standing hip Y
  private calibFrames = 0;
  private readonly GRAVITY = 1.8;
  private readonly PLAT_W = 0.22;

  constructor(canvas: HTMLCanvasElement, pose: PoseEngine) { super(canvas, pose); }

  reset() {
    this.py = 0;
    this.velY = 0;
    this.grounded = true;
    this.charge = 0;
    this.inSquat = false;
    this.camY = 0;
    this.maxY = 0;
    this.score = 0;
    this.elapsed = 0;
    this.baselineHipY = -1;
    this.calibFrames = 0;
    this.platforms = [
      { x: 0.5, y: 0,    w: this.PLAT_W * 2 }, // start platform (wide)
      ...Array.from({ length: 20 }, (_, i) => ({
        x: 0.15 + Math.random() * 0.7,
        y: -(i + 1) * 0.18 - 0.05,
        w: this.PLAT_W,
      })),
    ];
  }

  update(dt: number) {
    this.elapsed += dt;

    const hipY = (this.pose.get(LM.LEFT_HIP).y + this.pose.get(LM.RIGHT_HIP).y) / 2;

    // Calibrate baseline during first 60 frames of normal standing
    if (this.baselineHipY < 0 && hipY > 0.1) {
      this.calibFrames++;
      this.baselineHipY = hipY; // running update; last stable value used
    }
    const threshold = this.baselineHipY > 0 ? this.baselineHipY + 0.09 : 0.68;
    const squatting = hipY > threshold;

    if (squatting) {
      this.charge = Math.min(this.charge + dt * 1.2, 1);
      this.inSquat = true;
    } else if (this.inSquat && this.grounded && this.charge > 0.1) {
      // Stand up → jump!
      this.velY = -(2.5 + this.charge * 3.5);
      this.grounded = false;
      this.charge = 0;
      this.inSquat = false;
    } else if (!squatting) {
      this.inSquat = false;
    }

    // Physics
    this.velY += this.GRAVITY * dt;
    this.py -= this.velY * dt;

    // Platform collision (only when falling)
    if (this.velY > 0) {
      for (const p of this.platforms) {
        const relY = p.y - this.py;
        if (relY > -0.02 && relY < 0.04 && Math.abs(0.5 - p.x) < p.w / 2 + 0.04) {
          this.py = p.y;
          this.velY = 0;
          this.grounded = true;
          if (p.y < this.maxY) {
            this.maxY = p.y;
            this.score = Math.floor(-this.maxY * 10);
          }
        }
      }
    }

    // Fall off bottom = game over
    if (this.py > 0.5) { this.finish(); return; }

    // Camera follows player up
    this.camY = this.py - 0.65;

    // Extend platforms if needed
    const topPlat = Math.min(...this.platforms.map((p) => p.y));
    while (topPlat - this.camY > -1) {
      this.platforms.push({
        x: 0.15 + Math.random() * 0.7,
        y: topPlat - 0.18 - Math.random() * 0.06,
        w: this.PLAT_W,
      });
    }
  }

  render() {
    const { ctx, W, H } = this;
    this.drawBg();

    const toScreenY = (worldY: number) => (worldY - this.camY) * H;

    // Platforms
    for (const p of this.platforms) {
      const sy = toScreenY(p.y);
      if (sy < -20 || sy > H + 20) continue;
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.roundRect((p.x - p.w / 2) * W, sy - 8, p.w * W, 16, 4);
      ctx.fill();
    }

    // Player
    const px = 0.5 * W;
    const py = toScreenY(this.py);
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.roundRect(px - 20, py - 40, 40, 40, 8);
    ctx.fill();

    // Charge bar
    if (this.charge > 0) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(px - 30, py - 52, 60, 10);
      ctx.fillStyle = `hsl(${120 - this.charge * 120},90%,50%)`;
      ctx.fillRect(px - 30, py - 52, 60 * this.charge, 10);
    }

    // HUD
    this.text(`Score: ${this.score}`, 20, 44, 28, "#fff");
    if (this.baselineHipY < 0) {
      this.pill("Stand straight to calibrate…", W / 2, 44, "#64748b");
    } else {
      this.text(this.inSquat ? "Hold squat..." : "Squat to charge!", W / 2, 44, 22, "#fbbf24", "center");
    }
    this.text("Squat then stand to jump", W / 2, H - 16, 16, "rgba(255,255,255,0.5)", "center");
  }
}
