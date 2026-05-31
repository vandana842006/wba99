// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsPDF from 'jspdf';
import {
  Camera, Play, Square, Save, Download, RefreshCcw, AlertTriangle, CheckCircle,
  Activity, Target, Zap, Sparkles, Loader2, ChevronRight, Trophy, Gauge, Upload, Mic, MicOff
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
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

// Stub for 3D rigged avatar (requires Three.js + Mixamo model loaded via CDN)
const RiggedAvatar3D = React.forwardRef(function RiggedAvatar3D(_props, ref) {
  React.useImperativeHandle(ref, () => ({ update: () => {} }));
  return (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <span className="font-mono text-[11px] text-primary opacity-60">3D Avatar loading…</span>
    </div>
  );
});

// MediaPipe Pose 33-landmark indices
const LM = {
  NOSE: 0, LEFT_EYE_INNER: 1, LEFT_EYE: 2, LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4, RIGHT_EYE: 5, RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7, RIGHT_EAR: 8, MOUTH_LEFT: 9, MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_PINKY: 17, RIGHT_PINKY: 18,
  LEFT_INDEX: 19, RIGHT_INDEX: 20,
  LEFT_THUMB: 21, RIGHT_THUMB: 22,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
  LEFT_HEEL: 29, RIGHT_HEEL: 30,
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
  [LM.LEFT_ANKLE, LM.LEFT_FOOT_INDEX], [LM.LEFT_ANKLE, LM.LEFT_HEEL], [LM.LEFT_HEEL, LM.LEFT_FOOT_INDEX],
  [LM.RIGHT_ANKLE, LM.RIGHT_FOOT_INDEX], [LM.RIGHT_ANKLE, LM.RIGHT_HEEL], [LM.RIGHT_HEEL, LM.RIGHT_FOOT_INDEX],
  [LM.NOSE, LM.LEFT_EYE], [LM.NOSE, LM.RIGHT_EYE],
  [LM.LEFT_EYE, LM.LEFT_EAR], [LM.RIGHT_EYE, LM.RIGHT_EAR],
];

// Joint angle definitions (3-point angles)
const ANGLE_DEFS = [
  { id: 'L_shoulder', a: LM.LEFT_ELBOW, b: LM.LEFT_SHOULDER, c: LM.LEFT_HIP, label: 'L Shoulder', normal: [0, 180], target: 'flexion', color: '#00e5ff' },
  { id: 'R_shoulder', a: LM.RIGHT_ELBOW, b: LM.RIGHT_SHOULDER, c: LM.RIGHT_HIP, label: 'R Shoulder', normal: [0, 180], target: 'flexion', color: '#00e5ff' },
  { id: 'L_elbow', a: LM.LEFT_SHOULDER, b: LM.LEFT_ELBOW, c: LM.LEFT_WRIST, label: 'L Elbow', normal: [140, 180], target: 'extension', color: '#a78bfa' },
  { id: 'R_elbow', a: LM.RIGHT_SHOULDER, b: LM.RIGHT_ELBOW, c: LM.RIGHT_WRIST, label: 'R Elbow', normal: [140, 180], target: 'extension', color: '#a78bfa' },
  { id: 'L_hip', a: LM.LEFT_SHOULDER, b: LM.LEFT_HIP, c: LM.LEFT_KNEE, label: 'L Hip', normal: [160, 180], target: 'extension', color: '#fbbf24' },
  { id: 'R_hip', a: LM.RIGHT_SHOULDER, b: LM.RIGHT_HIP, c: LM.RIGHT_KNEE, label: 'R Hip', normal: [160, 180], target: 'extension', color: '#fbbf24' },
  { id: 'L_knee', a: LM.LEFT_HIP, b: LM.LEFT_KNEE, c: LM.LEFT_ANKLE, label: 'L Knee', normal: [165, 180], target: 'extension', color: '#22c55e' },
  { id: 'R_knee', a: LM.RIGHT_HIP, b: LM.RIGHT_KNEE, c: LM.RIGHT_ANKLE, label: 'R Knee', normal: [165, 180], target: 'extension', color: '#22c55e' },
  { id: 'L_ankle', a: LM.LEFT_KNEE, b: LM.LEFT_ANKLE, c: LM.LEFT_FOOT_INDEX, label: 'L Ankle', normal: [70, 110], target: 'neutral', color: '#ec4899' },
  { id: 'R_ankle', a: LM.RIGHT_KNEE, b: LM.RIGHT_ANKLE, c: LM.RIGHT_FOOT_INDEX, label: 'R Ankle', normal: [70, 110], target: 'neutral', color: '#ec4899' },
];

const MODES = [
  { id: 'live', label: 'Live Analysis', icon: Activity, desc: 'Full skeleton + 10 joint angles' },
  { id: 'squat', label: 'Squat Counter', icon: Target, desc: 'Auto-count squat reps + AI Voice Coach' },
  { id: 'reach', label: 'Reach Targets', icon: Sparkles, desc: 'Touch targets with hands (60s)' },
  { id: 'gait', label: 'Gait Phase', icon: Zap, desc: 'Detect IC / Stance / Swing' },
  { id: 'video', label: 'Video Upload', icon: Upload, desc: 'Analyze a recorded video file frame-by-frame' },
  { id: 'avatar3d', label: '3D Avatar', icon: Trophy, desc: 'Three.js 3D skeleton mirrors your body' },
  { id: 'avatar3d-rigged', label: '3D Rigged Avatar', icon: Trophy, desc: 'Mixamo-rigged GLTF humanoid driven by your live pose' },
];

// Pro-mode extra analysis modes for analyzing a SUBJECT in front of you (back camera, no mirror)
const PRO_MODES = [
  { id: 'valgus', label: 'Knee Valgus/Varus', icon: Target, desc: 'Frontal-plane knee alignment vs hip-ankle line — detects knock-knee (valgus) / bow-leg (varus)' },
  { id: 'fms-squat', label: 'FMS · Deep Squat', icon: Target, desc: 'Functional Movement Screen — deep squat. Scores hip/knee/ankle depth + trunk position' },
  { id: 'fms-lunge', label: 'FMS · In-Line Lunge', icon: Activity, desc: 'FMS in-line lunge — front-knee tracking + trunk angle' },
  { id: 'walk-front', label: 'Walk · Frontal View', icon: Zap, desc: 'Patient walks TOWARD the camera — stride width, knee adduction, pelvic drop' },
  { id: 'walk-side', label: 'Walk · Sagittal View', icon: Zap, desc: 'Patient walks PARALLEL to the camera — stride length, hip/knee/ankle ROM, gait phase' },
];

// Vector math helpers
const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
const angleAt = (a, b, c) => {
  // angle at b formed by a-b-c, in degrees
  const v1x = a.x - b.x, v1y = a.y - b.y;
  const v2x = c.x - b.x, v2y = c.y - b.y;
  const dot = v1x * v2x + v1y * v2y;
  const m1 = Math.hypot(v1x, v1y), m2 = Math.hypot(v2x, v2y);
  if (m1 < 1e-6 || m2 < 1e-6) return 0;
  let cos = dot / (m1 * m2);
  cos = Math.max(-1, Math.min(1, cos));
  return Math.acos(cos) * 180 / Math.PI;
};

// Frontal-plane knee deviation vs hip-ankle line.
// Frontal-plane knee deviation vs hip-ankle line.
// Returns { offsetPx, normalized, severity, label } where:
//   normalized = signed offset divided by thigh length (positive = valgus / knee INWARD, negative = varus / knee OUTWARD)
function kneeFrontalDeviation(hip, knee, ankle, side /* 'L' or 'R' */) {
  if (!hip || !knee || !ankle) return null;
  const vx = ankle.x - hip.x, vy = ankle.y - hip.y;
  const mag2 = vx * vx + vy * vy;
  if (mag2 < 1e-6) return null;
  const t = ((knee.x - hip.x) * vx + (knee.y - hip.y) * vy) / mag2;
  const px = hip.x + t * vx, py = hip.y + t * vy;
  const offsetPx = knee.x - px; // +ve = knee to the right of line
  // For left leg, valgus = knee moves to the RIGHT (toward midline of body), so + means valgus.
  // For right leg, valgus = knee moves to the LEFT, so we flip the sign.
  const signed = side === 'L' ? offsetPx : -offsetPx;
  const thigh = Math.hypot(hip.x - knee.x, hip.y - knee.y) || 1;
  const normalized = signed / thigh; // dimensionless
  const abs = Math.abs(normalized);
  let severity = 'neutral';
  if (abs < 0.05) severity = 'neutral';
  else if (abs < 0.12) severity = 'mild';
  else if (abs < 0.20) severity = 'moderate';
  else severity = 'severe';
  const label = signed > 0.02 ? 'VALGUS' : (signed < -0.02 ? 'VARUS' : 'NEUTRAL');
  return { offsetPx, normalized, severity, label };
}

// ─── Clinical Consequences Mapper ───
// Maps abnormal biomechanical findings to literature-backed potential
// consequences. Used in the PDF report's "Findings & Consequences" page.
function clinicalConsequences(jointId, status /* 'below' | 'above' */, sev /* 'mild' | 'moderate' | 'severe' */, angleVal) {
  // joint key: e.g. 'L_shoulder', 'R_knee'
  const j = jointId.split('_').slice(1).join('_'); // 'shoulder', 'knee', etc.
  const reduce = (cs) => cs; // placeholder for future severity filtering
  if (j === 'shoulder' && status === 'below') {
    return reduce([
      'Restricted overhead reach — risk of subacromial impingement during ADLs (combing hair, dressing).',
      'Compensatory trunk lean and scapular hiking, accelerating cervico-thoracic strain.',
      'Loss of throwing/lifting power — common after rotator cuff repair or adhesive capsulitis.',
      'Reduced ability to perform occupational tasks (painting, shelving, sports).',
    ]);
  }
  if (j === 'shoulder' && status === 'above') {
    return reduce([
      'Possible glenohumeral hypermobility / multidirectional instability — risk of recurrent subluxation.',
      'Increased anterior labral stress; screen for labral lesions if positive apprehension test.',
    ]);
  }
  if (j === 'elbow' && status === 'below') {
    return reduce([
      'Functional limitation in feeding, hygiene, and reaching pockets.',
      'Risk of post-traumatic stiffness or heterotopic ossification after fracture/surgery.',
      'Compensatory shoulder elevation, leading to upper-trap overuse.',
    ]);
  }
  if (j === 'elbow' && status === 'above') {
    return reduce([
      'Elbow hyperextension — risk of distal biceps strain and posterior impingement.',
    ]);
  }
  if (j === 'hip' && status === 'below') {
    return reduce([
      'Limited hip extension — leads to shortened stride, compensatory lumbar hyperextension during gait (low-back pain risk).',
      'Common after total hip arthroplasty or with hip flexor contracture (Thomas-test positive).',
      'Reduced step-up / stair-climb capacity, falls risk in elderly.',
    ]);
  }
  if (j === 'hip' && status === 'above') {
    return reduce([
      'Femoroacetabular impingement-like presentation; screen FADIR.',
      'Posterior hip capsule laxity — risk of posterior instability in deep flexion postures.',
    ]);
  }
  if (j === 'knee' && status === 'below') {
    return reduce([
      'Knee flexion contracture — gait deviation with quadriceps avoidance pattern, accelerating patellofemoral cartilage stress.',
      'Difficulty with sit-to-stand and stair descent; falls risk.',
      `${sev === 'severe' ? 'Severe loss (≤90°) limits functional squatting, kneeling, and floor-to-stand transitions.' : 'Reduced terminal-knee extension lag — possible quadriceps inhibition.'}`,
      'Post-ACL reconstruction: early flexion deficit predicts arthrofibrosis.',
    ]);
  }
  if (j === 'knee' && status === 'above') {
    return reduce([
      'Genu recurvatum (knee hyperextension) — chronic posterior capsule strain and posterior cruciate stress.',
      'Common in stroke patients with quadriceps weakness — orthotic consideration (ground-reaction-force AFO).',
    ]);
  }
  if (j === 'ankle' && status === 'below') {
    return reduce([
      'Reduced dorsiflexion — increases plantar fascia, Achilles, and posterior tibial loading.',
      'Predisposition to forefoot striking and shin-splint syndrome in runners.',
      'Stair descent and squat depth limitation.',
    ]);
  }
  if (j === 'ankle' && status === 'above') {
    return reduce([
      'Ankle hyperdorsiflexion — possible hypermobility, risk of recurrent ankle sprains.',
    ]);
  }
  return [`${jointId} angle of ${(angleVal || 0).toFixed(1)}° is outside the normal range. Clinical correlation advised.`];
}

function asymmetryConsequences(joint, pct) {
  const jl = joint.toLowerCase();
  const sev = pct >= 20 ? 'NOTABLE' : 'MILD';
  if (jl.includes('knee')) {
    return [
      `${sev} L/R knee ROM difference (${pct.toFixed(1)}%) — gait asymmetry, antalgic limp.`,
      'Risk of contralateral overuse injury (e.g., contralateral patellofemoral pain).',
      'Unilateral quadriceps inhibition — perform single-leg-extension strength test.',
      'Common after ACL/meniscus surgery — extend rehab on the affected side.',
    ];
  }
  if (jl.includes('hip')) {
    return [
      `${pct.toFixed(1)}% bilateral hip ROM asymmetry — pelvic obliquity, leg-length discrepancy probable.`,
      'Trendelenburg gait risk — assess glute-medius strength.',
      'Lumbar scoliosis-like compensations on the longer-stride side.',
    ];
  }
  if (jl.includes('shoulder')) {
    return [
      `Shoulder bilateral ROM difference (${pct.toFixed(1)}%) — dominant-side overuse vs non-dominant restriction.`,
      'Scapular dyskinesia; common with rotator cuff impingement.',
      'Sports performance asymmetry — handicap for overhead athletes.',
    ];
  }
  if (jl.includes('elbow')) {
    return [
      `Elbow bilateral asymmetry (${pct.toFixed(1)}%) — possible post-fracture stiffness on the limited side.`,
      'Functional reach difference — review ADL adaptations.',
    ];
  }
  if (jl.includes('ankle')) {
    return [
      `${pct.toFixed(1)}% bilateral ankle ROM asymmetry — stance-time imbalance, falls risk in older adults.`,
      'Common after lateral ankle sprain — assess single-leg balance.',
    ];
  }
  return [`Bilateral asymmetry of ${pct.toFixed(1)}% — investigate underlying weakness or restriction on the limited side.`];
}

function valgusConsequences(label, sev, side) {
  const sideTxt = side === 'L' ? 'Left' : 'Right';
  if (label === 'VALGUS') {
    return [
      `${sideTxt} knee valgus (knock-knee pattern) — ↑ patellofemoral joint compression and medial-collateral-ligament tensile load.`,
      'Anterior cruciate ligament (ACL) injury risk increased 4-6× in athletes with dynamic valgus during cutting/landing tasks (Hewett et al.).',
      'Iliotibial band tightness and lateral hip-abductor weakness commonly co-present.',
      `${sev === 'severe' ? 'Severe valgus' : 'Dynamic valgus'} — refer for video-gait analysis; prescribe hip-abductor / external-rotator strengthening (clam-shells, monster walks, single-leg squat retraining).`,
      'In paediatric/adolescent patients with persistent valgus, screen for pes planus, femoral anteversion, or skeletal alignment issues.',
    ];
  }
  return [
    `${sideTxt} knee varus (bow-leg pattern) — ↑ medial-tibiofemoral compartment load, accelerated medial knee OA risk.`,
    'Lateral collateral ligament tensile stress; common in long-standing runners and football players.',
    'Often accompanied by gluteus-maximus weakness and IT-band overuse.',
    `${sev === 'severe' ? 'Severe varus may benefit from unloader brace consultation; consider orthopedic referral.' : 'Mild varus — strengthen quadriceps, hip-abductors, and prescribe lateral-wedge insole trial.'}`,
  ];
}




// canvas is the main (mirrored) live-pose canvas. pa/pb/pc are the 3 landmark
// points in canvas pixel space (un-mirrored). w/h are the canvas dimensions.
// Returns a data URL of a 320×320 JPEG with the joint centered, parent+child
// limbs visible, and an angle annotation badge.
function buildJointCrop(canvas, def, pa, pb, pc, angleVal, w, h, mirror = true) {
  if (!canvas) throw new Error('no canvas');
  // When mirrored, screen-x = w - landmark.x. When NOT mirrored (back camera), screen-x = landmark.x.
  const sx = (p) => (mirror ? (w - p.x) : p.x);
  const ax = sx(pa), ay = pa.y;
  const bx = sx(pb), by = pb.y;
  const cx = sx(pc), cy = pc.y;
  // Bounding radius: maximum limb length, padded ~50%
  const r1 = Math.hypot(ax - bx, ay - by);
  const r2 = Math.hypot(cx - bx, cy - by);
  const rPad = Math.max(r1, r2) * 1.5;
  // Square crop centered on joint b
  const half = Math.max(120, Math.min(rPad, 320));
  let cropX = Math.max(0, Math.min(w - 2 * half, bx - half));
  let cropY = Math.max(0, Math.min(h - 2 * half, by - half));
  let cropW = Math.min(2 * half, w - cropX);
  let cropH = Math.min(2 * half, h - cropY);
  // Output canvas: 320×320
  const OUT = 320;
  const out = document.createElement('canvas');
  out.width = OUT; out.height = OUT;
  const octx = out.getContext('2d');
  // Letterbox-fill the crop to OUT
  octx.fillStyle = '#06070d';
  octx.fillRect(0, 0, OUT, OUT);
  octx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, OUT, OUT);
  // Map landmark canvas coords -> output coords
  const map = (xp, yp) => ({
    x: ((xp - cropX) / cropW) * OUT,
    y: ((yp - cropY) / cropH) * OUT,
  });
  const A = map(ax, ay), B = map(bx, by), C = map(cx, cy);
  // Subtle vignette
  const grad = octx.createRadialGradient(B.x, B.y, OUT * 0.15, B.x, B.y, OUT * 0.7);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.55)');
  octx.fillStyle = grad;
  octx.fillRect(0, 0, OUT, OUT);
  // Redraw the joint limbs on top for clarity (in case original strokes are thin in crop)
  octx.save();
  octx.strokeStyle = def.color || '#00e5ff';
  octx.lineWidth = 4;
  octx.shadowColor = def.color || '#00e5ff';
  octx.shadowBlur = 10;
  octx.beginPath();
  octx.moveTo(A.x, A.y); octx.lineTo(B.x, B.y); octx.lineTo(C.x, C.y);
  octx.stroke();
  octx.shadowBlur = 0;
  // Landmark dots
  for (const p of [A, B, C]) {
    octx.fillStyle = '#0c0d12';
    octx.beginPath(); octx.arc(p.x, p.y, 7, 0, Math.PI * 2); octx.fill();
    octx.fillStyle = def.color || '#00e5ff';
    octx.beginPath(); octx.arc(p.x, p.y, 4, 0, Math.PI * 2); octx.fill();
  }
  // Joint focus circle on B
  octx.strokeStyle = def.color || '#00e5ff';
  octx.lineWidth = 2.5;
  octx.beginPath(); octx.arc(B.x, B.y, 16, 0, Math.PI * 2); octx.stroke();
  // Angle arc between BA and BC
  const ang1 = Math.atan2(A.y - B.y, A.x - B.x);
  const ang2 = Math.atan2(C.y - B.y, C.x - B.x);
  // Draw inner arc indicating the measured angle
  octx.strokeStyle = `${def.color || '#00e5ff'}cc`;
  octx.lineWidth = 3;
  const arcR = 28;
  // Determine sweep direction so we draw the smaller (measured) arc
  let start = ang1, end = ang2;
  let span = end - start;
  while (span <= -Math.PI) span += 2 * Math.PI;
  while (span > Math.PI) span -= 2 * Math.PI;
  octx.beginPath(); octx.arc(B.x, B.y, arcR, start, start + span, span < 0); octx.stroke();
  octx.restore();
  // Top label band
  octx.fillStyle = 'rgba(6,7,13,0.85)';
  octx.fillRect(0, 0, OUT, 36);
  octx.fillStyle = def.color || '#00e5ff';
  octx.font = '700 14px "Share Tech Mono", monospace';
  octx.fillText((def.label || '').toUpperCase(), 10, 23);
  octx.fillStyle = '#ffffff';
  octx.font = '900 18px "Orbitron", "Share Tech Mono", monospace';
  const angTxt = `${angleVal.toFixed(1)}°`;
  const tw = octx.measureText(angTxt).width;
  octx.fillText(angTxt, OUT - tw - 10, 25);
  // Bottom hint band with normal range
  const [lo, hi] = def.normal || [0, 180];
  const inRange = angleVal >= lo && angleVal <= hi;
  octx.fillStyle = 'rgba(6,7,13,0.85)';
  octx.fillRect(0, OUT - 22, OUT, 22);
  octx.fillStyle = '#a0b0c8';
  octx.font = '600 10px "Share Tech Mono", monospace';
  octx.fillText(`NORMAL ${lo}-${hi}°`, 10, OUT - 7);
  octx.fillStyle = inRange ? '#00ff88' : '#ffcc00';
  octx.font = '700 10px "Share Tech Mono", monospace';
  const status = inRange ? '✓ IN RANGE' : (angleVal < lo ? '↓ BELOW' : '↑ ABOVE');
  const sw = octx.measureText(status).width;
  octx.fillText(status, OUT - sw - 10, OUT - 7);
  return out.toDataURL('image/jpeg', 0.72);
}

// Posture score: avg deviation from normal range per joint
function computePostureScore(angles) {
  let total = 0, count = 0;
  for (const def of ANGLE_DEFS) {
    const v = angles[def.id];
    if (v == null) continue;
    const [lo, hi] = def.normal;
    let dev = 0;
    if (v < lo) dev = lo - v;
    else if (v > hi) dev = v - hi;
    // Convert deviation to a 0-100 contribution (max acceptable deviation ~30deg)
    total += Math.max(0, 100 - (dev / 30) * 100);
    count++;
  }
  return count > 0 ? total / count : 0;
}

// Symmetry score: 100 - mean |L-R| diff across paired angles
function computeSymmetry(angles) {
  const pairs = [['L_shoulder', 'R_shoulder'], ['L_elbow', 'R_elbow'], ['L_hip', 'R_hip'], ['L_knee', 'R_knee'], ['L_ankle', 'R_ankle']];
  let total = 0, n = 0;
  for (const [l, r] of pairs) {
    if (angles[l] != null && angles[r] != null) {
      total += Math.abs(angles[l] - angles[r]);
      n++;
    }
  }
  if (n === 0) return 0;
  const meanDiff = total / n;
  return Math.max(0, 100 - meanDiff * 2); // 50deg diff → 0 score
}

export function LivePoseAnalysis({ proMode = false } = {}) {
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patientId') ?? undefined;
  const [status, setStatus] = useState('idle'); // idle | loading-model | ready | running | error
  const [error, setError] = useState(null);
  const [fps, setFps] = useState(0);
  const [mode, setMode] = useState(proMode ? 'walk-front' : 'live');
  const [cameraFacing, setCameraFacing] = useState(proMode ? 'environment' : 'user');
  const mirrorCanvas = cameraFacing === 'user'; // mirror only when self-facing front camera
  const [valgusData, setValgusData] = useState({ L: null, R: null });
  const [angles, setAngles] = useState({});
  const [postureScore, setPostureScore] = useState(0);
  const [symmetryScore, setSymmetryScore] = useState(0);
  const [reps, setReps] = useState(0);
  const [reachScore, setReachScore] = useState(0);
  const [reachTimer, setReachTimer] = useState(60);
  const [gaitPhase, setGaitPhase] = useState('Stance');
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [notes, setNotes] = useState('');
  const [voiceCoachOn, setVoiceCoachOn] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [videoProcessing, setVideoProcessing] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [yoloEnabled, setYoloEnabled] = useState(false);
  const [yoloPersons, setYoloPersons] = useState(0);
  const [proEngine, setProEngine] = useState('free'); // free | yolov8-pose | mediapipe-holistic | blazepose | sam2 | depth
  const [proStatus, setProStatus] = useState({ available: false, lastError: null });
  const [proResult, setProResult] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [maxSnapshots, setMaxSnapshots] = useState({}); // {jointId: {angle, dataUrl, t}}
  const [previousMaxes, setPreviousMaxes] = useState({}); // {jointId: prevMaxAngle} from last session
  const [improvements, setImprovements] = useState({}); // {jointId: deltaDeg}
  const [user, setUser] = useState(null);
  const { user: authUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [savedPatientName, setSavedPatientName] = useState('');

  // ─── ROM Voice Coach state ───
  const [romVoiceOn, setRomVoiceOn] = useState(false);
  const [romTrackedJoints, setRomTrackedJoints] = useState(() => new Set()); // joint ids selected for audio feedback
  const [romVoice, setRomVoice] = useState('nova'); // nova | onyx | alloy | echo | shimmer
  const [romLastAnnounced, setRomLastAnnounced] = useState({}); // {jointId: angle} for UI display

  // Refs (mutable, no re-render)
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const landmarkerRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const lastFrameTs = useRef(performance.now());
  const fpsBuf = useRef([]);
  const squatState = useRef({ phase: 'standing', count: 0, lastCoachAt: 0, depthAtBottom: 180 });
  const reachState = useRef({ target: null, score: 0, deadline: 0 });
  const gaitState = useRef({ lastAnkleY: { L: 0, R: 0 }, phase: 'Stance', samples: [] });
  const sessionStart = useRef(0);
  const recordedAngles = useRef([]);
  const recordedFlags = useRef([]);
  const threeRef = useRef({ scene: null, camera: null, renderer: null, bones: {}, mount: null });
  const threeMountRef = useRef(null);
  const riggedAvatarRef = useRef(null);
  const yoloFrameRef = useRef(0);
  const yoloBusyRef = useRef(false);

  // ROM voice coach refs (mutable — used inside RAF tick loop, must not trigger re-render)
  const romAnnouncedMaxRef = useRef({}); // {jointId: lastAnnouncedAngle}
  const romPerJointCooldownRef = useRef({}); // {jointId: timestampMs}
  const romGlobalCooldownRef = useRef(0); // timestampMs — global anti-spam gate
  const romPlayingRef = useRef(false); // true while an MP3 is actively playing
  const romAudioCacheRef = useRef({}); // {textKey: dataUrl} — speeds up repeated phrases
  const romTrackedRef = useRef(new Set()); // mirror of state for use in RAF
  const romVoiceOnRef = useRef(false); // mirror of state for use in RAF
  const romVoiceRef = useRef('nova');
  const romHistoryRef = useRef([]); // [{jointId, label, angle, prevMax, delta, tMs}] full announcement log for PDF
  const maxSnapshotsRef = useRef({}); // mirror of maxSnapshots state for use in RAF tick

  const token = localStorage.getItem('wba99_token');
  const headers = { Authorization: `Bearer ${token}` };

  // ─── Load history, patients, user, Pro Engine status, last session for improvement comparison ───
  useEffect(() => {
    axios.get(`${API}/api/live-pose-sessions`, { headers, withCredentials: true })
      .then(r => setHistory(r.data || []))
      .catch(() => {});
    axios.get(`${API}/api/yolo/status`).then(r => setProStatus({ available: r.data?.fal_configured, lastError: null })).catch(() => {});
    axios.get(`${API}/api/auth/me`, { headers, withCredentials: true }).then(r => setUser(r.data)).catch(() => {});
    axios.get(`${API}/api/patients`, { headers, withCredentials: true }).then(r => setPatients(r.data || [])).catch(() => {});
  }, []);

  // When patient changes, fetch their last session to seed previousMaxes for improvement display
  useEffect(() => {
    if (!selectedPatient) { setPreviousMaxes({}); setImprovements({}); return; }
    axios.get(`${API}/api/live-pose-sessions?patient_id=${selectedPatient}`, { headers, withCredentials: true })
      .then(r => {
        const list = r.data || [];
        if (list.length === 0) { setPreviousMaxes({}); return; }
        const last = list[0]; // sorted desc by created_at
        // Reconstruct max-per-joint from last session's angles_history
        const maxes = {};
        for (const sample of (last.angles_history || [])) {
          for (const [k, v] of Object.entries(sample.angles || {})) {
            if (typeof v === 'number') maxes[k] = Math.max(maxes[k] || 0, v);
          }
        }
        setPreviousMaxes(maxes);
      })
      .catch(() => setPreviousMaxes({}));
  }, [selectedPatient]);

  // ─── Load MediaPipe model from CDN ───
  const loadModel = useCallback(async () => {
    setStatus('loading-model');
    setError(null);
    try {
      // Dynamic import via CDN — avoids npm bundler complexity
      const visionModule = await import(/* webpackIgnore: true */ 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs');
      const { FilesetResolver, PoseLandmarker } = visionModule;
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );
      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      landmarkerRef.current = landmarker;
      setStatus('ready');
    } catch (e) {
      console.error('Model load failed', e);
      setError(`Failed to load AI model. ${e.message || e}`);
      setStatus('error');
    }
  }, []);

  // ─── Start camera ───
  const startCamera = useCallback(async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera not supported in this browser. Use Chrome or Edge.');
      }
      // Try environment (back) camera first on mobile, fallback to front
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: cameraFacing },
          audio: false,
        });
      } catch (e1) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (!landmarkerRef.current) {
        await loadModel();
      }
      setStatus('running');
      sessionStart.current = performance.now();
      recordedAngles.current = [];
      recordedFlags.current = [];
      squatState.current = { phase: 'standing', count: 0 };
      setReps(0);
      reachState.current = { target: { x: 0.3 + Math.random() * 0.4, y: 0.3 + Math.random() * 0.4 }, score: 0, deadline: performance.now() + 60000 };
      setReachScore(0);
      setReachTimer(60);
      tick();
    } catch (e) {
      console.error('Camera error', e);
      if (e.name === 'NotAllowedError') {
        setError('Camera permission denied. Click the lock icon in your browser address bar → Allow Camera, then click Retry.');
      } else if (e.name === 'NotFoundError') {
        setError('No camera detected. Connect a webcam and try again.');
      } else {
        setError(`Camera error: ${e.message || e.name}`);
      }
      setStatus('error');
    }
  }, [loadModel, cameraFacing]);

  // ─── Stop ───
  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus('ready');
  }, []);

  // ─── Three.js 3D Avatar (humanoid mesh — skin + limbs + head) ───
  const initThree = useCallback(async () => {
    if (threeRef.current.scene || !threeMountRef.current) return;
    const THREE = await import(/* webpackIgnore: true */ 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
    const mount = threeMountRef.current;
    const w = mount.clientWidth || 320;
    const h = mount.clientHeight || 360;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06070d);
    // Add a subtle grid floor for depth perception
    const grid = new THREE.GridHelper(6, 12, 0x143057, 0x0a1830);
    grid.position.y = -1.6;
    scene.add(grid);
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0, 4);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    mount.appendChild(renderer.domElement);
    // Lights — rim + key + fill for soft skin shading
    scene.add(new THREE.AmbientLight(0x303048, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(3, 5, 4); scene.add(key);
    const rim = new THREE.PointLight(0x00e5ff, 1.4, 12);
    rim.position.set(-3, 1, 2); scene.add(rim);
    const fill = new THREE.PointLight(0xff4080, 0.9, 12);
    fill.position.set(3, -2, 3); scene.add(fill);

    // Joint sphere meshes (small markers)
    const jointGeo = new THREE.SphereGeometry(0.06, 16, 16);
    const jointMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x002030, roughness: 0.4, metalness: 0.2 });
    const jointIds = [
      'NOSE','LEFT_SHOULDER','RIGHT_SHOULDER','LEFT_ELBOW','RIGHT_ELBOW','LEFT_WRIST','RIGHT_WRIST',
      'LEFT_HIP','RIGHT_HIP','LEFT_KNEE','RIGHT_KNEE','LEFT_ANKLE','RIGHT_ANKLE'
    ];
    const bones = {};
    for (const id of jointIds) {
      const m = new THREE.Mesh(jointGeo, jointMat.clone());
      bones[id] = m;
      scene.add(m);
    }
    bones.NOSE.visible = false; // head sphere will replace it

    // Skin materials — gradient-like cyan for limbs, warm core for torso
    const limbMat = new THREE.MeshStandardMaterial({
      color: 0x4ea4d6, emissive: 0x002a44, emissiveIntensity: 0.4, roughness: 0.45, metalness: 0.25,
    });
    const torsoMat = new THREE.MeshStandardMaterial({
      color: 0x355a8a, emissive: 0x001a30, emissiveIntensity: 0.3, roughness: 0.5, metalness: 0.2,
    });
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xc9a98e, emissive: 0x301a10, emissiveIntensity: 0.2, roughness: 0.55, metalness: 0.1,
    });

    // Head ellipsoid
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 32), headMat);
    head.scale.set(1, 1.15, 1);
    scene.add(head);

    // Torso mesh — single rounded box that we re-scale/orient per frame
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1, 24, 1, false), torsoMat);
    scene.add(torso);

    // Limb meshes — cylinders we'll orient between two joints
    const limbDefs = [
      // [from, to, radiusTop, radiusBottom]
      ['LEFT_SHOULDER','LEFT_ELBOW', 0.11, 0.10],
      ['LEFT_ELBOW','LEFT_WRIST',    0.10, 0.09],
      ['RIGHT_SHOULDER','RIGHT_ELBOW',0.11, 0.10],
      ['RIGHT_ELBOW','RIGHT_WRIST',  0.10, 0.09],
      ['LEFT_HIP','LEFT_KNEE',       0.15, 0.13],
      ['LEFT_KNEE','LEFT_ANKLE',     0.13, 0.10],
      ['RIGHT_HIP','RIGHT_KNEE',     0.15, 0.13],
      ['RIGHT_KNEE','RIGHT_ANKLE',   0.13, 0.10],
    ];
    const limbs = [];
    for (const [a, b, rt, rb] of limbDefs) {
      // Cylinder height = 1; default oriented along +Y. We'll scale & rotate per frame.
      const g = new THREE.CylinderGeometry(rt, rb, 1, 16, 1, false);
      const m = new THREE.Mesh(g, limbMat.clone());
      scene.add(m);
      limbs.push({ from: a, to: b, mesh: m });
    }

    threeRef.current = {
      scene, camera, renderer, bones, head, torso, limbs, THREE,
      defaultUp: new THREE.Vector3(0, 1, 0),
    };
    const animate = () => {
      requestAnimationFrame(animate);
      if (threeRef.current.renderer) threeRef.current.renderer.render(scene, camera);
    };
    animate();
  }, []);

  const updateThreeAvatar = (lmks) => {
    const t = threeRef.current;
    if (!t.scene || !lmks) return;
    const THREE = t.THREE;
    const get = (i) => lmks[i] ? { x: (lmks[i].x - 0.5) * 3, y: -(lmks[i].y - 0.5) * 3.5, z: -(lmks[i].z || 0) * 2 } : null;
    const map = {
      NOSE: LM.NOSE, LEFT_SHOULDER: LM.LEFT_SHOULDER, RIGHT_SHOULDER: LM.RIGHT_SHOULDER,
      LEFT_ELBOW: LM.LEFT_ELBOW, RIGHT_ELBOW: LM.RIGHT_ELBOW,
      LEFT_WRIST: LM.LEFT_WRIST, RIGHT_WRIST: LM.RIGHT_WRIST,
      LEFT_HIP: LM.LEFT_HIP, RIGHT_HIP: LM.RIGHT_HIP,
      LEFT_KNEE: LM.LEFT_KNEE, RIGHT_KNEE: LM.RIGHT_KNEE,
      LEFT_ANKLE: LM.LEFT_ANKLE, RIGHT_ANKLE: LM.RIGHT_ANKLE,
    };
    for (const [key, idx] of Object.entries(map)) {
      const p = get(idx);
      if (p && t.bones[key]) t.bones[key].position.set(p.x, p.y, p.z);
    }

    // Head — sit just above shoulder-midpoint (offset from NOSE direction)
    const ls = t.bones.LEFT_SHOULDER.position, rs = t.bones.RIGHT_SHOULDER.position;
    const nose = t.bones.NOSE.position;
    if (ls && rs && nose && t.head) {
      const shoulderMid = new THREE.Vector3().addVectors(ls, rs).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(nose, shoulderMid).normalize();
      const headPos = shoulderMid.clone().addScaledVector(dir, 0.35);
      t.head.position.copy(headPos);
    }

    // Torso — cylinder from shoulder-mid to hip-mid
    const lh = t.bones.LEFT_HIP.position, rh = t.bones.RIGHT_HIP.position;
    if (ls && rs && lh && rh && t.torso) {
      const sm = new THREE.Vector3().addVectors(ls, rs).multiplyScalar(0.5);
      const hm = new THREE.Vector3().addVectors(lh, rh).multiplyScalar(0.5);
      orientCylinderBetween(t.torso, sm, hm, THREE, t.defaultUp);
      // Width = shoulder-to-shoulder distance × 0.55 for visual chest width
      const shoulderW = ls.distanceTo(rs);
      const hipW = lh.distanceTo(rh);
      t.torso.scale.x = Math.max(shoulderW * 0.8, 0.4);
      t.torso.scale.z = Math.max(shoulderW * 0.4, 0.2);
    }

    // Limbs
    for (const limb of t.limbs) {
      const a = t.bones[limb.from]?.position;
      const b = t.bones[limb.to]?.position;
      if (a && b) orientCylinderBetween(limb.mesh, a, b, THREE, t.defaultUp);
    }
  };

  // Position+rotate+scale a unit-height cylinder so it spans from p1 → p2
  const orientCylinderBetween = (mesh, p1, p2, THREE, up) => {
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    mesh.position.copy(mid);
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    if (len < 1e-4) return;
    dir.normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
    mesh.quaternion.copy(q);
    mesh.scale.y = len;
  };

  // ─── Video Upload Analysis ───
  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    setVideoProcessing(true);
    setVideoProgress(0);
    try {
      if (!landmarkerRef.current) await loadModel();
      const url = URL.createObjectURL(file);
      const v = videoRef.current;
      v.srcObject = null;
      v.src = url;
      v.muted = true;
      await new Promise((res) => { v.onloadedmetadata = res; });
      const duration = v.duration || 0;
      const fps = 6; // sample at 6 fps for analysis
      const total = Math.max(1, Math.floor(duration * fps));
      const summary = { frames: [], avgPosture: 0, avgSymmetry: 0 };
      // Reuse landmarker in IMAGE mode? Actually VIDEO mode works on HTMLVideoElement.
      let postureSum = 0, symSum = 0, postureN = 0;
      sessionStart.current = performance.now();
      for (let i = 0; i < total; i++) {
        v.currentTime = i / fps;
        await new Promise((res) => { v.onseeked = res; setTimeout(res, 200); });
        try {
          const r = landmarkerRef.current.detectForVideo(v, performance.now());
          if (r?.landmarks?.length > 0) {
            const lm = r.landmarks[0];
            const newAngles = {};
            for (const def of ANGLE_DEFS) {
              if (lm[def.a] && lm[def.b] && lm[def.c]) {
                newAngles[def.id] = angleAt(lm[def.a], lm[def.b], lm[def.c]);
              }
            }
            summary.frames.push({ t: i / fps, angles: newAngles });
            const ps = computePostureScore(newAngles);
            const ss = computeSymmetry(newAngles);
            postureSum += ps; symSum += ss; postureN++;
            setAngles(newAngles);
            setPostureScore(ps);
            setSymmetryScore(ss);
          }
        } catch (err) { /* skip */ }
        setVideoProgress(Math.round(((i + 1) / total) * 100));
      }
      if (postureN > 0) {
        summary.avgPosture = postureSum / postureN;
        summary.avgSymmetry = symSum / postureN;
        setPostureScore(summary.avgPosture);
        setSymmetryScore(summary.avgSymmetry);
      }
      recordedAngles.current = summary.frames.map(f => ({ t: f.t * 1000, angles: f.angles }));
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Video analysis failed', e);
    } finally {
      setVideoProcessing(false);
      const v = videoRef.current; if (v) v.src = '';
    }
  };

  // ─── Multi-person via TF.js MoveNet (FREE, browser-based) ───
  const movenetRef = useRef(null);
  const loadMovenet = useCallback(async () => {
    if (movenetRef.current) return;
    // Load TF.js and pose-detection from CDN
    const loadScript = (src) => new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) return res();
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection@2.1.3/dist/pose-detection.min.js');
      if (!window.poseDetection) throw new Error('pose-detection global not found');
      await window.tf.setBackend('webgl');
      await window.tf.ready();
      movenetRef.current = await window.poseDetection.createDetector(
        window.poseDetection.SupportedModels.MoveNet,
        {
          modelType: window.poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
          enableTracking: true,
          trackerType: window.poseDetection.TrackerType.BoundingBox,
        }
      );
    } catch (e) {
      console.error('MoveNet load failed', e);
      alert('Failed to load multi-person detector: ' + (e.message || e));
      setYoloEnabled(false);
    }
  }, []);

  const runMovenetOnVideo = async () => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c || !movenetRef.current || yoloBusyRef.current) return null;
    yoloBusyRef.current = true;
    try {
      const poses = await movenetRef.current.estimatePoses(v, { maxPoses: 6 });
      setYoloPersons(poses.length);
      return poses;
    } catch (e) {
      console.error('MoveNet error', e);
      return null;
    } finally {
      yoloBusyRef.current = false;
    }
  };

  // Keep fal.ai for paid HQ option (gracefully falls back if no key)
  const callProEngine = async (modelKey) => {
    const v = videoRef.current;
    if (!v || yoloBusyRef.current) return;
    yoloBusyRef.current = true;
    try {
      const tmp = document.createElement('canvas');
      tmp.width = v.videoWidth; tmp.height = v.videoHeight;
      tmp.getContext('2d').drawImage(v, 0, 0);
      const dataUri = tmp.toDataURL('image/jpeg', 0.6);
      const { data } = await axios.post(`${API}/api/ai/pro-engine`, { image_data_uri: dataUri, model: modelKey }, { headers, withCredentials: true });
      setProResult({ model: modelKey, data: data.data });
      const persons = data?.data?.predictions?.length || data?.data?.detections?.length || (data?.data?.landmarks ? 1 : 0);
      setYoloPersons(persons);
      setProStatus(s => ({ ...s, lastError: null }));
    } catch (err) {
      const detail = err.response?.data?.detail;
      const fallbackHint = (typeof detail === 'object' && detail?.fallback === 'free');
      console.warn(`Pro engine [${modelKey}] failed, falling back to free`, detail);
      setProStatus({ available: false, lastError: detail?.reason || detail?.error || err.message });
      // Auto-switch to free engine
      setProEngine('free');
      if (fallbackHint && !movenetRef.current) await loadMovenet();
      setYoloEnabled(true);
    } finally {
      yoloBusyRef.current = false;
    }
  };


  const speak = (text) => {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05; u.pitch = 1.0; u.volume = 1.0;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  // ─── HD TTS via OpenAI (cached) + amplified via Web Audio gain ───
  const romAudioCtxRef = useRef(null);
  const speakHQ = useCallback(async (text) => {
    if (!text || romPlayingRef.current) return;
    const cacheKey = `${romVoiceRef.current}::${text}`;
    try {
      romPlayingRef.current = true;
      let dataUrl = romAudioCacheRef.current[cacheKey];
      if (!dataUrl) {
        const { data } = await axios.post(
          `${API}/api/voice-agent/tts`,
          { text, voice: romVoiceRef.current, model: 'tts-1', speed: 1.05, format: 'mp3' },
          { headers, withCredentials: true }
        );
        if (data?.audio_base64) {
          dataUrl = `data:${data.mime || 'audio/mp3'};base64,${data.audio_base64}`;
          romAudioCacheRef.current[cacheKey] = dataUrl;
        }
      }
      if (!dataUrl) { romPlayingRef.current = false; return; }
      const audio = new Audio(dataUrl);
      audio.volume = 1.0;
      audio.crossOrigin = 'anonymous';
      // Amplify via Web Audio GainNode (browsers allow >1.0 here)
      try {
        if (!romAudioCtxRef.current) {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (Ctx) romAudioCtxRef.current = new Ctx();
        }
        const ctx = romAudioCtxRef.current;
        if (ctx) {
          if (ctx.state === 'suspended') await ctx.resume();
          const src = ctx.createMediaElementSource(audio);
          const gain = ctx.createGain();
          gain.gain.value = 2.5; // ~+8 dB — clearly louder without distortion for clean TTS
          src.connect(gain).connect(ctx.destination);
        }
      } catch (e) { /* AudioContext may already be wired; fall through to normal play */ }
      audio.onended = () => { romPlayingRef.current = false; };
      audio.onerror = () => { romPlayingRef.current = false; };
      await audio.play().catch(() => { romPlayingRef.current = false; });
    } catch (e) {
      console.warn('HQ TTS failed, falling back to Web Speech', e?.message);
      romPlayingRef.current = false;
      speak(text);
    }
  }, []);

  // Decide whether to announce a new max ROM for a tracked joint
  const checkRomAnnounce = useCallback((newAngles, nowMs) => {
    if (!romVoiceOnRef.current) return;
    const tracked = romTrackedRef.current;
    if (!tracked || tracked.size === 0) return;
    if (romPlayingRef.current) return;
    if (nowMs - romGlobalCooldownRef.current < 2500) return; // 2.5s anti-spam

    let bestId = null, bestDelta = 0, bestAngle = 0;
    for (const jointId of tracked) {
      const v = newAngles[jointId];
      if (typeof v !== 'number' || v <= 0 || v >= 200) continue;
      const prevAnnounced = romAnnouncedMaxRef.current[jointId] ?? 0;
      const perCool = romPerJointCooldownRef.current[jointId] || 0;
      if (nowMs - perCool < 4000) continue; // 4s per-joint cooldown
      const delta = v - prevAnnounced;
      if (delta >= 5 && delta > bestDelta) { // need ≥5° gain to announce
        bestId = jointId; bestDelta = delta; bestAngle = v;
      }
    }
    if (!bestId) return;
    const def = ANGLE_DEFS.find(d => d.id === bestId);
    if (!def) return;
    const prevAnnounced = romAnnouncedMaxRef.current[bestId] ?? 0;
    romAnnouncedMaxRef.current[bestId] = bestAngle;
    romPerJointCooldownRef.current[bestId] = nowMs;
    romGlobalCooldownRef.current = nowMs;
    const rounded = Math.round(bestAngle);
    const phrase = `Max ${def.label.replace('L ', 'left ').replace('R ', 'right ')} ${rounded} degrees`;
    setRomLastAnnounced(prev => ({ ...prev, [bestId]: rounded }));
    // Log to history for PDF/save (cap at 200 entries)
    romHistoryRef.current.push({
      jointId: bestId,
      label: def.label,
      angle: bestAngle,
      prevMax: prevAnnounced,
      delta: bestDelta,
      tMs: nowMs - sessionStart.current,
    });
    if (romHistoryRef.current.length > 200) romHistoryRef.current.shift();
    speakHQ(phrase);
  }, [speakHQ]);

  // Keep refs in sync with state (so RAF loop reads fresh values without re-creating tick)
  useEffect(() => { romVoiceOnRef.current = romVoiceOn; }, [romVoiceOn]);
  useEffect(() => { romTrackedRef.current = romTrackedJoints; }, [romTrackedJoints]);
  useEffect(() => { romVoiceRef.current = romVoice; }, [romVoice]);
  useEffect(() => { maxSnapshotsRef.current = maxSnapshots; }, [maxSnapshots]);

  const toggleRomJoint = (jointId) => {
    setRomTrackedJoints(prev => {
      const next = new Set(prev);
      if (next.has(jointId)) next.delete(jointId);
      else next.add(jointId);
      return next;
    });
  };

  const resetRomBaseline = () => {
    romAnnouncedMaxRef.current = {};
    romPerJointCooldownRef.current = {};
    romGlobalCooldownRef.current = 0;
    romHistoryRef.current = [];
    setRomLastAnnounced({});
  };

  const updateSquatCounter = (lmks) => {
    if (!lmks[LM.LEFT_KNEE] || !lmks[LM.RIGHT_KNEE]) return;
    const lk = angleAt(lmks[LM.LEFT_HIP], lmks[LM.LEFT_KNEE], lmks[LM.LEFT_ANKLE]);
    const rk = angleAt(lmks[LM.RIGHT_HIP], lmks[LM.RIGHT_KNEE], lmks[LM.RIGHT_ANKLE]);
    const avg = (lk + rk) / 2;
    const s = squatState.current;
    if (s.phase === 'standing' && avg < 110) {
      s.phase = 'down';
      s.depthAtBottom = avg;
      if (voiceCoachOn) speak('Going down');
    } else if (s.phase === 'down') {
      s.depthAtBottom = Math.min(s.depthAtBottom, avg);
      if (avg > 160) {
        s.phase = 'standing';
        s.count++;
        setReps(s.count);
        if (voiceCoachOn) {
          const depth = s.depthAtBottom;
          let cue = `${s.count}`;
          if (depth > 100) cue += ' — go deeper next time';
          else if (depth < 80) cue += ' — perfect depth';
          else cue += ' — good form';
          // Milestone cheers
          if (s.count % 5 === 0) cue += `. ${s.count} reps, great work!`;
          speak(cue);
        }
        s.depthAtBottom = 180;
      }
    }
  };

  const updateReachGame = (lmks) => {
    const r = reachState.current;
    if (!r.target) return;
    const tLeft = (r.deadline - performance.now()) / 1000;
    setReachTimer(Math.max(0, Math.ceil(tLeft)));
    if (tLeft <= 0) return;
    const lw = lmks[LM.LEFT_WRIST], rw = lmks[LM.RIGHT_WRIST];
    if (!lw || !rw) return;
    const hit = (p) => p && dist(p, r.target) < 0.08;
    if (hit(lw) || hit(rw)) {
      r.score++;
      setReachScore(r.score);
      r.target = { x: 0.15 + Math.random() * 0.7, y: 0.2 + Math.random() * 0.6 };
    }
  };

  const updateGaitPhase = (lmks) => {
    const la = lmks[LM.LEFT_ANKLE], ra = lmks[LM.RIGHT_ANKLE];
    if (!la || !ra) return;
    const g = gaitState.current;
    // Lower ankle (higher y in image coords) = on ground = stance
    const lOnGround = la.y > 0.85;
    const rOnGround = ra.y > 0.85;
    let phase = 'Stance';
    if (lOnGround && rOnGround) phase = 'Double Support';
    else if (lOnGround && !rOnGround) phase = 'L Stance · R Swing';
    else if (!lOnGround && rOnGround) phase = 'R Stance · L Swing';
    else phase = 'Both Off';
    if (phase !== g.phase) {
      g.phase = phase;
      setGaitPhase(phase);
      g.samples.push({ t: performance.now() - sessionStart.current, phase });
    }
  };

  // ─── Main detection loop ───
  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !canvas || !landmarker || !streamRef.current) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    if (video.readyState < 2 || video.videoWidth === 0) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const w = video.videoWidth, h = video.videoHeight;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    const ctx = canvas.getContext('2d');

    const now = performance.now();
    let lmks = null;
    try {
      const result = landmarker.detectForVideo(video, now);
      if (result?.landmarks?.length > 0) lmks = result.landmarks[0];
    } catch (e) { /* skip frame */ }

    // FPS calculation
    const dt = now - lastFrameTs.current;
    lastFrameTs.current = now;
    if (dt > 0) {
      fpsBuf.current.push(1000 / dt);
      if (fpsBuf.current.length > 30) fpsBuf.current.shift();
      setFps(Math.round(fpsBuf.current.reduce((a, b) => a + b, 0) / fpsBuf.current.length));
    }

    // Clear canvas (mirror only when self-facing front camera)
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    if (mirrorCanvas) {
      ctx.scale(-1, 1);
      ctx.translate(-w, 0);
    }

    // Draw video (mirrored if user-facing)
    ctx.drawImage(video, 0, 0, w, h);

    if (lmks) {
      // landmarks are normalized (0-1)
      const pts = lmks.map(l => ({ x: l.x * w, y: l.y * h, visibility: l.visibility }));

      // Skeleton edges
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#00e5ff';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 8;
      for (const [a, b] of SKELETON_EDGES) {
        if (pts[a]?.visibility > 0.3 && pts[b]?.visibility > 0.3) {
          ctx.beginPath();
          ctx.moveTo(pts[a].x, pts[a].y);
          ctx.lineTo(pts[b].x, pts[b].y);
          ctx.stroke();
        }
      }
      ctx.shadowBlur = 0;

      // Landmark points
      for (let i = 0; i < pts.length; i++) {
        if (pts[i].visibility < 0.3) continue;
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Compute angles
      const newAngles = {};
      for (const def of ANGLE_DEFS) {
        if (pts[def.a]?.visibility > 0.3 && pts[def.b]?.visibility > 0.3 && pts[def.c]?.visibility > 0.3) {
          const ang = angleAt(pts[def.a], pts[def.b], pts[def.c]);
          newAngles[def.id] = ang;
          // Draw angle near joint b (text rendering — un-mirror only when canvas itself is mirrored)
          ctx.save();
          if (mirrorCanvas) {
            ctx.scale(-1, 1);
            ctx.translate(-w, 0);
          }
          ctx.font = '700 14px "Share Tech Mono", monospace';
          ctx.fillStyle = def.color;
          ctx.strokeStyle = 'rgba(0,0,0,0.8)';
          ctx.lineWidth = 3;
          const tx = (mirrorCanvas ? (w - pts[def.b].x) : pts[def.b].x) + 8;
          const ty = pts[def.b].y - 6;
          ctx.strokeText(`${Math.round(ang)}°`, tx, ty);
          ctx.fillText(`${Math.round(ang)}°`, tx, ty);
          ctx.restore();
        }
      }
      setAngles(newAngles);
      setPostureScore(computePostureScore(newAngles));
      setSymmetryScore(computeSymmetry(newAngles));

      // ── Voice ROM Coach: announce new max for tracked joints ──
      checkRomAnnounce(newAngles, now);

      // ── Auto-snapshot when a joint hits a new max angle (cropped + annotated per joint) ──
      const newMaxIds = [];
      for (const [k, v] of Object.entries(newAngles)) {
        if (typeof v !== 'number') continue;
        const prevMax = maxSnapshotsRef.current[k]?.angle ?? -Infinity;
        if (v > prevMax + 2 && v < 200) newMaxIds.push({ id: k, angle: v });
      }
      // Build per-joint cropped snapshots while pts (canvas-space) is still in scope
      const newSnaps = {};
      for (const { id: jointId, angle: angVal } of newMaxIds) {
        const def = ANGLE_DEFS.find(d => d.id === jointId);
        if (!def) continue;
        const pa = pts[def.a], pb = pts[def.b], pc = pts[def.c];
        if (!pa || !pb || !pc) continue;
        try {
          const dataUrl = buildJointCrop(canvasRef.current, def, pa, pb, pc, angVal, w, h, mirrorCanvas);
          newSnaps[jointId] = { angle: angVal, dataUrl, t: now - sessionStart.current };
        } catch (e) {
          newSnaps[jointId] = { angle: angVal, t: now - sessionStart.current };
        }
      }
      if (Object.keys(newSnaps).length > 0) {
        // Update ref immediately so subsequent ticks see the new baseline
        maxSnapshotsRef.current = { ...maxSnapshotsRef.current, ...newSnaps };
        setMaxSnapshots(prev => ({ ...prev, ...newSnaps }));
      }

      // ── Pro Mode: Knee Valgus/Varus frontal-plane analysis ──
      if (proMode && (mode === 'valgus' || mode === 'walk-front' || mode === 'fms-squat')) {
        const Ldev = kneeFrontalDeviation(pts[LM.LEFT_HIP], pts[LM.LEFT_KNEE], pts[LM.LEFT_ANKLE], 'L');
        const Rdev = kneeFrontalDeviation(pts[LM.RIGHT_HIP], pts[LM.RIGHT_KNEE], pts[LM.RIGHT_ANKLE], 'R');
        setValgusData({ L: Ldev, R: Rdev });
        // Draw hip-ankle reference line + knee deviation arrow for each leg
        ctx.save();
        ctx.lineWidth = 2.5;
        for (const [hipI, kneeI, ankleI, dev, side] of [
          [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE, Ldev, 'L'],
          [LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE, Rdev, 'R'],
        ]) {
          const hp = pts[hipI], kp = pts[kneeI], ap = pts[ankleI];
          if (!hp || !kp || !ap || !dev) continue;
          // Reference line hip→ankle (yellow dashed)
          ctx.strokeStyle = 'rgba(255,204,0,0.85)';
          ctx.setLineDash([6, 4]);
          ctx.beginPath(); ctx.moveTo(hp.x, hp.y); ctx.lineTo(ap.x, ap.y); ctx.stroke();
          ctx.setLineDash([]);
          // Projected point on line
          const vx = ap.x - hp.x, vy = ap.y - hp.y;
          const mag2 = vx * vx + vy * vy || 1;
          const t = ((kp.x - hp.x) * vx + (kp.y - hp.y) * vy) / mag2;
          const px = hp.x + t * vx, py = hp.y + t * vy;
          // Deviation segment (red = abnormal, green = neutral)
          const col = dev.severity === 'neutral' ? '#00ff88' : (dev.severity === 'mild' ? '#ffcc00' : '#ff3366');
          ctx.strokeStyle = col; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(kp.x, kp.y); ctx.stroke();
          // Label
          ctx.save();
          if (mirrorCanvas) { ctx.scale(-1, 1); ctx.translate(-w, 0); }
          const lx = (mirrorCanvas ? (w - kp.x) : kp.x) + 12;
          const ly = kp.y;
          ctx.font = '900 13px "Share Tech Mono", monospace';
          ctx.fillStyle = '#06070d';
          ctx.fillRect(lx - 2, ly - 14, 96, 16);
          ctx.fillStyle = col;
          ctx.fillText(`${side} ${dev.label} ${(dev.normalized * 100).toFixed(0)}%`, lx, ly - 2);
          ctx.restore();
        }
        ctx.restore();
      }

      // Record (low-rate, every ~333ms)
      if (recording && recordedAngles.current.length === 0 || (recording && now - (recordedAngles.current[recordedAngles.current.length - 1]?.t + sessionStart.current || 0) > 333)) {
        recordedAngles.current.push({ t: now - sessionStart.current, angles: newAngles });
      }

      // Mode-specific logic
      const lmObj = lmks.map(l => ({ x: l.x, y: l.y, z: l.z, visibility: l.visibility }));
      if (mode === 'squat') updateSquatCounter(lmObj);
      else if (mode === 'reach') updateReachGame(lmObj);
      else if (mode === 'gait') updateGaitPhase(lmObj);
      else if (mode === 'avatar3d') updateThreeAvatar(lmObj);
      else if (mode === 'avatar3d-rigged' && riggedAvatarRef.current) riggedAvatarRef.current.update(lmObj);

      // Multi-person via TF.js MoveNet (FREE, in-browser) — every 3rd frame
      if (yoloEnabled && proEngine === 'free' && movenetRef.current) {
        yoloFrameRef.current++;
        if (yoloFrameRef.current % 3 === 0) {
          runMovenetOnVideo().then(poses => {
            if (!poses || !canvasRef.current) return;
            const ctx2 = canvasRef.current.getContext('2d');
            ctx2.save();
            if (mirrorCanvas) { ctx2.scale(-1, 1); ctx2.translate(-w, 0); }
            for (const pose of poses) {
              if (!pose.keypoints || pose.keypoints.length < 5) continue;
              // Bounding box from keypoints
              let xs = pose.keypoints.map(k => k.x), ys = pose.keypoints.map(k => k.y);
              const x1 = Math.min(...xs) - 10, x2 = Math.max(...xs) + 10;
              const y1 = Math.min(...ys) - 10, y2 = Math.max(...ys) + 10;
              ctx2.strokeStyle = '#a78bfa';
              ctx2.lineWidth = 2;
              ctx2.setLineDash([6, 4]);
              ctx2.strokeRect(x1, y1, x2 - x1, y2 - y1);
              ctx2.setLineDash([]);
              ctx2.fillStyle = '#a78bfa';
              ctx2.font = '700 12px "Share Tech Mono", monospace';
              ctx2.fillText(`#${pose.id ?? '?'}  ${Math.round((pose.score || 0) * 100)}%`, x1 + 4, y1 - 4);
            }
            ctx2.restore();
          });
        }
      }

      // Pro Engine (fal.ai) sampling — every 60 frames (~2/sec) since it's a network call
      if (proEngine !== 'free' && yoloEnabled) {
        yoloFrameRef.current++;
        if (yoloFrameRef.current % 60 === 0) callProEngine(proEngine);
      }


      // Draw reach target
      if (mode === 'reach' && reachState.current.target) {
        const t = reachState.current.target;
        ctx.save();
        if (mirrorCanvas) { ctx.scale(-1, 1); ctx.translate(-w, 0); }
        const tx = mirrorCanvas ? (w - t.x * w) : (t.x * w);
        const ty = t.y * h;
        ctx.fillStyle = 'rgba(255,204,0,0.6)';
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(tx, ty, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    } else {
      // No person detected — overlay
      ctx.save();
      if (mirrorCanvas) { ctx.scale(-1, 1); ctx.translate(-w, 0); }
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '700 18px "Share Tech Mono", monospace';
      ctx.fillText('No person detected', 20, 30);
      ctx.restore();
    }

    ctx.restore();
    rafRef.current = requestAnimationFrame(tick);
  }, [mode, recording, checkRomAnnounce, mirrorCanvas, proMode]);

  // Compute improvement deltas vs previous session
  useEffect(() => {
    const next = {};
    for (const [k, snap] of Object.entries(maxSnapshots)) {
      if (typeof previousMaxes[k] === 'number') {
        next[k] = snap.angle - previousMaxes[k];
      }
    }
    setImprovements(next);
  }, [maxSnapshots, previousMaxes]);

  // ─── Restart tick when mode changes during running ───
  useEffect(() => {
    if (status === 'running') {
      if (mode === 'squat') squatState.current = { phase: 'standing', count: 0, lastCoachAt: 0, depthAtBottom: 180 };
      if (mode === 'reach') {
        reachState.current = { target: { x: 0.3 + Math.random() * 0.4, y: 0.3 + Math.random() * 0.4 }, score: 0, deadline: performance.now() + 60000 };
        setReachScore(0);
        setReachTimer(60);
      }
      setReps(0);
    }
    if (mode === 'avatar3d') initThree();
  }, [mode, status, initThree]);

  // ─── Cleanup on unmount ───
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ─── Save session ───
  const saveSession = () => setShowModal(true);

  const handleFirebaseSave = async (pid) => {
    if (!authUser) return;
    setSaving(true);
    try {
      const dur = (performance.now() - sessionStart.current) / 1000;
      const maxAnglesPayload = {};
      for (const [k, snap] of Object.entries(maxSnapshots)) {
        maxAnglesPayload[k] = { angle: snap.angle, t: snap.t };
      }
      await addDoc(collection(firebaseDB, 'assessments'), {
        patientId: pid,
        physioId: authUser.uid,
        toolType: 'live-pose',
        data: {
          mode,
          duration_s: dur,
          avg_fps: fps,
          posture_score: Math.round(postureScore),
          symmetry_score: Math.round(symmetryScore),
          reps: mode === 'squat' ? reps : (mode === 'reach' ? reachScore : 0),
          angles_history: recordedAngles.current.slice(-200),
          gait_phases: gaitState.current.samples.slice(-100),
          max_angles: maxAnglesPayload,
          rom_voice_log: (romHistoryRef.current || []).slice(-100),
          notes: notes.trim(),
        },
        createdAt: serverTimestamp(),
      });
      setShowModal(false);
      setRecording(false);
      toast.success('Session saved');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save session');
    } finally {
      setSaving(false);
    }
  };

  // ─── Export PDF (detailed clinical report) ───
  const exportPDF = () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const patientObj = patients.find(p => p.id === selectedPatient);
      const patientName = patientObj?.name || (user?.role === 'patient' ? user?.name : 'Unassigned');
      const patientAge = patientObj?.age || '—';
      const patientCondition = patientObj?.condition || '—';
      const modeLabel = MODES.find(m => m.id === mode)?.label || mode;
      const durationS = ((performance.now() - sessionStart.current) / 1000) || 0;
      const sampleCount = recordedAngles.current?.length || 0;
      const nowStr = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

      // Capture a hero snapshot of the current canvas if running
      let heroDataUrl = null;
      try {
        if (canvasRef.current) heroDataUrl = canvasRef.current.toDataURL('image/jpeg', 0.7);
      } catch (_) {}

      const drawPageChrome = (pageTitle) => {
        // Background — keep WHITE for clean print
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, 210, 297, 'F');
        // Header bar
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 16, 'F');
        doc.setTextColor(0, 229, 255);
        doc.setFont(undefined, 'bold'); doc.setFontSize(13);
        doc.text('WBA99 ANALYSIS', 12, 10);
        doc.setTextColor(255); doc.setFontSize(9); doc.setFont(undefined, 'normal');
        doc.text(pageTitle, 105, 10, { align: 'center' });
        doc.text(nowStr, 198, 10, { align: 'right' });
      };

      const drawFooter = () => {
        doc.setFontSize(7); doc.setTextColor(120);
        doc.text('WBA99 · LIVE POSE CLINICAL REPORT · MADE IN INDIA', 14, 290);
        doc.text('www.wba99.com', 105, 290, { align: 'center' });
      };

      // ── PAGE 1: Cover + Patient + Hero Frame ──
      drawPageChrome('CLINICAL ASSESSMENT REPORT');

      // Big patient hero
      doc.setFillColor(241, 245, 249);
      doc.rect(8, 22, 194, 50, 'F');
      doc.setFontSize(22); doc.setTextColor(15, 23, 42); doc.setFont(undefined, 'bold');
      doc.text(patientName, 14, 36);
      doc.setFontSize(10); doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'normal');
      doc.text(`Age: ${patientAge}   ·   Condition: ${patientCondition}`, 14, 43);
      doc.text(`Session Mode: ${modeLabel}`, 14, 49);
      doc.text(`Duration: ${durationS.toFixed(1)}s   ·   Samples: ${sampleCount}   ·   Avg FPS: ${fps}`, 14, 55);
      doc.text(`AI Engine: ${proEngine === 'free' ? 'MediaPipe (Free)' : proEngine.toUpperCase()}`, 14, 61);
      doc.setFontSize(8); doc.setTextColor(0, 229, 255); doc.setFont(undefined, 'bold');
      doc.text(`Report ID: WBA99-LP-${Date.now().toString().slice(-8)}`, 14, 68);

      // Hero snapshot
      if (heroDataUrl) {
        try {
          doc.setFontSize(10); doc.setTextColor(15, 23, 42); doc.setFont(undefined, 'bold');
          doc.text('CURRENT FRAME (SKELETON OVERLAY)', 14, 80);
          doc.addImage(heroDataUrl, 'JPEG', 14, 84, 130, 75);
        } catch (_) {}
      }

      // Performance Score Cards (right column)
      const cards = [
        { label: 'POSTURE', val: Math.round(postureScore), unit: '/100', color: [16, 185, 129] },
        { label: 'SYMMETRY', val: Math.round(symmetryScore), unit: '/100', color: [59, 130, 246] },
        { label: mode === 'squat' ? 'REPS' : mode === 'reach' ? 'TARGETS' : 'SAMPLES',
          val: mode === 'squat' ? reps : mode === 'reach' ? reachScore : sampleCount,
          unit: '', color: [168, 85, 247] },
        { label: 'DURATION', val: durationS.toFixed(0), unit: 's', color: [236, 72, 153] },
      ];
      cards.forEach((c, i) => {
        const x = 152, y = 84 + i * 19;
        doc.setFillColor(c.color[0], c.color[1], c.color[2]); doc.setDrawColor(c.color[0], c.color[1], c.color[2]);
        doc.roundedRect(x, y, 44, 15, 2, 2, 'S');
        doc.setFontSize(7); doc.setFont(undefined, 'bold');
        doc.text(c.label, x + 2, y + 5);
        doc.setFontSize(16);
        doc.text(`${c.val}${c.unit}`, x + 2, y + 13);
      });

      // Executive Summary
      doc.setTextColor(15, 23, 42); doc.setFont(undefined, 'bold'); doc.setFontSize(11);
      doc.text('EXECUTIVE SUMMARY', 14, 175);
      doc.setDrawColor(0, 229, 255); doc.line(14, 177, 196, 177);
      doc.setFont(undefined, 'normal'); doc.setFontSize(9); doc.setTextColor(51, 65, 85);
      const totalImp = Object.values(improvements).filter(v => typeof v === 'number');
      const avgImp = totalImp.length ? (totalImp.reduce((a, b) => a + b, 0) / totalImp.length).toFixed(1) : '0.0';
      const snapCount = Object.keys(maxSnapshots).length;
      const summary = [
        `• Patient performed a ${durationS.toFixed(0)}-second ${modeLabel.toLowerCase()} session captured at ${fps} FPS.`,
        `• Average ROM change since last session: ${avgImp >= 0 ? '+' : ''}${avgImp}°. ${snapCount} max-angle frames auto-captured.`,
        `• Posture score: ${Math.round(postureScore)}/100 (${postureScore >= 80 ? 'EXCELLENT' : postureScore >= 60 ? 'GOOD' : postureScore >= 40 ? 'FAIR' : 'NEEDS WORK'}).`,
        `• Bilateral symmetry: ${Math.round(symmetryScore)}/100 (${symmetryScore >= 80 ? 'BALANCED' : symmetryScore >= 60 ? 'MILD ASYMMETRY' : 'NOTABLE ASYMMETRY'}).`,
      ];
      let sy = 184;
      summary.forEach(line => {
        const wrapped = doc.splitTextToSize(line, 182);
        doc.text(wrapped, 14, sy);
        sy += wrapped.length * 4.5;
      });

      drawFooter();

      // ── PAGE 2: Detailed Joint Kinematics Table ──
      doc.addPage(); drawPageChrome('JOINT KINEMATIC DATA');
      doc.setTextColor(15, 23, 42); doc.setFontSize(13); doc.setFont(undefined, 'bold');
      doc.text('RANGE OF MOTION · ALL TRACKED JOINTS', 14, 24);
      doc.setDrawColor(0, 229, 255); doc.line(14, 26, 196, 26);

      // Table header
      const colX = [14, 50, 78, 104, 130, 152, 178];
      const headers = ['Joint', 'Current', 'Max Today', 'Last Sess', 'Δ Imp', 'Normal', 'Status'];
      doc.setFillColor(15, 23, 42); doc.rect(14, 30, 182, 7, 'F');
      doc.setTextColor(255); doc.setFontSize(8); doc.setFont(undefined, 'bold');
      headers.forEach((h, i) => doc.text(h, colX[i] + 1, 35));

      doc.setTextColor(15, 23, 42); doc.setFont(undefined, 'normal'); doc.setFontSize(8);
      let ry = 42;
      for (const def of ANGLE_DEFS) {
        const cur = typeof angles[def.id] === 'number' ? angles[def.id] : null;
        const snap = maxSnapshots[def.id];
        const prev = previousMaxes[def.id];
        const delta = improvements[def.id];
        const maxA = snap?.angle;
        const inRange = cur != null && cur >= def.normal[0] && cur <= def.normal[1];
        const status = cur == null ? '—' : inRange ? 'WITHIN' : (Math.abs(cur - (def.normal[0] + def.normal[1]) / 2) > 30 ? 'MAJOR' : 'MILD');
        const statusColor = status === 'WITHIN' ? [16, 185, 129] : status === 'MILD' ? [234, 179, 8] : status === 'MAJOR' ? [220, 38, 38] : [148, 163, 184];

        doc.text(def.label, colX[0] + 1, ry);
        doc.text(cur != null ? `${cur.toFixed(1)}°` : '—', colX[1] + 1, ry);
        doc.text(maxA != null ? `${maxA.toFixed(1)}°` : '—', colX[2] + 1, ry);
        doc.text(typeof prev === 'number' ? `${prev.toFixed(1)}°` : '—', colX[3] + 1, ry);
        if (typeof delta === 'number') {
          doc.setTextColor(delta >= 0 ? 16 : 220, delta >= 0 ? 185 : 38, delta >= 0 ? 129 : 38);
          doc.text(`${delta >= 0 ? '+' : ''}${delta.toFixed(1)}°`, colX[4] + 1, ry);
          doc.setTextColor(15, 23, 42);
        } else {
          doc.text('—', colX[4] + 1, ry);
        }
        doc.text(`${def.normal[0]}-${def.normal[1]}°`, colX[5] + 1, ry);
        doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]); doc.setFont(undefined, 'bold');
        doc.text(status, colX[6] + 1, ry);
        doc.setTextColor(15, 23, 42); doc.setFont(undefined, 'normal');
        doc.setDrawColor(226, 232, 240); doc.line(14, ry + 1.5, 196, ry + 1.5);
        ry += 7;
      }

      // ── Bilateral Symmetry block ──
      ry += 4;
      doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.setTextColor(15, 23, 42);
      doc.text('BILATERAL SYMMETRY · LEFT vs RIGHT (Current Frame)', 14, ry);
      doc.setDrawColor(168, 85, 247); doc.line(14, ry + 2, 196, ry + 2);
      ry += 8;
      doc.setFontSize(9); doc.setFont(undefined, 'normal');
      const lrPairs = [
        ['shoulder', 'L_shoulder', 'R_shoulder'],
        ['elbow', 'L_elbow', 'R_elbow'],
        ['hip', 'L_hip', 'R_hip'],
        ['knee', 'L_knee', 'R_knee'],
        ['ankle', 'L_ankle', 'R_ankle'],
      ];
      lrPairs.forEach(([name, lk, rk]) => {
        const lv = angles[lk], rv = angles[rk];
        if (typeof lv !== 'number' || typeof rv !== 'number') return;
        const diff = Math.abs(lv - rv);
        const pct = Math.max(lv, rv) > 0 ? (diff / Math.max(lv, rv) * 100) : 0;
        const sev = pct < 5 ? ['BALANCED', [16, 185, 129]] : pct < 10 ? ['MILD', [234, 179, 8]] : ['NOTABLE', [220, 38, 38]];
        doc.text(name.toUpperCase(), 18, ry);
        doc.text(`L: ${lv.toFixed(1)}°`, 60, ry);
        doc.text(`R: ${rv.toFixed(1)}°`, 95, ry);
        doc.text(`Δ ${diff.toFixed(1)}° (${pct.toFixed(1)}%)`, 130, ry);
        doc.setTextColor(sev[1][0], sev[1][1], sev[1][2]); doc.setFont(undefined, 'bold');
        doc.text(sev[0], 178, ry); doc.setTextColor(15, 23, 42); doc.setFont(undefined, 'normal');
        ry += 6;
      });

      drawFooter();

      // ── PAGE 3: Angle Time-Series Charts ──
      if (sampleCount >= 5) {
        doc.addPage(); drawPageChrome('ANGLE TRENDS · TIME SERIES');
        doc.setTextColor(15, 23, 42); doc.setFontSize(12); doc.setFont(undefined, 'bold');
        doc.text('JOINT ANGLES OVER TIME (last 200 samples)', 14, 24);
        doc.setFont(undefined, 'normal'); doc.setFontSize(8); doc.setTextColor(100);
        doc.text('Vertical: angle (degrees) · Horizontal: time (s)', 14, 29);

        const chartTargets = ['L_knee', 'R_knee', 'L_hip', 'R_hip'];
        chartTargets.forEach((jointId, idx) => {
          const def = ANGLE_DEFS.find(d => d.id === jointId);
          const col = idx % 2;
          const row = Math.floor(idx / 2);
          const cx = 14 + col * 92;
          const cy = 36 + row * 80;
          const cw = 86, ch = 60;

          // Frame
          doc.setDrawColor(180); doc.setLineWidth(0.3); doc.rect(cx, cy, cw, ch);
          // Title
          doc.setTextColor(15, 23, 42); doc.setFontSize(9); doc.setFont(undefined, 'bold');
          doc.text(def?.label || jointId, cx + 1, cy - 1);
          // Series
          const series = recordedAngles.current
            .map(s => ({ t: s.t / 1000, v: s.angles?.[jointId] }))
            .filter(p => typeof p.v === 'number');
          if (series.length < 2) { doc.setFontSize(8); doc.setTextColor(150); doc.text('No data', cx + cw / 2, cy + ch / 2); return; }
          const minT = series[0].t, maxT = series[series.length - 1].t;
          const allV = series.map(p => p.v);
          const minV = Math.min(...allV, def?.normal[0] - 10);
          const maxV = Math.max(...allV, def?.normal[1] + 10);
          const span = (maxV - minV) || 1;
          const tspan = (maxT - minT) || 1;
          // Normal range band
          const y1 = cy + ch - ((def.normal[0] - minV) / span) * ch;
          const y2 = cy + ch - ((def.normal[1] - minV) / span) * ch;
          doc.setFillColor(220, 252, 231); doc.rect(cx, Math.min(y1, y2), cw, Math.abs(y2 - y1), 'F');
          // Plot line
          doc.setDrawColor(14, 165, 233); doc.setLineWidth(0.7);
          for (let i = 1; i < series.length; i++) {
            const x1 = cx + ((series[i - 1].t - minT) / tspan) * cw;
            const yy1 = cy + ch - ((series[i - 1].v - minV) / span) * ch;
            const x2 = cx + ((series[i].t - minT) / tspan) * cw;
            const yy2 = cy + ch - ((series[i].v - minV) / span) * ch;
            doc.line(x1, yy1, x2, yy2);
          }
          // Y labels
          doc.setFontSize(6); doc.setTextColor(80); doc.setFont(undefined, 'normal');
          doc.text(`${maxV.toFixed(0)}°`, cx - 6, cy + 3);
          doc.text(`${minV.toFixed(0)}°`, cx - 6, cy + ch);
          // Min/Max/Avg badges
          const avg = allV.reduce((a, b) => a + b, 0) / allV.length;
          doc.setFontSize(7); doc.setTextColor(15, 23, 42);
          doc.text(`min ${Math.min(...allV).toFixed(0)}° · max ${Math.max(...allV).toFixed(0)}° · avg ${avg.toFixed(0)}°`, cx, cy + ch + 5);
        });

        drawFooter();
      }

      // ── PAGE 4: Max-Angle Snapshots ──
      const snapEntries = Object.entries(maxSnapshots).filter(([, s]) => s?.dataUrl);
      if (snapEntries.length > 0) {
        doc.addPage(); drawPageChrome('MAX-ANGLE FRAME SNAPSHOTS');
        doc.setTextColor(15, 23, 42); doc.setFontSize(12); doc.setFont(undefined, 'bold');
        doc.text('AUTO-CAPTURED PEAK ROM FRAMES', 14, 24);
        doc.setFontSize(8); doc.setFont(undefined, 'normal'); doc.setTextColor(100);
        doc.text('Each frame was captured at the moment the joint reached its maximum angle during this session.', 14, 29);

        let isy = 34;
        let col = 0;
        const imgW = 92, imgH = 65;
        for (const [jointId, snap] of snapEntries) {
          const defObj = ANGLE_DEFS.find(d => d.id === jointId);
          const x = 14 + col * (imgW + 4);
          try { doc.addImage(snap.dataUrl, 'JPEG', x, isy + 6, imgW, imgH); } catch (_) {}
          doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(15, 23, 42);
          doc.text(`${defObj?.label || jointId}`, x, isy + 4);
          doc.setTextColor(0, 100, 200); doc.text(`${snap.angle.toFixed(1)}°`, x + 50, isy + 4);
          doc.setFontSize(7); doc.setTextColor(100); doc.setFont(undefined, 'normal');
          doc.text(`Normal: ${defObj?.normal[0]}-${defObj?.normal[1]}°`, x, isy + imgH + 11);
          if (typeof snap.t === 'number') doc.text(`Captured at ${(snap.t / 1000).toFixed(1)}s`, x, isy + imgH + 15);
          col++;
          if (col >= 2) { col = 0; isy += imgH + 22; }
          if (isy > 230 && snapEntries.indexOf([jointId, snap]) < snapEntries.length - 1) {
            drawFooter(); doc.addPage(); drawPageChrome('MAX-ANGLE FRAME SNAPSHOTS (CONT.)'); isy = 24; col = 0;
          }
        }
        drawFooter();
      }

      // ── PAGE: Voice ROM Coach Session log (only if there are announcements) ──
      const romLog = romHistoryRef.current || [];
      if (romLog.length > 0) {
        doc.addPage(); drawPageChrome('VOICE ROM COACH · ANNOUNCEMENT LOG');
        doc.setTextColor(15, 23, 42); doc.setFontSize(12); doc.setFont(undefined, 'bold');
        doc.text('AI-ANNOUNCED MAX RANGE MILESTONES', 14, 24);
        doc.setDrawColor(0, 229, 255); doc.line(14, 26, 196, 26);
        doc.setFont(undefined, 'normal'); doc.setFontSize(8); doc.setTextColor(100);
        doc.text(`The voice coach announced ${romLog.length} new max-range milestone${romLog.length === 1 ? '' : 's'} during this session. Each line shows the joint, the new max angle, the previous best, and the elapsed time.`, 14, 31, { maxWidth: 182 });

        // Per-joint summary
        let py = 42;
        doc.setFont(undefined, 'bold'); doc.setFontSize(10); doc.setTextColor(15, 23, 42);
        doc.text('PEAK ROM PER JOINT (FROM VOICE COACH)', 14, py);
        doc.setDrawColor(0, 229, 255); doc.line(14, py + 1.5, 196, py + 1.5);
        py += 7;
        const perJointBest = {};
        for (const ev of romLog) {
          if (!perJointBest[ev.jointId] || ev.angle > perJointBest[ev.jointId].angle) perJointBest[ev.jointId] = ev;
        }
        doc.setFontSize(9); doc.setFont(undefined, 'normal'); doc.setTextColor(51, 65, 85);
        for (const def of ANGLE_DEFS) {
          const best = perJointBest[def.id];
          if (!best) continue;
          if (py > 270) { drawFooter(); doc.addPage(); drawPageChrome('VOICE ROM COACH (CONT.)'); py = 24; }
          const [lo, hi] = def.normal;
          const inRange = best.angle >= lo && best.angle <= hi;
          doc.setFillColor(...(inRange ? [16, 185, 129] : [245, 158, 11]));
          doc.circle(16, py - 1.5, 1.5, 'F');
          doc.text(`${def.label}: ${best.angle.toFixed(1)}° (normal ${lo}-${hi}°) — improvement ${best.delta.toFixed(1)}° over baseline`, 20, py);
          py += 5.5;
        }

        // Full chronological log
        py += 6;
        if (py > 250) { drawFooter(); doc.addPage(); drawPageChrome('VOICE ROM COACH (CONT.)'); py = 24; }
        doc.setFont(undefined, 'bold'); doc.setFontSize(10); doc.setTextColor(15, 23, 42);
        doc.text('CHRONOLOGICAL ANNOUNCEMENT LOG', 14, py);
        doc.setDrawColor(168, 85, 247); doc.line(14, py + 1.5, 196, py + 1.5);
        py += 6;
        // Table header
        doc.setFontSize(8); doc.setTextColor(100);
        doc.text('#', 14, py); doc.text('Time', 22, py); doc.text('Joint', 44, py); doc.text('Max°', 86, py); doc.text('Prev°', 108, py); doc.text('Δ°', 132, py); doc.text('Phrase Spoken', 152, py);
        py += 3;
        doc.setDrawColor(220); doc.line(14, py, 196, py); py += 4;
        doc.setFont(undefined, 'normal'); doc.setFontSize(8); doc.setTextColor(51, 65, 85);
        romLog.forEach((ev, i) => {
          if (py > 282) { drawFooter(); doc.addPage(); drawPageChrome('VOICE ROM COACH (CONT.)'); py = 24; }
          const secs = (ev.tMs / 1000).toFixed(1);
          const phrase = `Max ${ev.label.replace('L ', 'left ').replace('R ', 'right ')} ${Math.round(ev.angle)} degrees`;
          doc.text(`${i + 1}`, 14, py);
          doc.text(`${secs}s`, 22, py);
          doc.text(ev.label, 44, py);
          doc.setTextColor(0, 120, 200); doc.text(`${ev.angle.toFixed(1)}`, 86, py);
          doc.setTextColor(120); doc.text(`${ev.prevMax.toFixed(1)}`, 108, py);
          doc.setTextColor(16, 185, 129); doc.text(`+${ev.delta.toFixed(1)}`, 132, py);
          doc.setTextColor(51, 65, 85);
          const phraseTrunc = phrase.length > 32 ? phrase.slice(0, 30) + '…' : phrase;
          doc.text(`"${phraseTrunc}"`, 152, py);
          py += 4.5;
        });
        drawFooter();
      }

      // ── PAGE: Biomechanical Findings & Clinical Consequences ──
      // Build a dossier of abnormal findings with thumbnail crop + condition associations
      const findings = [];
      // a) Joints below or above normal range (based on observed MAX angle from snapshots)
      for (const def of ANGLE_DEFS) {
        const snap = maxSnapshots[def.id];
        if (!snap || typeof snap.angle !== 'number') continue;
        const [lo, hi] = def.normal;
        let status = 'ok', sev = 'normal';
        if (snap.angle < lo) { status = 'below'; sev = (lo - snap.angle) > 20 ? 'severe' : 'moderate'; }
        else if (snap.angle > hi) { status = 'above'; sev = 'mild'; }
        if (status !== 'ok') {
          findings.push({
            joint: def.label, jointId: def.id, angle: snap.angle, normal: [lo, hi],
            status, sev,
            consequences: clinicalConsequences(def.id, status, sev, snap.angle),
            img: snap.dataUrl || null,
          });
        }
      }
      // b) Bilateral asymmetry
      for (const [name, lk, rk] of lrPairs) {
        const lv = angles[lk] ?? maxSnapshots[lk]?.angle;
        const rv = angles[rk] ?? maxSnapshots[rk]?.angle;
        if (typeof lv !== 'number' || typeof rv !== 'number') continue;
        const diff = Math.abs(lv - rv);
        const pct = Math.max(lv, rv) > 0 ? (diff / Math.max(lv, rv) * 100) : 0;
        if (pct >= 10) {
          findings.push({
            joint: `${name.toUpperCase()} (Bilateral)`, jointId: `asym-${name}`,
            angle: null, normal: null, status: 'asymmetry', sev: pct >= 20 ? 'severe' : 'moderate',
            asymPct: pct, leftVal: lv, rightVal: rv,
            consequences: asymmetryConsequences(name, pct),
            img: maxSnapshots[lk]?.dataUrl || maxSnapshots[rk]?.dataUrl || null,
          });
        }
      }
      // c) Valgus/varus findings (proMode)
      if (proMode && (valgusData.L || valgusData.R)) {
        for (const side of ['L', 'R']) {
          const d = valgusData[side];
          if (!d || d.severity === 'neutral') continue;
          findings.push({
            joint: `${side === 'L' ? 'Left' : 'Right'} Knee · ${d.label}`,
            jointId: `valgus-${side}`,
            angle: null, normal: null, status: d.label.toLowerCase(), sev: d.severity,
            deviationPct: (d.normalized * 100),
            consequences: valgusConsequences(d.label, d.severity, side),
            img: maxSnapshots[side === 'L' ? 'L_knee' : 'R_knee']?.dataUrl || null,
          });
        }
      }

      if (findings.length > 0) {
        doc.addPage(); drawPageChrome('BIOMECHANICAL FINDINGS & CLINICAL CONSEQUENCES');
        doc.setTextColor(15, 23, 42); doc.setFontSize(12); doc.setFont(undefined, 'bold');
        doc.text('ABNORMAL FINDINGS & POTENTIAL CLINICAL CONSEQUENCES', 14, 24);
        doc.setDrawColor(220, 38, 38); doc.line(14, 26, 196, 26);
        doc.setFont(undefined, 'normal'); doc.setFontSize(8); doc.setTextColor(100);
        doc.text(`The system identified ${findings.length} abnormal biomechanical finding${findings.length === 1 ? '' : 's'} from the captured live-pose data. Each finding is paired with literature-supported clinical consequences. Review with the patient and incorporate into the treatment plan.`, 14, 31, { maxWidth: 182 });

        let fy = 38;
        findings.forEach((f, idx) => {
          // Each finding card ~58mm tall: image left (40mm), text right
          const cardH = 56;
          if (fy + cardH > 282) { drawFooter(); doc.addPage(); drawPageChrome('BIOMECHANICAL FINDINGS (CONT.)'); fy = 24; }
          // Card border
          const sevColor = f.sev === 'severe' ? [220, 38, 38] : (f.sev === 'moderate' ? [234, 88, 12] : [234, 179, 8]);
          doc.setDrawColor(...sevColor); doc.setLineWidth(0.6);
          doc.rect(14, fy, 182, cardH);
          doc.setFillColor(...sevColor);
          doc.rect(14, fy, 4, cardH, 'F'); // left severity stripe
          // Thumbnail
          if (f.img) {
            try { doc.addImage(f.img, 'JPEG', 21, fy + 3, 36, 36); } catch (_) {}
          } else {
            doc.setFillColor(241, 245, 249); doc.rect(21, fy + 3, 36, 36, 'F');
            doc.setFontSize(7); doc.setTextColor(120);
            doc.text('NO CAPTURE', 28, fy + 22);
          }
          // Finding heading
          doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.setTextColor(...sevColor);
          doc.text(`${idx + 1}. ${f.joint}`, 62, fy + 7);
          doc.setFontSize(8); doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42);
          let metaTxt = '';
          if (f.angle != null) metaTxt = `Max ${f.angle.toFixed(1)}°  ·  Normal ${f.normal[0]}-${f.normal[1]}°  ·  ${f.status.toUpperCase()}  ·  Severity: ${f.sev.toUpperCase()}`;
          else if (f.asymPct != null) metaTxt = `Asymmetry ${f.asymPct.toFixed(1)}%  ·  L=${f.leftVal.toFixed(1)}°  R=${f.rightVal.toFixed(1)}°  ·  ${f.sev.toUpperCase()}`;
          else if (f.deviationPct != null) metaTxt = `Frontal deviation ${Math.abs(f.deviationPct).toFixed(1)}%  ·  ${f.sev.toUpperCase()}`;
          doc.text(metaTxt, 62, fy + 12);
          // Consequences bullet list
          doc.setFontSize(7.5); doc.setTextColor(51, 65, 85);
          doc.setFont(undefined, 'bold'); doc.text('POTENTIAL CLINICAL CONSEQUENCES:', 62, fy + 18);
          doc.setFont(undefined, 'normal');
          let cy = fy + 22;
          (f.consequences || []).slice(0, 6).forEach((c) => {
            const wrapped = doc.splitTextToSize(`• ${c}`, 130);
            doc.text(wrapped, 62, cy);
            cy += wrapped.length * 3.4;
            if (cy > fy + cardH - 2) return;
          });
          fy += cardH + 4;
        });
        drawFooter();

        // Add a tally that will be persisted in the saved-session flags so the
        // research dashboard can count "sessions with abnormal findings".
        recordedFlags.current.push({ type: 'pdf_consequences', data: { findings_count: findings.length, severities: findings.map(f => f.sev) } });
      }

      // ── PAGE: Clinical Observations + Recommendations ──
      doc.addPage(); drawPageChrome('CLINICAL OBSERVATIONS & RECOMMENDATIONS');
      doc.setTextColor(15, 23, 42); doc.setFontSize(12); doc.setFont(undefined, 'bold');
      doc.text('AUTO-GENERATED OBSERVATIONS', 14, 24);
      doc.setDrawColor(16, 185, 129); doc.line(14, 26, 196, 26);
      doc.setFont(undefined, 'normal'); doc.setFontSize(9); doc.setTextColor(51, 65, 85);

      const observations = [];
      for (const def of ANGLE_DEFS) {
        const cur = angles[def.id];
        if (typeof cur !== 'number') continue;
        if (cur < def.normal[0]) observations.push(`${def.label} flexion of ${cur.toFixed(1)}° is BELOW the normal range (${def.normal[0]}-${def.normal[1]}°). Consider passive ROM mobilization and active assisted exercises.`);
        else if (cur > def.normal[1]) observations.push(`${def.label} angle of ${cur.toFixed(1)}° is ABOVE the normal range — assess for hypermobility or compensatory pattern.`);
      }
      for (const [, lk, rk] of lrPairs) {
        const lv = angles[lk], rv = angles[rk];
        if (typeof lv === 'number' && typeof rv === 'number') {
          const pct = Math.max(lv, rv) > 0 ? Math.abs(lv - rv) / Math.max(lv, rv) * 100 : 0;
          if (pct >= 10) observations.push(`${lk.split('_')[1]} bilateral asymmetry of ${pct.toFixed(1)}% (L=${lv.toFixed(1)}°, R=${rv.toFixed(1)}°) — focus on the weaker side.`);
        }
      }
      Object.entries(improvements).forEach(([jid, d]) => {
        if (typeof d === 'number' && d <= -5) {
          const def = ANGLE_DEFS.find(x => x.id === jid);
          observations.push(`${def?.label || jid} ROM regressed by ${Math.abs(d).toFixed(1)}° vs last session. Review home exercise compliance.`);
        }
        if (typeof d === 'number' && d >= 5) {
          const def = ANGLE_DEFS.find(x => x.id === jid);
          observations.push(`${def?.label || jid} ROM improved by ${d.toFixed(1)}° vs last session — encourage continued effort.`);
        }
      });
      if (observations.length === 0) {
        observations.push('All measured joint angles are within normal range for the captured frame. Continue current protocol and re-assess after 2 weeks.');
      }

      let oy = 32;
      observations.forEach((obs, i) => {
        if (oy > 270) { drawFooter(); doc.addPage(); drawPageChrome('CLINICAL OBSERVATIONS (CONT.)'); oy = 24; }
        const wrapped = doc.splitTextToSize(`${i + 1}. ${obs}`, 178);
        // bullet circle
        doc.setFillColor(0, 229, 255); doc.circle(16, oy - 1.5, 1.4, 'F');
        doc.text(wrapped, 20, oy);
        oy += wrapped.length * 4.5 + 2;
      });

      // Recommended next steps
      oy += 4;
      doc.setFont(undefined, 'bold'); doc.setFontSize(11); doc.setTextColor(15, 23, 42);
      doc.text('RECOMMENDED NEXT STEPS', 14, oy);
      doc.setDrawColor(168, 85, 247); doc.line(14, oy + 2, 196, oy + 2);
      oy += 8;
      doc.setFont(undefined, 'normal'); doc.setFontSize(9); doc.setTextColor(51, 65, 85);
      const recs = [
        `Schedule a follow-up Live Pose session in 1 week to track ROM trend (current avg improvement: ${avgImp}°).`,
        `Continue the prescribed home exercise plan. Patient should aim for ${mode === 'squat' ? `${Math.max(reps, 12)}+ squats` : '15 min of guided movement'} daily.`,
        `Review the auto-captured max-angle frames in this report to demonstrate progress to the patient.`,
        Math.round(symmetryScore) < 80 ? 'Focus on bilateral symmetry — prescribe unilateral strengthening for the weaker side.' : 'Maintain bilateral balance with mirror exercises.',
      ];
      recs.forEach((r, i) => {
        if (oy > 275) { drawFooter(); doc.addPage(); drawPageChrome('RECOMMENDATIONS (CONT.)'); oy = 24; }
        const wrapped = doc.splitTextToSize(`${i + 1}. ${r}`, 178);
        doc.setFillColor(168, 85, 247); doc.circle(16, oy - 1.5, 1.4, 'F');
        doc.text(wrapped, 20, oy);
        oy += wrapped.length * 4.5 + 2;
      });

      // Clinician Notes
      if (notes && notes.trim()) {
        oy += 6;
        if (oy > 250) { drawFooter(); doc.addPage(); drawPageChrome('CLINICIAN NOTES'); oy = 24; }
        doc.setFont(undefined, 'bold'); doc.setFontSize(11); doc.setTextColor(15, 23, 42);
        doc.text('CLINICIAN NOTES', 14, oy);
        doc.setDrawColor(236, 72, 153); doc.line(14, oy + 2, 196, oy + 2);
        oy += 7;
        doc.setFont(undefined, 'normal'); doc.setFontSize(9); doc.setTextColor(51, 65, 85);
        const split = doc.splitTextToSize(notes, 182);
        doc.text(split, 14, oy);
      }

      drawFooter();

      // Page numbers footer
      const total = doc.internal.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        doc.setFontSize(7); doc.setTextColor(140);
        doc.text(`Page ${i} of ${total}`, 196, 290, { align: 'right' });
      }

      doc.save(`WBA99_LivePose_${(patientName || 'patient').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('PDF export failed: ' + (err?.message || 'unknown error') + '\n\nPlease start a Live Pose session first so there is data to include in the report.');
    }
  };

  // ─── Render ───
  return (
    <div className="space-y-0 -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8" data-testid="live-pose-page">

      {/* ─── Top bar ─── */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-border bg-background">
        <div className="w-9 h-9 rounded-md border-2 border-primary flex items-center justify-center text-[10px] font-black text-primary">W99</div>
        <div>
          <div className="text-base font-bold text-text tracking-wide">
            {proMode ? 'LIVE POSE 2 · PRO ANALYZER' : 'LIVE POSE · AI BIOMECHANICS'}
            {proMode && <span className="ml-2 font-mono text-[9px] px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/40 text-amber-400">PRO</span>}
          </div>
          <div className="font-mono text-[9px] text-text-muted/50">
            {proMode ? 'BACK CAMERA · FMS · GAIT · KNEE VALGUS/VARUS · MULTI-VIEW' : 'MEDIAPIPE · 33 LANDMARKS · 10 JOINT ANGLES · REAL-TIME'}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => {
              const next = cameraFacing === 'user' ? 'environment' : 'user';
              setCameraFacing(next);
              if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
                setTimeout(() => startCamera(), 200);
              }
            }}
            className={`font-mono text-[9px] px-2 py-1 rounded font-bold border ${cameraFacing === 'environment' ? 'bg-amber-400/15 border-amber-400/40 text-amber-400' : 'bg-primary/10 border-primary/30 text-primary'}`}
            data-testid="camera-flip-btn"
            title="Flip between front (selfie) and back camera"
          >
            <RefreshCcw size={10} className="inline mr-1" />
            {cameraFacing === 'environment' ? 'BACK' : 'FRONT'}
          </button>
          <div className="font-mono text-[9px] px-2 py-1 rounded bg-primary/10 border border-primary/30 text-primary">
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${status === 'running' ? 'animate-pulse' : ''} ${status === 'running' ? 'bg-emerald-400' : status === 'error' ? 'bg-red-500' : 'bg-primary'}`} />
            {status.toUpperCase()}
          </div>
          <div className="font-mono text-[9px] px-2 py-1 rounded bg-input border border-border text-text-muted" data-testid="fps-display">
            <Gauge size={10} className="inline mr-1" /> {fps} FPS
          </div>
        </div>
      </div>


      {/* ─── Mode tabs ─── */}
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto bg-background border-b border-border">
        {(proMode ? [...PRO_MODES, ...MODES] : MODES).map(m => {
          const Ico = m.icon;
          const active = mode === m.id;
          const isPro = PRO_MODES.some(pm => pm.id === m.id);
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex-shrink-0 px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-semibold transition-colors border ${
                active
                  ? isPro ? 'bg-amber-400/15 border-amber-400/40 text-amber-400' : 'bg-primary/15 border-primary/40 text-primary'
                  : 'bg-input border-border text-text-muted hover:text-text hover:border-border'
              }`}
              data-testid={`mode-${m.id}`}
            >
              <Ico size={14} /> {m.label}
            </button>
          );
        })}
      </div>

      {/* ─── Main video + stats ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 p-3">
        {/* Video */}
        <div className="lg:col-span-2 relative rounded-xl overflow-hidden bg-black border border-border" style={{ minHeight: 420 }}>
          <video ref={videoRef} className="hidden" playsInline muted />
          <canvas ref={canvasRef} className="w-full h-auto" style={{ display: 'block', minHeight: 420 }} data-testid="pose-canvas" />

          {/* Idle / loading / error overlay */}
          {status !== 'running' && mode !== 'video' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/92">
              {status === 'idle' && (
                <>
                  <Camera size={64} className="mb-4 text-primary" />
                  <p className="font-black tracking-wide text-lg text-white mb-2">CAMERA OFFLINE</p>
                  <p className="font-mono text-[10px] mb-4 text-text-muted/60">Grant camera permission to begin real-time pose analysis</p>
                  <button
                    onClick={startCamera}
                    className="px-6 py-3 rounded-lg font-bold text-sm bg-primary text-white hover:bg-primary/90 transition"
                    data-testid="start-camera-btn"
                  >
                    <Play size={14} className="inline mr-2" /> START CAMERA
                  </button>
                </>
              )}
              {status === 'loading-model' && (
                <>
                  <Loader2 size={48} className="animate-spin mb-3 text-primary" />
                  <p className="font-black tracking-wide text-sm text-white">LOADING AI MODEL…</p>
                  <p className="font-mono text-[10px] mt-2 text-text-muted/60">MediaPipe Pose · ~3 MB · cached after first load</p>
                </>
              )}
              {status === 'ready' && (
                <>
                  <CheckCircle size={48} className="mb-3 text-emerald-400" />
                  <p className="font-black tracking-wide text-sm text-white mb-3">MODEL READY · CAMERA STOPPED</p>
                  <button
                    onClick={startCamera}
                    className="px-6 py-3 rounded-lg font-bold text-sm bg-primary text-white hover:bg-primary/90 transition"
                    data-testid="restart-camera-btn"
                  >
                    <Play size={14} className="inline mr-2" /> RESUME
                  </button>
                </>
              )}
              {status === 'error' && (
                <>
                  <AlertTriangle size={48} className="mb-3 text-red-500" />
                  <p className="font-black tracking-wide text-sm text-red-500">ERROR</p>
                  <p className="font-mono text-[10px] my-3 max-w-md text-text-muted">{error}</p>
                  <button
                    onClick={startCamera}
                    className="px-5 py-2 rounded-lg text-xs font-bold bg-primary/10 border border-primary/40 text-primary hover:bg-primary/20 transition"
                    data-testid="retry-camera-btn"
                  >
                    <RefreshCcw size={12} className="inline mr-2" /> RETRY
                  </button>
                </>
              )}
            </div>
          )}

          {/* Video Upload mode UI */}
          {mode === 'video' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/92">
              {!videoProcessing ? (
                <>
                  <Upload size={64} className="mb-4 text-primary" />
                  <p className="font-black tracking-wide text-lg text-white mb-2">VIDEO UPLOAD ANALYSIS</p>
                  <p className="font-mono text-[10px] mb-5 max-w-md text-text-muted/60">
                    Upload a walking, squatting, or posture video. The AI samples 6 frames per second and produces a full biomechanics report.
                  </p>
                  <label className="px-6 py-3 rounded-lg font-bold text-sm cursor-pointer inline-block bg-primary text-white hover:bg-primary/90 transition" data-testid="video-upload-label">
                    <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} data-testid="video-upload-input" />
                    <Upload size={14} className="inline mr-2" /> SELECT VIDEO
                  </label>
                  {videoFile && <p className="font-mono text-[9px] mt-3 text-text-muted">Last: {videoFile.name}</p>}
                </>
              ) : (
                <>
                  <Loader2 size={48} className="animate-spin mb-3 text-primary" />
                  <p className="font-black tracking-wide text-sm text-white mb-2">PROCESSING…</p>
                  <div className="w-80 h-2 rounded-full overflow-hidden bg-input">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${videoProgress}%` }} data-testid="video-progress" />
                  </div>
                  <p className="font-mono text-[10px] mt-2 text-text-muted/60">{videoProgress}% · sampling at 6 fps</p>
                </>
              )}
            </div>
          )}

          {/* Running controls */}
          {status === 'running' && (
            <div className="absolute top-2 right-2 flex gap-2 flex-wrap justify-end">
              <select
                value={proEngine}
                onChange={async (e) => {
                  const next = e.target.value;
                  setProEngine(next);
                  if (next !== 'free') {
                    setYoloEnabled(true);
                  } else if (next === 'free' && !movenetRef.current) {
                    await loadMovenet();
                  }
                }}
                className={`font-mono text-[10px] px-2 py-1.5 rounded-lg font-bold cursor-pointer border ${proEngine !== 'free' ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-black/70 border-white/20 text-white/80'}`}
                data-testid="pro-engine-select"
                title={proStatus.available ? 'fal.ai GPU models available' : 'fal.ai not configured — will auto-fallback to free'}
              >
                <option value="free">⚡ FREE · MoveNet</option>
                <option value="yolov8-pose">★ YOLOv8 Pose</option>
                <option value="mediapipe-holistic">★ MP Holistic</option>
                <option value="blazepose">★ BlazePose</option>
                <option value="sam2">★ SAM-2 Seg</option>
                <option value="depth">★ Depth Est</option>
              </select>
              <button
                onClick={async () => {
                  const next = !yoloEnabled;
                  if (next && proEngine === 'free' && !movenetRef.current) await loadMovenet();
                  setYoloEnabled(next);
                }}
                className={`font-mono text-[10px] px-3 py-1.5 rounded-lg font-bold border ${yoloEnabled ? 'bg-violet-400/20 border-violet-400/40 text-violet-400' : 'bg-black/70 border-white/20 text-white/80'}`}
                data-testid="yolo-toggle"
                title="Multi-person tracking — uses selected Pro Engine or auto-falls back to free"
              >
                MULTI {yoloEnabled ? `(${yoloPersons})` : 'OFF'}
              </button>
              <button
                onClick={() => setRecording(r => !r)}
                className={`font-mono text-[10px] px-3 py-1.5 rounded-lg font-bold border ${recording ? 'bg-red-500/15 border-red-500/40 text-red-400' : 'bg-black/70 border-white/20 text-white/80'}`}
                data-testid="record-btn"
              >
                ● {recording ? 'REC' : 'RECORD'}
              </button>
              <button
                onClick={stopCamera}
                className="font-mono text-[10px] px-3 py-1.5 rounded-lg font-bold border bg-black/70 border-white/20 text-white/80"
                data-testid="stop-camera-btn"
              >
                <Square size={10} className="inline mr-1" /> STOP
              </button>
            </div>
          )}

          {/* 3D Avatar mount (only when avatar3d mode) */}
          {mode === 'avatar3d' && (
            <div
              ref={threeMountRef}
              className="absolute top-2 left-2 rounded-lg overflow-hidden"
              style={{ width: 280, height: 320, border: '2px solid var(--color-primary)', background: '#000' }}
              data-testid="three-mount"
            />
          )}

          {/* Rigged Mixamo GLTF avatar mount */}
          {mode === 'avatar3d-rigged' && (
            <div
              className="absolute top-2 left-2 rounded-lg overflow-hidden border-2 border-primary bg-black"
              style={{ width: 320, height: 380 }}
              data-testid="rigged-mount"
            >
              <RiggedAvatar3D ref={riggedAvatarRef} />
            </div>
          )}

          {/* Pro engine fallback notice */}
          {proStatus.lastError && (
            <div className="absolute top-2 left-2 px-3 py-2 rounded-lg max-w-xs bg-amber-500/15 border border-amber-500/40" data-testid="pro-fallback-notice">
              <div className="text-[10px] font-bold text-amber-400">★ PRO → FREE</div>
              <div className="text-[9px] mt-0.5 text-white/70">{String(proStatus.lastError).slice(0, 80)}</div>
              <button onClick={() => setProStatus(s => ({ ...s, lastError: null }))} className="text-[9px] mt-1 underline text-amber-400">dismiss</button>
            </div>
          )}

          {/* Game HUD overlay (squat/reach/gait) */}
          {status === 'running' && mode === 'squat' && (
            <div className="absolute bottom-3 left-3 px-4 py-2 rounded-lg flex items-center gap-3 bg-black/75 border-2 border-emerald-400/60" data-testid="squat-counter">
              <div>
                <div className="font-mono text-[9px] text-white/50">SQUAT REPS</div>
                <div className="font-black text-3xl text-emerald-400">{reps}</div>
              </div>
              <button
                onClick={() => { setVoiceCoachOn(v => !v); if (!voiceCoachOn) speak('Voice coach activated'); else window.speechSynthesis?.cancel(); }}
                className={`font-mono text-[10px] px-3 py-2 rounded-lg font-bold flex items-center gap-1 border ${voiceCoachOn ? 'bg-emerald-400/20 border-emerald-400/50 text-emerald-400' : 'bg-white/5 border-white/20 text-white/70'}`}
                data-testid="voice-coach-toggle"
                title="AI Voice Coach"
              >
                {voiceCoachOn ? <Mic size={12} /> : <MicOff size={12} />} COACH {voiceCoachOn ? 'ON' : 'OFF'}
              </button>
            </div>
          )}
          {status === 'running' && mode === 'reach' && (
            <div className="absolute bottom-3 left-3 px-4 py-2 rounded-lg flex gap-4 bg-black/75 border-2 border-amber-400/60" data-testid="reach-hud">
              <div>
                <div className="font-mono text-[9px] text-white/50">SCORE</div>
                <div className="font-black text-2xl text-amber-400">{reachScore}</div>
              </div>
              <div>
                <div className="font-mono text-[9px] text-white/50">TIME</div>
                <div className={`font-black text-2xl ${reachTimer < 10 ? 'text-red-400' : 'text-white'}`}>{reachTimer}s</div>
              </div>
            </div>
          )}
          {status === 'running' && mode === 'gait' && (
            <div className="absolute bottom-3 left-3 px-4 py-2 rounded-lg bg-black/75 border-2 border-violet-400/60" data-testid="gait-hud">
              <div className="font-mono text-[9px] text-white/50">GAIT PHASE</div>
              <div className="font-black text-lg text-violet-400">{gaitPhase}</div>
            </div>
          )}
        </div>

        {/* Stats column */}
        <div className="space-y-3" data-testid="stats-panel">
          {/* Scores */}
          <div className="bg-surface border border-border rounded-xl p-3">
            <div className="font-mono text-[8px] mb-2 text-text-muted/60 tracking-widest">PERFORMANCE</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 rounded bg-input">
                <div className="font-black text-2xl text-primary" data-testid="posture-score">{Math.round(postureScore)}</div>
                <div className="font-mono text-[8px] text-text-muted/60">POSTURE</div>
              </div>
              <div className="text-center p-2 rounded bg-input">
                <div className="font-black text-2xl text-emerald-400" data-testid="symmetry-score">{Math.round(symmetryScore)}</div>
                <div className="font-mono text-[8px] text-text-muted/60">SYMMETRY</div>
              </div>
            </div>
          </div>

          {/* ─── PRO MODE: Knee Valgus/Varus Live HUD ─── */}
          {proMode && (mode === 'valgus' || mode === 'walk-front' || mode === 'fms-squat') && (
            <div className="bg-surface border border-border rounded-xl p-3" data-testid="valgus-hud">
              <div className="font-mono text-[8px] mb-2 text-amber-400 tracking-widest">KNEE FRONTAL ALIGNMENT · L vs R</div>
              {['L', 'R'].map(side => {
                const d = valgusData[side];
                if (!d) return (
                  <div key={side} className="flex items-center justify-between text-[10px] font-mono px-2 py-1.5 mb-1 rounded bg-input text-text-muted/40">
                    <span>{side === 'L' ? 'LEFT' : 'RIGHT'}</span><span>—</span>
                  </div>
                );
                const colClass = d.severity === 'neutral' ? 'text-emerald-400' : (d.severity === 'mild' ? 'text-amber-400' : 'text-red-400');
                return (
                  <div key={side} className="flex items-center justify-between px-2 py-1.5 mb-1 rounded bg-input border border-border" data-testid={`valgus-${side}`}>
                    <span className="font-mono text-[10px] text-text-muted">{side === 'L' ? 'LEFT' : 'RIGHT'}</span>
                    <span className={`font-black text-xs ${colClass}`}>
                      {d.label} · {(d.normalized * 100).toFixed(0)}%
                    </span>
                    <span className="font-mono text-[9px] text-text-muted/60">{d.severity.toUpperCase()}</span>
                  </div>
                );
              })}
              <div className="font-mono text-[8px] mt-2 text-text-muted/60">
                Yellow dashed line = hip→ankle reference. Coloured segment = knee deviation. Patient must face the camera (frontal plane).
              </div>
            </div>
          )}

          {/* ─── Voice ROM Coach ─── */}
          <div className="bg-surface border border-border rounded-xl p-3" data-testid="rom-voice-card">
            <div className="flex items-center justify-between mb-2">
              <div className="font-mono text-[8px] text-text-muted/60 tracking-widest">
                VOICE ROM COACH · MAX RANGE ANNOUNCE
              </div>
              <button
                onClick={() => {
                  const next = !romVoiceOn;
                  setRomVoiceOn(next);
                  if (next) {
                    try { new Audio().play().catch(() => {}); } catch (e) {}
                    speakHQ('Voice range coach activated. Move into your maximum range.');
                  }
                }}
                className={`font-mono text-[10px] px-2.5 py-1 rounded font-bold flex items-center gap-1 border ${romVoiceOn ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-input border-border text-text-muted'}`}
                data-testid="rom-voice-toggle"
              >
                {romVoiceOn ? <Mic size={11} /> : <MicOff size={11} />} {romVoiceOn ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="font-mono text-[9px] mb-2 text-text-muted/60 leading-relaxed">
              Pick the joints to monitor. When you reach a new max angle (≥5° gain), the AI voice announces it in real time.
            </div>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {ANGLE_DEFS.map(def => {
                const active = romTrackedJoints.has(def.id);
                const lastVal = romLastAnnounced[def.id];
                return (
                  <button
                    key={def.id}
                    onClick={() => toggleRomJoint(def.id)}
                    className="font-mono text-[9px] px-2 py-1 rounded font-bold transition-colors border"
                    style={{
                      background: active ? `${def.color}22` : 'var(--color-input)',
                      borderColor: active ? def.color : 'var(--color-border)',
                      color: active ? def.color : 'var(--color-text-muted)',
                    }}
                    data-testid={`rom-chip-${def.id}`}
                  >
                    {def.label}
                    {active && typeof lastVal === 'number' && (
                      <span className="ml-1 opacity-85">· {lastVal}°</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={romVoice}
                onChange={e => setRomVoice(e.target.value)}
                className="font-mono text-[10px] px-2 py-1 rounded flex-1 outline-none bg-input border border-border text-text"
                data-testid="rom-voice-select"
              >
                <option value="nova">Voice: Nova (warm female)</option>
                <option value="shimmer">Voice: Shimmer (bright female)</option>
                <option value="alloy">Voice: Alloy (neutral)</option>
                <option value="echo">Voice: Echo (male)</option>
                <option value="onyx">Voice: Onyx (deep male)</option>
              </select>
              <button
                onClick={resetRomBaseline}
                className="font-mono text-[10px] px-2 py-1 rounded font-bold bg-amber-400/10 border border-amber-400/30 text-amber-400"
                data-testid="rom-reset-btn"
                title="Reset announced baseline so all current max ranges can be re-spoken"
              >
                <RefreshCcw size={10} className="inline mr-1" />Reset
              </button>
            </div>
            {romVoiceOn && romTrackedJoints.size === 0 && (
              <div className="font-mono text-[9px] mt-2 px-2 py-1 rounded bg-amber-400/10 border border-amber-400/30 text-amber-400">
                ⚠ Select at least one joint chip above to hear announcements.
              </div>
            )}
          </div>

          {/* Joint angles list */}
          <div className="bg-surface border border-border rounded-xl p-3 max-h-[420px] overflow-y-auto">
            <div className="font-mono text-[8px] mb-2 text-text-muted/60 tracking-widest">JOINT ANGLES · LIVE / MAX / IMPROVEMENT</div>
            <div className="space-y-2">
              {ANGLE_DEFS.map(def => {
                const v = angles[def.id];
                const maxSnap = maxSnapshots[def.id];
                const prev = previousMaxes[def.id];
                const delta = improvements[def.id];
                const [lo, hi] = def.normal;
                const inRange = v != null && v >= lo && v <= hi;
                return (
                  <div key={def.id} className="rounded-md p-2 bg-input border border-border" data-testid={`angle-${def.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 rounded" style={{ background: def.color }} />
                        <span className="font-mono text-[10px] text-text-muted">{def.label}</span>
                      </div>
                      <span className={`font-black text-sm ${v != null ? (inRange ? 'text-emerald-400' : 'text-amber-400') : 'text-text-muted/30'}`} data-testid={`angle-live-${def.id}`}>
                        {v != null ? `${v.toFixed(0)}°` : '—'}
                      </span>
                    </div>
                    {(maxSnap || prev !== undefined) && (
                      <div className="flex justify-between items-center mt-1 text-[9px] text-text-muted/60 font-mono">
                        <span>Max: <b className="text-primary">{maxSnap ? `${maxSnap.angle.toFixed(0)}°` : '—'}</b></span>
                        {typeof prev === 'number' && <span>Prev: {prev.toFixed(0)}°</span>}
                        {typeof delta === 'number' && (
                          <span className={`px-1.5 py-0.5 rounded font-bold ${delta >= 0 ? 'bg-emerald-400/15 text-emerald-400' : 'bg-red-400/12 text-red-400'}`} data-testid={`delta-${def.id}`}>
                            {delta >= 0 ? '+' : ''}{delta.toFixed(1)}°
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Max-angle snapshots gallery */}
          {Object.keys(maxSnapshots).length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-3 max-h-[260px] overflow-y-auto" data-testid="max-snapshots-card">
              <div className="font-mono text-[8px] mb-2 text-text-muted/60 tracking-widest">MAX-ANGLE SNAPSHOTS · {Object.keys(maxSnapshots).length}</div>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(maxSnapshots).filter(([, s]) => s.dataUrl).map(([k, snap]) => {
                  const def = ANGLE_DEFS.find(d => d.id === k);
                  return (
                    <div key={k} className="rounded overflow-hidden border border-border" data-testid={`max-snap-${k}`}>
                      <img src={snap.dataUrl} alt={k} className="w-full h-16 object-cover" />
                      <div className="px-1.5 py-0.5 text-[9px] bg-input font-mono" style={{ color: def?.color || 'var(--color-text)' }}>
                        {def?.label || k}: {snap.angle.toFixed(0)}°
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="bg-surface border border-border rounded-xl p-3 space-y-2">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Clinical notes..."
              rows={2}
              className="w-full font-mono text-[10px] p-2 rounded outline-none bg-input border border-border text-text placeholder:text-text-muted/50"
              data-testid="session-notes"
            />
            <div className="flex gap-2">
              <button
                onClick={saveSession}
                disabled={saving}
                className="flex-1 text-[11px] font-bold py-2 rounded disabled:opacity-30 bg-primary text-white hover:bg-primary/90 transition"
                data-testid="save-session-btn"
              >
                {saving ? <Loader2 size={12} className="inline animate-spin mr-1" /> : <Save size={12} className="inline mr-1" />}
                SAVE
              </button>
              <button
                onClick={exportPDF}
                disabled={status !== 'running' && Object.keys(angles).length === 0 && Object.keys(maxSnapshots).length === 0}
                className="flex-1 text-[11px] font-bold py-2 rounded disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/20 transition"
                data-testid="export-pdf-btn"
                title="Generate detailed clinical PDF report"
              >
                <Download size={12} className="inline mr-1" /> PDF
              </button>
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-3 max-h-[180px] overflow-y-auto">
              <div className="font-mono text-[8px] mb-2 text-text-muted/60 tracking-widest">RECENT SESSIONS</div>
              <div className="space-y-1.5">
                {history.slice(0, 8).map(s => (
                  <div key={s.id} className="flex items-center justify-between text-[10px] font-mono p-1.5 rounded bg-input">
                    <div>
                      <div className="text-text">{s.mode?.toUpperCase()}</div>
                      <div className="text-text-muted/60">{s.created_at?.split('T')[0]}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-primary">{s.posture_score || 0}</div>
                      {s.reps > 0 && <div className="text-emerald-400">{s.reps} reps</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom mode description */}
      <div className="px-4 pb-4">
        <div className="bg-surface border border-border rounded-xl p-3 flex items-start gap-3">
          <ChevronRight size={16} className="mt-0.5 flex-shrink-0 text-primary" />
          <div>
            <div className="text-[11px] font-bold text-text">{MODES.find(m => m.id === mode)?.label}</div>
            <div className="font-mono text-[10px] mt-0.5 text-text-muted">{MODES.find(m => m.id === mode)?.desc}</div>
            {mode === 'squat' && <div className="font-mono text-[9px] mt-1 text-text-muted/60">Bend knees below 110° then return above 160° to count a rep.</div>}
            {mode === 'reach' && <div className="font-mono text-[9px] mt-1 text-text-muted/60">Move either hand to touch the yellow targets within the 60-second window.</div>}
            {mode === 'gait' && <div className="font-mono text-[9px] mt-1 text-text-muted/60">Walk in place facing the camera. System detects foot contact / swing phases.</div>}
          </div>
        </div>
      </div>

      <PatientSelectSaveModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleFirebaseSave}
        saving={saving}
        preselectedPatientId={patientId}
      />
    </div>
  );
}
