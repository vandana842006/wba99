import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { setDoc, collection, serverTimestamp, getDoc, doc, writeBatch } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { firebaseDB, firebaseFunctions } from "../../core/firebase";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import {
  ArrowLeft, Upload, Video, AlertTriangle, CheckCircle2,
  RotateCcw, X, Play, Pause, Flag,
} from "lucide-react";
import type { Patient } from "../../types";
import toast from "react-hot-toast";
import { PatientSelectSaveModal } from "./patients/PatientSelectSaveModal";

// â"€â"€ Types â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

interface PhaseResult {
  quality: number;
  deviations: string[];
  notes: string;
  frame_focus?: string;
  landmarks?: string[];
  ideal?: string[];
}

interface RehabProtocolItem {
  problem: string;
  cause: string;
  solution: string;
}

interface JointAngleRow {
  phase: string;
  abbr: string;
  hip: string;
  knee: string;
  ankle: string;
  hip_ideal: string;
  knee_ideal: string;
  ankle_ideal: string;
  status: "normal" | "mild" | "moderate" | "severe";
}

interface GaitAnalysisResult {
  view_mode?: "lateral" | "anterior" | "all";
  gait_cycle_breakdown?: {
    stance_phase_percent?: number;
    swing_phase_percent?: number;
    stance_subphases?: string[];
    swing_subphases?: string[];
  };
  phases: Record<string, PhaseResult>;
  joint_angle_table?: JointAngleRow[];
  total_score: number;
  risk_level: "low" | "moderate" | "high";
  summary: string;
  key_findings: string[];
  risk_flags?: string[];
  cadence_observation: string;
  stride_observation: string;
  symmetry_observation: string;
  spatiotemporal?: {
    step_length?: string;
    stride_length?: string;
    cadence?: string;
    speed?: string;
  };
  kinematic?: {
    joint_angles?: string;
    rom?: string;
  };
  kinetic?: {
    ground_reaction_force?: string;
    pressure_mapping?: string;
  };
  biomechanical_lines?: string[];
  clinical_report?: {
    patient_details?: string;
    gait_phase_analysis?: string;
    joint_angle_summary?: string;
    deviations?: string;
    risk_assessment?: string;
    rehab_protocol?: string;
  };
  rehab_protocol?: RehabProtocolItem[];
  recommendations?: string[];
}

// ── Running analysis types ───────────────────────────────────────────────────────

interface RunningSegmentResult {
  status: string;
  recap: string[];
  coach_tip: string;
  consequences: string;
  correction: string;
  angle: number | null;
  good_range_min: number | null;
  good_range_max: number | null;
  quality: "ideal" | "acceptable" | "needs_improvement";
}

interface RunningAnalysisResult {
  total_score: number;
  score_label: string;
  segments: {
    head: RunningSegmentResult;
    back: RunningSegmentResult;
    arm: RunningSegmentResult;
    front_leg: RunningSegmentResult;
    back_leg: RunningSegmentResult;
    foot_strike: RunningSegmentResult;
  };
  contact_time: number | null;
  joint_angles_cycle: {
    knee_left: number[];
    knee_right: number[];
    hip_left: number[];
    hip_right: number[];
    elbow_left: number[];
    elbow_right: number[];
  };
  summary: string;
  key_findings: string[];
  rehab_protocol?: RehabProtocolItem[];
  recommendations?: string[];
}

// â"€â"€ Constants â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

const GAIT_PHASES = [
  { id: "ic",  abbr: "IC",  label: "Initial Contact",  phase: "Stance" },
  { id: "lr",  abbr: "LR",  label: "Loading Response", phase: "Stance" },
  { id: "ms",  abbr: "MS",  label: "Mid Stance",       phase: "Stance" },
  { id: "ts",  abbr: "TS",  label: "Terminal Stance",  phase: "Stance" },
  { id: "ps",  abbr: "PS",  label: "Pre-Swing",        phase: "Stance" },
  { id: "is",  abbr: "IS",  label: "Initial Swing",    phase: "Swing"  },
  { id: "msw", abbr: "MSw", label: "Mid Swing",        phase: "Swing"  },
  { id: "tsw", abbr: "TSw", label: "Terminal Swing",   phase: "Swing"  },
];

const GAIT_PHASE_REFS = [
  { abbr: "IC",  phase: "Initial Contact",  hip_ideal: "20–30° F",   knee_ideal: "0–5° F",    ankle_ideal: "Neutral"   },
  { abbr: "LR",  phase: "Loading Response", hip_ideal: "Stable",     knee_ideal: "10–15° F",  ankle_ideal: "5–10° PF"  },
  { abbr: "MS",  phase: "Mid Stance",       hip_ideal: "0° Neutral", knee_ideal: "5–10° F",   ankle_ideal: "5° DF"     },
  { abbr: "TS",  phase: "Terminal Stance",  hip_ideal: "10–20° Ext", knee_ideal: "0–5° F",    ankle_ideal: "10–15° DF" },
  { abbr: "PS",  phase: "Pre-Swing",        hip_ideal: "Neutral",    knee_ideal: "35–40° F",  ankle_ideal: "20° PF"    },
  { abbr: "IS",  phase: "Initial Swing",    hip_ideal: "15–20° F",   knee_ideal: "60° F",     ankle_ideal: "Neutral"   },
  { abbr: "MSw", phase: "Mid Swing",        hip_ideal: "25° F",      knee_ideal: "25–30° F",  ankle_ideal: "5° DF"     },
  { abbr: "TSw", phase: "Terminal Swing",   hip_ideal: "25–30° F",   knee_ideal: "0–5° F",    ankle_ideal: "Neutral"   },
] as const;

const PHASE_ANGLE_NORMS: Array<{ hip: [number,number]; knee: [number,number]; ankle: [number,number] }> = [
  { hip: [20, 30],   knee: [0, 5],   ankle: [-5, 5]   }, // IC
  { hip: [15, 35],   knee: [10, 15], ankle: [-10, -5]  }, // LR
  { hip: [-5, 5],    knee: [5, 10],  ankle: [0, 8]    },  // MS
  { hip: [-20, -10], knee: [0, 5],   ankle: [10, 15]  }, // TS
  { hip: [-5, 5],    knee: [35, 40], ankle: [-25, -15] }, // PS
  { hip: [15, 20],   knee: [55, 65], ankle: [-5, 5]   }, // IS
  { hip: [20, 30],   knee: [25, 30], ankle: [0, 8]    }, // MSw
  { hip: [20, 30],   knee: [0, 5],   ankle: [-5, 5]   }, // TSw
];

const REHAB_MAP: Record<string, string> = {
  "Forefoot strike": "Tibialis anterior strengthening; heel strike retraining",
  "No heel strike": "Tibialis strengthening; dorsiflexor retraining",
  "Knee hyperextension": "Quad eccentric control; neuromuscular knee stabilisation",
  "Excess trunk lean": "Core stability; hip flexor lengthening",
  "No knee flexion (shock transferâ†')": "Eccentric quad loading; shock absorption drills",
  "Foot slap": "Tibialis anterior strengthening; AFO if indicated",
  "Knee valgus collapse": "Glute medius/max strengthening; valgus control training",
  "Hip drop (Trendelenburg)": "Hip abductor strengthening; single-leg balance",
  "Forward trunk lean": "Core activation; hip extensor strengthening",
  "Early heel rise": "Gastrocnemius/soleus stretching; heel contact cueing",
  "Limited hip extension": "Hip flexor release; glute max activation",
  "Weak push-off": "Calf/soleus strengthening; plantarflexion power training",
  "Reduced propulsion": "Plyometric push-off drills; ankle loading",
  "Toe drag": "Hip flexor strengthening; ankle dorsiflexor activation",
  "Drop foot (foot clearance failure)": "Tibialis anterior EMG; AFO assessment",
  "Poor eccentric control": "Hamstring eccentric loading; deceleration drills",
  "Unstable landing preparation": "Proprioception training; pre-activation exercises",
};

// ── Deviation metadata ──────────────────────────────────────────────────────────

const DEVIATION_SEVERITY: Record<string, "critical" | "moderate"> = {
  "Hip drop (Trendelenburg)":          "critical",
  "Knee valgus collapse":              "critical",
  "Drop foot (foot clearance failure)":"critical",
  "Knee hyperextension":               "moderate",
  "Forefoot strike":                   "moderate",
  "No heel strike":                    "moderate",
  "Excess trunk lean":                 "moderate",
  "No knee flexion (shock transfer↑)": "moderate",
  "Foot slap":                         "moderate",
  "Forward trunk lean":                "moderate",
  "Early heel rise":                   "moderate",
  "Limited hip extension":             "moderate",
  "Weak push-off":                     "moderate",
  "Reduced propulsion":                "moderate",
  "Toe drag":                          "moderate",
  "Poor eccentric control":            "moderate",
  "Unstable landing preparation":      "moderate",
};

const DEVIATION_DESCRIPTIONS: Record<string, string> = {
  "Hip drop (Trendelenburg)":          "Hip drop during mid-stance. Glute med weakness suspected.",
  "Knee valgus collapse":              "Knee collapses inward during stance. Glute med and VMO weakness.",
  "Drop foot (foot clearance failure)":"Foot clearance insufficient during swing. Tibialis anterior weakness.",
  "Knee hyperextension":               "Knee snaps into extension at loading response. Eccentric quad control deficit.",
  "Forefoot strike":                   "No heel strike at initial contact. May indicate ankle DF limitation or pain avoidance.",
  "No heel strike":                    "No heel strike at IC. Possible ankle stiffness or pain avoidance.",
  "Excess trunk lean":                 "Excessive anterior trunk lean. Core weakness or hip flexor tightness.",
  "No knee flexion (shock transfer↑)": "Absent loading response knee flexion. Increased joint impact forces.",
  "Foot slap":                         "Rapid uncontrolled foot descent after IC. Tibialis anterior weakness.",
  "Forward trunk lean":                "Trunk leaning forward during stance. Core and hip extensor weakness.",
  "Early heel rise":                   "Heel lifting before terminal stance. Gastrocnemius/soleus tightness.",
  "Limited hip extension":             "Reduced hip extension in terminal stance. Hip flexor tightness.",
  "Weak push-off":                     "Reduced ankle plantarflexion power at pre-swing. Calf weakness.",
  "Reduced propulsion":                "Insufficient propulsive force. Ankle plantarflexor loading deficit.",
  "Toe drag":                          "Initial swing clearance insufficient. Weak hip flexor or drop foot contributing.",
  "Poor eccentric control":            "Insufficient hamstring eccentric loading during terminal swing.",
  "Unstable landing preparation":      "Poor pre-activation before initial contact. Proprioception deficit.",
};

const ANGLE_PARAMS = [
  { key: "hip",   label: "Hip Flexion",   min: -20, max: 60,  normalMin: 0,  normalMax: 30, color: "#f97316", minLabel: "-20°",    maxLabel: "60°",    midLabel: "NORMAL: 0–30°"  },
  { key: "knee",  label: "Knee Flexion",  min: -10, max: 70,  normalMin: 0,  normalMax: 5,  color: "#4ade80", minLabel: "-10°",    maxLabel: "70°",    midLabel: "NORMAL: 0–5°"   },
  { key: "ankle", label: "Ankle (DF/PF)", min: -20, max: 20,  normalMin: -5, normalMax: 5,  color: "#e879f9", minLabel: "-20° PF", maxLabel: "20° DF", midLabel: "Neutral"        },
  { key: "trunk", label: "Trunk Lean",    min: -15, max: 15,  normalMin: 0,  normalMax: 5,  color: "#22d3ee", minLabel: "-15°",    maxLabel: "15°",    midLabel: "NORMAL: 0–5°"   },
] as const;

function parseAngleDeg(s: string | undefined): number | null {
  if (!s) return null;
  const m = s.match(/-?\d+/);
  return m ? parseInt(m[0], 10) : null;
}

function computeNumericAngles(kps: WireKp[], _W: number, _H: number) {
  const g = (i: number): WireKp | null => (kps[i]?.score ?? 0) > 0.2 ? kps[i] : null;
  const sh  = g(KP_IDX.l_shoulder) ?? g(KP_IDX.r_shoulder);
  const hp  = g(KP_IDX.l_hip)      ?? g(KP_IDX.r_hip);
  const lHp = g(KP_IDX.l_hip), lKn = g(KP_IDX.l_knee), lAn = g(KP_IDX.l_ankle), lFt = g(KP_IDX.l_foot_index);
  const rHp = g(KP_IDX.r_hip), rKn = g(KP_IDX.r_knee), rAn = g(KP_IDX.r_ankle), rFt = g(KP_IDX.r_foot_index);
  const kn  = (lHp && lKn) ? lKn : (rHp && rKn) ? rKn : null;
  const an  = lAn ?? rAn;
  const ft  = lFt ?? rFt;
  const trunkLean  = sh && hp ? wireAngle(hp.x, hp.y - 100, hp.x, hp.y, sh.x, sh.y) : null;
  const hipFlexion = sh && hp && kn ? 180 - wireAngle(sh.x, sh.y, hp.x, hp.y, kn.x, kn.y) : null;
  const kneeFlexion= hp && kn && an ? 180 - wireAngle(hp.x, hp.y, kn.x, kn.y, an.x, an.y) : null;
  const ankleAngle = kn && an && ft ? wireAngle(kn.x, kn.y, an.x, an.y, ft.x, ft.y) - 90 : null;
  return { trunkLean, hipFlexion, kneeFlexion, ankleAngle };
}

const ANALYZING_MESSAGES = [
  "Reading gait pattern...",
  "Analyzing joint mechanics...",
  "Identifying phase deviations...",
  "Assessing movement quality...",
  "Cross-referencing biomechanics...",
  "Generating clinical assessment...",
];

// 8 frames = one per gait phase (walking) or across running cycle
const FRAME_COUNT = 8;

const RUNNING_ANALYZING_MESSAGES = [
  "Reading running mechanics...",
  "Analyzing head & trunk position...",
  "Assessing arm swing pattern...",
  "Evaluating leg cycle mechanics...",
  "Assessing foot strike pattern...",
  "Generating running assessment...",
];

const RUNNING_SEGMENTS = [
  { id: "head" as const,        label: "Head",        subtitle: "Gaze & Head Position"      },
  { id: "back" as const,        label: "Back",        subtitle: "Trunk Lean"                 },
  { id: "arm" as const,         label: "Arm",         subtitle: "Elbow Angle & Arm Swing"   },
  { id: "front_leg" as const,   label: "Front Leg",   subtitle: "Leading Knee Angle"        },
  { id: "back_leg" as const,    label: "Back Leg",    subtitle: "Trailing Heel Kick"        },
  { id: "foot_strike" as const, label: "Foot Strike", subtitle: "Landing Pattern"           },
];

function runningScoreStyle(score: number) {
  if (score >= 80) return { text: "text-emerald-500", bar: "bg-emerald-500", badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" };
  if (score >= 60) return { text: "text-lime-500",    bar: "bg-lime-500",    badge: "bg-lime-500/15 text-lime-600 dark:text-lime-400"         };
  if (score >= 40) return { text: "text-amber-500",   bar: "bg-amber-500",   badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400"      };
  if (score >= 20) return { text: "text-orange-500",  bar: "bg-orange-500",  badge: "bg-orange-500/15 text-orange-600 dark:text-orange-400"   };
  return                  { text: "text-red-500",     bar: "bg-red-500",     badge: "bg-red-500/15 text-red-600 dark:text-red-400"            };
}

function segmentQualityColor(quality: RunningSegmentResult["quality"]): string {
  if (quality === "ideal")            return "#14b8a6";
  if (quality === "acceptable")       return "#f59e0b";
  return "#ef4444";
}

const JOINT_ANGLE_LINES = [
  { key: "knee_left"  as const, label: "Knee L",  color: "#f9a8d4" },
  { key: "knee_right" as const, label: "Knee R",  color: "#ef4444" },
  { key: "hip_left"   as const, label: "Hip L",   color: "#fde68a" },
  { key: "hip_right"  as const, label: "Hip R",   color: "#f97316" },
  { key: "elbow_left" as const, label: "Elbow L", color: "#e879f9" },
  { key: "elbow_right"as const, label: "Elbow R", color: "#a855f7" },
];

// â"€â"€ Frame extractor â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function extractFrames(
  file: File,
  count: number,
  onProgress: (n: number) => void,
  startSec: number,
  endSec: number,
): Promise<{ frames: string[]; thumbnails: string[] }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject(new Error("Canvas not supported"));

    video.muted = true;
    video.playsInline = true;
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    const cleanup = () => URL.revokeObjectURL(objectUrl);

    video.onloadedmetadata = () => {
      const W = Math.min(video.videoWidth || 1280, 1280);
      const H = Math.round(W * (video.videoHeight / video.videoWidth));
      canvas.width = W;
      canvas.height = H;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const span = endSec - startSec;
      const timestamps = Array.from({ length: count }, (_, i) =>
        count === 1 ? startSec : startSec + (span * i) / (count - 1)
      );

      const frames: string[] = [];
      const thumbnails: string[] = [];
      let idx = 0;

      const seekNext = () => {
        if (idx >= count) {
          cleanup();
          resolve({ frames, thumbnails });
          return;
        }
        video.currentTime = timestamps[idx];
      };

      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, W, H);
        frames.push(canvas.toDataURL("image/jpeg", 0.95).split(",")[1]);
        thumbnails.push(canvas.toDataURL("image/jpeg", 0.92));
        onProgress(idx + 1);
        idx++;
        setTimeout(seekNext, 40);
      };

      seekNext();
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Failed to load video. Try MP4 or WebM format."));
    };
  });
}

// â"€â"€ Helpers â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

const fmt = (s: number) => s.toFixed(2) + "s";

function riskStyle(r: string) {
  if (r === "low")      return { text: "text-emerald-500", bar: "bg-emerald-500", label: "Low Risk" };
  if (r === "moderate") return { text: "text-amber-500",   bar: "bg-amber-500",   label: "Moderate Risk" };
  return                       { text: "text-red-500",     bar: "bg-red-500",     label: "High Risk" };
}

function qualityBadge(q: number) {
  if (q === 3) return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25";
  if (q === 2) return "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/25";
  if (q === 1) return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25";
  return             "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25";
}

const qualityLabel = (q: number) => (["Severe", "Moderate", "Mild", "Normal"] as const)[q as 0|1|2|3] ?? "-";

const statusToQuality = (s: string) =>
  s === "normal" ? 3 : s === "mild" ? 2 : s === "moderate" ? 1 : 0;

// â"€â"€ Wire overlay constants â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

// BlazePose 33-keypoint indices (provides heel + foot_index for real ankle angles)
const KP_IDX = {
  nose: 0,
  l_eye_inner: 1, l_eye: 2, l_eye_outer: 3,
  r_eye_inner: 4, r_eye: 5, r_eye_outer: 6,
  l_ear: 7, r_ear: 8,
  mouth_l: 9, mouth_r: 10,
  l_shoulder: 11, r_shoulder: 12,
  l_elbow: 13, r_elbow: 14,
  l_wrist: 15, r_wrist: 16,
  l_pinky: 17, r_pinky: 18,
  l_index: 19, r_index: 20,
  l_thumb: 21, r_thumb: 22,
  l_hip: 23, r_hip: 24,
  l_knee: 25, r_knee: 26,
  l_ankle: 27, r_ankle: 28,
  l_heel: 29, r_heel: 30,
  l_foot_index: 31, r_foot_index: 32,
};

const WIRE_CONNECTIONS: [number, number][] = [
  // Arms
  [11,12], [11,13], [13,15], [12,14], [14,16],
  // Torso
  [11,23], [12,24], [23,24],
  // Legs
  [23,25], [25,27], [24,26], [26,28],
  // Feet (ankle→heel, ankle→toe)
  [27,29], [28,30],
  [27,31], [28,32],
];

interface WireKp { x: number; y: number; score: number; name: string; }

function wireAngle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  const v1x = ax-bx, v1y = ay-by, v2x = cx-bx, v2y = cy-by;
  const dot = v1x*v2x + v1y*v2y;
  const mag = Math.sqrt(v1x**2+v1y**2) * Math.sqrt(v2x**2+v2y**2);
  if (mag === 0) return 0;
  return Math.round(Math.acos(Math.min(1, Math.max(-1, dot/mag))) * 180/Math.PI);
}

function computeWireAngles(kps: WireKp[], _W: number, _H: number) {
  const g = (i: number) => kps[i] && kps[i].score > 0.2
    ? { x: kps[i].x, y: kps[i].y } : null;

  // Lower threshold helper for face landmarks â€" they're often < 0.2 in lateral view
  const gf = (i: number) => kps[i] && kps[i].score > 0.12
    ? { x: kps[i].x, y: kps[i].y } : null;

  const angles: { label: string; x: number; y: number; color: string }[] = [];
  const extraLines: { x1: number; y1: number; x2: number; y2: number; color: string }[] = [];
  const extraDots: { x: number; y: number; color: string }[] = [];
  const nose = gf(KP_IDX.nose);
  const lEar = gf(KP_IDX.l_ear);
  const lSh = g(KP_IDX.l_shoulder), rSh = g(KP_IDX.r_shoulder);
  const lEl = g(KP_IDX.l_elbow),   rEl = g(KP_IDX.r_elbow);
  const lHp = g(KP_IDX.l_hip),     rHp = g(KP_IDX.r_hip);
  const lKn = g(KP_IDX.l_knee),    rKn = g(KP_IDX.r_knee);
  const lAn = g(KP_IDX.l_ankle),   rAn = g(KP_IDX.r_ankle);

  const sh = lSh ?? rSh, hp = lHp ?? rHp;
  const el = (lSh && lEl) ? lEl : rEl;

  // Trunk lean from vertical â€" angle at hip between a point directly above and the shoulder.
  // 0Â° = upright, increases with forward/backward lean.
  if (sh && hp) {
    const vertAbove = { x: hp.x, y: hp.y - 100 };
    angles.push({ label: `${wireAngle(vertAbove.x, vertAbove.y, hp.x, hp.y, sh.x, sh.y)}Â°`, x: sh.x + 8, y: sh.y - 14, color: "#22d3ee" });
  }
  // Shoulder flexion â€" angle at shoulder between hip direction and elbow direction
  if (sh && hp && el)
    angles.push({ label: `${wireAngle(hp.x,hp.y,sh.x,sh.y,el.x,el.y)}Â°`, x: sh.x+8, y: sh.y+10, color: "#fbbf24" });
  // Hip flexion â€" angle at hip between shoulder (trunk) and knee (thigh)
  if (sh && hp) {
    const hipKn = lHp && lKn ? lKn : (rHp && rKn ? rKn : null);
    if (hipKn)
      angles.push({ label: `${wireAngle(sh.x,sh.y,hp.x,hp.y,hipKn.x,hipKn.y)}Â°`, x: hp.x+8, y: hp.y, color: "#f97316" });
  }
  // Knee flexion â€" both legs: angle at knee between hip (thigh) and ankle (shank)
  for (const [legHp, legKn, legAn] of [[lHp, lKn, lAn], [rHp, rKn, rAn]] as [typeof lHp, typeof lKn, typeof lAn][]) {
    if (!legHp || !legKn || !legAn) continue;
    angles.push({ label: `${wireAngle(legHp.x,legHp.y,legKn.x,legKn.y,legAn.x,legAn.y)}Â°`, x: legKn.x+8, y: legKn.y, color: "#4ade80" });
  }
  // â"€â"€ Walking direction â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  // Use midpoint of BOTH shoulders (more stable than a single landmark) as the
  // reference. Require a 10px margin so tiny detection noise never flips the sign.
  const shMidX = lSh && rSh ? (lSh.x + rSh.x) / 2
               : lSh ? lSh.x : rSh ? rSh.x
               : hp  ? hp.x  : _W / 2;
  const hpMidX = lHp && rHp ? (lHp.x + rHp.x) / 2
               : hp ? hp.x : shMidX;

  // Priority 1: nose vs shoulder midpoint (nose is forward of body in a lateral view)
  // Priority 2: left-ear vs shoulder midpoint (ear is behind nose for same-side view)
  // Priority 3: shoulder lean (very weak â€" trunk rarely leans in a lateral walk view)
  let faceRight: boolean;
  if (nose && Math.abs(nose.x - shMidX) >= 10) {
    faceRight = nose.x > shMidX;
  } else if (lEar && Math.abs(lEar.x - shMidX) >= 8) {
    // Right-facing: left ear is behind head â†' lEar.x < shMidX
    faceRight = lEar.x < shMidX;
  } else {
    faceRight = shMidX >= hpMidX; // fallback: very weak
  }
  const walkSign = faceRight ? 1 : -1;

  // Ankle dorsiflexion/plantarflexion using actual BlazePose foot_index keypoints.
  // angle at ankle between tibia (knee->ankle) and foot segment (ankle->foot_index).
  const lFoot = g(KP_IDX.l_foot_index);
  const rFoot = g(KP_IDX.r_foot_index);

  for (const [legKn, legAn, legFoot] of [
    [lKn, lAn, lFoot],
    [rKn, rAn, rFoot],
  ] as [typeof lKn, typeof lAn, typeof lFoot][]) {
    if (!legKn || !legAn || !legFoot) continue;
    extraDots.push({ x: legFoot.x, y: legFoot.y, color: "#e879f9" });
    const label = `${wireAngle(legKn.x, legKn.y, legAn.x, legAn.y, legFoot.x, legFoot.y)}°`;
    angles.push({ label, x: legAn.x + walkSign * 10, y: legAn.y - 18, color: "#e879f9" });
  }
  return { angles, extraLines, extraDots };
}

// Dynamic CDN loader
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src; s.async = true;
    s.onload = () => resolve(); s.onerror = reject;
    document.head.appendChild(s);
  });
}

// Object-contain letterbox rect
function getContainRect(vidW: number, vidH: number, contW: number, contH: number) {
  const vAR = vidW / vidH, cAR = contW / contH;
  let w: number, h: number;
  if (vAR > cAR) { w = contW; h = contW / vAR; }
  else            { w = contH * vAR; h = contH; }
  return { x: (contW - w) / 2, y: (contH - h) / 2, w, h };
}

// Rounded-rect path polyfill
function rrPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// Canvas wire skeleton renderer (6 viz modes)
function drawWireCanvas(
  ctx: CanvasRenderingContext2D,
  kps: WireKp[],
  W: number,
  H: number,
  opts: { viz: string; body: string; size: number; line: number; glow: number; bg: number },
) {
  const { viz, body, size, line, glow, bg } = opts;
  const lw = Math.max(1, line);  // line thickness
  const jr = Math.max(2, size);  // joint dot radius

  if (bg > 0) {
    ctx.fillStyle = `rgba(0,0,0,${bg / 100})`;
    ctx.fillRect(0, 0, W, H);
  }

  const ok = (i: number) => !!(kps[i] && kps[i].score > 0.2);
  // BlazePose: face landmarks 0–10, body 11–32
  const skipKp = (ki: number) => (body === 'body' && ki <= 10) || (body === 'face' && ki > 10);
  const skipConn = ([a, b]: [number, number]) =>
    (body === 'body' && (a <= 10 || b <= 10)) || (body === 'face' && (a > 10 || b > 10));
  const lineCol = (a: number, b: number) => Math.max(a, b) <= 22 ? '#22d3ee' : '#4ade80';
  const jointCol = (ki: number) => ki >= KP_IDX.l_hip ? '#f472b6' : '#22d3ee';

  if (viz === 'particles') {
    kps.forEach((kp, ki) => {
      if (kp.score < 0.25 || skipKp(ki)) return;
      const c = jointCol(ki);
      ctx.shadowBlur = glow; ctx.shadowColor = c;
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(kp.x, kp.y, jr * 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    });
    return;
  }

  const isNeon = viz === 'neon', isBone = viz === 'bone';
  const isMatrix = viz === 'matrix', isGhost = viz === 'ghost';
  ctx.lineCap = 'round';

  WIRE_CONNECTIONS.forEach(([a, b]) => {
    if (!ok(a) || !ok(b) || skipConn([a, b])) return;
    const c = isMatrix ? '#00ff41' : isGhost ? 'rgba(255,255,255,0.35)' : lineCol(a, b);
    ctx.strokeStyle = c;
    ctx.lineWidth = isBone ? lw * 2.5 : lw;
    if ((isNeon || isMatrix) && glow > 0) { ctx.shadowBlur = glow; ctx.shadowColor = c; }
    ctx.beginPath(); ctx.moveTo(kps[a].x, kps[a].y); ctx.lineTo(kps[b].x, kps[b].y); ctx.stroke();
    ctx.shadowBlur = 0;
  });

  kps.forEach((kp, ki) => {
    if (kp.score < 0.25 || skipKp(ki)) return;
    const c = isMatrix ? '#00ff41' : isGhost ? 'rgba(255,255,255,0.5)' : jointCol(ki);
    if ((isNeon || isMatrix) && glow > 0) { ctx.shadowBlur = glow * 1.5; ctx.shadowColor = c; }
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(kp.x, kp.y, jr, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    if (!isGhost && !isMatrix) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(kp.x, kp.y, jr * 0.45, 0, Math.PI * 2); ctx.fill();
    }
  });

  // Extra lines + dots (ankle-to-toe)
  const { angles, extraLines, extraDots } = computeWireAngles(kps, W, H);
  ctx.lineCap = 'round';
  extraLines.forEach(({ x1, y1, x2, y2, color }) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = isBone ? lw * 3 : lw * 1.6;
    if ((isNeon || isMatrix) && glow > 0) { ctx.shadowBlur = glow; ctx.shadowColor = color; }
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.shadowBlur = 0;
  });
  extraDots.forEach(({ x, y, color }) => {
    if ((isNeon || isMatrix) && glow > 0) { ctx.shadowBlur = glow * 1.5; ctx.shadowColor = color; }
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, jr, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    if (!isGhost && !isMatrix) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x, y, jr * 0.45, 0, Math.PI * 2); ctx.fill();
    }
  });

  // Angle badges
  const fs = Math.max(9, 9 + Math.floor(lw * 0.4));
  ctx.font = `bold ${fs}px monospace`;
  angles.forEach(({ label, x, y, color }) => {
    const tw = ctx.measureText(label).width;
    const bw = tw + 10, bh = fs + 6;
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    rrPath(ctx, x - 2, y - bh + 2, bw, bh, 3);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(label, x - 2 + bw / 2, y + 2);
    ctx.textAlign = 'left';
  });
}

// â"€â"€ Component â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

type Step = "upload" | "trim" | "extracting" | "preview" | "analyzing" | "results";

export function ClinicalGaitAnalysis() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const patientId = searchParams.get("patientId") ?? "";
  const [patient, setPatient] = useState<Patient | null>(null);

  const [step, setStep] = useState<Step>("upload");
  const [viewMode, setViewMode] = useState<"lateral" | "anterior" | "all">("lateral");
  const [analysisMode, setAnalysisMode] = useState<"walking" | "running">("walking");

  // Upload
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoURL, setVideoURL] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trim / cycle selector
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [useFullVideo, setUseFullVideo] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const draggingHandle = useRef<"start" | "end" | null>(null);

  // Extraction
  const [extractedFrames, setExtractedFrames] = useState<string[]>([]);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [frameSize, setFrameSize] = useState({ w: 640, h: 360 });

  // Wire overlay
  const [frameKeypoints, setFrameKeypoints] = useState<(WireKp[] | null)[]>([]);
  const [poseDetecting, setPoseDetecting] = useState(false);
  const [showWireOverlay, setShowWireOverlay] = useState(true);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  // Live wire overlay (trim/select-cycle step)
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const liveDetectorRef = useRef<any>(null);
  const liveAnimRef = useRef<number | null>(null);
  const liveDetectingRef = useRef(false);
  const wireOptsRef = useRef({ viz: 'wire', body: 'body', size: 4, line: 2, glow: 15, bg: 10 });
  const [liveWireMode, setLiveWireMode] = useState(false);
  const [liveWireLoading, setLiveWireLoading] = useState(false);
  const [wireViz, setWireViz] = useState<'wire'|'neon'|'particles'|'bone'|'matrix'|'ghost'>('wire');
  const [wireBody, setWireBody] = useState<'face'|'body'|'both'>('body');
  const [wireSize, setWireSize] = useState(4);
  const [wireLine, setWireLine] = useState(2);
  const [wireGlow, setWireGlow] = useState(15);
  const [wireBG, setWireBG] = useState(10);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Analysis
  const [analysis, setAnalysis] = useState<GaitAnalysisResult | null>(null);
  const [runningAnalysis, setRunningAnalysis] = useState<RunningAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [observations, setObservations] = useState("");
  const [msgIdx, setMsgIdx] = useState(0);

  // Save
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Results interaction
  const [selectedFrameIdx, setSelectedFrameIdx] = useState(0);
  const [activeResultTab, setActiveResultTab] = useState<"joints" | "flags" | "rehab" | "ai">("joints");

  useEffect(() => {
    if (!patientId) return;
    getDoc(doc(firebaseDB, "patients", patientId)).then((d) => {
      if (d.exists()) setPatient({ id: d.id, ...d.data() } as Patient);
    });
  }, [patientId]);

  useEffect(() => {
    if (step !== "analyzing") return;
    const msgs = analysisMode === "running" ? RUNNING_ANALYZING_MESSAGES : ANALYZING_MESSAGES;
    const id = setInterval(() => setMsgIdx((i) => (i + 1) % msgs.length), 2400);
    return () => clearInterval(id);
  }, [step, analysisMode]);

  useEffect(() => {
    setAnalysis(null);
    setRunningAnalysis(null);
    setAnalysisError(null);
    setObservations("");
  }, [analysisMode]);

  useEffect(() => {
    return () => { if (videoURL) URL.revokeObjectURL(videoURL); };
  }, [videoURL]);

  // â"€â"€ Pose detection on extracted frames (Preview step) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  useEffect(() => {
    if (step !== "preview" || thumbnails.length === 0) return;
    let cancelled = false;

    const run = async () => {
      setPoseDetecting(true);
      setFrameKeypoints([]);
      try {
        await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.15.0/dist/tf.min.js");
        await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection@2.1.3/dist/pose-detection.min.js");
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js");

        // Wait until globals are available
        await new Promise<void>((res) => {
          const poll = () => (window as any).poseDetection ? res() : setTimeout(poll, 80);
          poll();
        });

        const pd = (window as any).poseDetection;
        // MediaPipe runtime uses WASM — avoids TF.js backend conflicts with face-api
        const detector = await pd.createDetector(
          pd.SupportedModels.BlazePose,
          { runtime: 'mediapipe', solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404' },
        );

        const results: (WireKp[] | null)[] = [];
        for (let i = 0; i < thumbnails.length; i++) {
          if (cancelled) break;
          try {
            const img = new Image();
            img.src = thumbnails[i];
            await new Promise<void>((res) => { img.onload = () => res(); });
            const poses = await detector.estimatePoses(img);
            results.push((poses[0]?.keypoints as WireKp[]) ?? null);
          } catch {
            results.push(null);
          }
        }
        if (!cancelled) setFrameKeypoints(results);
      } catch (e) {
        console.warn("Pose detection skipped:", e);
      } finally {
        if (!cancelled) setPoseDetecting(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [step, thumbnails]);

  // â"€â"€ Lightbox keyboard navigation â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  useEffect(() => {
    if (lightboxIdx === null) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setLightboxIdx(null); }
      if (e.key === "ArrowRight") setLightboxIdx((i) => i !== null ? Math.min(i + 1, thumbnails.length - 1) : null);
      if (e.key === "ArrowLeft")  setLightboxIdx((i) => i !== null ? Math.max(i - 1, 0) : null);
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [lightboxIdx, thumbnails.length]);

  // â"€â"€ Live wire detection loop (trim step) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  useEffect(() => {
    if (!liveWireMode || step !== 'trim') {
      if (liveAnimRef.current) { cancelAnimationFrame(liveAnimRef.current); liveAnimRef.current = null; }
      const c = liveCanvasRef.current;
      if (c) { const cx = c.getContext('2d'); cx?.clearRect(0, 0, c.width, c.height); }
      return;
    }

    let cancelled = false;

    const startDetection = async () => {
      setLiveWireLoading(true);
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.15.0/dist/tf.min.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection@2.1.3/dist/pose-detection.min.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js');
        await new Promise<void>((res) => {
          const poll = () => (window as any).poseDetection ? res() : setTimeout(poll, 80);
          poll();
        });
        if (cancelled) return;
        const pd = (window as any).poseDetection;
        // MediaPipe WASM runtime — avoids TF.js backend conflicts with face-api
        liveDetectorRef.current = await pd.createDetector(
          pd.SupportedModels.BlazePose,
          { runtime: 'mediapipe', solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404' },
        );
      } catch (e) {
        console.warn('Wire detection init failed:', e);
        if (!cancelled) setLiveWireMode(false);
        return;
      } finally {
        if (!cancelled) setLiveWireLoading(false);
      }

      if (cancelled || !liveDetectorRef.current) return;

      const loop = async () => {
        if (cancelled) return;
        const canvas = liveCanvasRef.current;
        const video = videoRef.current;
        if (canvas && video && video.videoWidth > 0) {
          const cW = canvas.clientWidth, cH = canvas.clientHeight;
          if (canvas.width !== cW || canvas.height !== cH) {
            canvas.width = cW; canvas.height = cH;
          }
          if (!liveDetectingRef.current) {
            liveDetectingRef.current = true;
            try {
              const poses = await liveDetectorRef.current.estimatePoses(video);
              if (!cancelled) {
                const cx = canvas.getContext('2d');
                if (cx) {
                  cx.clearRect(0, 0, cW, cH);
                  if (poses[0]?.keypoints) {
                    const raw = poses[0].keypoints as WireKp[];
                    const rect = getContainRect(video.videoWidth, video.videoHeight, cW, cH);
                    const sx = rect.w / video.videoWidth, sy = rect.h / video.videoHeight;
                    const kps = raw.map(kp => ({ ...kp, x: rect.x + kp.x * sx, y: rect.y + kp.y * sy }));
                    drawWireCanvas(cx, kps, cW, cH, wireOptsRef.current);
                  }
                }
              }
            } catch { /* frame skip */ }
            liveDetectingRef.current = false;
          }
        }
        liveAnimRef.current = requestAnimationFrame(loop);
      };

      liveAnimRef.current = requestAnimationFrame(loop);
    };

    startDetection();

    return () => {
      cancelled = true;
      if (liveAnimRef.current) { cancelAnimationFrame(liveAnimRef.current); liveAnimRef.current = null; }
      liveDetectorRef.current = null;
      liveDetectingRef.current = false;
    };
  }, [liveWireMode, step]);

  // â"€â"€ Download video with wire overlay â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  const handleDownloadWireVideo = useCallback(async () => {
    const video = videoRef.current;
    const detector = liveDetectorRef.current;
    if (!video || !detector || isDownloading) return;

    setIsDownloading(true);
    setDownloadProgress(0);

    const srcW = video.videoWidth, srcH = video.videoHeight;
    const maxW = 1280;
    const scale = srcW > maxW ? maxW / srcW : 1;
    const cW = Math.round(srcW * scale), cH = Math.round(srcH * scale);

    const canvas = document.createElement('canvas');
    canvas.width = cW; canvas.height = cH;
    const ctx = canvas.getContext('2d')!;

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';
    const ext = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];

    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `gait-wire-analysis.${ext}`; a.click();
      URL.revokeObjectURL(url);
      setIsDownloading(false);
      setDownloadProgress(0);
    };

    // Seek to start of selected cycle (or beginning)
    const from = startTime ?? 0;
    const to = endTime ?? video.duration;
    video.pause();
    video.currentTime = from;
    await new Promise<void>(res => { video.onseeked = () => res(); });

    recorder.start(100);
    let lastKps: WireKp[] | null = null;
    let detecting = false;
    let done = false;

    const drawLoop = async () => {
      if (done) return;
      if (video.currentTime >= to || video.ended) {
        done = true;
        video.pause();
        setTimeout(() => recorder.stop(), 200);
        return;
      }

      ctx.drawImage(video, 0, 0, cW, cH);

      if (!detecting) {
        detecting = true;
        detector.estimatePoses(video).then((poses: any) => {
          if (poses[0]?.keypoints) {
            const raw = poses[0].keypoints as WireKp[];
            // Scale from native video coords to canvas coords
            lastKps = raw.map(kp => ({ ...kp, x: kp.x * scale, y: kp.y * scale }));
          }
          detecting = false;
        }).catch(() => { detecting = false; });
      }

      if (lastKps) drawWireCanvas(ctx, lastKps, cW, cH, wireOptsRef.current);

      setDownloadProgress(Math.min(99, Math.round(((video.currentTime - from) / (to - from)) * 100)));
      requestAnimationFrame(drawLoop);
    };

    video.play();
    requestAnimationFrame(drawLoop);
  }, [startTime, endTime, isDownloading]);

  // â"€â"€ Video controls â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  }, []);

  const stepFrame = useCallback((dir: 1 | -1) => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = Math.max(0, Math.min(v.currentTime + dir / 30, v.duration));
  }, []);

  const markStart = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    setUseFullVideo(false);
    setStartTime(v.currentTime);
    setEndTime(null);
  }, []);

  const markEnd = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (startTime === null) { toast.error("Mark Start first"); return; }
    if (v.currentTime <= startTime) { toast.error("End must come after Start"); return; }
    v.pause();
    setEndTime(v.currentTime);
  }, [startTime]);

  const applyQuickWindow = useCallback((dur: number) => {
    if (videoDuration === 0) return;
    const center = videoRef.current?.currentTime ?? videoDuration / 2;
    const s = Math.max(0, Math.min(center - dur / 2, videoDuration - dur));
    const e = Math.min(videoDuration, s + dur);
    setUseFullVideo(false);
    setStartTime(parseFloat(s.toFixed(3)));
    setEndTime(parseFloat(e.toFixed(3)));
  }, [videoDuration]);

  const getTimeFromClientX = useCallback((clientX: number): number => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect || videoDuration === 0) return 0;
    return Math.max(0, Math.min(videoDuration, ((clientX - rect.left) / rect.width) * videoDuration));
  }, [videoDuration]);

  const handleTimelinePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!timelineRef.current || videoDuration === 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const hitX = e.clientX;
    if (startTime !== null) {
      const handleX = rect.left + (startTime / videoDuration) * rect.width;
      if (Math.abs(hitX - handleX) <= 16) {
        draggingHandle.current = "start";
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
    }
    if (endTime !== null) {
      const handleX = rect.left + (endTime / videoDuration) * rect.width;
      if (Math.abs(hitX - handleX) <= 16) {
        draggingHandle.current = "end";
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
    }
    const t = getTimeFromClientX(hitX);
    if (videoRef.current) videoRef.current.currentTime = t;
  }, [startTime, endTime, videoDuration, getTimeFromClientX]);

  const handleTimelinePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingHandle.current) return;
    e.preventDefault();
    setUseFullVideo(false);
    const t = getTimeFromClientX(e.clientX);
    if (draggingHandle.current === "start") {
      setStartTime(t);
      setEndTime(prev => (prev !== null && t >= prev ? null : prev));
    } else {
      setEndTime(prev => {
        if (startTime !== null && t > startTime) return t;
        return prev;
      });
    }
  }, [startTime, getTimeFromClientX]);

  const handleTimelinePointerUp = useCallback(() => {
    draggingHandle.current = null;
  }, []);

  // Keyboard shortcuts for trim step
  useEffect(() => {
    if (step !== "trim") return;
    const handle = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === " ") { e.preventDefault(); togglePlay(); }
      if (e.key === "s" || e.key === "S") markStart();
      if (e.key === "e" || e.key === "E") markEnd();
      if (e.key === "ArrowLeft")  { e.preventDefault(); stepFrame(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); stepFrame(1); }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [step, togglePlay, markStart, markEnd, stepFrame]);

  // â"€â"€ File handling â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  const acceptFile = useCallback((file: File) => {
    if (!file.type.startsWith("video/")) { toast.error("Please upload a video file."); return; }
    if (file.size > 500 * 1024 * 1024) { toast.error("File too large. Max 500 MB."); return; }
    if (videoURL) URL.revokeObjectURL(videoURL);
    setVideoFile(file);
    setVideoURL(URL.createObjectURL(file));
    setStartTime(null);
    setEndTime(null);
    setExtractedFrames([]);
    setThumbnails([]);
    setAnalysis(null);
    setAnalysisError(null);
    setStep("upload");
  }, [videoURL]);

  // â"€â"€ Core actions â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  const handleExtract = async () => {
    if (!videoFile || startTime === null || endTime === null) return;
    setStep("extracting");
    setExtractionProgress(0);
    setFrameKeypoints([]);
    // Capture frame dimensions from current video element
    const v = videoRef.current;
    if (v && v.videoWidth > 0) {
      const fW = Math.min(v.videoWidth, 1280);
      setFrameSize({ w: fW, h: Math.round(fW * v.videoHeight / v.videoWidth) });
    }
    try {
      const { frames, thumbnails: thumbs } = await extractFrames(
        videoFile, FRAME_COUNT, (n) => setExtractionProgress(n), startTime, endTime,
      );
      setExtractedFrames(frames);
      setThumbnails(thumbs);
      setStep("preview");
    } catch (err) {
      toast.error((err as Error).message ?? "Frame extraction failed.");
      setStep("trim");
    }
  };

  const handleAnalyze = async () => {
    if (extractedFrames.length === 0) return;
    setStep("analyzing");
    setAnalysisError(null);
    setMsgIdx(0);

    if (analysisMode === "running") {
      try {
        const analyzeRunningFn = httpsCallable(firebaseFunctions, "analyzeRunningGait");
        const res = await analyzeRunningFn({
          frames: extractedFrames,
          viewMode,
          patientInfo: patient
            ? { age: patient.age, gender: patient.gender, condition: patient.condition }
            : undefined,
        });
        const { analysis: result } = res.data as { analysis: RunningAnalysisResult };
        setRunningAnalysis(result);
        setObservations(
          [result.summary, ...(result.key_findings ?? []).map((f) => `• ${f}`)].join("\n\n")
        );
        setStep("results");
      } catch (err: unknown) {
        const msg = (err as { message?: string })?.message ?? "Analysis failed. Please try again.";
        setAnalysisError(msg);
        toast.error(msg);
        setStep("preview");
      }
      return;
    }

    try {
      const analyzeGaitFn = httpsCallable(firebaseFunctions, "analyzeGait");
      const res = await analyzeGaitFn({
        frames: extractedFrames,
        cycleFrames: true,
        viewMode,
        patientInfo: patient
          ? { age: patient.age, gender: patient.gender, condition: patient.condition }
          : undefined,
      });
      const { analysis: result } = res.data as { analysis: GaitAnalysisResult };
      const phases: Record<string, PhaseResult> = {};
      for (const p of GAIT_PHASES) {
        phases[p.id] = result.phases?.[p.id] ?? { quality: 2, deviations: [], notes: "Not clearly visible." };
      }
      setAnalysis({ ...result, phases });
      setObservations(
        [result.summary, ...(result.key_findings ?? []).map((f) => `• ${f}`)].join("\n\n")
      );
      setStep("results");
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Analysis failed. Please try again.";
      setAnalysisError(msg);
      toast.error(msg);
      setStep("preview");
    }
  };

  const handleSave = async (pid: string) => {
    if (!user) return;
    if (analysisMode === "running" && !runningAnalysis) return;
    if (analysisMode === "walking" && !analysis) return;
    setSaving(true);
    try {
      // Draw video frame + skeleton wireframe onto a 2× supersampled canvas for PDF sharpness.
      // ctx.scale(2,2) doubles every coordinate so lines, dots and angle labels are all rendered
      // at physical 2× size — giving ~230 DPI when placed full-width in the PDF.
      const generateWireframeThumb = (
        thumbDataUrl: string,
        kps: WireKp[] | null,
      ): Promise<string> =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const W = img.naturalWidth, H = img.naturalHeight;
            const SCALE = 2;
            const canvas = document.createElement("canvas");
            canvas.width = W * SCALE; canvas.height = H * SCALE;
            const ctx = canvas.getContext("2d")!;
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.scale(SCALE, SCALE);
            ctx.drawImage(img, 0, 0, W, H);
            if (kps && kps.length > 0) {
              // size/line values are in logical px; scale(2,2) doubles them on the physical canvas
              drawWireCanvas(ctx, kps, W, H, {
                viz: "wire", body: "body", size: 7, line: 3.5, glow: 14, bg: 0,
              });
            }
            // Cap at 1600px to stay within Firestore 1 MB per-document limit
            const MAX = 1600;
            const ratio = Math.min(MAX / canvas.width, MAX / canvas.height, 1);
            if (ratio < 1) {
              const oW = Math.round(canvas.width * ratio), oH = Math.round(canvas.height * ratio);
              const out = document.createElement("canvas");
              out.width = oW; out.height = oH;
              const outCtx = out.getContext("2d")!;
              outCtx.imageSmoothingEnabled = true;
              outCtx.imageSmoothingQuality = "high";
              outCtx.drawImage(canvas, 0, 0, oW, oH);
              resolve(out.toDataURL("image/jpeg", 0.95));
            } else {
              resolve(canvas.toDataURL("image/jpeg", 0.95));
            }
          };
          img.onerror = () => resolve(thumbDataUrl);
          img.src = thumbDataUrl;
        });

      const compressThumb = (dataUrl: string): Promise<string> =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX = 1280;
            const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
            canvas.width = Math.round(img.width * ratio);
            canvas.height = Math.round(img.height * ratio);
            const ctx2 = canvas.getContext("2d")!;
            ctx2.imageSmoothingEnabled = true;
            ctx2.imageSmoothingQuality = "high";
            ctx2.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", 0.93));
          };
          img.onerror = () => resolve(dataUrl);
          img.src = dataUrl;
        });

      const [compressedThumbs, wireframeThumbs] = await Promise.all([
        Promise.all(thumbnails.slice(0, 8).map(compressThumb)),
        Promise.all(
          thumbnails.slice(0, 8).map((thumb, i) =>
            generateWireframeThumb(thumb, frameKeypoints[i] ?? null)
          )
        ),
      ]);

      const assessmentId = doc(collection(firebaseDB, "assessments")).id;

      // Build joint_angle_table from BlazePose keypoints when AI doesn't provide one
      const computedJAT = GAIT_PHASES.map((_ph, i) => {
        const ref = GAIT_PHASE_REFS[i]!;
        const norm = PHASE_ANGLE_NORMS[i]!;
        const kps = frameKeypoints[i] ?? null;
        if (!kps || kps.length === 0) {
          return { ...ref, hip: "—", knee: "—", ankle: "—", status: "normal" as const };
        }
        const { hipFlexion, kneeFlexion, ankleAngle } = computeNumericAngles(kps, frameSize.w, frameSize.h);
        const nosePt  = kps[KP_IDX.nose];
        const lShPt   = kps[KP_IDX.l_shoulder];
        const rShPt   = kps[KP_IDX.r_shoulder];
        const shMidX  = (lShPt && rShPt) ? (lShPt.x + rShPt.x) / 2 : (lShPt?.x ?? rShPt?.x ?? frameSize.w / 2);
        const faceRight = nosePt && Math.abs(nosePt.x - shMidX) >= 10 ? nosePt.x > shMidX : shMidX >= frameSize.w / 2;
        const hipPt   = kps[KP_IDX.l_hip]  ?? kps[KP_IDX.r_hip];
        const kneePt  = (kps[KP_IDX.l_hip] && kps[KP_IDX.l_knee]) ? kps[KP_IDX.l_knee] : (kps[KP_IDX.r_knee] ?? null);
        let hipSigned = hipFlexion;
        if (hipFlexion !== null && kneePt && hipPt) {
          const kneeAhead = faceRight ? kneePt.x > hipPt.x : kneePt.x < hipPt.x;
          if (!kneeAhead) hipSigned = -hipFlexion;
        }
        const fmtHip   = hipSigned !== null
          ? hipSigned >= 0 ? `${Math.round(hipSigned)}° F` : `${Math.round(-hipSigned)}° Ext`
          : "—";
        const fmtKnee  = kneeFlexion !== null ? `${Math.round(Math.max(0, kneeFlexion))}° F` : "—";
        const fmtAnkle = ankleAngle !== null
          ? ankleAngle >= 2 ? `${Math.round(ankleAngle)}° DF`
          : ankleAngle <= -2 ? `${Math.round(-ankleAngle)}° PF`
          : "Neutral"
          : "—";
        let dev = 0;
        const chk = (v: number | null, [lo, hi]: [number, number]) => {
          if (v === null) return;
          const slack = (hi - lo) * 0.5 + 5;
          if (v < lo - slack * 2 || v > hi + slack * 2) dev += 2;
          else if (v < lo - slack || v > hi + slack) dev += 1;
        };
        chk(hipSigned, norm.hip);
        chk(kneeFlexion, norm.knee);
        chk(ankleAngle, norm.ankle);
        const status = dev >= 4 ? "severe" : dev >= 2 ? "moderate" : dev >= 1 ? "mild" : "normal";
        return { ...ref, hip: fmtHip, knee: fmtKnee, ankle: fmtAnkle, status };
      });

      let cleanData: Record<string, unknown>;

      if (analysisMode === "running" && runningAnalysis) {
        cleanData = JSON.parse(JSON.stringify({
          analysis_mode: "running",
          total_score: runningAnalysis.total_score,
          score_label: runningAnalysis.score_label,
          segments: runningAnalysis.segments,
          contact_time: runningAnalysis.contact_time,
          joint_angles_cycle: runningAnalysis.joint_angles_cycle,
          view_mode: viewMode,
          observations,
          key_findings: runningAnalysis.key_findings ?? [],
          rehab_protocol: runningAnalysis.rehab_protocol ?? [],
          recommendations: runningAnalysis.recommendations ?? [],
          ai_generated: true,
        }));
      } else {
        const finalJAT = Array.isArray(analysis!.joint_angle_table) && analysis!.joint_angle_table.length === 8
          ? analysis!.joint_angle_table
          : computedJAT;

        cleanData = JSON.parse(JSON.stringify({
          analysis_mode: "walking",
          phases: analysis!.phases,
          total_score: analysis!.total_score,
          risk_level: analysis!.risk_level,
          view_mode: analysis!.view_mode ?? viewMode,
          gait_cycle_breakdown: analysis!.gait_cycle_breakdown,
          observations,
          key_findings: analysis!.key_findings ?? [],
          risk_flags: analysis!.risk_flags ?? [],
          cadence_observation: analysis!.cadence_observation,
          stride_observation: analysis!.stride_observation,
          symmetry_observation: analysis!.symmetry_observation,
          spatiotemporal: analysis!.spatiotemporal,
          kinematic: analysis!.kinematic,
          kinetic: analysis!.kinetic,
          biomechanical_lines: analysis!.biomechanical_lines,
          clinical_report: analysis!.clinical_report,
          rehab_protocol: analysis!.rehab_protocol ?? [],
          recommendations: analysis!.recommendations ?? [],
          joint_angle_table: finalJAT,
          ai_generated: true,
        }));
      }

      await setDoc(doc(firebaseDB, "assessments", assessmentId), {
        patientId: pid,
        physioId: user.uid,
        toolType: "gait_clinical",
        data: cleanData,
        createdAt: serverTimestamp(),
      });

      // Store thumbnails in Firestore subcollection to avoid Firebase Storage CORS restrictions
      const thumbBatch = writeBatch(firebaseDB);
      compressedThumbs.forEach((dataUrl, i) => {
        thumbBatch.set(doc(firebaseDB, "assessments", assessmentId, "thumbnails", `thumb_${i}`), { data: dataUrl });
      });
      wireframeThumbs.forEach((dataUrl, i) => {
        thumbBatch.set(doc(firebaseDB, "assessments", assessmentId, "thumbnails", `wire_${i}`), { data: dataUrl });
      });
      await thumbBatch.commit();

      setShowModal(false);
      toast.success(analysisMode === "running" ? "Running Gait Analysis saved!" : "Clinical Gait Analysis saved!");
      setTimeout(() => navigate("/physio/reports"), 1200);
    } catch (err) {
      console.error("Save failed:", err);
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // â"€â"€ Derived values â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  const cycleDuration = startTime !== null && endTime !== null ? endTime - startTime : null;
  const isValidCycle = cycleDuration !== null && cycleDuration >= 0.4 && (useFullVideo || cycleDuration <= 10.0);
  const allDeviations = analysis
    ? GAIT_PHASES.flatMap((p) => analysis.phases[p.id]?.deviations ?? []).filter((v, i, a) => a.indexOf(v) === i)
    : [];
  const risk = analysis ? riskStyle(analysis.risk_level) : null;

  // â"€â"€ Render â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost" size="sm"
          onClick={() => {
            if (step === "trim")     { setStep("upload"); return; }
            if (step === "preview")  { setStep("trim");   return; }
            if (step === "results")  { setStep("preview"); return; }
            navigate(-1);
          }}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-1.5 w-8 bg-teal-500 rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">Clinical Gait Analysis</span>
          </div>
          <h1 className="text-2xl font-black text-text">
            {analysisMode === "running" ? "Running Gait Analysis" : "AI-Powered Gait Analysis"}
          </h1>
          {patient && (
            <p className="text-text-muted text-sm">
              Patient: <span className="text-text font-semibold">{patient.name}</span>
            </p>
          )}
        </div>
        {step === "results" && analysisMode === "running" && runningAnalysis && (() => {
          const rs = runningScoreStyle(runningAnalysis.total_score);
          return (
            <div className="text-right">
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Score</p>
              <p className={`text-4xl font-black tabular-nums ${rs.text}`}>
                {runningAnalysis.total_score}<span className="text-lg text-text-muted font-bold">%</span>
              </p>
            </div>
          );
        })()}
        {step === "results" && analysisMode === "walking" && analysis && risk && (
          <div className="text-right">
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Score</p>
            <p className={`text-4xl font-black tabular-nums ${risk.text}`}>
              {analysis.total_score}<span className="text-lg text-text-muted font-bold"> / 24</span>
            </p>
          </div>
        )}
      </div>

      {/* Step pills */}
      <div className="flex items-center gap-1.5 text-xs flex-wrap">
        {(["upload", "trim", "extracting", "preview", "analyzing", "results"] as Step[]).map((s, i, arr) => {
          const labels: Record<Step, string> = {
            upload: "Upload", trim: "Select Cycle", extracting: "Extracting",
            preview: "Preview", analyzing: "Analyzing", results: "Results",
          };
          const stepIdx = arr.indexOf(step);
          const thisIdx = i;
          return (
            <div key={s} className="flex items-center gap-1.5">
              {i > 0 && <div className="h-px w-4 bg-border" />}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-bold transition ${
                step === s          ? "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30" :
                stepIdx > thisIdx   ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" :
                                      "bg-input text-text-muted border-border"
              }`}>
                {stepIdx > thisIdx && <CheckCircle2 className="w-3 h-3" />}
                <span className="hidden sm:inline">{labels[s]}</span>
                <span className="sm:hidden">{i + 1}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* â"€â"€â"€ STEP 1: UPLOAD â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      {step === "upload" && (
        <div className="space-y-4">

          {/* Analysis mode toggle */}
          <div className="flex gap-1 p-1 bg-input border border-border rounded-2xl">
            <button
              type="button"
              onClick={() => setAnalysisMode("walking")}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition ${
                analysisMode === "walking"
                  ? "bg-teal-500/20 text-teal-500 border border-teal-500/30"
                  : "text-text-muted hover:text-text"
              }`}
            >
              Walking Gait
            </button>
            <button
              type="button"
              onClick={() => setAnalysisMode("running")}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition ${
                analysisMode === "running"
                  ? "bg-orange-500/20 text-orange-500 border border-orange-500/30"
                  : "text-text-muted hover:text-text"
              }`}
            >
              Running Gait
            </button>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            {([
              { id: "anterior", label: "ANT", desc: "Frontal plane symmetry, hip drop, step width" },
              { id: "lateral", label: "LAT", desc: "Sagittal phases, push-off, toe clearance" },
              { id: "all", label: "ALL VIEWS", desc: "Combined frontal + sagittal interpretation" },
            ] as const).map((view) => (
              <button
                key={view.id}
                type="button"
                onClick={() => setViewMode(view.id)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  viewMode === view.id
                    ? "border-teal-500/40 bg-teal-500/10"
                    : "border-border bg-input hover:border-teal-500/30"
                }`}
              >
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted">{view.label}</p>
                <p className="mt-1 text-xs text-text leading-relaxed">{view.desc}</p>
              </button>
            ))}
          </div>
          <p className="text-sm text-text-muted">
            {analysisMode === "running"
              ? <>Upload a running video for <strong>LAT</strong> or <strong>ANT</strong> view. Record 5-15 seconds of running at a comfortable pace with the full body visible.</>
              : <>Upload a gait video for <strong>ANT</strong>, <strong>LAT</strong>, or <strong>ALL VIEWS</strong>. Record 5-15 seconds of complete walking with the full body visible.</>
            }
          </p>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) acceptFile(f); }}
            onClick={() => !videoFile && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl transition-all ${
              dragging ? "border-teal-500 bg-teal-500/5" :
              videoFile ? "border-teal-500/40 bg-teal-500/5" :
              "border-border bg-input hover:border-teal-500/50 hover:bg-surface cursor-pointer"
            }`}
          >
            {videoFile && videoURL ? (
              <div>
                <video src={videoURL} controls className="w-full rounded-t-2xl max-h-64 object-contain bg-black" />
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Video className="w-4 h-4 text-teal-500 flex-shrink-0" />
                    <p className="text-sm font-bold text-text truncate">{videoFile.name}</p>
                    <span className="text-xs text-text-muted flex-shrink-0">
                      {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setVideoFile(null); setVideoURL(null); }}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-500 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-teal-500/10 flex items-center justify-center">
                  <Upload className="w-7 h-7 text-teal-500" />
                </div>
                <div className="text-center">
                  <p className="font-black text-text">Drop video here or click to browse</p>
                  <p className="text-sm text-text-muted mt-1">MP4, MOV, WebM | Max 500 MB</p>
                </div>
              </div>
            )}
          </div>

          <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f); }} />

          {/* Filming tips */}
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { icon: "CAM",  tip: "Keep the full body visible in the selected ANT or LAT view" },
              { icon: analysisMode === "running" ? "RUN" : "WALK", tip: analysisMode === "running" ? "Capture running at a consistent, comfortable pace — avoid sprinting" : "Capture complete walking at a comfortable, natural pace" },
              { icon: "LIGHT", tip: "Use clear lighting and a simple background when possible" },
            ].map(({ icon, tip }) => (
              <div key={tip} className="flex items-center gap-3 p-3 rounded-xl bg-input border border-border">
                <span className="text-xs font-black text-teal-500 min-w-[40px]">{icon}</span>
                <p className="text-xs text-text-muted">{tip}</p>
              </div>
            ))}
          </div>

          {videoFile && (
            <div className="flex justify-end">
              <Button variant="primary" size="lg" onClick={() => setStep("trim")}>
                {analysisMode === "running" ? "Select Running Cycle" : "Select Gait Cycle"} {"->"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* â"€â"€â"€ STEP 2: TRIM / CYCLE SELECTOR â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      {step === "trim" && videoURL && (
        <div className="space-y-4">

          {/* Instructions */}
          <div className="bg-teal-500/5 border border-teal-500/20 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-teal-600 dark:text-teal-400">
              How to select one gait cycle
            </p>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
              {[
                { n: 1, text: "Play and watch - pause near the moment a heel first contacts the ground" },
                { n: 2, text: "Drag the green handle to set cycle start; drag the red handle to set cycle end" },
                { n: 3, text: "Or tap a Quick Select preset (0.8 – 1.5 s) to snap a window around the current position" },
                { n: 4, text: "Or tap 'Use Full Video' if the clip is already trimmed to one cycle" },
              ].map(({ n, text }) => (
                <div key={n} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                    {n}
                  </span>
                  <p className="text-xs text-text-muted leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
            {/* Keyboard shortcuts - desktop only */}
            <div className="hidden sm:flex flex-wrap gap-3 pt-1 border-t border-teal-500/10 text-[10px] font-bold text-text-muted/70 uppercase tracking-wider">
              <span>Space = play/pause</span>
              <span>S = mark start</span>
              <span>E = mark end</span>
              <span>&lt; &gt; = frame step</span>
              <span>Drag handles = adjust range</span>
            </div>
            {/* Touch hint - mobile only */}
            <div className="flex sm:hidden items-center gap-2 pt-1 border-t border-teal-500/10 text-[10px] font-bold text-text-muted/70 uppercase tracking-wider">
              <span>Drag green/red handles to set range</span>
              <span>|</span>
              <span>Use &lt; &gt; to step frames</span>
            </div>
          </div>

          {/* Video player with live wire canvas overlay */}
          <div className="relative rounded-2xl overflow-hidden bg-black">
            <video
              ref={videoRef}
              src={videoURL}
              playsInline
              className="w-full max-h-72 object-contain cursor-pointer"
              style={{ display: 'block' }}
              onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
              onLoadedMetadata={() => setVideoDuration(videoRef.current?.duration ?? 0)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onClick={togglePlay}
            />
            {liveWireMode && (
              <canvas
                ref={liveCanvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />
            )}
            {liveWireLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-7 h-7 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
                  <span className="text-xs text-teal-300 font-bold tracking-wider">Loading AI model...€¦</span>
                </div>
              </div>
            )}
            {liveWireMode && !liveWireLoading && (
              <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-teal-500/40">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest">Live Wire</span>
              </div>
            )}
          </div>

          {/* Live wire controls */}
          <div className="rounded-2xl border border-border overflow-hidden bg-input">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"
                  className={`w-3.5 h-3.5 ${liveWireMode ? 'text-teal-400' : 'text-text-muted'}`}>
                  <line x1="7" y1="1" x2="7" y2="4"/><line x1="7" y1="4" x2="4" y2="8"/>
                  <line x1="7" y1="4" x2="10" y2="8"/><line x1="4" y1="8" x2="3" y2="13"/>
                  <line x1="10" y1="8" x2="11" y2="13"/><circle cx="7" cy="2" r="1" fill="currentColor"/>
                </svg>
                <span className="text-xs font-black uppercase tracking-widest text-text-muted">Live Wire Analysis</span>
              </div>
              <button
                onClick={() => setLiveWireMode(v => !v)}
                className={`px-3 py-1 rounded-lg border text-xs font-bold transition ${
                  liveWireMode
                    ? 'bg-teal-500 text-white border-teal-600 shadow-sm'
                    : 'bg-surface text-text-muted border-border hover:border-teal-500/40 hover:text-teal-500'
                }`}
              >
                {liveWireMode ? 'ON' : 'OFF'}
              </button>
            </div>

            {liveWireMode && (
              <div className="p-4 space-y-3">
                {/* Body part */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-text-muted w-10">Body</span>
                  <div className="flex items-center gap-1">
                    {(['body', 'face', 'both'] as const).map(b => (
                      <button
                        key={b}
                        onClick={() => { setWireBody(b); wireOptsRef.current.body = b; }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition capitalize ${
                          wireBody === b
                            ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                            : 'text-text-muted border border-transparent hover:border-border'
                        }`}
                      >{b}</button>
                    ))}
                  </div>
                </div>

                {/* Viz modes */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-text-muted w-10">Viz</span>
                  <div className="flex items-center flex-wrap gap-1">
                    {([
                      { id: 'wire', label: 'Wire' },
                      { id: 'neon', label: 'Neon' },
                      { id: 'particles', label: 'Particles' },
                      { id: 'bone', label: 'Bone+ROM' },
                      { id: 'matrix', label: 'Matrix' },
                      { id: 'ghost', label: 'Ghost' },
                    ] as const).map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => { setWireViz(id); wireOptsRef.current.viz = id; }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide transition ${
                          wireViz === id
                            ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                            : 'text-text-muted border border-border hover:border-teal-500/30'
                        }`}
                      >{label}</button>
                    ))}
                  </div>
                </div>

                {/* Sliders */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  {([
                    { label: 'Line',  val: wireLine, min: 1, max: 10,
                      fn: (v: number) => { setWireLine(v); wireOptsRef.current.line = v; } },
                    { label: 'Dot',   val: wireSize, min: 2, max: 12,
                      fn: (v: number) => { setWireSize(v); wireOptsRef.current.size = v; } },
                    { label: 'Glow',  val: wireGlow, min: 0, max: 40,
                      fn: (v: number) => { setWireGlow(v); wireOptsRef.current.glow = v; } },
                    { label: 'BG',    val: wireBG,   min: 0, max: 80,
                      fn: (v: number) => { setWireBG(v);   wireOptsRef.current.bg   = v; } },
                  ]).map(({ label, val, min, max, fn }) => (
                    <div key={label} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">{label}</span>
                        <span className="text-[10px] font-mono text-teal-400 tabular-nums">{val}</span>
                      </div>
                      <input
                        type="range" min={min} max={max} value={val}
                        onChange={e => fn(Number(e.target.value))}
                        className="w-full h-1 accent-teal-500 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>

                {/* Angle legend + download */}
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
                  {[
                    { color: '#22d3ee', label: 'Neck' },
                    { color: '#fbbf24', label: 'Shoulder' },
                    { color: '#f97316', label: 'Hip' },
                    { color: '#4ade80', label: 'Knee' },
                    { color: '#e879f9', label: 'Ankle' },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                      <span className="text-[10px] font-bold text-text-muted">{label}</span>
                    </div>
                  ))}

                  <button
                    onClick={handleDownloadWireVideo}
                    disabled={isDownloading}
                    className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                      isDownloading
                        ? 'bg-teal-500/10 text-teal-400 border-teal-500/30 cursor-wait'
                        : 'bg-surface text-text-muted border-border hover:border-teal-500/40 hover:text-teal-500'
                    }`}
                    title={startTime !== null && endTime !== null ? 'Download selected cycle with wire overlay' : 'Download full video with wire overlay'}
                  >
                    {isDownloading ? (
                      <>
                        <div className="w-3 h-3 rounded-full border-[1.5px] border-teal-400 border-t-transparent animate-spin" />
                        <span>{downloadProgress}%</span>
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                          <path d="M7 1v8M4 6l3 3 3-3M2 11h10"/>
                        </svg>
                        <span>{startTime !== null && endTime !== null ? 'Download Cycle' : 'Download Video'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Custom controls */}
          <div className="bg-input border border-border rounded-2xl p-4 space-y-4">

            {/* Playback row */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => stepFrame(-1)}
                className="w-12 h-12 sm:w-9 sm:h-9 rounded-xl border border-border bg-surface hover:bg-input active:bg-input text-text-muted hover:text-text flex items-center justify-center text-2xl sm:text-lg font-bold transition"
                title="Previous frame (Left)"
              >&lt;</button>
              <button
                onClick={togglePlay}
                className="w-14 h-14 sm:w-10 sm:h-10 rounded-xl bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white flex items-center justify-center transition shadow-sm"
              >
                {playing ? <Pause className="w-5 h-5 sm:w-4 sm:h-4" /> : <Play className="w-5 h-5 sm:w-4 sm:h-4 ml-0.5" />}
              </button>
              <button
                onClick={() => stepFrame(1)}
                className="w-12 h-12 sm:w-9 sm:h-9 rounded-xl border border-border bg-surface hover:bg-input active:bg-input text-text-muted hover:text-text flex items-center justify-center text-2xl sm:text-lg font-bold transition"
                title="Next frame (Right)"
              >&gt;</button>
              <span className="text-sm font-mono text-text-muted ml-1 tabular-nums">
                {fmt(currentTime)} / {fmt(videoDuration)}
              </span>
            </div>

            {/* Timeline - draggable range handles */}
            <div className="space-y-1">
              <div
                ref={timelineRef}
                className="relative h-10 sm:h-8 rounded-full bg-border cursor-pointer touch-none select-none overflow-hidden"
                onPointerDown={handleTimelinePointerDown}
                onPointerMove={handleTimelinePointerMove}
                onPointerUp={handleTimelinePointerUp}
                onPointerCancel={handleTimelinePointerUp}
              >
                {/* Playback progress */}
                <div className="absolute inset-y-0 left-0 bg-primary/10 pointer-events-none"
                  style={{ width: `${videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0}%` }} />

                {/* Selected range highlight */}
                {startTime !== null && (
                  <div className="absolute inset-y-0 bg-teal-500/30 pointer-events-none"
                    style={{
                      left: `${(startTime / videoDuration) * 100}%`,
                      width: `${Math.max(0, ((endTime ?? currentTime) - startTime) / videoDuration * 100)}%`,
                    }} />
                )}

                {/* Start handle - draggable */}
                {startTime !== null && (
                  <div
                    className="absolute inset-y-0 w-3 bg-emerald-500 rounded-sm pointer-events-none"
                    style={{ left: `${(startTime / videoDuration) * 100}%`, transform: "translateX(-50%)", cursor: "ew-resize" }}
                  />
                )}

                {/* End handle - draggable */}
                {endTime !== null && (
                  <div
                    className="absolute inset-y-0 w-3 bg-red-500 rounded-sm pointer-events-none"
                    style={{ left: `${(endTime / videoDuration) * 100}%`, transform: "translateX(-50%)", cursor: "ew-resize" }}
                  />
                )}

                {/* Playhead */}
                <div className="absolute inset-y-0 w-1 bg-white shadow-md pointer-events-none"
                  style={{ left: `${videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0}%` }} />
              </div>

              {/* Timeline labels */}
              <div className="flex items-center justify-between text-[10px] font-bold text-text-muted/60 px-1">
                <span>0s</span>
                {startTime !== null && (
                  <span className="text-emerald-500">&#9650; Start {fmt(startTime)}</span>
                )}
                {endTime !== null && (
                  <span className="text-red-500">End {fmt(endTime)} &#9650;</span>
                )}
                <span>{fmt(videoDuration)}</span>
              </div>
            </div>

            {/* Quick select presets + Use Full Video */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Quick select:</span>
              {([0.8, 1.0, 1.2, 1.5] as const).map((dur) => (
                <button
                  key={dur}
                  onClick={() => applyQuickWindow(dur)}
                  className="px-2.5 py-1 rounded-lg border border-border bg-surface hover:border-teal-500/40 hover:text-teal-500 text-xs font-bold text-text-muted transition"
                >
                  {dur}s
                </button>
              ))}
              <button
                onClick={() => { setUseFullVideo(true); setStartTime(0); setEndTime(videoDuration); }}
                className="ml-auto px-3 py-1 rounded-lg border border-border bg-surface hover:border-teal-500/40 hover:text-teal-500 text-xs font-bold text-text-muted transition"
              >
                Use Full Video
              </button>
            </div>

            {/* Mark Start / End buttons â€" taller for thumb targets */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={markStart}
                className="flex items-center justify-center gap-2 py-4 sm:py-3 rounded-xl border-2 border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 active:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm transition"
              >
                <Flag className="w-3.5 h-3.5" />
                {startTime !== null ? `Start: ${fmt(startTime)}` : "Mark Start"}
              </button>
              <button
                onClick={markEnd}
                disabled={startTime === null}
                className={`flex items-center justify-center gap-2 py-4 sm:py-3 rounded-xl border-2 font-bold text-sm transition ${
                  startTime === null
                    ? "border-border text-text-muted opacity-40 cursor-not-allowed"
                    : "border-red-500/40 bg-red-500/5 hover:bg-red-500/10 active:bg-red-500/20 text-red-600 dark:text-red-400"
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                {endTime !== null ? `End: ${fmt(endTime)}` : "Mark End"}
              </button>
            </div>

            {/* Cycle duration feedback */}
            {cycleDuration !== null && (
              <div className={`flex items-center gap-2 p-3 rounded-xl text-xs font-bold ${
                isValidCycle
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              }`}>
                {isValidCycle
                  ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  : <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />}
                {isValidCycle
                  ? useFullVideo
                    ? `Full video: ${cycleDuration.toFixed(2)}s - 8 frames sampled evenly across the clip`
                    : `Good selection: ${cycleDuration.toFixed(2)}s - 8 frames will be extracted (IC → TSw)`
                  : cycleDuration < 0.4
                  ? `Too short: ${cycleDuration.toFixed(2)}s - select a longer section of the walk`
                  : `Too long: ${cycleDuration.toFixed(2)}s - maximum is 10s (one heel-to-heel cycle)`}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="md" onClick={() => setStep("upload")}>
              <ArrowLeft className="w-4 h-4" /> Change Video
            </Button>
            <button
              onClick={handleExtract}
              disabled={!isValidCycle}
              className={`px-6 py-3 rounded-2xl font-black text-sm transition ${
                isValidCycle
                  ? "bg-primary text-white hover:bg-primary/90 shadow-sm active:scale-95"
                  : "bg-input border border-border text-text-muted cursor-not-allowed opacity-50"
              }`}
            >
              Extract 8 Frames {"->"}
            </button>
          </div>
        </div>
      )}

      {/* â"€â"€â"€ EXTRACTING â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      {step === "extracting" && (
        <div className="flex flex-col items-center justify-center py-20 gap-6">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/10 flex items-center justify-center">
            <Video className="w-7 h-7 text-teal-500 animate-pulse" />
          </div>
          <div className="text-center">
            <p className="font-black text-text text-lg">Extracting frames...</p>
            <p className="text-sm text-text-muted mt-1">
              Frame {extractionProgress} of {FRAME_COUNT} captured
            </p>
            <p className="text-xs text-text-muted/60 mt-1">One frame per gait phase</p>
          </div>
          <div className="w-64 space-y-2">
            <div className="h-2 rounded-full bg-border overflow-hidden">
              <div className="h-full rounded-full bg-teal-500 transition-all duration-300"
                style={{ width: `${(extractionProgress / FRAME_COUNT) * 100}%` }} />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-text-muted/60">
              {GAIT_PHASES.map((p, i) => (
                <span key={p.id} className={i < extractionProgress ? "text-teal-500" : ""}>{p.abbr}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* â"€â"€â"€ PREVIEW â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      {step === "preview" && thumbnails.length > 0 && (
        <div className="space-y-5">
          {analysisError && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{analysisError}</p>
            </div>
          )}

          {/* Header row with wire toggle */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-widest text-text-muted">
              8 frames extracted - one per gait phase
            </p>
            <button
              onClick={() => setShowWireOverlay((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition ${
                showWireOverlay
                  ? "bg-teal-500/15 text-teal-400 border-teal-500/30"
                  : "bg-input text-text-muted border-border"
              }`}
            >
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                <line x1="7" y1="1" x2="7" y2="4"/>
                <line x1="7" y1="4" x2="4" y2="8"/>
                <line x1="7" y1="4" x2="10" y2="8"/>
                <line x1="4" y1="8" x2="3" y2="13"/>
                <line x1="10" y1="8" x2="11" y2="13"/>
                <circle cx="7" cy="2" r="1" fill="currentColor"/>
              </svg>
              {poseDetecting
                ? `Detecting pose...€¦ (${frameKeypoints.length}/${thumbnails.length})`
                : showWireOverlay ? "Wire ON" : "Wire OFF"}
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {thumbnails.map((thumb, i) => {
              const kps = frameKeypoints[i] ?? null;
              const wireResult = kps && showWireOverlay ? computeWireAngles(kps, frameSize.w, frameSize.h) : null;
              const angles = wireResult?.angles ?? [];
              const extraLines = wireResult?.extraLines ?? [];
              const extraDots = wireResult?.extraDots ?? [];
              return (
                <div
                  key={i}
                  className="relative rounded-xl overflow-hidden bg-black border border-border aspect-video cursor-pointer group hover:border-teal-500/60 transition-colors"
                  onClick={() => setLightboxIdx(i)}
                  title="Click to enlarge"
                >
                  <img
                    src={thumb}
                    alt={GAIT_PHASES[i]?.abbr}
                    className="absolute inset-0 w-full h-full object-cover"
                  />

                  {/* Wire skeleton SVG overlay */}
                  {kps && showWireOverlay && (
                    <svg
                      className="absolute inset-0 w-full h-full"
                      viewBox={`0 0 ${frameSize.w} ${frameSize.h}`}
                      preserveAspectRatio="xMidYMid meet"
                    >
                      {/* Skeleton lines */}
                      {WIRE_CONNECTIONS.map(([a, b], ci) => {
                        const p1 = kps[a], p2 = kps[b];
                        if (!p1 || !p2 || p1.score < 0.2 || p2.score < 0.2) return null;
                        return (
                          <line
                            key={ci}
                            x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                            stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" opacity="0.9"
                          />
                        );
                      })}
                      {/* Extra lines: ankle-to-toe */}
                      {extraLines.map((ln, li) => (
                        <line key={`ex-${li}`} x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2}
                          stroke={ln.color} strokeWidth="2.5" strokeLinecap="round" opacity="0.95"/>
                      ))}
                      {/* Toe tip dot */}
                      {extraDots.map((d, di) => (
                        <g key={`ed-${di}`}>
                          <circle cx={d.x} cy={d.y} r={5} fill={d.color} opacity="0.95"/>
                          <circle cx={d.x} cy={d.y} r={2.5} fill="#fff" opacity="0.85"/>
                        </g>
                      ))}

                      {/* Joint dots */}
                      {kps.map((kp, ki) => {
                        if (kp.score < 0.25) return null;
                        const isLower = ki >= KP_IDX.l_hip;
                        return (
                          <g key={ki}>
                            <circle cx={kp.x} cy={kp.y} r={isLower ? 5 : 4} fill={isLower ? "#f472b6" : "#22d3ee"} opacity="0.9"/>
                            <circle cx={kp.x} cy={kp.y} r={isLower ? 3 : 2} fill="#fff" opacity="0.7"/>
                          </g>
                        );
                      })}

                      {/* Angle badges */}
                      {angles.map((ang, ai) => (
                        <g key={ai}>
                          <rect
                            x={ang.x - 2} y={ang.y - 8}
                            width={30} height={13}
                            rx="3" fill="rgba(0,0,0,0.72)"
                          />
                          <text
                            x={ang.x + 13} y={ang.y + 2}
                            fill={ang.color} fontSize="8"
                            fontWeight="bold" textAnchor="middle"
                            fontFamily="monospace"
                          >
                            {ang.label}
                          </text>
                        </g>
                      ))}
                    </svg>
                  )}

                  {/* Expand hint on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                    <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                      <svg viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5" className="w-4 h-4">
                        <path d="M2 6V2h4M10 2h4v4M2 10v4h4M14 10v4h-4"/>
                      </svg>
                    </div>
                  </div>

                  {/* Phase label */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5 flex items-center justify-between">
                    <span className={`text-[10px] font-black ${
                      GAIT_PHASES[i]?.phase === "Stance" ? "text-emerald-400" : "text-sky-400"
                    }`}>{GAIT_PHASES[i]?.abbr}</span>
                    <span className="text-[9px] text-white/60">{GAIT_PHASES[i]?.label.split(" ")[0]}</span>
                  </div>

                  {/* Detecting spinner per frame */}
                  {poseDetecting && frameKeypoints.length === i && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <div className="w-5 h-5 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Angle legend â€" only when wire is shown and detection done */}
          {showWireOverlay && !poseDetecting && frameKeypoints.some(Boolean) && (
            <div className="flex flex-wrap items-center gap-3 px-1">
              {[
                { color: "#22d3ee", label: "Neck" },
                { color: "#fbbf24", label: "Shoulder" },
                { color: "#f97316", label: "Hip" },
                { color: "#4ade80", label: "Knee" },
                { color: "#e879f9", label: "Ankle" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="text-[10px] font-bold text-text-muted">{label}</span>
                </div>
              ))}
              <span className="text-[10px] text-text-muted/50 ml-auto">Angles measured at each joint</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button variant="ghost" size="md" onClick={() => setStep("trim")}>
              <RotateCcw className="w-4 h-4" /> Re-select cycle
            </Button>
            <Button variant="primary" size="lg" onClick={handleAnalyze}>
              Analyze with AI {"->"}
            </Button>
          </div>
        </div>
      )}

      {/* â"€â"€â"€ ANALYZING â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      {step === "analyzing" && (
        <div className="flex flex-col items-center justify-center py-20 gap-6">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-teal-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-black text-text text-lg">
              {analysisMode === "running" ? "Analyzing running mechanics..." : "Analyzing gait..."}
            </p>
            <p className="text-sm text-text-muted">
              {analysisMode === "running" ? RUNNING_ANALYZING_MESSAGES[msgIdx] : ANALYZING_MESSAGES[msgIdx]}
            </p>
          </div>
          <p className="text-xs text-text-muted/60 max-w-xs text-center">
            {analysisMode === "running"
              ? "Claude is analyzing 8 frames across Head → Back → Arms → Front Leg → Back Leg → Foot Strike."
              : `Claude is reading 8 frames against the IC → LR → MS → TS → PS → IS → MSw → TSw model.`
            }
          </p>
        </div>
      )}

      {/* â"€â"€â"€ RESULTS â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      {/* ─── RUNNING RESULTS ──────────────────────────────────────────────────────── */}
      {step === "results" && analysisMode === "running" && runningAnalysis && (() => {
        const rs = runningScoreStyle(runningAnalysis.total_score);
        return (
          <div className="space-y-5">

            {/* Score banner */}
            <div className="bg-input border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-text-muted">Running Biomechanical Score</p>
                  <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-orange-500 mt-2">
                    View: {viewMode} · Running Mode
                  </p>
                  <p className={`text-5xl font-black tabular-nums mt-1 ${rs.text}`}>
                    {runningAnalysis.total_score}<span className="text-2xl text-text-muted font-bold">%</span>
                  </p>
                  <span className={`mt-1 inline-block px-3 py-1 rounded-full text-xs font-bold ${rs.badge}`}>
                    {runningAnalysis.score_label}
                  </span>
                </div>
                <div className="text-right space-y-1 text-xs text-text-muted">
                  <div><span className="font-bold text-emerald-500">≥80%</span>  Excellent</div>
                  <div><span className="font-bold text-lime-500">60–79%</span>  Good</div>
                  <div><span className="font-bold text-amber-500">40–59%</span>  Okay</div>
                  <div><span className="font-bold text-orange-500">20–39%</span>  Needs Work</div>
                  <div><span className="font-bold text-red-500">&lt;20%</span>  Poor</div>
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-border overflow-hidden">
                <div className={`h-full rounded-full ${rs.bar}`} style={{ width: `${runningAnalysis.total_score}%` }} />
              </div>
            </div>

            {/* Section 1: Analysis */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-border" />
                <p className="text-xs font-black uppercase tracking-widest text-text-muted">1) Analysis</p>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-4">
                {RUNNING_SEGMENTS.map((seg) => {
                  const segData = runningAnalysis.segments[seg.id];
                  if (!segData) return null;
                  const qColor = segmentQualityColor(segData.quality);
                  const hasAngle = segData.angle != null && segData.good_range_min != null && segData.good_range_max != null;
                  const angleDisplayMin = hasAngle ? Math.min(segData.good_range_min! - 20, segData.angle! - 15) : 0;
                  const angleDisplayMax = hasAngle ? Math.max(segData.good_range_max! + 20, segData.angle! + 15) : 180;
                  const displayRange = angleDisplayMax - angleDisplayMin;
                  const pctOf = (n: number) => Math.max(0, Math.min(100, ((n - angleDisplayMin) / displayRange) * 100));
                  return (
                    <div key={seg.id} className="bg-input border border-border rounded-2xl p-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-start gap-2 mb-2">
                            <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: qColor }} />
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">{seg.label}</p>
                              <p className="text-sm font-bold text-text mt-0.5">{segData.status}</p>
                            </div>
                          </div>
                          <div className="space-y-2 text-xs mt-3">
                            <p>
                              <span className="font-bold text-amber-500">Coach tip: </span>
                              <span className="text-text-muted">{segData.coach_tip}</span>
                            </p>
                            <p>
                              <span className="font-bold text-orange-400">Consequences: </span>
                              <span className="text-text-muted">{segData.consequences}</span>
                            </p>
                            <p>
                              <span className="font-bold text-teal-500">Correction: </span>
                              <span className="text-text-muted">{segData.correction}</span>
                            </p>
                          </div>
                        </div>
                        <div>
                          <div className="bg-surface rounded-xl p-3 mb-3">
                            <p className="text-[10px] font-black uppercase tracking-wider text-text-muted mb-1.5">Recap</p>
                            <ul className="space-y-1">
                              {(segData.recap ?? []).map((r, ri) => (
                                <li key={ri} className="text-xs text-text-muted flex items-start gap-1.5">
                                  <span className="text-text-muted/50 mt-0.5 flex-shrink-0">•</span>
                                  <span>{r}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          {hasAngle && (
                            <div>
                              <div className="flex justify-between text-[10px] text-text-muted mb-1">
                                <span>Angle: <span className="font-bold" style={{ color: qColor }}>{segData.angle}°</span></span>
                                <span>Good range: {segData.good_range_min}° to {segData.good_range_max}°</span>
                              </div>
                              <div className="relative h-2 rounded-full bg-border">
                                <div
                                  className="absolute h-full rounded-full bg-emerald-500/30"
                                  style={{
                                    left: `${pctOf(segData.good_range_min!)}%`,
                                    width: `${pctOf(segData.good_range_max!) - pctOf(segData.good_range_min!)}%`,
                                  }}
                                />
                                <div
                                  className="absolute w-3.5 h-3.5 rounded-full -top-[3px] -translate-x-1/2 border-2 border-surface shadow"
                                  style={{ left: `${pctOf(segData.angle!)}%`, backgroundColor: qColor }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Metrics */}
            {runningAnalysis.contact_time != null && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px flex-1 bg-border" />
                  <p className="text-xs font-black uppercase tracking-widest text-text-muted">2) Metrics</p>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="bg-input border border-border rounded-2xl p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-border/60 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-[8px] font-black text-text-muted text-center leading-tight">CONTACT<br/>TIME</span>
                    </div>
                    <div>
                      <p className="text-4xl font-black tabular-nums text-amber-500">
                        {runningAnalysis.contact_time.toFixed(2)} <span className="text-xl font-bold">Seconds</span>
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        Time during which at least one foot is in contact with the ground during a running cycle.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Section 3: Joint Angles */}
            {runningAnalysis.joint_angles_cycle && (() => {
              const allVals = JOINT_ANGLE_LINES.flatMap(l => runningAnalysis.joint_angles_cycle[l.key] ?? []).filter(v => typeof v === "number");
              if (allVals.length < 2) return null;
              const chartMin = Math.min(...allVals) - 10;
              const chartMax = Math.max(...allVals) + 10;
              const W = 220, H = 80, pts = 8;
              const xStep = W / (pts - 1);
              const toY = (v: number) => H - Math.max(0, Math.min(H, ((v - chartMin) / (chartMax - chartMin)) * H));
              const toPath = (vals: number[]) => {
                if (!vals || vals.length < 2) return "";
                return "M " + vals.map((v, i) => `${i * xStep},${toY(v)}`).join(" L ");
              };
              return (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-px flex-1 bg-border" />
                    <p className="text-xs font-black uppercase tracking-widest text-text-muted">3) Joint Angles</p>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="bg-input border border-border rounded-2xl p-4">
                    <div className="overflow-x-auto">
                      <svg width="100%" viewBox={`-28 -4 ${W + 32} ${H + 20}`} preserveAspectRatio="none" style={{ minWidth: 240 }}>
                        {/* Y-axis labels */}
                        <text x="-4" y="4" fill="#6b7280" fontSize="7" textAnchor="end">{Math.round(chartMax)}°</text>
                        <text x="-4" y={H / 2 + 3} fill="#6b7280" fontSize="7" textAnchor="end">0°</text>
                        <text x="-4" y={H + 2} fill="#6b7280" fontSize="7" textAnchor="end">{Math.round(chartMin)}°</text>
                        {/* Zero line */}
                        {chartMin < 0 && chartMax > 0 && (
                          <line x1="0" y1={toY(0)} x2={W} y2={toY(0)} stroke="#374151" strokeWidth="0.5" strokeDasharray="3,2" />
                        )}
                        {/* Data lines */}
                        {JOINT_ANGLE_LINES.map(({ key, color }) => {
                          const vals = runningAnalysis.joint_angles_cycle[key];
                          const d = toPath(vals ?? []);
                          if (!d) return null;
                          return <path key={key} d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />;
                        })}
                        {/* X-axis labels */}
                        {[0, 20, 40, 60, 80, 100].map((pct, i) => (
                          <text key={pct} x={(i / 5) * W} y={H + 14} fill="#6b7280" fontSize="7" textAnchor="middle">{pct}</text>
                        ))}
                      </svg>
                    </div>
                    <p className="text-[9px] text-text-muted text-center mt-1">Running Cycle (%)</p>
                    <div className="mt-3 grid grid-cols-3 gap-x-4 gap-y-1.5">
                      {JOINT_ANGLE_LINES.map(({ key, label, color }) => (
                        <div key={key} className="flex items-center gap-1.5">
                          <div className="w-5 h-0.5 rounded flex-shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-[10px] text-text-muted">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Key findings */}
            {(runningAnalysis.key_findings?.length ?? 0) > 0 && (
              <div className="bg-input border border-border rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-text-muted mb-2">Key Findings</p>
                <div className="space-y-1">
                  {runningAnalysis.key_findings.map((f, fi) => (
                    <p key={fi} className="text-xs text-text-muted">• {f}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Rehab protocol */}
            {(runningAnalysis.rehab_protocol?.length ?? 0) > 0 && (
              <div className="bg-input border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-border">
                  <p className="font-black text-text text-sm">
                    Rehabilitation Protocol
                    <span className="ml-2 text-xs font-normal text-text-muted">WBA99 running corrections</span>
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-surface/50">
                        <th className="text-left px-4 py-2.5 font-black uppercase tracking-wider text-text-muted text-[9px]">Problem / Deviation</th>
                        <th className="text-left px-4 py-2.5 font-black uppercase tracking-wider text-amber-500/80 text-[9px]">Cause</th>
                        <th className="text-left px-4 py-2.5 font-black uppercase tracking-wider text-teal-500/80 text-[9px]">Intervention / Solution</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {runningAnalysis.rehab_protocol!.map((item, idx) => (
                        <tr key={idx} className="hover:bg-surface/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-3 h-3 text-orange-500 mt-0.5 flex-shrink-0" />
                              <span className="font-bold text-text">{item.problem}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-amber-600 dark:text-amber-400">{item.cause}</td>
                          <td className="px-4 py-3 text-teal-600 dark:text-teal-400">{item.solution}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Editable clinical notes */}
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-text-muted mb-2">Clinical Notes</p>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={5}
                placeholder="AI-generated summary - edit as needed..."
                className="w-full rounded-2xl border border-border bg-input px-4 py-3 text-sm text-text outline-none focus:border-primary/50 placeholder:text-text-muted/60 transition resize-none shadow-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <Button variant="ghost" size="md" onClick={() => setStep("trim")}>
                <RotateCcw className="w-4 h-4" /> Re-select Cycle
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="font-bold">AI analysis complete</span>
                </div>
                <Button variant="primary" size="lg" onClick={() => setShowModal(true)}>
                  Save Report
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── WALKING RESULTS ──────────────────────────────────────────────────────── */}
      {step === "results" && analysisMode === "walking" && analysis && risk && (
        <div className="space-y-5">

          {/* Score banner */}
          <div className="bg-input border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-text-muted">Biomechanical Gait Score</p>
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-teal-500 mt-2">
                  View: {analysis.view_mode ?? viewMode}
                </p>
                <p className={`text-5xl font-black tabular-nums mt-1 ${risk.text}`}>
                  {analysis.total_score}<span className="text-2xl text-text-muted font-bold"> / 24</span>
                </p>
                <p className={`text-sm font-bold mt-1 ${risk.text}`}>{risk.label}</p>
              </div>
              <div className="text-right space-y-1 text-xs text-text-muted">
                <div><span className="font-bold text-emerald-500">20-24</span>  Low Risk</div>
                <div><span className="font-bold text-amber-500">13-19</span>  Moderate</div>
                <div><span className="font-bold text-red-500">0-12</span>  High Risk</div>
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-border overflow-hidden">
              <div className={`h-full rounded-full ${risk.bar}`}
                style={{ width: `${(analysis.total_score / 24) * 100}%` }} />
            </div>
          </div>


          {/* Metrics bar */}
          <div className="grid grid-cols-4 sm:grid-cols-8 divide-x divide-border bg-input border border-border rounded-2xl overflow-hidden text-center">
            {([
              { label: 'STEP LEN',   val: analysis.spatiotemporal?.step_length   ?? '—', sub: 'metres'    },
              { label: 'STRIDE LEN', val: analysis.spatiotemporal?.stride_length ?? '—', sub: 'metres'    },
              { label: 'CADENCE',    val: analysis.spatiotemporal?.cadence       ?? '—', sub: 'steps/min' },
              { label: 'WALK SPEED', val: analysis.spatiotemporal?.speed         ?? '—', sub: 'm/sec'     },
              { label: 'STANCE %',   val: `${analysis.gait_cycle_breakdown?.stance_phase_percent ?? 60}%`, sub: 'of cycle' },
              { label: 'SWING %',    val: `${analysis.gait_cycle_breakdown?.swing_phase_percent  ?? 40}%`, sub: 'of cycle' },
              { label: 'GAIT SCORE', val: String(Math.round((analysis.total_score / 24) * 100)), sub: '/ 100' },
              { label: 'RISK LEVEL', val: (analysis.risk_level ?? '—').slice(0,3).toUpperCase(), sub: risk.label },
            ] as const).map(({ label, val, sub }, i) => (
              <div key={i} className="px-2 py-2.5">
                <p className="text-[7px] font-black uppercase tracking-widest text-text-muted">{label}</p>
                <p className={`text-sm font-black tabular-nums mt-0.5 ${i === 6 ? risk.text : 'text-teal-400'}`}>{val}</p>
                <p className="text-[7px] text-text-muted uppercase mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
          {/* Wire analysis strip â€" 8 frames with skeleton overlay */}
          {analysis.gait_cycle_breakdown && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="bg-input border border-border rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">Gait Cycle Breakdown</p>
                <p className="text-sm text-text mt-2">
                  Stance {analysis.gait_cycle_breakdown.stance_phase_percent ?? 60}% | Swing {analysis.gait_cycle_breakdown.swing_phase_percent ?? 40}%
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {(analysis.gait_cycle_breakdown.stance_subphases ?? ["IC", "LR", "MS", "TS", "PS"]).join(" | ")}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {(analysis.gait_cycle_breakdown.swing_subphases ?? ["IS", "MSw", "TSw"]).join(" | ")}
                </p>
              </div>
              <div className="bg-input border border-border rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">Biomechanical Lines</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(analysis.biomechanical_lines ?? ["Hip Line", "Femur Line", "Tibia Line", "Foot Line"]).map((line) => (
                    <span key={line} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                      {line}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {thumbnails.length > 0 && (
            <div className="space-y-3">
              {/* ── 8-frame selector strip ─────────────────────── */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-widest text-text-muted">
                  8 Gait Frames — Click to Inspect
                </p>
                <button
                  onClick={() => setShowWireOverlay((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[10px] font-bold transition ${
                    showWireOverlay
                      ? "bg-teal-500/15 text-teal-400 border-teal-500/30"
                      : "bg-input text-text-muted border-border"
                  }`}
                >
                  {showWireOverlay ? "Wire ON" : "Wire OFF"}
                </button>
              </div>

              <div className="grid grid-cols-8 gap-1">
                {thumbnails.map((thumb, i) => {
                  const kps = frameKeypoints[i] ?? null;
                  const wr = kps && showWireOverlay ? computeWireAngles(kps, frameSize.w, frameSize.h) : null;
                  const isSelected = selectedFrameIdx === i;
                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedFrameIdx(i)}
                      className={`relative rounded-lg overflow-hidden bg-black cursor-pointer aspect-video border-2 transition-all ${
                        isSelected ? "border-teal-400 ring-1 ring-teal-400/30" : "border-border hover:border-teal-500/40"
                      }`}
                    >
                      <img src={thumb} alt={GAIT_PHASES[i]?.abbr} className="absolute inset-0 w-full h-full object-cover" />
                      {kps && showWireOverlay && (
                        <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${frameSize.w} ${frameSize.h}`} preserveAspectRatio="xMidYMid meet">
                          {WIRE_CONNECTIONS.map(([a, b], ci) => {
                            const p1 = kps[a], p2 = kps[b];
                            if (!p1||!p2||p1.score<0.2||p2.score<0.2) return null;
                            return <line key={ci} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" opacity="0.9"/>;
                          })}
                          {(wr?.extraDots ?? []).map((d, di) => (
                            <g key={di}><circle cx={d.x} cy={d.y} r={4} fill={d.color} opacity="0.95"/></g>
                          ))}
                          {kps.map((kp, ki) => {
                            if (kp.score < 0.25) return null;
                            const lo = ki >= KP_IDX.l_hip;
                            return <g key={ki}><circle cx={kp.x} cy={kp.y} r={lo?4:3} fill={lo?"#f472b6":"#22d3ee"} opacity="0.9"/></g>;
                          })}
                        </svg>
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-black/70 px-1 py-0.5 flex justify-between">
                        <span className={`text-[7px] font-black ${GAIT_PHASES[i]?.phase==="Stance"?"text-emerald-400":"text-sky-400"}`}>{GAIT_PHASES[i]?.abbr}</span>
                        <span className={`text-[7px] font-bold ${qualityBadge(analysis.phases[GAIT_PHASES[i]?.id]?.quality ?? 2).split(" ")[0]}`}>
                          {analysis.phases[GAIT_PHASES[i]?.id]?.quality ?? "—"}/3
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Selected frame detail + tabs ──────────────── */}
              <div className="grid sm:grid-cols-2 gap-3">
                {/* Clean frame + Wire frame stacked */}
                <div className="space-y-1.5">
                  {/* Clean */}
                  <div className="relative bg-black rounded-xl overflow-hidden aspect-video border border-border">
                    <img src={thumbnails[selectedFrameIdx]} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-black/80 text-[8px] font-black text-teal-400 uppercase tracking-wider">Clean Frame</div>
                    <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[8px] font-black text-white uppercase">
                      {GAIT_PHASES[selectedFrameIdx]?.label}
                    </div>
                    <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[8px] font-black text-emerald-400">
                      {GAIT_PHASES[selectedFrameIdx]?.phase === "Stance" ? "STANCE" : "SWING"}
                    </div>
                  </div>
                  {/* Wire */}
                  {(() => {
                    const kps2 = frameKeypoints[selectedFrameIdx] ?? null;
                    const wr2 = kps2 ? computeWireAngles(kps2, frameSize.w, frameSize.h) : null;
                    return (
                      <div className="relative bg-black rounded-xl overflow-hidden aspect-video border border-border">
                        <img src={thumbnails[selectedFrameIdx]} className="absolute inset-0 w-full h-full object-cover opacity-25" />
                        {kps2 && (
                          <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${frameSize.w} ${frameSize.h}`} preserveAspectRatio="xMidYMid meet">
                            {WIRE_CONNECTIONS.map(([a, b], ci) => {
                              const p1 = kps2[a], p2 = kps2[b];
                              if (!p1||!p2||p1.score<0.2||p2.score<0.2) return null;
                              return <line key={ci} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" opacity="0.95"/>;
                            })}
                            {(wr2?.extraLines ?? []).map((ln, li) => (
                              <line key={li} x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2} stroke={ln.color} strokeWidth="2.5" strokeLinecap="round" opacity="0.95"/>
                            ))}
                            {(wr2?.extraDots ?? []).map((d, di) => (
                              <g key={di}><circle cx={d.x} cy={d.y} r={5} fill={d.color} opacity="0.95"/><circle cx={d.x} cy={d.y} r={2.5} fill="#fff" opacity="0.8"/></g>
                            ))}
                            {kps2.map((kp, ki) => {
                              if (kp.score < 0.25) return null;
                              const lo = ki >= KP_IDX.l_hip;
                              return <g key={ki}><circle cx={kp.x} cy={kp.y} r={lo?5:4} fill={lo?"#f472b6":"#22d3ee"} opacity="0.9"/><circle cx={kp.x} cy={kp.y} r={lo?3:2} fill="#fff" opacity="0.7"/></g>;
                            })}
                            {(wr2?.angles ?? []).map((ang, ai) => (
                              <g key={ai}>
                                <rect x={ang.x-2} y={ang.y-8} width={32} height={13} rx="3" fill="rgba(0,0,0,0.8)"/>
                                <text x={ang.x+14} y={ang.y+2} fill={ang.color} fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">{ang.label}</text>
                              </g>
                            ))}
                          </svg>
                        )}
                        <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-black/80 text-[8px] font-black text-cyan-400 uppercase tracking-wider">Wire Frame</div>
                      </div>
                    );
                  })()}
                </div>

                {/* JOINTS / FLAGS / REHAB / AI tabs */}
                <div className="flex flex-col gap-2">
                  {/* Tab buttons */}
                  <div className="grid grid-cols-4 gap-1">
                    {(["joints", "flags", "rehab", "ai"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveResultTab(tab)}
                        className={`py-1.5 text-[9px] font-black uppercase rounded-lg border transition ${
                          activeResultTab === tab
                            ? "bg-teal-500/15 text-teal-400 border-teal-500/30"
                            : "bg-input text-text-muted border-border hover:text-text"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* JOINTS tab */}
                  {activeResultTab === "joints" && (() => {
                    const phase = GAIT_PHASES[selectedFrameIdx];
                    const angleRow = analysis.joint_angle_table?.find((r) => r.abbr === phase?.abbr);
                    const kpsLive = frameKeypoints[selectedFrameIdx];
                    const live = kpsLive ? computeNumericAngles(kpsLive, frameSize.w, frameSize.h) : null;
                    const hipVal   = live?.hipFlexion    ?? parseAngleDeg(angleRow?.hip);
                    const kneeVal  = live?.kneeFlexion   ?? parseAngleDeg(angleRow?.knee);
                    const ankleVal = live?.ankleAngle    ?? parseAngleDeg(angleRow?.ankle);
                    const trunkVal = live?.trunkLean;
                    const vals: Record<string, number | null> = { hip: hipVal, knee: kneeVal, ankle: ankleVal, trunk: trunkVal ?? null };
                    const textVals: Record<string, string> = {
                      hip:   hipVal   != null ? `${hipVal}°`   : (angleRow?.hip   ?? "—"),
                      knee:  kneeVal  != null ? `${kneeVal}°`  : (angleRow?.knee  ?? "—"),
                      ankle: ankleVal != null ? `${ankleVal}°` : (angleRow?.ankle ?? "—"),
                      trunk: trunkVal != null ? `${trunkVal}°` : "—",
                    };
                    // ROM chart data from joint_angle_table
                    const jat = analysis.joint_angle_table ?? [];
                    const romHip   = GAIT_PHASES.map(p => parseAngleDeg(jat.find(r => r.abbr === p.abbr)?.hip));
                    const romKnee  = GAIT_PHASES.map(p => parseAngleDeg(jat.find(r => r.abbr === p.abbr)?.knee));
                    const romAnkle = GAIT_PHASES.map(p => parseAngleDeg(jat.find(r => r.abbr === p.abbr)?.ankle));
                    const allRomVals = [...romHip, ...romKnee, ...romAnkle].filter(v => v != null) as number[];
                    const romMin = allRomVals.length ? Math.min(...allRomVals) - 5 : -20;
                    const romMax = allRomVals.length ? Math.max(...allRomVals) + 5 : 80;
                    const romH = 50, romW = GAIT_PHASES.length * 22;
                    const toY = (v: number | null) => v == null ? null : romH - ((v - romMin) / (romMax - romMin)) * romH;
                    const toPath = (vals: (number | null)[]) => {
                      const pts = vals.map((v, i) => v == null ? null : `${i * 22 + 11},${toY(v)}`).filter(Boolean);
                      return pts.length > 1 ? "M " + pts.join(" L ") : "";
                    };
                    return (
                      <div className="flex-1 bg-input border border-border rounded-2xl p-3 space-y-3 overflow-y-auto max-h-72">
                        <p className="text-[8px] font-black uppercase tracking-widest text-text-muted">
                          Joint Angles — {phase?.label?.toUpperCase() ?? "Current Frame"}
                        </p>
                        {ANGLE_PARAMS.map((ap) => {
                          const rawVal = vals[ap.key] as number | null;
                          const pct = rawVal != null ? Math.max(0, Math.min(100, ((rawVal - ap.min) / (ap.max - ap.min)) * 100)) : null;
                          const nMinPct = ((ap.normalMin - ap.min) / (ap.max - ap.min)) * 100;
                          const nMaxPct = ((ap.normalMax - ap.min) / (ap.max - ap.min)) * 100;
                          return (
                            <div key={ap.key} className="space-y-0.5">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-text uppercase">{ap.label}</span>
                                <span className="text-sm font-black" style={{ color: ap.color }}>
                                  {textVals[ap.key]}
                                </span>
                              </div>
                              <div className="relative h-2 rounded-full bg-border">
                                <div className="absolute h-full rounded-full bg-emerald-500/25"
                                  style={{ left: `${nMinPct}%`, width: `${nMaxPct - nMinPct}%` }} />
                                {pct != null && (
                                  <div className="absolute w-3.5 h-3.5 rounded-full -top-[3px] -translate-x-1/2 border-2 border-surface shadow"
                                    style={{ left: `${pct}%`, backgroundColor: ap.color }} />
                                )}
                              </div>
                              <div className="flex justify-between text-[8px] text-text-muted">
                                <span>{ap.minLabel}</span><span>{ap.midLabel}</span><span>{ap.maxLabel}</span>
                              </div>
                            </div>
                          );
                        })}
                        {jat.length > 0 && (
                          <div className="pt-2 border-t border-border">
                            <p className="text-[8px] font-black uppercase tracking-widest text-text-muted mb-1.5">ROM Across Cycle</p>
                            <svg width="100%" viewBox={`0 0 ${romW} ${romH + 12}`} preserveAspectRatio="none" className="overflow-visible">
                              {toPath(romHip)   && <path d={toPath(romHip)!}   fill="none" stroke="#f97316" strokeWidth="1.5" strokeLinejoin="round"/>}
                              {toPath(romKnee)  && <path d={toPath(romKnee)!}  fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinejoin="round"/>}
                              {toPath(romAnkle) && <path d={toPath(romAnkle)!} fill="none" stroke="#e879f9" strokeWidth="1.5" strokeLinejoin="round"/>}
                              {GAIT_PHASES.map((p, i) => (
                                <text key={i} x={i * 22 + 11} y={romH + 10} textAnchor="middle" fontSize="6" fill="#6b7280">{p.abbr}</text>
                              ))}
                            </svg>
                            <div className="flex gap-3 mt-1">
                              <span className="text-[8px] font-bold" style={{color:"#f97316"}}>■ HIP</span>
                              <span className="text-[8px] font-bold" style={{color:"#4ade80"}}>■ KNEE</span>
                              <span className="text-[8px] font-bold" style={{color:"#e879f9"}}>■ ANKLE</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* FLAGS tab */}
                  {activeResultTab === "flags" && (
                    <div className="flex-1 bg-input border border-border rounded-2xl p-3 overflow-y-auto max-h-72 space-y-2">
                      <p className="text-[8px] font-black uppercase tracking-widest text-text-muted">Deviations Detected</p>
                      {allDeviations.length === 0 ? (
                        <p className="text-xs text-emerald-400 font-bold">No deviations detected.</p>
                      ) : allDeviations.map((dev) => {
                        const sev = DEVIATION_SEVERITY[dev];
                        const desc = DEVIATION_DESCRIPTIONS[dev];
                        return (
                          <div key={dev} className={`border-l-2 pl-2.5 py-1 ${sev === "critical" ? "border-red-500" : sev === "moderate" ? "border-amber-500" : "border-emerald-500"}`}>
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="text-[9px] font-black text-text uppercase tracking-wide">{dev}</span>
                              <span className={`text-[7px] font-black px-1.5 py-0.5 rounded border flex-shrink-0 ${
                                sev === "critical"
                                  ? "bg-red-500/10 text-red-400 border-red-500/30"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              }`}>{(sev ?? "moderate").toUpperCase()}</span>
                            </div>
                            {desc && <p className="text-[9px] text-text-muted leading-relaxed">{desc}</p>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* REHAB tab */}
                  {activeResultTab === "rehab" && (
                    <div className="flex-1 bg-input border border-border rounded-2xl p-3 overflow-y-auto max-h-72 space-y-2">
                      <p className="text-[8px] font-black uppercase tracking-widest text-text-muted">Rehabilitation Protocol</p>
                      {allDeviations.map((dev) => {
                        const rx = REHAB_MAP[dev];
                        if (!rx) return null;
                        return (
                          <div key={dev} className="border-l-2 border-teal-500/40 pl-2.5 py-1">
                            <p className="text-[9px] font-black text-text">{dev}</p>
                            <p className="text-[9px] text-text-muted mt-0.5">{rx}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* AI tab */}
                  {activeResultTab === "ai" && (() => {
                    const phase = GAIT_PHASES[selectedFrameIdx];
                    const angleRow = analysis.joint_angle_table?.find((r) => r.abbr === phase?.abbr);
                    return (
                      <div className="flex-1 bg-input border border-border rounded-2xl p-3 space-y-1.5">
                        <p className="text-[8px] font-black uppercase tracking-widest text-text-muted">Analysis Parameters</p>
                        {([
                          ["VIEW",    (analysis.view_mode ?? viewMode).toUpperCase()],
                          ["PHASE",   phase?.label?.toUpperCase() ?? "—"],
                          ["HIP",     `${angleRow?.hip ?? "—"} FLEXION`],
                          ["KNEE",    `${angleRow?.knee ?? "—"} FLEXION`],
                          ["ANKLE",   angleRow?.ankle ?? "—"],
                          ["CADENCE", analysis.spatiotemporal?.cadence ?? "—"],
                          ["FLAGS",   `${allDeviations.length} deviations`],
                        ] as [string, string][]).map(([label, val]) => (
                          <div key={label} className="flex items-center gap-2 text-xs">
                            <span className="text-text-muted font-bold w-14 flex-shrink-0 text-[9px] uppercase">{label}:</span>
                            <span className={`font-black text-[10px] ${label === "FLAGS" && allDeviations.length > 0 ? "text-amber-400" : "text-teal-400"}`}>{val}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Phase grid */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-text-muted mb-3">Phase Details</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {GAIT_PHASES.map((p) => {
                const pd = analysis.phases[p.id];
                if (!pd) return null;
                const angleRow = analysis.joint_angle_table?.find((r) => r.abbr === p.abbr);
                return (
                  <div key={p.id} className={`border rounded-2xl p-4 space-y-2 shadow-sm ${
                    p.phase === "Stance"
                      ? "bg-emerald-500/5 border-emerald-500/20"
                      : "bg-sky-500/5 border-sky-500/20"
                  }`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-black text-text">{p.label}</span>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border flex-shrink-0 ${
                        p.phase === "Stance"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                      }`}>{p.phase.toUpperCase()}</span>
                    </div>
                    {angleRow && (
                      <div className="flex flex-wrap gap-1.5">
                        {([
                          { label: "HIP",  val: angleRow.hip  },
                          { label: "KNEE", val: angleRow.knee },
                          { label: "ANK",  val: angleRow.ankle },
                        ] as const).map(({ label, val }) => (
                          <span key={label} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-border/60 text-text border border-border">
                            <span className="text-text-muted font-normal">{label}</span>
                            {val}
                          </span>
                        ))}
                      </div>
                    )}
                    {pd.deviations.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {pd.deviations.map((dev) => (
                          <span key={dev} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            ⚠ {dev}
                          </span>
                        ))}
                      </div>
                    )}
                    {pd.notes && <p className="text-xs text-text-muted leading-relaxed">{pd.notes}</p>}
                    {!!pd.frame_focus && (
                      <p className="text-[11px] text-text font-semibold">Frame: <span className="text-text-muted font-normal">{pd.frame_focus}</span></p>
                    )}
                    {!!pd.ideal?.length && (
                      <p className="text-[11px] text-text font-semibold">Ideal: <span className="text-text-muted font-normal">{pd.ideal.join(" | ")}</span></p>
                    )}
                    {!!pd.landmarks?.length && (
                      <p className="text-[11px] text-text font-semibold">Landmarks: <span className="text-text-muted font-normal">{pd.landmarks.join(", ")}</span></p>
                    )}
                    <div className="pt-0.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${qualityBadge(pd.quality)}`}>
                        {pd.quality}/3 · {qualityLabel(pd.quality)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Joint Angle Summary Table */}
          {analysis.joint_angle_table && analysis.joint_angle_table.length > 0 && (
            <div className="bg-input border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <div>
                  <p className="font-black text-text text-sm">Joint Angle Summary</p>
                  <p className="text-[10px] text-text-muted mt-0.5">Hip / Knee / Ankle — observed vs. ideal | F = Flexion, Ext = Extension, DF = Dorsiflexion, PF = Plantarflexion</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface/50">
                      <th className="text-left px-3 py-2.5 font-black uppercase tracking-wider text-text-muted text-[9px] w-32">Phase</th>
                      <th className="text-center px-2 py-2.5 font-black uppercase tracking-wider text-[#f97316] text-[9px]">Hip</th>
                      <th className="text-center px-2 py-2.5 font-black uppercase tracking-wider text-[#f97316] text-[9px]">Ideal</th>
                      <th className="text-center px-2 py-2.5 font-black uppercase tracking-wider text-[#4ade80] text-[9px]">Knee</th>
                      <th className="text-center px-2 py-2.5 font-black uppercase tracking-wider text-[#4ade80] text-[9px]">Ideal</th>
                      <th className="text-center px-2 py-2.5 font-black uppercase tracking-wider text-[#e879f9] text-[9px]">Ankle</th>
                      <th className="text-center px-2 py-2.5 font-black uppercase tracking-wider text-[#e879f9] text-[9px]">Ideal</th>
                      <th className="text-center px-3 py-2.5 font-black uppercase tracking-wider text-text-muted text-[9px]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {analysis.joint_angle_table.map((row) => {
                      const q = statusToQuality(row.status);
                      const phaseInfo = GAIT_PHASES.find(p => p.abbr === row.abbr);
                      return (
                        <tr key={row.abbr} className="hover:bg-surface/30 transition-colors">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                                phaseInfo?.phase === "Stance"
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : "bg-sky-500/10 text-sky-400"
                              }`}>{row.abbr}</span>
                              <span className="text-text-muted text-[10px]">{row.phase}</span>
                            </div>
                          </td>
                          <td className="px-2 py-2 text-center font-mono text-[10px] text-text">{row.hip}</td>
                          <td className="px-2 py-2 text-center text-[9px] text-text-muted/60">{row.hip_ideal}</td>
                          <td className="px-2 py-2 text-center font-mono text-[10px] text-text">{row.knee}</td>
                          <td className="px-2 py-2 text-center text-[9px] text-text-muted/60">{row.knee_ideal}</td>
                          <td className="px-2 py-2 text-center font-mono text-[10px] text-text">{row.ankle}</td>
                          <td className="px-2 py-2 text-center text-[9px] text-text-muted/60">{row.ankle_ideal}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${qualityBadge(q)}`}>
                              {qualityLabel(q)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Spatiotemporal observations */}
          {(analysis.cadence_observation || analysis.stride_observation || analysis.symmetry_observation) && (
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { label: "Cadence",  value: analysis.cadence_observation  },
                { label: "Stride",   value: analysis.stride_observation   },
                { label: "Symmetry", value: analysis.symmetry_observation },
              ].filter((o) => o.value).map(({ label, value }) => (
                <div key={label} className="bg-input border border-border rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">{label}</p>
                  <p className="text-xs text-text mt-1 leading-relaxed">{value}</p>
                </div>
              ))}
            </div>
          )}

          {(analysis.spatiotemporal || analysis.kinematic || analysis.kinetic) && (
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="bg-input border border-border rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">Spatiotemporal</p>
                <div className="mt-2 space-y-1 text-xs text-text">
                  <p>Step length: <span className="text-text-muted">{analysis.spatiotemporal?.step_length ?? "Not measurable from provided frames"}</span></p>
                  <p>Stride length: <span className="text-text-muted">{analysis.spatiotemporal?.stride_length ?? "Not measurable from provided frames"}</span></p>
                  <p>Cadence: <span className="text-text-muted">{analysis.spatiotemporal?.cadence ?? "Not measurable from provided frames"}</span></p>
                  <p>Speed: <span className="text-text-muted">{analysis.spatiotemporal?.speed ?? "Not measurable from provided frames"}</span></p>
                </div>
              </div>
              <div className="bg-input border border-border rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">Kinematic</p>
                <div className="mt-2 space-y-1 text-xs text-text">
                  <p>Joint angles: <span className="text-text-muted">{analysis.kinematic?.joint_angles ?? "Not measurable from provided frames"}</span></p>
                  <p>ROM: <span className="text-text-muted">{analysis.kinematic?.rom ?? "Not measurable from provided frames"}</span></p>
                </div>
              </div>
              <div className="bg-input border border-border rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">Kinetic</p>
                <div className="mt-2 space-y-1 text-xs text-text">
                  <p>GRF: <span className="text-text-muted">{analysis.kinetic?.ground_reaction_force ?? "Requires sensors"}</span></p>
                  <p>Pressure mapping: <span className="text-text-muted">{analysis.kinetic?.pressure_mapping ?? "Requires sensors"}</span></p>
                </div>
              </div>
            </div>
          )}

          {(analysis.risk_flags?.length || analysis.recommendations?.length) && (
            <div className="grid sm:grid-cols-2 gap-3">
              {(analysis.risk_flags?.length ?? 0) > 0 && (
                <div className="bg-input border border-border rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">Risk Flags</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {analysis.risk_flags?.map((flag) => (
                      <span key={flag} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {flag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {(analysis.recommendations?.length ?? 0) > 0 && (
                <div className="bg-input border border-border rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">Recommendations</p>
                  <div className="mt-2 space-y-1">
                    {analysis.recommendations?.map((item) => (
                      <p key={item} className="text-xs text-text-muted">{item}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rehab protocol */}
          {(allDeviations.length > 0 || (analysis.rehab_protocol?.length ?? 0) > 0) && (
            <div className="bg-input border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-border">
                <p className="font-black text-text text-sm">
                  Rehabilitation Protocol
                  <span className="ml-2 text-xs font-normal text-text-muted">WBA99 linked corrections</span>
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface/50">
                      <th className="text-left px-4 py-2.5 font-black uppercase tracking-wider text-text-muted text-[9px]">Problem / Deviation</th>
                      <th className="text-left px-4 py-2.5 font-black uppercase tracking-wider text-amber-500/80 text-[9px]">Cause</th>
                      <th className="text-left px-4 py-2.5 font-black uppercase tracking-wider text-teal-500/80 text-[9px]">Intervention / Solution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(analysis.rehab_protocol?.length ?? 0) > 0
                      ? analysis.rehab_protocol!.map((item, idx) => (
                          <tr key={`${item.problem}-${idx}`} className="hover:bg-surface/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                                <span className="font-bold text-text">{item.problem}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-amber-600 dark:text-amber-400">{item.cause}</td>
                            <td className="px-4 py-3 text-teal-600 dark:text-teal-400">{item.solution}</td>
                          </tr>
                        ))
                      : allDeviations.map((dev) => (
                          <tr key={dev} className="hover:bg-surface/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                                <span className="font-bold text-text">{dev}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-amber-600 dark:text-amber-400">
                              {REHAB_MAP[dev]?.split(";")[0] ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-teal-600 dark:text-teal-400">
                              {REHAB_MAP[dev]?.split(";")[1]?.trim() ?? REHAB_MAP[dev] ?? "—"}
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Editable clinical notes */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-text-muted mb-2">Clinical Notes</p>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={5}
              placeholder="AI-generated summary - edit as needed..."
              className="w-full rounded-2xl border border-border bg-input px-4 py-3 text-sm text-text outline-none focus:border-primary/50 placeholder:text-text-muted/60 transition resize-none shadow-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Button variant="ghost" size="md" onClick={() => setStep("trim")}>
              <RotateCcw className="w-4 h-4" /> Re-select Cycle
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="font-bold">AI analysis complete</span>
              </div>
              <Button variant="primary" size="lg" onClick={() => setShowModal(true)}>
                Save Report
              </Button>
            </div>
          </div>
        </div>
      )}

      <PatientSelectSaveModal
        open={showModal} onClose={() => setShowModal(false)}
        onSave={handleSave} saving={saving} preselectedPatientId={patientId}
      />

      {/* â"€â"€ Frame Lightbox â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      {lightboxIdx !== null && thumbnails[lightboxIdx] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightboxIdx(null)}
        >
          {/* Modal panel â€" stop propagation so clicking inside doesn't close */}
          <div
            className="relative w-full max-w-3xl mx-4 rounded-2xl overflow-hidden bg-[#0a0f1a] border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                  GAIT_PHASES[lightboxIdx]?.phase === "Stance"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-sky-500/15 text-sky-400"
                }`}>
                  {GAIT_PHASES[lightboxIdx]?.abbr}
                </span>
                <span className="text-sm font-black text-white">{GAIT_PHASES[lightboxIdx]?.label}</span>
                <span className="text-xs text-white/40">| {GAIT_PHASES[lightboxIdx]?.phase} phase</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/40">{lightboxIdx + 1} / {thumbnails.length}</span>
                <span className="text-[10px] text-white/30 hidden sm:block">ESC to close | Left/Right to navigate</span>
                <button
                  onClick={() => setLightboxIdx(null)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Image + wire overlay */}
            <div className="relative w-full bg-black">
              <img
                src={thumbnails[lightboxIdx]}
                alt={GAIT_PHASES[lightboxIdx]?.label}
                className="w-full object-contain max-h-[60vh]"
              />
              {frameKeypoints[lightboxIdx] && showWireOverlay && (() => {
                const kps = frameKeypoints[lightboxIdx]!;
                const { angles, extraLines: lbExtraLines, extraDots: lbExtraDots } = computeWireAngles(kps, frameSize.w, frameSize.h);
                return (
                  <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox={`0 0 ${frameSize.w} ${frameSize.h}`}
                    preserveAspectRatio="xMidYMid meet"
                  >
                    {/* Lines */}
                    {WIRE_CONNECTIONS.map(([a, b], ci) => {
                      const p1 = kps[a], p2 = kps[b];
                      if (!p1||!p2||p1.score<0.2||p2.score<0.2) return null;
                      return (
                        <line key={ci}
                          x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                          stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" opacity="0.92"
                        />
                      );
                    })}
                    {/* Extra lines: ankle-to-toe */}
                    {lbExtraLines.map((ln, li) => (
                      <line key={`ex-${li}`} x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2}
                        stroke={ln.color} strokeWidth="3.5" strokeLinecap="round" opacity="0.95"/>
                    ))}
                    {/* Toe tip dot */}
                    {lbExtraDots.map((d, di) => (
                      <g key={`ed-${di}`}>
                        <circle cx={d.x} cy={d.y} r={7} fill={d.color} opacity="0.95"/>
                        <circle cx={d.x} cy={d.y} r={3.5} fill="#fff" opacity="0.85"/>
                      </g>
                    ))}
                    {/* Joints */}
                    {kps.map((kp, ki) => {
                      if (kp.score < 0.25) return null;
                      const lo = ki >= KP_IDX.l_hip;
                      return (
                        <g key={ki}>
                          <circle cx={kp.x} cy={kp.y} r={lo ? 7 : 6} fill={lo ? "#f472b6" : "#22d3ee"} opacity="0.92"/>
                          <circle cx={kp.x} cy={kp.y} r={lo ? 4 : 3} fill="#fff" opacity="0.85"/>
                        </g>
                      );
                    })}
                    {/* Angle badges */}
                    {angles.map((ang, ai) => (
                      <g key={ai}>
                        <rect x={ang.x-3} y={ang.y-10} width={38} height={17} rx="4" fill="rgba(0,0,0,0.80)"/>
                        <text
                          x={ang.x+16} y={ang.y+3}
                          fill={ang.color} fontSize="11" fontWeight="bold"
                          textAnchor="middle" fontFamily="monospace"
                        >{ang.label}</text>
                      </g>
                    ))}
                  </svg>
                );
              })()}
            </div>

            {/* Angle legend + nav footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 gap-4">
              {/* Angle legend */}
              <div className="flex flex-wrap items-center gap-3">
                {[
                  { color: "#22d3ee", label: "Neck" },
                  { color: "#fbbf24", label: "Shoulder" },
                  { color: "#f97316", label: "Hip" },
                  { color: "#4ade80", label: "Knee" },
                  { color: "#e879f9", label: "Ankle" },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                    <span className="text-[11px] font-bold text-white/50">{label}</span>
                  </div>
                ))}
              </div>

              {/* Prev / Next */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setLightboxIdx((i) => i !== null ? Math.max(i - 1, 0) : null)}
                  disabled={lightboxIdx === 0}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition text-lg font-bold"
                >&gt;</button>
                <button
                  onClick={() => setLightboxIdx((i) => i !== null ? Math.min(i + 1, thumbnails.length - 1) : null)}
                  disabled={lightboxIdx === thumbnails.length - 1}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition text-lg font-bold"
                >&gt;</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



