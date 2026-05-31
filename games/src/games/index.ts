import type { PoseEngine } from "../pose";
import type { Game } from "../engine";
import { Racer }      from "./racer";
import { Flappy }     from "./flappy";
import { Reach }      from "./reach";
import { Squat }      from "./squat";
import { Balance }    from "./balance";
import { ArmRace }    from "./armrace";
import { LeanDodger } from "./leandodger";
import { SLS }        from "./sls";

export interface GameMeta {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  target: string;
  isNew?: boolean;
  create: (canvas: HTMLCanvasElement, pose: PoseEngine) => Game;
}

export const GAMES: GameMeta[] = [
  { id: "racer",      name: "Pose Racer",    emoji: "🏎️", desc: "Lean to steer · dodge traffic",          target: "Trunk control",          isNew: true, create: (c, p) => new Racer(c, p) },
  { id: "flappy",     name: "Flappy Pose",   emoji: "🐦", desc: "Raise arm to fly · dodge pipes",          target: "Shoulder flexion",                   create: (c, p) => new Flappy(c, p) },
  { id: "reach",      name: "Reach Targets", emoji: "🎯", desc: "Touch targets · 60s challenge",           target: "Upper limb ROM",                     create: (c, p) => new Reach(c, p) },
  { id: "squat",      name: "Squat Jumper",  emoji: "🏃", desc: "Squat to charge · stand to jump",         target: "Lower limb power",                   create: (c, p) => new Squat(c, p) },
  { id: "balance",    name: "Balance Hold",  emoji: "⚖️", desc: "Hold CoG steady · survive longest",       target: "Static balance",                     create: (c, p) => new Balance(c, p) },
  { id: "armrace",    name: "Arm Race",      emoji: "💪", desc: "Match cues fast · left/right/both",       target: "Bilateral coordination",             create: (c, p) => new ArmRace(c, p) },
  { id: "leandodger", name: "Lean Dodger",   emoji: "🏄", desc: "Lean to dodge · falling boulders",        target: "Lateral trunk control",              create: (c, p) => new LeanDodger(c, p) },
  { id: "sls",        name: "SLS Balance",   emoji: "🦅", desc: "Single leg stand · shrinking zone",       target: "Single-leg stability",               create: (c, p) => new SLS(c, p) },
];
