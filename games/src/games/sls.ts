import { Game } from "../engine";
import type { PoseEngine } from "../pose";
import { LM } from "../pose";

type Leg = "left" | "right";

export class SLS extends Game {
  private targetLeg: Leg = "left";
  private holdTime = 0;
  private zoneR = 0.12;
  private elapsed = 0;
  private roundT = 0;
  private readonly ROUND_DUR = 15;
  private readonly DURATION = 60;
  private roundScore = 0;

  constructor(canvas: HTMLCanvasElement, pose: PoseEngine) { super(canvas, pose); }

  reset() {
    this.elapsed = 0;
    this.score = 0;
    this.holdTime = 0;
    this.zoneR = 0.12;
    this.roundT = 0;
    this.roundScore = 0;
    this.targetLeg = Math.random() < 0.5 ? "left" : "right";
  }

  /** Returns true if the given leg is raised (ankle significantly above the other ankle) */
  private isLegRaised(leg: Leg): boolean {
    const thisAnkle  = this.pose.get(leg === "left" ? LM.LEFT_ANKLE  : LM.RIGHT_ANKLE);
    const otherAnkle = this.pose.get(leg === "left" ? LM.RIGHT_ANKLE : LM.LEFT_ANKLE);
    // A raised ankle is clearly higher on screen (lower y) than the planted ankle
    return otherAnkle.y - thisAnkle.y > 0.10;
  }

  private isStandingOn(leg: Leg): boolean {
    const other: Leg = leg === "left" ? "right" : "left";
    return this.isLegRaised(other) && !this.isLegRaised(leg);
  }

  update(dt: number) {
    this.elapsed += dt;
    if (this.elapsed >= this.DURATION) { this.finish(); return; }

    this.roundT += dt;
    if (this.roundT >= this.ROUND_DUR) {
      this.roundT = 0;
      this.targetLeg = this.targetLeg === "left" ? "right" : "left";
      this.zoneR = Math.max(0.05, this.zoneR - 0.015);
    }

    const standing = this.isStandingOn(this.targetLeg);
    if (standing) {
      this.holdTime += dt;
      this.roundScore = Math.floor(this.holdTime * 10) / 10;
      this.score = this.roundScore;
    }
  }

  render() {
    const { ctx, W, H } = this;
    this.drawBg();

    const standing = this.isStandingOn(this.targetLeg);

    // Balance zone at hip midpoint
    const hip = this.pose.mid(LM.LEFT_HIP, LM.RIGHT_HIP);
    const cx = hip.x * W, cy = hip.y * H;
    const r = this.zoneR * W;

    ctx.strokeStyle = standing ? "#22c55e" : "#f59e0b";
    ctx.lineWidth = 4;
    ctx.fillStyle = standing ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.08)";
    ctx.beginPath(); ctx.arc(W / 2, H * 0.5, r, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Hip dot
    ctx.fillStyle = standing ? "#22c55e" : "#ef4444";
    ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2; ctx.stroke();

    // Leg indicators
    const drawLeg = (leg: Leg, x: number) => {
      const raised = this.isLegRaised(leg);
      const isTarget = leg === this.targetLeg;
      ctx.strokeStyle = isTarget ? "#f97316" : "#475569";
      ctx.lineWidth = raised ? 6 : 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, H * 0.75); ctx.lineTo(x, raised ? H * 0.55 : H * 0.85);
      ctx.stroke();
      if (isTarget) {
        ctx.fillStyle = "#f97316";
        ctx.beginPath(); ctx.arc(x, H * 0.52, 8, 0, Math.PI * 2); ctx.fill();
      }
    };
    drawLeg("left", W * 0.35);
    drawLeg("right", W * 0.65);

    // Target cue
    const label = `Stand on ${this.targetLeg.toUpperCase()} leg`;
    this.pill(label, W / 2, H * 0.18, this.targetLeg === "left" ? "#3b82f6" : "#a855f7");

    // Round timer bar
    const barW = 260;
    const frac = 1 - this.roundT / this.ROUND_DUR;
    ctx.fillStyle = "#1e293b88";
    ctx.fillRect(W / 2 - barW / 2, H * 0.24, barW, 8);
    ctx.fillStyle = "#f97316";
    ctx.fillRect(W / 2 - barW / 2, H * 0.24, barW * frac, 8);

    // HUD
    this.text(`Hold: ${this.score.toFixed(1)}s`, 20, 44, 28, "#fff");
    const rem = Math.ceil(Math.max(0, this.DURATION - this.elapsed));
    this.text(`${rem}s`, W / 2, 44, 28, "#fbbf24", "center");
    this.pill(standing ? "✓ Good!" : "Lift other foot", W / 2, H - 52, standing ? "#22c55e" : "#ef4444");
    this.text("Single leg stance challenge", W / 2, H - 16, 16, "rgba(255,255,255,0.5)", "center");
  }
}
