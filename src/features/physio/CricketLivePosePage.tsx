// @ts-nocheck
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import {
  Upload, Camera, Pause, Play, Square, Download, Loader2, AlertTriangle,
  RefreshCcw, Sparkles, CheckCircle, Target, Eye, RotateCw, Trash2
} from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { firebaseDB } from '../../core/firebase';
import { useAuth } from '../../context/AuthContext';
import { PatientSelectSaveModal } from './patients/PatientSelectSaveModal';
import toast from 'react-hot-toast';

const API = '';

// Minimal axios stub — API calls fail silently (backend not required for core pose detection)
const axios = {
  get: (url, opts) => {
    if (!url) return Promise.resolve({ data: {} });
    return fetch(url, {
      method: 'GET',
      headers: opts?.headers || {},
      credentials: opts?.withCredentials ? 'include' : 'same-origin',
    }).then(r => r.json().then(data => ({ data })).catch(() => ({ data: {} }))).catch(() => ({ data: {} }));
  },
  post: (url, body, opts) => {
    if (!url) return Promise.resolve({ data: {} });
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) },
      body: JSON.stringify(body),
      credentials: opts?.withCredentials ? 'include' : 'same-origin',
    }).then(r => r.json().then(data => ({ data })).catch(() => ({ data: {} }))).catch(() => ({ data: {} }));
  },
};

// MediaPipe landmark indices
const LM = {
  NOSE: 0, LEFT_EYE: 2, RIGHT_EYE: 5, LEFT_EAR: 7, RIGHT_EAR: 8,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14, LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_HIP: 23, RIGHT_HIP: 24, LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28, LEFT_HEEL: 29, RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31, RIGHT_FOOT_INDEX: 32,
};

const SKELETON_EDGES = [
  [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
  [LM.LEFT_SHOULDER, LM.LEFT_ELBOW], [LM.LEFT_ELBOW, LM.LEFT_WRIST],
  [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW], [LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
  [LM.LEFT_SHOULDER, LM.LEFT_HIP], [LM.RIGHT_SHOULDER, LM.RIGHT_HIP],
  [LM.LEFT_HIP, LM.RIGHT_HIP],
  [LM.LEFT_HIP, LM.LEFT_KNEE], [LM.LEFT_KNEE, LM.LEFT_ANKLE],
  [LM.RIGHT_HIP, LM.RIGHT_KNEE], [LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
  [LM.LEFT_ANKLE, LM.LEFT_FOOT_INDEX], [LM.RIGHT_ANKLE, LM.RIGHT_FOOT_INDEX],
  [LM.LEFT_EAR, LM.RIGHT_EAR],
];

// ─── Math helpers ───────────────────────────────────────────────────────────
const angle3 = (a, b, c) => {
  const v1x = a.x - b.x, v1y = a.y - b.y;
  const v2x = c.x - b.x, v2y = c.y - b.y;
  const dot = v1x * v2x + v1y * v2y;
  const m1 = Math.hypot(v1x, v1y), m2 = Math.hypot(v2x, v2y);
  if (m1 < 1e-6 || m2 < 1e-6) return 0;
  let cos = dot / (m1 * m2);
  cos = Math.max(-1, Math.min(1, cos));
  return Math.acos(cos) * 180 / Math.PI;
};

// Angle of vector (b-a) from vertical (0 = straight up). Result in degrees.
const vecFromVertical = (a, b) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y; // y axis points down
  // vertical "up" vector is (0,-1). Angle between (dx,dy) and (0,-1)
  let ang = Math.atan2(dx, -dy) * 180 / Math.PI;
  return ang;
};

// Angle of line (a→b) from horizontal in image plane (deg), positive = tilt right-down
const lineFromHorizontal = (a, b) => Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

// ─── Benchmarks per phase ─────────────────────────────────────────────────
// Each metric: {id, label, unit, ideal:[lo,hi], cause}
const BENCH = {
  batsman: {
    label: 'Batsman',
    color: '#1E3A8A',
    phases: [
      { name: 'Stance', metrics: [
        { id: 'feet_width', label: 'Feet width', unit: 'cm', ideal: [38, 45], cause: 'Static T20 stance / over-coached balance' },
        { id: 'knee_flex_front', label: 'Front knee flexion', unit: '°', ideal: [15, 25], cause: 'Fatigue or poor lower-body conditioning' },
        { id: 'knee_flex_back', label: 'Back knee flexion', unit: '°', ideal: [15, 25], cause: 'Tall-player habit / quadriceps weakness' },
        { id: 'trunk_lean', label: 'Trunk forward lean', unit: '°', ideal: [20, 30], cause: 'Lordotic posture / weak anterior core' },
        { id: 'head_tilt', label: 'Head tilt (frontal)', unit: '°', ideal: [0, 5], cause: 'Dominant-eye compensation / neck stiffness' },
      ]},
      { name: 'Backlift', metrics: [
        { id: 'top_elbow_flex', label: 'Top-hand elbow flexion', unit: '°', ideal: [90, 110], cause: 'Tension / over-coached high elbow' },
        { id: 'top_shoulder_elev', label: 'Top-hand shoulder elevation', unit: '°', ideal: [70, 90], cause: 'GIRD / posterior shoulder tightness' },
      ]},
      { name: 'Stride', metrics: [
        { id: 'stride_length_pct', label: 'Stride length (% leg)', unit: '%', ideal: [55, 70], cause: 'Reaching for ball / poor depth perception' },
        { id: 'front_foot_angle', label: 'Front-foot landing angle', unit: '°', ideal: [30, 45], cause: 'Closed stride blocks hip rotation' },
      ]},
      { name: 'Impact', metrics: [
        { id: 'front_knee_impact', label: 'Front knee at impact', unit: '°', ideal: [140, 160], cause: 'Knee collapse → loss of height & power' },
        { id: 'hip_shoulder_sep', label: 'Hip-shoulder separation', unit: '°', ideal: [30, 40], cause: 'Thoracic stiffness / weak obliques' },
        { id: 'top_arm_elbow_impact', label: 'Top-arm elbow at impact', unit: '°', ideal: [160, 180], cause: 'Bunt shot / top-hand weakness' },
        { id: 'trunk_lean_impact', label: 'Trunk forward lean at impact', unit: '°', ideal: [15, 25], cause: 'Upright trunk → back-foot fall-away' },
      ]},
      { name: 'Follow-through', metrics: [
        { id: 'head_disp', label: 'Head displacement post-impact', unit: 'cm', ideal: [0, 3], cause: 'Over-hitting / loss of base' },
      ]},
    ],
  },
  pace_bowler: {
    label: 'Pace Bowler',
    color: '#DC2626',
    phases: [
      { name: 'Bound', metrics: [
        { id: 'trunk_lean_runup', label: 'Trunk lean (run-up)', unit: '°', ideal: [5, 10], cause: 'Upright posture loses horizontal velocity' },
      ]},
      { name: 'BFC', metrics: [
        { id: 'back_foot_angle', label: 'Back-foot alignment', unit: '°', ideal: [0, 30], cause: 'Mixed action — counter-rotation injury risk' },
        { id: 'trunk_extension_bfc', label: 'Trunk extension', unit: '°', ideal: [10, 20], cause: 'Thoracic immobility / short-arm action' },
        { id: 'hip_shoulder_sep_bfc', label: 'Hip-shoulder separation', unit: '°', ideal: [30, 40], cause: 'Limited thoracic rotation' },
        { id: 'front_arm_elev', label: 'Front-arm elevation', unit: '°', ideal: [150, 180], cause: 'Lumbar stiffness / protective pattern' },
        { id: 'contra_lean', label: 'Contralateral trunk lean', unit: '°', ideal: [10, 20], cause: 'Weak anterior deltoid' },
      ]},
      { name: 'FFC', metrics: [
        { id: 'front_knee_ffc', label: 'Front knee at FFC', unit: '°', ideal: [150, 175], cause: 'Quad weakness / pain-compensatory collapse' },
      ]},
      { name: 'Release', metrics: [
        { id: 'arm_angle_release', label: 'Arm angle from vertical', unit: '°', ideal: [0, 15], cause: 'Round-arm action → reduced bounce' },
        { id: 'trunk_lat_flex', label: 'Trunk lateral flexion', unit: '°', ideal: [20, 35], cause: 'Lumbar pain avoidance' },
        { id: 'elbow_flex_release', label: 'Bowling elbow at release', unit: '°', ideal: [165, 180], cause: '>15° flexion → ICC illegal action' },
        { id: 'front_knee_release', label: 'Front knee at release', unit: '°', ideal: [155, 180], cause: 'Knee collapse — major speed leak' },
        { id: 'head_position', label: 'Head fall-away angle', unit: '°', ideal: [0, 8], cause: 'Loss of vestibular reference → accuracy leak' },
      ]},
      { name: 'Follow-through', metrics: [
        { id: 'trunk_rotation', label: 'Trunk rotation', unit: '°', ideal: [45, 90], cause: 'Aborted rotation — energy retained, less pace' },
      ]},
    ],
  },
  spin_bowler: {
    label: 'Spin Bowler',
    color: '#7C3AED',
    phases: [
      { name: 'BFC', metrics: [
        { id: 'back_foot_angle_spin', label: 'Back-foot alignment', unit: '°', ideal: [45, 90], cause: 'Misaligned drive base' },
        { id: 'hip_shoulder_sep_spin', label: 'Hip-shoulder separation', unit: '°', ideal: [25, 40], cause: 'Thoracic stiffness reduces rev rate' },
        { id: 'front_arm_spin', label: 'Front-arm elevation', unit: '°', ideal: [140, 180], cause: 'Reduces release height & spin energy' },
      ]},
      { name: 'Release', metrics: [
        { id: 'arm_angle_spin', label: 'Arm angle from vertical', unit: '°', ideal: [0, 20], cause: 'Round-arm reduces flight & dip' },
        { id: 'trunk_lat_flex_spin', label: 'Trunk lateral flexion', unit: '°', ideal: [15, 25], cause: 'Reduces release height' },
        { id: 'elbow_flex_spin', label: 'Bowling elbow at release', unit: '°', ideal: [160, 180], cause: '>15° flexion may be flagged' },
      ]},
      { name: 'Follow-through', metrics: [
        { id: 'trunk_rotation_spin', label: 'Trunk rotation through target', unit: '°', ideal: [30, 80], cause: 'Aborted rotation — flatter trajectory' },
      ]},
    ],
  },
};

// Compute cricket metrics for a snapshot of MediaPipe landmarks.
// Returns object: {metricId: value, ...}.
// dominant: 'right' = right-handed batsman/bowler; flips left/right side semantics.
const computeMetrics = (pts, view, dominant) => {
  if (!pts) return {};
  const out = {};
  const v = (idx) => pts[idx]?.visibility ?? 0;
  const ok = (...idxs) => idxs.every(i => v(i) > 0.3);

  // Front foot = left for RHB/RH-bowler (faces off-side); back foot = right.
  const FRONT_HIP = dominant === 'right' ? LM.LEFT_HIP : LM.RIGHT_HIP;
  const BACK_HIP  = dominant === 'right' ? LM.RIGHT_HIP : LM.LEFT_HIP;
  const FRONT_KNEE = dominant === 'right' ? LM.LEFT_KNEE : LM.RIGHT_KNEE;
  const BACK_KNEE  = dominant === 'right' ? LM.RIGHT_KNEE : LM.LEFT_KNEE;
  const FRONT_ANKLE = dominant === 'right' ? LM.LEFT_ANKLE : LM.RIGHT_ANKLE;
  const BACK_ANKLE  = dominant === 'right' ? LM.RIGHT_ANKLE : LM.LEFT_ANKLE;
  const FRONT_FOOT  = dominant === 'right' ? LM.LEFT_FOOT_INDEX : LM.RIGHT_FOOT_INDEX;
  // Top hand on bat = upper hand. For RHB, top hand is LEFT hand (above bottom right).
  // Bowling arm: for right-arm bowler, bowling arm is RIGHT shoulder.
  const TOP_SHOULDER = dominant === 'right' ? LM.LEFT_SHOULDER : LM.RIGHT_SHOULDER;
  const TOP_ELBOW    = dominant === 'right' ? LM.LEFT_ELBOW : LM.RIGHT_ELBOW;
  const TOP_WRIST    = dominant === 'right' ? LM.LEFT_WRIST : LM.RIGHT_WRIST;
  // For bowler arm = dominant side
  const BOWL_SHOULDER = dominant === 'right' ? LM.RIGHT_SHOULDER : LM.LEFT_SHOULDER;
  const BOWL_ELBOW    = dominant === 'right' ? LM.RIGHT_ELBOW : LM.LEFT_ELBOW;
  const BOWL_WRIST    = dominant === 'right' ? LM.RIGHT_WRIST : LM.LEFT_WRIST;
  const NON_BOWL_SHOULDER = TOP_SHOULDER;
  const NON_BOWL_ELBOW    = TOP_ELBOW;
  const NON_BOWL_WRIST    = TOP_WRIST;

  // Shoulder width as scale reference (~38 cm avg adult)
  let scale = 1;
  if (ok(LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER)) {
    const sw = dist(pts[LM.LEFT_SHOULDER], pts[LM.RIGHT_SHOULDER]);
    if (sw > 5) scale = 38 / sw; // cm per pixel
  }

  // ─── Batsman / general body metrics ───
  if (ok(FRONT_ANKLE, BACK_ANKLE)) {
    const feet_px = dist(pts[FRONT_ANKLE], pts[BACK_ANKLE]);
    out.feet_width = +(feet_px * scale).toFixed(1);
  }
  if (ok(FRONT_HIP, FRONT_KNEE, FRONT_ANKLE)) {
    out.knee_flex_front = +(180 - angle3(pts[FRONT_HIP], pts[FRONT_KNEE], pts[FRONT_ANKLE])).toFixed(1);
    out.front_knee_impact = +angle3(pts[FRONT_HIP], pts[FRONT_KNEE], pts[FRONT_ANKLE]).toFixed(1);
    out.front_knee_ffc = out.front_knee_impact;
    out.front_knee_release = out.front_knee_impact;
  }
  if (ok(BACK_HIP, BACK_KNEE, BACK_ANKLE)) {
    out.knee_flex_back = +(180 - angle3(pts[BACK_HIP], pts[BACK_KNEE], pts[BACK_ANKLE])).toFixed(1);
  }
  // Trunk forward lean: angle of mid_shoulder→mid_hip from vertical (image y down = down)
  if (ok(LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_HIP, LM.RIGHT_HIP)) {
    const ms = mid(pts[LM.LEFT_SHOULDER], pts[LM.RIGHT_SHOULDER]);
    const mh = mid(pts[LM.LEFT_HIP], pts[LM.RIGHT_HIP]);
    // Trunk vector from hip to shoulder; positive lean forward = shoulders ahead of hips (toward camera left for right-handed side view)
    const a = Math.abs(vecFromVertical(mh, ms));
    out.trunk_lean = +a.toFixed(1);
    out.trunk_lean_impact = out.trunk_lean;
    out.trunk_extension_bfc = +Math.max(0, a - 0).toFixed(1); // signed extension when lean is backward; approximated
    out.trunk_lat_flex = +a.toFixed(1);
    out.trunk_lat_flex_spin = out.trunk_lat_flex;
    out.trunk_lean_runup = +a.toFixed(1);
    out.contra_lean = +a.toFixed(1);
  }
  if (ok(LM.LEFT_EAR, LM.RIGHT_EAR)) {
    const a = lineFromHorizontal(pts[LM.LEFT_EAR], pts[LM.RIGHT_EAR]);
    out.head_tilt = +Math.abs(a).toFixed(1);
    out.head_position = out.head_tilt;
  }
  // Top-hand elbow flexion
  if (ok(TOP_SHOULDER, TOP_ELBOW, TOP_WRIST)) {
    out.top_elbow_flex = +angle3(pts[TOP_SHOULDER], pts[TOP_ELBOW], pts[TOP_WRIST]).toFixed(1);
    out.top_arm_elbow_impact = out.top_elbow_flex;
  }
  // Top-hand shoulder elevation (angle between hip-shoulder and shoulder-elbow)
  if (ok(FRONT_HIP, TOP_SHOULDER, TOP_ELBOW)) {
    out.top_shoulder_elev = +(180 - angle3(pts[FRONT_HIP], pts[TOP_SHOULDER], pts[TOP_ELBOW])).toFixed(1);
  }
  // Hip-shoulder separation: shoulder line angle minus hip line angle (top-view inferred via x-axis tilt)
  if (ok(LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_HIP, LM.RIGHT_HIP)) {
    const sh = lineFromHorizontal(pts[LM.LEFT_SHOULDER], pts[LM.RIGHT_SHOULDER]);
    const hp = lineFromHorizontal(pts[LM.LEFT_HIP], pts[LM.RIGHT_HIP]);
    const sep = Math.abs(sh - hp);
    out.hip_shoulder_sep = +sep.toFixed(1);
    out.hip_shoulder_sep_bfc = out.hip_shoulder_sep;
    out.hip_shoulder_sep_spin = out.hip_shoulder_sep;
  }
  // Stride length as % of leg length (leg = hip→ankle)
  if (ok(FRONT_HIP, FRONT_ANKLE, BACK_ANKLE)) {
    const leg = dist(pts[FRONT_HIP], pts[FRONT_ANKLE]);
    const stride = dist(pts[FRONT_ANKLE], pts[BACK_ANKLE]);
    if (leg > 5) out.stride_length_pct = +((stride / leg) * 100).toFixed(1);
  }
  // Front foot landing angle (foot vector from horizontal)
  if (ok(FRONT_ANKLE, FRONT_FOOT)) {
    out.front_foot_angle = +Math.abs(lineFromHorizontal(pts[FRONT_ANKLE], pts[FRONT_FOOT])).toFixed(1);
    out.back_foot_angle = out.front_foot_angle;
    out.back_foot_angle_spin = out.front_foot_angle;
  }
  // Bowling arm angle from vertical at release: shoulder→wrist line
  if (ok(BOWL_SHOULDER, BOWL_WRIST)) {
    const a = Math.abs(vecFromVertical(pts[BOWL_SHOULDER], pts[BOWL_WRIST]));
    out.arm_angle_release = +a.toFixed(1);
    out.arm_angle_spin = out.arm_angle_release;
  }
  // Bowling elbow extension at release
  if (ok(BOWL_SHOULDER, BOWL_ELBOW, BOWL_WRIST)) {
    out.elbow_flex_release = +angle3(pts[BOWL_SHOULDER], pts[BOWL_ELBOW], pts[BOWL_WRIST]).toFixed(1);
    out.elbow_flex_spin = out.elbow_flex_release;
  }
  // Front-arm (non-bowling) elevation: hip-shoulder-elbow
  if (ok(FRONT_HIP, NON_BOWL_SHOULDER, NON_BOWL_ELBOW)) {
    out.front_arm_elev = +(180 - angle3(pts[FRONT_HIP], pts[NON_BOWL_SHOULDER], pts[NON_BOWL_ELBOW])).toFixed(1);
    out.front_arm_spin = out.front_arm_elev;
  }
  // Trunk rotation through target (approx by hip line tilt from horizontal)
  if (ok(LM.LEFT_HIP, LM.RIGHT_HIP)) {
    out.trunk_rotation = +Math.abs(lineFromHorizontal(pts[LM.LEFT_HIP], pts[LM.RIGHT_HIP])).toFixed(1);
    out.trunk_rotation_spin = out.trunk_rotation;
  }
  // Head displacement: not derivable from single frame — left undefined.

  return out;
};

const statusOf = (val, ideal) => {
  if (val === undefined || val === null || Number.isNaN(val)) return { status: 'none', color: '#94A3B8', label: 'N/A' };
  if (val >= ideal[0] && val <= ideal[1]) return { status: 'optimal', color: '#16A34A', label: 'Optimal' };
  const dev = val < ideal[0] ? ideal[0] - val : val - ideal[1];
  const range = Math.max(ideal[1] - ideal[0], 1);
  if (dev <= range * 0.5) return { status: 'minor', color: '#F59E0B', label: 'Minor' };
  return { status: 'major', color: '#DC2626', label: 'Major' };
};

const ROLE_ICONS = { batsman: '🏏', pace_bowler: '🔴', spin_bowler: '🟣' };

// ─── Auto phase detection (heuristic) ─────────────────────────────────────
// Each detector observes a single landmark-derived scalar over a sliding window
// and fires a phase capture when its pattern (stable / peakHigh / peakLow) matches.
// Phases are ordered: a phase only fires after its `after` dependency has fired.
const detectorMetrics = (pts, dominant) => {
  if (!pts) return null;
  const FRONT_ANKLE = dominant === 'right' ? LM.LEFT_ANKLE : LM.RIGHT_ANKLE;
  const BACK_ANKLE  = dominant === 'right' ? LM.RIGHT_ANKLE : LM.LEFT_ANKLE;
  const TOP_WRIST   = dominant === 'right' ? LM.LEFT_WRIST  : LM.RIGHT_WRIST;
  const BOWL_SHOULDER = dominant === 'right' ? LM.RIGHT_SHOULDER : LM.LEFT_SHOULDER;
  const BOWL_WRIST  = dominant === 'right' ? LM.RIGHT_WRIST  : LM.LEFT_WRIST;
  const armAng = pts[BOWL_SHOULDER] && pts[BOWL_WRIST]
    ? Math.abs(vecFromVertical(pts[BOWL_SHOULDER], pts[BOWL_WRIST])) : null;
  const midHipY = pts[LM.LEFT_HIP] && pts[LM.RIGHT_HIP]
    ? (pts[LM.LEFT_HIP].y + pts[LM.RIGHT_HIP].y) / 2 : null;
  return {
    top_wrist_y: pts[TOP_WRIST]?.y,
    front_ankle_x: pts[FRONT_ANKLE]?.x,
    front_ankle_y: pts[FRONT_ANKLE]?.y,
    back_ankle_y: pts[BACK_ANKLE]?.y,
    bowl_wrist_y: pts[BOWL_WRIST]?.y,
    arm_angle: armAng,
    mid_hip_y: midHipY,
  };
};

// Phase detectors per role. type: stable | peakHigh | peakLow.
// peakHigh fires when buffer-middle frame is the max value within the window.
// peakLow fires when buffer-middle frame is the min value within the window.
// stable fires when buffer std-dev < varThreshold.
const DETECTORS = {
  batsman: [
    { phase: 'Stance', type: 'stable', metric: 'mid_hip_y', window: 16, varThreshold: 5 },
    { phase: 'Backlift', type: 'peakLow', metric: 'top_wrist_y', window: 18, minDelta: 25, after: 'Stance' },
    { phase: 'Stride', type: 'peakHigh', metric: 'front_ankle_x', window: 16, minDelta: 30, after: 'Backlift' },
    { phase: 'Impact', type: 'peakHigh', metric: 'top_wrist_y', window: 16, minDelta: 35, after: 'Backlift' },
    { phase: 'Follow-through', type: 'stable', metric: 'mid_hip_y', window: 18, varThreshold: 7, after: 'Impact' },
  ],
  pace_bowler: [
    { phase: 'Bound', type: 'peakLow', metric: 'mid_hip_y', window: 14, minDelta: 25 },
    { phase: 'BFC', type: 'stable', metric: 'back_ankle_y', window: 12, varThreshold: 5, after: 'Bound' },
    { phase: 'FFC', type: 'stable', metric: 'front_ankle_y', window: 12, varThreshold: 5, after: 'BFC' },
    { phase: 'Release', type: 'peakLow', metric: 'arm_angle', window: 14, minDelta: 8, after: 'FFC' },
    { phase: 'Follow-through', type: 'stable', metric: 'bowl_wrist_y', window: 16, varThreshold: 8, after: 'Release' },
  ],
  spin_bowler: [
    { phase: 'BFC', type: 'stable', metric: 'back_ankle_y', window: 12, varThreshold: 5 },
    { phase: 'Release', type: 'peakLow', metric: 'arm_angle', window: 14, minDelta: 8, after: 'BFC' },
    { phase: 'Follow-through', type: 'stable', metric: 'bowl_wrist_y', window: 16, varThreshold: 8, after: 'Release' },
  ],
};

const evalDetector = (d, history) => {
  if (history.length < d.window) return false;
  const win = history.slice(-d.window).map(h => h?.[d.metric]).filter(v => v != null && !Number.isNaN(v));
  if (win.length < Math.floor(d.window * 0.7)) return false;
  if (d.type === 'stable') {
    const mean = win.reduce((a, b) => a + b, 0) / win.length;
    const variance = win.reduce((s, v) => s + (v - mean) ** 2, 0) / win.length;
    return Math.sqrt(variance) < (d.varThreshold || 6);
  }
  if (d.type === 'peakHigh' || d.type === 'peakLow') {
    const mid = Math.floor(win.length / 2);
    const c = win[mid];
    const others = [...win.slice(0, mid), ...win.slice(mid + 1)];
    if (d.type === 'peakHigh') {
      const max = Math.max(...others);
      return c > max + (d.minDelta || 10) * 0.4 && c >= Math.max(...win);
    } else {
      const min = Math.min(...others);
      return c < min - (d.minDelta || 10) * 0.4 && c <= Math.min(...win);
    }
  }
  return false;
};

// ────────────────────────────────────────────────────────────────────────────
function CricketLivePose({ playerName = '', patientId = undefined }) {
  const [role, setRole] = useState('batsman');
  const [view, setView] = useState('Side');
  const [dominant, setDominant] = useState('right');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null);
  const [fps, setFps] = useState(0);
  const [progress, setProgress] = useState(0);
  const [liveMetrics, setLiveMetrics] = useState({});
  const [phaseCaptures, setPhaseCaptures] = useState({}); // {phaseName: {snapshot, metrics, at}}
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiOpen, setAiOpen] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();
  const [autoCapture, setAutoCapture] = useState(false);
  const [autoEvents, setAutoEvents] = useState([]); // {phase, at, verdict, reason} for UI feed
  const [aiConfirm, setAiConfirm] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState({}); // {phase: 'verifying' | 'rejected' | 'accepted' | 'unsure'}

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const landmarkerRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const lastTsRef = useRef(performance.now());
  const fpsBuf = useRef([]);
  const lastPtsRef = useRef(null);
  const detectorRef = useRef({ fired: new Set(), history: [], lastFireT: 0 });

  const cfg = BENCH[role];

  // ─── Load MediaPipe model ───
  const loadModel = useCallback(async () => {
    if (landmarkerRef.current) return;
    setStatus('loading');
    setError(null);
    try {
      const visionModule = await import(/* webpackIgnore: true */ 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs');
      const { FilesetResolver, PoseLandmarker } = visionModule;
      const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
      landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      setStatus('ready');
    } catch (e) {
      console.error(e);
      setError('Failed to load AI pose model. Refresh and retry.');
      setStatus('error');
    }
  }, []);

  // ─── File upload ───
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await loadModel();
    if (!landmarkerRef.current) return;
    const url = URL.createObjectURL(file);
    setSource({ type: 'file', name: file.name, url });
    const v = videoRef.current;
    v.srcObject = null; v.src = url; v.loop = false; v.muted = true;
    v.onloadedmetadata = () => { v.play(); setStatus('playing'); tick(); };
  };

  // ─── Live camera ───
  const startCamera = async () => {
    await loadModel();
    if (!landmarkerRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      const v = videoRef.current;
      v.srcObject = stream; v.src = '';
      await v.play();
      setSource({ type: 'camera', name: 'Live camera' });
      setStatus('playing');
      tick();
    } catch (e) {
      if (e.name === 'NotAllowedError') setError('Camera permission denied.');
      else if (e.name === 'NotFoundError') setError('No camera detected.');
      else setError(`Camera error: ${e.message}`);
      setStatus('error');
    }
  };

  // ─── Main detection loop ───
  const tick = useCallback(() => {
    const v = videoRef.current, c = canvasRef.current, lm = landmarkerRef.current;
    if (!v || !c || !lm) { rafRef.current = requestAnimationFrame(tick); return; }
    if (v.readyState < 2 || v.videoWidth === 0) { rafRef.current = requestAnimationFrame(tick); return; }
    if (v.ended) { setStatus('done'); return; }
    if (v.paused) { rafRef.current = requestAnimationFrame(tick); return; }

    const w = v.videoWidth, h = v.videoHeight;
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
    const ctx = c.getContext('2d');

    const now = performance.now();
    let res = null;
    try { res = lm.detectForVideo(v, now); } catch (e) { /* skip */ }

    const dt = now - lastTsRef.current;
    lastTsRef.current = now;
    if (dt > 0) {
      fpsBuf.current.push(1000 / dt);
      if (fpsBuf.current.length > 30) fpsBuf.current.shift();
      setFps(Math.round(fpsBuf.current.reduce((a, b) => a + b, 0) / fpsBuf.current.length));
    }

    ctx.save();
    ctx.clearRect(0, 0, w, h);
    if (source?.type === 'camera') { ctx.scale(-1, 1); ctx.translate(-w, 0); }
    ctx.drawImage(v, 0, 0, w, h);

    if (res?.landmarks?.length > 0) {
      const lmks = res.landmarks[0];
      const pts = lmks.map(l => ({ x: l.x * w, y: l.y * h, visibility: l.visibility }));
      lastPtsRef.current = pts;

      // ── Auto phase detection ──
      if (autoCapture) {
        const dState = detectorRef.current;
        const dm = detectorMetrics(pts, dominant);
        if (dm) dState.history.push(dm);
        if (dState.history.length > 90) dState.history.shift();
        const dets = DETECTORS[role] || [];
        if (now - dState.lastFireT > 350) {
          for (const d of dets) {
            if (dState.fired.has(d.phase)) continue;
            if (d.after && !dState.fired.has(d.after)) continue;
            const series = dState.history.map(h => h[d.metric]);
            if (evalDetector(d, series)) {
              dState.fired.add(d.phase);
              dState.lastFireT = now;
              // Capture using last seen frame
              const snap = canvasRef.current?.toDataURL('image/jpeg', 0.78);
              const mm = computeMetrics(pts, view, dominant);
              const phaseName = d.phase;
              if (aiConfirm && snap) {
                // Provisional capture pending AI verification
                setPhaseCaptures(prev => ({ ...prev, [phaseName]: { snapshot: snap, metrics: mm, at: Date.now(), auto: true, pending: true } }));
                setPendingConfirm(prev => ({ ...prev, [phaseName]: 'verifying' }));
                setAutoEvents(ev => [...ev.slice(-9), { phase: phaseName, at: Date.now(), verdict: 'verifying' }]);
                // Fire async confirm
                (async () => {
                  try {
                    const token = localStorage.getItem('wba99_token');
                    const r = await axios.post(`${API}/api/cricket/phase-confirm`, {
                      snapshot_b64: snap, role, phase: phaseName, dominant,
                    }, { headers: { Authorization: `Bearer ${token}` }, withCredentials: true });
                    const verdict = r.data?.verdict || 'UNSURE';
                    const reason = r.data?.reason || '';
                    if (verdict === 'NO') {
                      // Reject — clear capture and re-arm detector for this phase
                      setPhaseCaptures(prev => { const n = { ...prev }; delete n[phaseName]; return n; });
                      detectorRef.current.fired.delete(phaseName);
                      setPendingConfirm(prev => ({ ...prev, [phaseName]: 'rejected' }));
                    } else {
                      setPhaseCaptures(prev => prev[phaseName] ? { ...prev, [phaseName]: { ...prev[phaseName], pending: false, aiVerdict: verdict, aiReason: reason } } : prev);
                      setPendingConfirm(prev => ({ ...prev, [phaseName]: verdict === 'YES' ? 'accepted' : 'unsure' }));
                    }
                    setAutoEvents(ev => ev.map(e => e.phase === phaseName && e.verdict === 'verifying' ? { ...e, verdict, reason } : e));
                  } catch (err) {
                    // On failure, accept as fallback
                    setPhaseCaptures(prev => prev[phaseName] ? { ...prev, [phaseName]: { ...prev[phaseName], pending: false } } : prev);
                    setPendingConfirm(prev => ({ ...prev, [phaseName]: 'unsure' }));
                  }
                })();
              } else {
                setPhaseCaptures(prev => ({ ...prev, [phaseName]: { snapshot: snap, metrics: mm, at: Date.now(), auto: true } }));
                setAutoEvents(ev => [...ev.slice(-9), { phase: phaseName, at: Date.now(), verdict: 'auto' }]);
              }
              break;
            }
          }
        }
      }

      // Skeleton glow
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#00e5ff';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 12;
      for (const [a, b] of SKELETON_EDGES) {
        if (pts[a]?.visibility > 0.3 && pts[b]?.visibility > 0.3) {
          ctx.beginPath();
          ctx.moveTo(pts[a].x, pts[a].y);
          ctx.lineTo(pts[b].x, pts[b].y);
          ctx.stroke();
        }
      }
      ctx.shadowBlur = 0;

      // Joints
      for (let i = 0; i < pts.length; i++) {
        if (pts[i].visibility < 0.3) continue;
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Cricket metrics
      const m = computeMetrics(pts, view, dominant);
      setLiveMetrics(m);

      // HUD labels at key joints
      ctx.save();
      if (source?.type === 'camera') { ctx.scale(-1, 1); ctx.translate(-w, 0); }
      ctx.font = '700 17px "Share Tech Mono", monospace';
      const drawLabel = (txt, x, y, color) => {
        ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 4;
        ctx.strokeText(txt, x, y);
        ctx.fillStyle = color; ctx.fillText(txt, x, y);
      };
      // Front knee
      const fk = dominant === 'right' ? LM.LEFT_KNEE : LM.RIGHT_KNEE;
      if (pts[fk]?.visibility > 0.3 && m.front_knee_impact !== undefined) {
        const px = source?.type === 'camera' ? w - pts[fk].x : pts[fk].x;
        drawLabel(`Knee ${Math.round(m.front_knee_impact)}°`, px + 10, pts[fk].y, '#22c55e');
      }
      // Trunk lean at hip mid
      if (pts[LM.LEFT_HIP]?.visibility > 0.3 && m.trunk_lean !== undefined) {
        const mh = mid(pts[LM.LEFT_HIP], pts[LM.RIGHT_HIP]);
        const px = source?.type === 'camera' ? w - mh.x : mh.x;
        drawLabel(`Trunk ${Math.round(m.trunk_lean)}°`, px + 10, mh.y, '#f59e0b');
      }
      // Hip-shoulder sep at shoulder mid
      if (pts[LM.LEFT_SHOULDER]?.visibility > 0.3 && m.hip_shoulder_sep !== undefined) {
        const ms = mid(pts[LM.LEFT_SHOULDER], pts[LM.RIGHT_SHOULDER]);
        const px = source?.type === 'camera' ? w - ms.x : ms.x;
        drawLabel(`X-Factor ${Math.round(m.hip_shoulder_sep)}°`, px + 10, ms.y - 14, '#a78bfa');
      }
      // Bowling arm angle at shoulder for bowler
      if (role !== 'batsman') {
        const bs = dominant === 'right' ? LM.RIGHT_SHOULDER : LM.LEFT_SHOULDER;
        if (pts[bs]?.visibility > 0.3 && m.arm_angle_release !== undefined) {
          const px = source?.type === 'camera' ? w - pts[bs].x : pts[bs].x;
          drawLabel(`Arm ${Math.round(m.arm_angle_release)}°`, px + 10, pts[bs].y - 4, '#ec4899');
        }
      }
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '700 18px "Share Tech Mono", monospace';
      ctx.fillText('No person detected — center the player in frame', 20, 30);
      ctx.restore();
    }

    ctx.restore();

    if (source?.type === 'file' && v.duration) {
      setProgress(Math.round((v.currentTime / v.duration) * 100));
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [source, role, view, dominant, autoCapture, aiConfirm]);

  // ─── Phase capture ───
  const capturePhase = (phaseName) => {
    if (!canvasRef.current || !lastPtsRef.current) return;
    const snap = canvasRef.current.toDataURL('image/jpeg', 0.78);
    const m = computeMetrics(lastPtsRef.current, view, dominant);
    setPhaseCaptures(prev => ({ ...prev, [phaseName]: { snapshot: snap, metrics: m, at: Date.now() } }));
  };

  const clearPhase = (phaseName) => {
    setPhaseCaptures(prev => {
      const next = { ...prev };
      delete next[phaseName];
      return next;
    });
    detectorRef.current.fired.delete(phaseName);
  };

  const resetAuto = () => {
    detectorRef.current = { fired: new Set(), history: [], lastFireT: 0 };
    setAutoEvents([]);
  };

  const togglePause = () => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) { v.play(); setStatus('playing'); }
    else { v.pause(); setStatus('paused'); }
  };

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const v = videoRef.current;
    if (v) { v.pause(); v.src = ''; v.srcObject = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setStatus('idle');
    setSource(null);
    resetAuto();
  };

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  }, []);

  // ─── Aggregate score ───
  const computeScore = () => {
    let opt = 0, min = 0, maj = 0, na = 0, total = 0;
    cfg.phases.forEach(ph => {
      const cap = phaseCaptures[ph.name];
      ph.metrics.forEach(mt => {
        total++;
        const val = cap?.metrics?.[mt.id];
        const s = statusOf(val, mt.ideal).status;
        if (s === 'optimal') opt++;
        else if (s === 'minor') min++;
        else if (s === 'major') maj++;
        else na++;
      });
    });
    const measured = total - na;
    const points = opt * 10 + min * 6 + maj * 2;
    const score = measured > 0 ? (points / measured).toFixed(1) : '-';
    return { opt, min, maj, na, total, measured, score };
  };

  // ─── AI coaching ───
  const requestAI = async () => {
    setAiOpen(true);
    setAiLoading(true);
    setAiText('');
    try {
      const token = localStorage.getItem('wba99_token');
      const lines = [`Cricket biomechanical analysis · Role: ${cfg.label} · View: ${view} · Dominant: ${dominant}`];
      lines.push(`Player: ${playerName || 'Unknown'}`);
      cfg.phases.forEach(ph => {
        const cap = phaseCaptures[ph.name];
        if (!cap) return;
        lines.push(`\n[${ph.name}]`);
        ph.metrics.forEach(mt => {
          const val = cap.metrics?.[mt.id];
          if (val === undefined) return;
          const s = statusOf(val, mt.ideal);
          lines.push(`  ${mt.label}: ${val}${mt.unit} (ideal ${mt.ideal[0]}–${mt.ideal[1]}${mt.unit}) → ${s.label}`);
        });
      });
      const prompt = `${lines.join('\n')}\n\nProvide a concise clinical-biomechanical assessment (<200 words). Highlight 3 priority corrections (with cues), any injury-risk flags (lumbar / shoulder / knee), and 2-3 drills with sets/reps tailored to the cricket role above.`;
      const { data } = await axios.post(`${API}/api/chat`, { message: prompt, context: `Cricket biomechanics ${role}` }, { headers: { Authorization: `Bearer ${token}` }, withCredentials: true });
      setAiText(data.response || 'No response.');
    } catch (e) {
      setAiText('AI coaching unavailable: ' + (e.message || e));
    } finally {
      setAiLoading(false);
    }
  };

  // ─── PDF export ───
  const exportPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const sc = computeScore();

    // Cover
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, 210, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('WBA99 · Cricket Biomechanical Report', 14, 16);
    doc.setFontSize(11);
    doc.text(`${cfg.label} · ${view} View · ${dominant === 'right' ? 'Right' : 'Left'}-handed`, 14, 24);
    doc.setFontSize(9);
    doc.text(`Player: ${playerName || '—'}    Generated: ${new Date().toLocaleString()}`, 14, 32);

    let y = 50;
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('Session Summary', 14, y); y += 7;
    doc.setFont(undefined, 'normal'); doc.setFontSize(10);
    doc.text(`Overall biomechanical score: ${sc.score} / 10`, 14, y); y += 5;
    doc.text(`Phases captured: ${Object.keys(phaseCaptures).length} / ${cfg.phases.length}`, 14, y); y += 5;
    doc.text(`Metrics measured: ${sc.measured} / ${sc.total}`, 14, y); y += 7;

    // Status pills
    doc.setFillColor(220, 252, 231); doc.rect(14, y, 50, 7, 'F');
    doc.setTextColor(22, 101, 52); doc.text(`Optimal: ${sc.opt}`, 18, y + 5);
    doc.setFillColor(254, 243, 199); doc.rect(67, y, 50, 7, 'F');
    doc.setTextColor(146, 64, 14); doc.text(`Minor dev.: ${sc.min}`, 71, y + 5);
    doc.setFillColor(254, 226, 226); doc.rect(120, y, 50, 7, 'F');
    doc.setTextColor(153, 27, 27); doc.text(`Major dev.: ${sc.maj}`, 124, y + 5);
    doc.setTextColor(20, 20, 20);
    y += 14;

    // Per-phase sections
    cfg.phases.forEach((ph, idx) => {
      const cap = phaseCaptures[ph.name];
      if (y > 245) { doc.addPage(); y = 14; }

      doc.setFillColor(30, 58, 138);
      doc.roundedRect(12, y - 3, 186, 9, 2, 2, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.setFont(undefined, 'bold');
      doc.text(`Phase ${idx + 1}: ${ph.name}`, 16, y + 3);
      doc.setFont(undefined, 'normal');
      doc.text(cap ? '✓ Captured' : '○ Not captured', 168, y + 3);
      doc.setTextColor(20, 20, 20);
      y += 13;

      // Snapshot
      if (cap?.snapshot) {
        try {
          doc.addImage(cap.snapshot, 'JPEG', 14, y, 80, 60);
        } catch (e) { /* ignore */ }
      }

      // Metric table (right of snapshot)
      doc.setFontSize(8); doc.setFont(undefined, 'bold');
      doc.setFillColor(241, 245, 249);
      doc.rect(98, y, 100, 6, 'F');
      doc.text('Parameter', 100, y + 4);
      doc.text('Value', 144, y + 4);
      doc.text('Ideal', 162, y + 4);
      doc.text('Status', 184, y + 4);
      doc.setFont(undefined, 'normal');
      let ty = y + 10;
      ph.metrics.forEach(mt => {
        const val = cap?.metrics?.[mt.id];
        const s = statusOf(val, mt.ideal);
        doc.setTextColor(40, 40, 40);
        doc.text(mt.label.length > 28 ? mt.label.slice(0, 27) + '…' : mt.label, 100, ty);
        doc.text(val !== undefined ? `${val}${mt.unit}` : '—', 144, ty);
        doc.text(`${mt.ideal[0]}-${mt.ideal[1]}${mt.unit}`, 162, ty);
        if (s.status === 'optimal') doc.setTextColor(22, 163, 74);
        else if (s.status === 'minor') doc.setTextColor(245, 158, 11);
        else if (s.status === 'major') doc.setTextColor(220, 38, 38);
        else doc.setTextColor(148, 163, 184);
        doc.text(s.label, 184, ty);
        ty += 4.8;
      });
      doc.setTextColor(20, 20, 20);

      // Likely causes for non-optimal metrics
      const issues = ph.metrics.filter(mt => {
        const val = cap?.metrics?.[mt.id];
        const s = statusOf(val, mt.ideal).status;
        return s === 'minor' || s === 'major';
      });
      let endY = Math.max(ty, y + 64);
      if (issues.length > 0) {
        if (endY > 250) { doc.addPage(); endY = 14; }
        doc.setFontSize(8); doc.setFont(undefined, 'bold');
        doc.setTextColor(120, 53, 15);
        doc.text('Likely cause of deviation:', 14, endY + 4);
        doc.setFont(undefined, 'normal'); doc.setTextColor(60, 60, 60);
        let cy = endY + 9;
        issues.forEach(mt => {
          if (cy > 280) { doc.addPage(); cy = 14; }
          const txt = doc.splitTextToSize(`• ${mt.label} — ${mt.cause}`, 180);
          doc.text(txt, 16, cy);
          cy += txt.length * 4 + 1;
        });
        endY = cy;
      }
      y = endY + 6;
    });

    // AI page
    if (aiText) {
      doc.addPage();
      doc.setFillColor(234, 88, 12);
      doc.rect(0, 0, 210, 14, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(13);
      doc.text('AI Biomechanical Coaching · GPT-5.2', 14, 10);
      doc.setTextColor(20, 20, 20); doc.setFontSize(10);
      const lines = doc.splitTextToSize(aiText, 180);
      doc.text(lines, 14, 24);
    }

    // Footer
    const pc = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pc; i++) {
      doc.setPage(i);
      doc.setFontSize(7); doc.setTextColor(150, 150, 150);
      doc.text(`WBA99 Bio-Analytics · Cricket ${cfg.label} · ${playerName || '—'} · Page ${i}/${pc}`, 14, 292);
    }
    doc.save(`WBA99_Cricket_Live_${cfg.label.replace(/\s/g, '_')}_${(playerName || 'Player').replace(/\s+/g, '_')}.pdf`);
  };

  // ─── Save snapshot of session to Firebase ───
  const saveSession = () => setShowModal(true);

  const handleFirebaseSave = async (pid) => {
    if (!user) return;
    setSavingReport(true);
    try {
      const sc = computeScore();
      await addDoc(collection(firebaseDB, 'assessments'), {
        patientId: pid,
        physioId: user.uid,
        toolType: 'cricket-live',
        data: {
          playerType: role,
          playerLabel: cfg.label,
          view,
          dominant,
          score: sc.score,
          optimal: sc.opt,
          minor: sc.min,
          major: sc.maj,
          phasesCapured: Object.keys(phaseCaptures).length,
          phases: Object.entries(phaseCaptures).reduce((acc, [k, v]) => ({ ...acc, [k]: v.metrics }), {}),
          aiCoachText: aiText || '',
          notes: `Cricket · ${cfg.label} · View: ${view} · Score ${sc.score}/10 · Phases: ${Object.keys(phaseCaptures).join(', ')}`,
        },
        createdAt: serverTimestamp(),
      });
      setShowModal(false);
      toast.success('Report saved');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save report');
    } finally {
      setSavingReport(false);
    }
  };

  const sc = computeScore();

  // ─── UI ───
  return (
    <div className="rounded-xl overflow-hidden border border-border bg-background text-text" data-testid="cricket-live-pose-root">

      {/* Top bar — controls */}
      <div className="px-4 py-3 border-b border-border bg-background">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-base font-bold text-text tracking-wide">
            CRICKET LIVE POSE · {cfg.label.toUpperCase()}
          </div>
          <div className="ml-auto flex flex-wrap gap-2 items-center">
            {/* Role */}
            <div className="flex gap-1">
              {Object.entries(BENCH).map(([k, c]) => (
                <button
                  key={k}
                  onClick={() => { setRole(k); setPhaseCaptures({}); detectorRef.current = { fired: new Set(), history: [], lastFireT: 0 }; setAutoEvents([]); }}
                  className="px-2.5 py-1 rounded text-[10px] font-bold transition border"
                  style={role === k
                    ? { background: c.color, color: '#fff', borderColor: c.color }
                    : { background: 'transparent', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
                  data-testid={`cricket-live-role-${k}`}
                >
                  {ROLE_ICONS[k]} {c.label}
                </button>
              ))}
            </div>
            {/* View */}
            <div className="flex gap-1 ml-2">
              {['Front', 'Side', 'Rear'].map(vv => (
                <button
                  key={vv}
                  onClick={() => setView(vv)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold border ${view === vv ? 'bg-primary text-white border-primary' : 'bg-transparent text-text-muted border-border'}`}
                  data-testid={`cricket-live-view-${vv.toLowerCase()}`}
                >
                  <Eye size={10} className="inline mr-1" />{vv}
                </button>
              ))}
            </div>
            {/* Dominant */}
            <button onClick={() => setDominant(d => d === 'right' ? 'left' : 'right')} className="px-2.5 py-1 rounded text-[10px] font-bold border border-violet-400/40 text-violet-400 bg-transparent hover:bg-violet-400/10 transition" data-testid="cricket-live-dominant">
              <RotateCw size={10} className="inline mr-1" />{dominant === 'right' ? 'RHB / R-arm' : 'LHB / L-arm'}
            </button>
            {/* Auto-capture toggle */}
            <button
              onClick={() => { setAutoCapture(a => !a); resetAuto(); }}
              className={`px-2.5 py-1 rounded text-[10px] font-bold border ${autoCapture ? 'bg-pink-500 text-white border-pink-500' : 'bg-transparent text-pink-500 border-pink-500/50'}`}
              data-testid="cricket-live-auto-toggle"
            >
              <Sparkles size={10} className="inline mr-1" />AUTO {autoCapture ? 'ON' : 'OFF'}
            </button>
            {/* AI Confirm toggle (only meaningful when AUTO is on) */}
            <button
              onClick={() => setAiConfirm(c => !c)}
              disabled={!autoCapture}
              className={`px-2.5 py-1 rounded text-[10px] font-bold disabled:opacity-40 border ${aiConfirm ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-transparent text-emerald-500 border-emerald-500/50'}`}
              data-testid="cricket-live-ai-confirm-toggle"
              title={autoCapture ? 'Use GPT-5.2 vision to verify each auto-captured phase' : 'Enable AUTO to use AI Confirm'}
            >
              <CheckCircle size={10} className="inline mr-1" />AI CONFIRM {aiConfirm ? 'ON' : 'OFF'}
            </button>
            {/* Status pill */}
            {status === 'playing' && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-400/15 border border-emerald-400/40 text-emerald-400">● {fps} FPS</span>}
            {status === 'loading' && <span className="px-2 py-0.5 rounded text-[10px] bg-amber-400/15 text-amber-400"><Loader2 size={10} className="inline animate-spin mr-1" />LOADING</span>}
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
        {/* Video panel */}
        <div className="lg:col-span-2 relative bg-black" style={{ minHeight: 420 }}>
          <video ref={videoRef} className="hidden" playsInline muted />
          <canvas ref={canvasRef} className="w-full h-auto" style={{ display: 'block', minHeight: 420 }} data-testid="cricket-live-canvas" />

          {!source && status !== 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/92">
              <Target size={42} className="mb-3 text-primary" />
              <div className="text-base font-bold mb-1 text-white tracking-wide">
                READY · CRICKET POSE DETECTION
              </div>
              <div className="text-xs mb-4 text-white/50">
                Capture {cfg.label.toLowerCase()} biomechanics from {view.toLowerCase()} view
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <label className="px-5 py-3 rounded-lg font-bold cursor-pointer flex items-center gap-2 shadow-lg bg-primary text-white hover:bg-primary/90 transition" data-testid="cricket-live-upload-label">
                  <input type="file" accept="video/*" className="sr-only" onChange={onFile} data-testid="cricket-live-upload-input" />
                  <Upload size={16} /> UPLOAD VIDEO
                </label>
                <button onClick={startCamera} className="px-5 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg bg-primary/10 border border-primary/40 text-primary hover:bg-primary/20 transition" data-testid="cricket-live-camera-btn">
                  <Camera size={16} /> LIVE CAMERA
                </button>
              </div>
            </div>
          )}

          {status === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/92">
              <Loader2 size={48} className="animate-spin mb-3 text-primary" />
              <p className="text-sm text-white font-bold">LOADING POSE AI…</p>
            </div>
          )}

          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/92">
              <AlertTriangle size={40} className="mb-3 text-red-500" />
              <p className="text-sm mb-2 text-red-500 font-bold">ERROR</p>
              <p className="text-xs max-w-md text-white/70">{error}</p>
              <button onClick={() => { setError(null); setStatus('idle'); }} className="mt-4 px-4 py-2 rounded text-xs font-bold bg-primary/10 border border-primary/40 text-primary hover:bg-primary/20 transition">
                <RefreshCcw size={12} className="inline mr-1" /> Retry
              </button>
            </div>
          )}

          {/* Floating controls */}
          {(status === 'playing' || status === 'paused' || status === 'done') && (
            <div className="absolute top-2 right-2 flex gap-1.5 flex-wrap justify-end">
              {source?.type === 'file' && (
                <button onClick={togglePause} className="px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 bg-black/75 border border-primary/40 text-primary" data-testid="cricket-live-pause-btn">
                  {status === 'paused' ? <Play size={11} /> : <Pause size={11} />}
                  {status === 'paused' ? 'PLAY' : 'PAUSE'}
                </button>
              )}
              <button onClick={requestAI} disabled={Object.keys(phaseCaptures).length === 0} className="px-3 py-1.5 rounded-lg text-[10px] font-bold disabled:opacity-40 bg-violet-400/20 border border-violet-400/40 text-violet-400" data-testid="cricket-live-ai-btn">
                <Sparkles size={11} className="inline mr-1" /> AI COACH
              </button>
              <button onClick={exportPDF} disabled={Object.keys(phaseCaptures).length === 0} className="px-3 py-1.5 rounded-lg text-[10px] font-bold disabled:opacity-40 bg-amber-400/15 border border-amber-400/40 text-amber-400" data-testid="cricket-live-pdf-btn">
                <Download size={11} className="inline mr-1" /> PDF
              </button>
              <button onClick={stop} className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-red-500/15 border border-red-500/40 text-red-400" data-testid="cricket-live-stop-btn">
                <Square size={11} className="inline mr-1" /> STOP
              </button>
            </div>
          )}

          {source?.type === 'file' && status !== 'idle' && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/50">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>

        {/* Sidebar — Phase capture & live metrics */}
        <div className="lg:col-span-1 p-3 space-y-3 max-h-[680px] overflow-y-auto bg-surface border-l border-border">
          {/* Score */}
          <div className="rounded-lg p-3 text-center bg-input border-2" style={{ borderColor: cfg.color }}>
            <div className="text-[9px] font-bold tracking-wider font-mono text-text-muted/60">OVERALL SCORE</div>
            <div className="text-3xl font-black mt-0.5" style={{ color: cfg.color }}>{sc.score}<span className="text-sm text-text-muted/60">/10</span></div>
            <div className="flex justify-center gap-2 mt-1 text-[9px] font-mono">
              <span className="text-emerald-400">● {sc.opt}</span>
              <span className="text-amber-400">● {sc.min}</span>
              <span className="text-red-400">● {sc.maj}</span>
              <span className="text-text-muted/60">N/A {sc.na}</span>
            </div>
          </div>

          {/* Auto-capture banner */}
          {autoCapture && (
            <div className="rounded-lg p-2.5 border border-pink-500/30 bg-pink-500/5" data-testid="cricket-live-auto-banner">
              <div className="text-[9px] font-bold tracking-wider mb-1 text-pink-500 font-mono">
                ✨ AUTO-CAPTURE ACTIVE · {detectorRef.current.fired.size}/{cfg.phases.length}
              </div>
              <div className="text-[10px] text-text-muted">
                Phases will snap automatically as motion patterns are detected. Tap any phase below to override.
              </div>
              {autoEvents.length > 0 && (
                <div className="mt-2 space-y-0.5 max-h-24 overflow-y-auto" data-testid="cricket-live-auto-events">
                  {autoEvents.slice().reverse().map((ev, i) => {
                    const isLatest = i === 0;
                    const verdictCls = ev.verdict === 'YES' ? 'text-emerald-500' : ev.verdict === 'NO' ? 'text-red-400' : ev.verdict === 'UNSURE' ? 'text-amber-400' : ev.verdict === 'verifying' ? 'text-emerald-500' : isLatest ? 'text-white' : 'text-text-muted/60';
                    return (
                      <div key={i} className={`flex items-center justify-between text-[10px] ${verdictCls}`}>
                        <span className="truncate" title={ev.reason || ''}>
                          {ev.verdict === 'verifying' ? '◐' : ev.verdict === 'NO' ? '✗' : '✓'} {ev.phase}
                          {ev.verdict && ev.verdict !== 'auto' && <span className="ml-1 text-[8px] opacity-70">[{ev.verdict}]</span>}
                        </span>
                        <span className="font-mono opacity-70">
                          {Math.max(0, Math.round((Date.now() - ev.at) / 1000))}s ago
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              <button onClick={resetAuto} className="mt-2 w-full py-1 rounded text-[10px] font-bold bg-red-500/10 border border-red-500/30 text-red-400" data-testid="cricket-live-auto-reset">
                RESET DETECTOR
              </button>
            </div>
          )}

          {/* Phase capture buttons */}
          <div>
            <div className="text-[9px] font-bold tracking-wider mb-2 font-mono text-text-muted/60">
              PHASE CAPTURE · {Object.keys(phaseCaptures).length}/{cfg.phases.length}
            </div>
            {cfg.phases.map((ph, idx) => {
              const cap = phaseCaptures[ph.name];
              const phaseScores = ph.metrics.map(mt => statusOf(cap?.metrics?.[mt.id], mt.ideal).status);
              const optCount = phaseScores.filter(s => s === 'optimal').length;
              const measured = phaseScores.filter(s => s !== 'none').length;
              return (
                <div key={ph.name} className="mb-2 rounded-md bg-input border" style={{ borderColor: cap ? cfg.color : 'var(--color-border)', borderWidth: cap ? '1.5px' : '1px' }} data-testid={`cricket-live-phase-${ph.name.toLowerCase()}`}>
                  <div className="p-2 flex items-center gap-2">
                    <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold" style={{ background: cap ? cfg.color : 'var(--color-border)', color: cap ? '#fff' : 'var(--color-text-muted)' }}>{idx + 1}</div>
                    <div className="flex-1">
                      <div className="text-[11px] font-bold text-text">{ph.name}</div>
                      <div className="text-[9px] font-mono text-text-muted/60">
                        {cap ? `${optCount}/${measured} optimal · ${ph.metrics.length} params` : `${ph.metrics.length} params to capture`}
                        {cap?.auto && <span className="ml-1.5 px-1 rounded text-[8px] bg-pink-500/20 text-pink-500">AUTO</span>}
                        {cap?.pending && <span className="ml-1 px-1 rounded text-[8px] animate-pulse bg-emerald-500/20 text-emerald-500">VERIFYING…</span>}
                        {cap?.aiVerdict === 'YES' && <span className="ml-1 px-1 rounded text-[8px] bg-emerald-500/20 text-emerald-500">✓ AI</span>}
                        {cap?.aiVerdict === 'UNSURE' && <span className="ml-1 px-1 rounded text-[8px] bg-amber-500/20 text-amber-400">? AI</span>}
                        {pendingConfirm[ph.name] === 'rejected' && <span className="ml-1 px-1 rounded text-[8px] bg-red-500/20 text-red-400">✗ REJECTED · RETRY</span>}
                      </div>
                    </div>
                    {cap && (
                      <button onClick={() => clearPhase(ph.name)} className="p-1 rounded hover:bg-red-500/20" data-testid={`cricket-live-clear-${ph.name.toLowerCase()}`}>
                        <Trash2 size={11} className="text-red-400" />
                      </button>
                    )}
                    <button
                      onClick={() => capturePhase(ph.name)}
                      disabled={status !== 'playing' && status !== 'paused'}
                      className="px-2 py-1 rounded text-[10px] font-bold disabled:opacity-30 border"
                      style={{ background: cap ? 'var(--color-primary-subtle)' : cfg.color, color: cap ? 'var(--color-primary)' : '#fff', borderColor: cap ? 'var(--color-primary)' : cfg.color }}
                      data-testid={`cricket-live-capture-${ph.name.toLowerCase()}`}
                    >
                      {cap ? 'RECAPTURE' : 'CAPTURE'}
                    </button>
                  </div>
                  {cap && (
                    <div className="px-2 pb-2">
                      {cap.snapshot && <img src={cap.snapshot} alt={ph.name} className="rounded mb-2 w-full" style={{ maxHeight: 90, objectFit: 'cover' }} />}
                      <div className="space-y-0.5">
                        {ph.metrics.map(mt => {
                          const val = cap.metrics?.[mt.id];
                          const s = statusOf(val, mt.ideal);
                          return (
                            <div key={mt.id} className="flex items-center justify-between text-[10px] gap-2">
                              <span className="text-text-muted truncate flex-1">{mt.label}</span>
                              <span className="font-mono" style={{ color: s.color }}>
                                {val !== undefined ? `${val}${mt.unit}` : '—'}
                              </span>
                              <span className="text-[8px] px-1 rounded font-mono" style={{ background: s.color + '25', color: s.color, minWidth: 36, textAlign: 'center' }}>{s.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Live metrics summary */}
          <div>
            <div className="text-[9px] font-bold tracking-wider mb-1 font-mono text-text-muted/60">LIVE METRICS</div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'front_knee_impact', label: 'Front knee', unit: '°' },
                { id: 'trunk_lean', label: 'Trunk lean', unit: '°' },
                { id: 'hip_shoulder_sep', label: 'Hip-Sh sep', unit: '°' },
                { id: 'feet_width', label: 'Feet width', unit: 'cm' },
                { id: 'top_elbow_flex', label: 'Top elbow', unit: '°' },
                { id: role === 'batsman' ? 'head_tilt' : 'arm_angle_release', label: role === 'batsman' ? 'Head tilt' : 'Arm angle', unit: '°' },
              ].map(m => (
                <div key={m.id} className="rounded p-1.5 bg-input border border-border">
                  <div className="text-[8px] text-text-muted/60">{m.label}</div>
                  <div className={`text-sm font-black ${liveMetrics[m.id] !== undefined ? 'text-emerald-400' : 'text-text-muted/30'}`}>
                    {liveMetrics[m.id] !== undefined ? `${liveMetrics[m.id]}${m.unit}` : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {Object.keys(phaseCaptures).length > 0 && (
            <button onClick={saveSession} disabled={savingReport} className="w-full py-2 rounded text-[10px] font-bold text-white" style={{ background: cfg.color }} data-testid="cricket-live-save-btn">
              {savingReport ? <Loader2 size={11} className="inline animate-spin mr-1" /> : null} Save to Server
            </button>
          )}
        </div>
      </div>

      {/* AI modal */}
      {aiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setAiOpen(false)} data-testid="cricket-live-ai-modal">
          <div className="max-w-2xl w-full max-h-[80vh] overflow-y-auto rounded-xl p-6 bg-surface border-2 border-violet-400/50 text-text" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
              <div>
                <div className="text-base font-bold flex items-center gap-2 text-violet-400">
                  <Sparkles size={16} /> AI BIOMECHANICAL COACHING
                </div>
                <div className="text-[10px] mt-1 font-mono text-text-muted/60">GPT-5.2 · CRICKET {cfg.label.toUpperCase()}</div>
              </div>
              <button onClick={() => setAiOpen(false)} className="text-2xl leading-none text-text-muted hover:text-text">×</button>
            </div>
            {aiLoading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2 size={32} className="animate-spin mb-3 text-violet-400" />
                <p className="text-sm text-text-muted">Analyzing biomechanics…</p>
              </div>
            ) : (
              <div className="text-sm whitespace-pre-wrap leading-relaxed text-text" data-testid="cricket-live-ai-text">
                {aiText}
              </div>
            )}
          </div>
        </div>
      )}

      <PatientSelectSaveModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleFirebaseSave}
        saving={savingReport}
        preselectedPatientId={patientId}
      />
    </div>
  );
}

export function CricketLivePosePage() {
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patientId') ?? undefined;
  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8">
      <CricketLivePose playerName="" patientId={patientId} />
    </div>
  );
}
