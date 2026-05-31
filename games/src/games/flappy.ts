import { Game } from "../engine";
import type { PoseEngine } from "../pose";
import { LM } from "../pose";

interface Pipe {
  x: number;       // left edge, 0–1
  gapY: number;    // gap centre, 0–1
  scored: boolean;
}

const BIRD_X   = 0.2;
const BIRD_R   = 0.028;
const PIPE_W   = 0.08;
const GAP_HALF = 0.11;
const GRAVITY  = 1.4;
const FLAP_VEL = -0.7;

export class Flappy extends Game {
  private birdY  = 0.5;
  private velY   = 0;
  private pipes: Pipe[] = [];
  private spawnT = 0;
  private flapLast = false;
  private alive  = true;
  private deathT = 0;

  constructor(canvas: HTMLCanvasElement, pose: PoseEngine) { super(canvas, pose); }

  reset() {
    this.birdY    = 0.5;
    this.velY     = 0;
    this.pipes    = [];
    this.spawnT   = 0;
    this.flapLast = false;
    this.alive    = true;
    this.deathT   = 0;
    this.score    = 0;
  }

  update(dt: number) {
    if (!this.alive) {
      this.deathT += dt;
      if (this.deathT > 2) this.finish();
      return;
    }

    // Flap: left wrist above left shoulder
    const lw = this.pose.get(LM.LEFT_WRIST);
    const ls = this.pose.get(LM.LEFT_SHOULDER);
    const flap = lw.y < ls.y - 0.04;
    if (flap && !this.flapLast) this.velY = FLAP_VEL;
    this.flapLast = flap;

    this.velY  += GRAVITY * dt;
    this.birdY += this.velY * dt;

    if (this.birdY < 0.04 || this.birdY > 0.96) { this.alive = false; return; }

    // Move pipes
    const speed = 0.22 + this.score * 0.003;
    this.spawnT += dt;
    if (this.spawnT >= 2.2) {
      this.spawnT = 0;
      this.pipes.push({ x: 1.05, gapY: 0.2 + Math.random() * 0.6, scored: false });
    }
    for (const p of this.pipes) p.x -= speed * dt;
    this.pipes = this.pipes.filter((p) => p.x > -PIPE_W - 0.02);

    // Collision & scoring
    for (const p of this.pipes) {
      const pCentreX = p.x + PIPE_W / 2;
      const inX = Math.abs(BIRD_X - pCentreX) < BIRD_R + PIPE_W / 2;

      if (inX && Math.abs(this.birdY - p.gapY) > GAP_HALF + BIRD_R) {
        this.alive = false;
        return;
      }

      if (!p.scored && BIRD_X > p.x + PIPE_W) {
        p.scored = true;
        this.score++;
      }
    }
  }

  render() {
    const { ctx, W, H } = this;
    this.drawBg();

    // Pipes
    for (const p of this.pipes) {
      const px = p.x * W;
      const pw = PIPE_W * W;
      const topH = (p.gapY - GAP_HALF) * H;
      const botY = (p.gapY + GAP_HALF) * H;
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(px, 0, pw, topH);
      ctx.fillRect(px, botY, pw, H - botY);
      ctx.fillStyle = "#16a34a";
      ctx.fillRect(px - 4, topH - 20, pw + 8, 20);
      ctx.fillRect(px - 4, botY, pw + 8, 20);
    }

    // Bird
    const bx = BIRD_X * W;
    const by = this.birdY * H;
    const r  = BIRD_R * Math.min(W, H);
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(Math.min(Math.max(this.velY * 0.5, -0.8), 0.8));
    ctx.fillStyle = this.alive ? "#fbbf24" : "#ef4444";
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(r * 0.4, -r * 0.3, r * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1e293b";
    ctx.beginPath(); ctx.arc(r * 0.55, -r * 0.25, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // HUD
    this.text(`${this.score}`, W / 2, 60, 48, "#fff", "center");
    if (!this.alive) this.pill("Game Over!", W / 2, H / 2 - 20, "#ef4444");
    this.text("Raise left arm to flap", W / 2, H - 16, 16, "rgba(255,255,255,0.5)", "center");
  }
}
