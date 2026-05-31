import { Game } from "../engine";
import type { PoseEngine } from "../pose";
import { LM } from "../pose";

type Cue = "LEFT" | "RIGHT" | "BOTH" | "NONE";

export class ArmRace extends Game {
  private cue: Cue = "NONE";
  private cueT = 0;
  private cueWindow = 2.0;   // seconds to react
  private responded = false;
  private resultT = 0;
  private resultOk = false;
  private level = 1;
  private elapsed = 0;
  private readonly DURATION = 60;

  constructor(canvas: HTMLCanvasElement, pose: PoseEngine) { super(canvas, pose); }

  reset() {
    this.cue = "NONE";
    this.cueT = 1.5; // delay before first cue
    this.cueWindow = 2.0;
    this.responded = false;
    this.resultT = 0;
    this.resultOk = false;
    this.score = 0;
    this.level = 1;
    this.elapsed = 0;
  }

  private nextCue() {
    const cues: Cue[] = ["LEFT", "RIGHT", "BOTH"];
    this.cue = cues[Math.floor(Math.random() * cues.length)];
    this.cueT = this.cueWindow;
    this.responded = false;
  }

  private checkArms(): { left: boolean; right: boolean } {
    const lw = this.pose.get(LM.LEFT_WRIST);
    const ls = this.pose.get(LM.LEFT_SHOULDER);
    const rw = this.pose.get(LM.RIGHT_WRIST);
    const rs = this.pose.get(LM.RIGHT_SHOULDER);
    return {
      left:  lw.y < ls.y - 0.06,
      right: rw.y < rs.y - 0.06,
    };
  }

  update(dt: number) {
    this.elapsed += dt;
    if (this.elapsed >= this.DURATION) { this.finish(); return; }

    if (this.resultT > 0) { this.resultT -= dt; return; }

    this.cueT -= dt;

    const { left, right } = this.checkArms();
    const match =
      (this.cue === "LEFT"  && left  && !right) ||
      (this.cue === "RIGHT" && right && !left)  ||
      (this.cue === "BOTH"  && left  && right)  ||
      (this.cue === "NONE"  && !left && !right);

    if (!this.responded && this.cue !== "NONE") {
      if (match) {
        this.responded = true;
        this.resultOk = true;
        this.resultT = 0.6;
        this.score++;
        this.level = Math.floor(this.score / 5) + 1;
        this.cueWindow = Math.max(0.8, 2.0 - this.level * 0.12);
        this.nextCue();
        return;
      }
    }

    if (this.cueT <= 0) {
      if (!this.responded && this.cue !== "NONE") {
        this.resultOk = false;
        this.resultT = 0.8;
      }
      this.nextCue();
    }
  }

  render() {
    const { ctx, W, H } = this;
    this.drawBg();

    // Arm silhouettes
    const { left, right } = this.checkArms();
    const drawArm = (up: boolean, xFrac: number, col: string) => {
      const x = xFrac * W;
      ctx.strokeStyle = up ? col : "#ffffff44";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.beginPath();
      if (up) {
        ctx.moveTo(x, H * 0.65); ctx.lineTo(x, H * 0.25);
      } else {
        ctx.moveTo(x, H * 0.55); ctx.lineTo(x + (xFrac < 0.5 ? -60 : 60), H * 0.45);
      }
      ctx.stroke();
      ctx.fillStyle = up ? col : "#ffffff44";
      ctx.beginPath(); ctx.arc(x, up ? H * 0.22 : H * 0.44, 16, 0, Math.PI * 2); ctx.fill();
    };
    drawArm(left,  0.3, "#3b82f6");
    drawArm(right, 0.7, "#a855f7");

    // Cue box
    const cueCol: Record<Cue, string> = { LEFT: "#3b82f6", RIGHT: "#a855f7", BOTH: "#22c55e", NONE: "#64748b" };
    ctx.fillStyle = (cueCol[this.cue] ?? "#f97316") + "dd";
    ctx.beginPath();
    ctx.roundRect(W / 2 - 110, H * 0.35, 220, 80, 16);
    ctx.fill();
    this.text(this.cue, W / 2, H * 0.35 + 54, 48, "#fff", "center");

    // Timer bar
    const barW = 300;
    const frac = this.cueT / this.cueWindow;
    ctx.fillStyle = "#1e293b88";
    ctx.fillRect(W / 2 - barW / 2, H * 0.48, barW, 10);
    ctx.fillStyle = frac > 0.4 ? "#22c55e" : "#ef4444";
    ctx.fillRect(W / 2 - barW / 2, H * 0.48, barW * Math.max(0, frac), 10);

    // Result flash
    if (this.resultT > 0) {
      this.pill(this.resultOk ? "✓ Nice!" : "✗ Miss", W / 2, H * 0.28, this.resultOk ? "#22c55e" : "#ef4444");
    }

    // HUD
    this.text(`Score: ${this.score}`, 20, 44, 28, "#fff");
    this.text(`Level ${this.level}`, W - 20, 44, 24, "#fbbf24", "right");
    const rem = Math.ceil(Math.max(0, this.DURATION - this.elapsed));
    this.text(`${rem}s`, W / 2, 44, 28, "#94a3b8", "center");
    this.text("Raise arm(s) matching the cue", W / 2, H - 16, 16, "rgba(255,255,255,0.5)", "center");
  }
}
