import type { PoseEngine } from "./pose";

export abstract class Game {
  protected W: number;
  protected H: number;
  protected ctx: CanvasRenderingContext2D;
  protected score = 0;
  protected running = false;
  private raf = 0;
  private onDone?: (score: number) => void;
  private lastTs = 0;

  constructor(
    protected canvas: HTMLCanvasElement,
    protected pose: PoseEngine,
  ) {
    this.W = canvas.width;
    this.H = canvas.height;
    this.ctx = canvas.getContext("2d")!;
  }

  start(onDone: (score: number) => void) {
    this.onDone = onDone;
    this.running = true;
    this.lastTs = performance.now();
    this.reset();
    this.tick();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  protected finish() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.onDone?.(this.score);
  }

  private tick() {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min((now - this.lastTs) / 1000, 0.05); // cap at 50ms
    this.lastTs = now;
    this.pose.detect();
    this.update(dt);
    this.render();
    this.raf = requestAnimationFrame(() => this.tick());
  }

  /** Draw camera feed (mirrored) as background with dark overlay */
  protected drawBg() {
    const { ctx, W, H, pose } = this;
    if (pose.video) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(pose.video, -W, 0, W, H);
      ctx.restore();
    } else {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, W, H);
    }
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, W, H);
    this.drawSkeleton();
  }

  private readonly SKELETON_PAIRS = [
    [11,12],[11,13],[13,15],[12,14],[14,16], // arms
    [11,23],[12,24],[23,24],                  // torso
    [23,25],[25,27],[24,26],[26,28],           // legs
  ];

  private drawSkeleton() {
    const { ctx, W, H, pose } = this;
    if (pose.landmarks.length === 0) {
      // No pose — show warning dot
      ctx.fillStyle = "#ef4444";
      ctx.beginPath(); ctx.arc(W - 20, 20, 7, 0, Math.PI * 2); ctx.fill();
      return;
    }
    ctx.save();
    ctx.globalAlpha = 0.45;
    // Bones
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    for (const [a, b] of this.SKELETON_PAIRS) {
      const la = pose.landmarks[a], lb = pose.landmarks[b];
      if (!la || !lb) continue;
      ctx.beginPath();
      ctx.moveTo((1 - la.x) * W, la.y * H);
      ctx.lineTo((1 - lb.x) * W, lb.y * H);
      ctx.stroke();
    }
    // Joints
    ctx.fillStyle = "#7dd3fc";
    for (const lm of pose.landmarks) {
      if ((lm.visibility ?? 0) < 0.4) continue;
      ctx.beginPath();
      ctx.arc((1 - lm.x) * W, lm.y * H, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Green dot = pose active
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#22c55e";
    ctx.beginPath(); ctx.arc(W - 20, 20, 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  protected text(
    t: string,
    x: number,
    y: number,
    size = 24,
    color = "#fff",
    align: CanvasTextAlign = "left",
  ) {
    const { ctx } = this;
    ctx.save();
    ctx.textAlign = align;
    ctx.font = `bold ${size}px system-ui, sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(t, x, y);
    ctx.restore();
  }

  protected pill(label: string, x: number, y: number, bg = "#f97316") {
    const { ctx } = this;
    const pad = 12;
    ctx.font = "bold 20px system-ui";
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = bg + "cc";
    ctx.beginPath();
    ctx.roundRect(x - tw / 2 - pad, y - 18, tw + pad * 2, 32, 16);
    ctx.fill();
    this.text(label, x, y + 8, 20, "#fff", "center");
  }

  abstract reset(): void;
  abstract update(dt: number): void;
  abstract render(): void;
}
