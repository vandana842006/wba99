import { Game } from "../engine";
import type { PoseEngine } from "../pose";
import { LM } from "../pose";

interface Target {
  x: number; y: number; r: number;
  hand: "left" | "right";
  hit: boolean;
  hitT: number;
}

export class Reach extends Game {
  private targets: Target[] = [];
  private elapsed = 0;
  private readonly DURATION = 60;

  constructor(canvas: HTMLCanvasElement, pose: PoseEngine) { super(canvas, pose); }

  reset() {
    this.targets = [];
    this.elapsed = 0;
    this.score = 0;
    this.spawnTargets();
  }

  private spawnTargets() {
    this.targets = [];
    for (let i = 0; i < 5; i++) this.addTarget();
  }

  private addTarget() {
    this.targets.push({
      x: 0.1 + Math.random() * 0.8,
      y: 0.15 + Math.random() * 0.7,
      r: 0.055,
      hand: Math.random() < 0.5 ? "left" : "right",
      hit: false,
      hitT: 0,
    });
  }

  update(dt: number) {
    this.elapsed += dt;
    if (this.elapsed >= this.DURATION) { this.finish(); return; }

    const lw = { x: this.pose.mx(LM.LEFT_WRIST),  y: this.pose.get(LM.LEFT_WRIST).y };
    const rw = { x: this.pose.mx(LM.RIGHT_WRIST), y: this.pose.get(LM.RIGHT_WRIST).y };

    for (const t of this.targets) {
      if (t.hit) { t.hitT -= dt; continue; }
      const pt = t.hand === "left" ? lw : rw;
      const dx = pt.x - t.x, dy = pt.y - t.y;
      if (Math.sqrt(dx * dx + dy * dy) < t.r + 0.02) {
        t.hit = true;
        t.hitT = 0.5;
        this.score++;
      }
    }

    // Replace hit targets after animation
    this.targets = this.targets.filter((t) => !(t.hit && t.hitT <= 0));
    while (this.targets.length < 5) this.addTarget();
  }

  render() {
    const { ctx, W, H } = this;
    this.drawBg();

    // Wrist cursors
    const lw = { x: this.pose.mx(LM.LEFT_WRIST)  * W, y: this.pose.get(LM.LEFT_WRIST).y  * H };
    const rw = { x: this.pose.mx(LM.RIGHT_WRIST) * W, y: this.pose.get(LM.RIGHT_WRIST).y * H };

    for (const { pt, col } of [{ pt: lw, col: "#3b82f6" }, { pt: rw, col: "#a855f7" }]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 18, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = col + "55";
      ctx.fill();
    }

    // Targets
    for (const t of this.targets) {
      const tx = t.x * W, ty = t.y * H, tr = t.r * W;
      const col = t.hand === "left" ? "#3b82f6" : "#a855f7";
      const alpha = t.hit ? t.hitT * 2 : 1;
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.fillStyle = col + "33";
      ctx.beginPath(); ctx.arc(tx, ty, tr, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      this.text(t.hand === "left" ? "L" : "R", tx, ty + 7, 20, col, "center");
      ctx.globalAlpha = 1;
    }

    // HUD
    this.text(`Score: ${this.score}`, 20, 44, 28, "#fff");
    const rem = Math.ceil(Math.max(0, this.DURATION - this.elapsed));
    this.text(`${rem}s`, W / 2, 44, 28, "#fbbf24", "center");

    // Legend
    this.pill("L = Left hand", W * 0.25, H - 16, "#3b82f6");
    this.pill("R = Right hand", W * 0.75, H - 16, "#a855f7");
  }
}
