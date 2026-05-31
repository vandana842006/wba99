import { Game } from "../engine";
import type { PoseEngine } from "../pose";
import { LM } from "../pose";

export class Balance extends Game {
  private elapsed = 0;
  private inZone = false;
  private holdTime = 0;
  private zoneR = 0.14;        // starts large, shrinks
  private feedback = "";
  private feedbackT = 0;
  private readonly DURATION = 60;
  private readonly MIN_ZONE = 0.045;

  constructor(canvas: HTMLCanvasElement, pose: PoseEngine) { super(canvas, pose); }

  reset() {
    this.elapsed = 0;
    this.score = 0;
    this.holdTime = 0;
    this.zoneR = 0.14;
    this.feedback = "";
    this.feedbackT = 0;
  }

  update(dt: number) {
    this.elapsed += dt;
    if (this.elapsed >= this.DURATION) { this.finish(); return; }

    // Shrink zone over time
    const progress = this.elapsed / this.DURATION;
    this.zoneR = 0.14 - progress * (0.14 - this.MIN_ZONE);

    // CoG proxy: hip midpoint (mirrored x)
    const hip = this.pose.mid(LM.LEFT_HIP, LM.RIGHT_HIP);
    const dx = hip.x - 0.5, dy = hip.y - 0.55;
    const dist = Math.sqrt(dx * dx + dy * dy);

    this.inZone = dist < this.zoneR;
    if (this.inZone) {
      this.holdTime += dt;
      this.score = Math.floor(this.holdTime * 10) / 10;
    }

    if (this.feedbackT > 0) this.feedbackT -= dt;
  }

  render() {
    const { ctx, W, H } = this;
    this.drawBg();

    const cx = W / 2, cy = H * 0.55;
    const r = this.zoneR * W;

    // Zone rings
    for (let i = 3; i >= 1; i--) {
      ctx.strokeStyle = `rgba(251,191,36,${0.12 * i})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, r * (1 + i * 0.3), 0, Math.PI * 2); ctx.stroke();
    }

    // Zone circle
    ctx.strokeStyle = this.inZone ? "#22c55e" : "#f59e0b";
    ctx.lineWidth = 4;
    ctx.fillStyle = this.inZone ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.08)";
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // CoG dot
    const hip = this.pose.mid(LM.LEFT_HIP, LM.RIGHT_HIP);
    const dx = hip.x * W, dy = hip.y * H;
    ctx.fillStyle = this.inZone ? "#22c55e" : "#ef4444";
    ctx.beginPath(); ctx.arc(dx, dy, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Trail
    ctx.strokeStyle = (this.inZone ? "#22c55e" : "#ef4444") + "66";
    ctx.lineWidth = 2;

    // HUD
    this.text(`Hold time: ${this.score.toFixed(1)}s`, 20, 44, 28, "#fff");
    const rem = Math.ceil(Math.max(0, this.DURATION - this.elapsed));
    this.text(`${rem}s`, W / 2, 44, 28, "#fbbf24", "center");
    this.pill(
      this.inZone ? "In zone! ✓" : "Move to center",
      W / 2, H - 52,
      this.inZone ? "#22c55e" : "#f59e0b",
    );
    const pct = Math.round((1 - (this.zoneR - this.MIN_ZONE) / (0.14 - this.MIN_ZONE)) * 100);
    this.text(`Difficulty: ${pct}%`, W - 20, 44, 20, "#94a3b8", "right");
    this.text("Keep hips centred in zone", W / 2, H - 16, 16, "rgba(255,255,255,0.5)", "center");
  }
}
