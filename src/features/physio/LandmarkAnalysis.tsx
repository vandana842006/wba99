import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { firebaseDB } from "../../core/firebase";
import { useAuth } from "../../context/AuthContext";
import {
  ArrowLeft, Grid3X3, AlignCenter, Tag, RotateCcw,
  Upload, Printer, ZoomIn, ZoomOut, Maximize2,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { PatientSelectSaveModal } from "./patients/PatientSelectSaveModal";
import type { Patient } from "../../types";
import toast from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────
interface Dot    { x: number; y: number }        // canvas-px / image-px (for math)
interface RelDot { rx: number; ry: number }      // image-relative 0–1 (stored)
type Dots    = Record<string, Dot>
type RelDots = Record<string, RelDot>
interface LM { id: string; lbl: string; rx: number; ry: number }
type Status = "good" | "warn" | "bad"

interface Finding {
  id: string; region: string; icon: string; status: Status
  alignment: string; angleVal: number; angleUnit: string; angleLbl: string
  normal: string; barPct: number
  metric1Lbl: string; metric1Val: string; metric1St: Status
  metric2Lbl: string; metric2Val: string; metric2St: Status
  bar1Lbl: string; bar1Val: number; bar1Max: number; bar1St: Status
  bar2Lbl: string; bar2Val: number; bar2Max: number; bar2Unit: string; bar2St: Status
  causes: string[]; consequences: string[]; rehab: string[]; evidence: string
}

// ── Mode meta ─────────────────────────────────────────────
const MODE_META: Record<string, { label: string; hint: string }> = {
  front:   { label: "Anterior View",   hint: "Patient faces camera · Upload a front-facing full-body photo" },
  back:    { label: "Posterior View",  hint: "Patient faces away · Upload a rear-facing full-body photo" },
  lateral: { label: "Lateral View",    hint: "Patient side-on · Upload a lateral full-body photo" },
  head:    { label: "Head-Neck",       hint: "Patient faces camera · Focus on head and cervical region" },
  trunk:   { label: "Trunk Symmetry",  hint: "Patient faces camera · Full body for trunk analysis" },
  quick:   { label: "Quick Analysis",  hint: "Patient faces camera · Rapid full-body posture scan" },
};

// ── Landmark definitions ──────────────────────────────────
const LM_FRONT: LM[] = [
  { id:"rEar",   lbl:"R. Tragus",          rx:.38, ry:.07 },
  { id:"lEar",   lbl:"L. Tragus",          rx:.62, ry:.07 },
  { id:"rAcr",   lbl:"R. Acromion",        rx:.29, ry:.22 },
  { id:"lAcr",   lbl:"L. Acromion",        rx:.71, ry:.22 },
  { id:"rElb",   lbl:"R. Lat.Epicondyle",  rx:.22, ry:.42 },
  { id:"lElb",   lbl:"L. Lat.Epicondyle",  rx:.78, ry:.42 },
  { id:"rASIS",  lbl:"R. ASIS",            rx:.38, ry:.51 },
  { id:"lASIS",  lbl:"L. ASIS",            rx:.62, ry:.51 },
  { id:"rWrist", lbl:"R. Radial Styloid",  rx:.20, ry:.56 },
  { id:"lWrist", lbl:"L. Radial Styloid",  rx:.80, ry:.56 },
  { id:"rPat",   lbl:"R. Mid-Patella",     rx:.39, ry:.73 },
  { id:"lPat",   lbl:"L. Mid-Patella",     rx:.61, ry:.73 },
  { id:"rMal",   lbl:"R. Lat.Malleolus",   rx:.39, ry:.91 },
  { id:"lMal",   lbl:"L. Lat.Malleolus",   rx:.61, ry:.91 },
];

const LM_LATERAL: LM[] = [
  { id:"ear",   lbl:"Tragus",         rx:.52, ry:.10 },
  { id:"cVert", lbl:"C7 Vertebra",    rx:.43, ry:.17 },
  { id:"acr",   lbl:"Acromion",       rx:.44, ry:.22 },
  { id:"gTroc", lbl:"Gr.Trochanter",  rx:.44, ry:.50 },
  { id:"fibHd", lbl:"Fib.Head",       rx:.47, ry:.68 },
  { id:"lMal",  lbl:"Lat.Malleolus",  rx:.47, ry:.90 },
  { id:"rASIS", lbl:"ASIS",           rx:.40, ry:.47 },
  { id:"rPSIS", lbl:"PSIS",           rx:.50, ry:.50 },
];

// ── Math helpers ──────────────────────────────────────────
function vecAngle(a: Dot, pivot: Dot, b: Dot): number {
  const v1x = a.x - pivot.x, v1y = a.y - pivot.y;
  const v2x = b.x - pivot.x, v2y = b.y - pivot.y;
  const dot = v1x*v2x + v1y*v2y;
  const mag = Math.sqrt((v1x*v1x + v1y*v1y) * (v2x*v2x + v2y*v2y));
  return mag ? Math.acos(Math.max(-1, Math.min(1, dot/mag))) * 180 / Math.PI : 0;
}
function horizAngleDeg(a: Dot, b: Dot): number { return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI; }
function dist(a: Dot, b: Dot): number { return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2); }
function pct(num: number, base: number): number { return parseFloat((num / base * 100).toFixed(1)); }

// ── Findings calculation (receives image-pixel-space Dots) ─
function calcFindings(D: Dots, isLateral: boolean): Finding[] {
  const F: Finding[] = [];

  if (!isLateral) {
    if (D.rEar && D.lEar) {
      const deg = parseFloat(Math.abs(horizAngleDeg(D.rEar, D.lEar)).toFixed(1));
      const side = D.rEar.y > D.lEar.y ? "Tilted Right" : "Tilted Left";
      const st: Status = deg < 2 ? "good" : deg < 5 ? "warn" : "bad";
      F.push({
        id:"head", region:"Head", icon:"👤", status:st,
        alignment: deg < 2 ? "Aligned" : deg < 5 ? `Slight Tilt ${deg}°` : `${side} ${deg}°`,
        angleVal:deg, angleUnit:"°", angleLbl:"Head Tilt", normal:"0 – 2°",
        barPct: Math.min(deg/10*100, 100),
        metric1Lbl:"HEAD TILT",    metric1Val:`${deg}°`,                             metric1St:st,
        metric2Lbl:"CERVICAL LOAD",metric2Val:deg>2 ? `+${(deg*0.9).toFixed(1)}kg` : "+0.0kg", metric2St:st,
        bar1Lbl:"Head Tilt",    bar1Val:deg,              bar1Max:10,  bar1St:st,
        bar2Lbl:"Cervical Load",bar2Val:Math.min(deg*9,100),bar2Max:100,bar2Unit:"%",bar2St:st,
        causes:       deg<2 ? ["N/A"] : ["Unilateral muscle tension","Habitual head posture","Ocular imbalance"],
        consequences: deg<2 ? ["N/A"] : ["Cervical pain","Headaches","Limited ROM"],
        rehab:        deg<2 ? [] : ["Chin tuck ×10 reps, 3 sets","Cervical lateral flexion stretch 3×30s","Upper trapezius release 2×45s each side"],
        evidence:"Souza et al. (2020) J.Manip.Physiol.Ther. Normal head tilt 0-2°. >5° clinically significant.",
      });
    }
    if (D.rAcr && D.lAcr) {
      const sw = dist(D.rAcr, D.lAcr);
      const deg = pct(Math.abs(D.rAcr.y - D.lAcr.y), sw);
      const side = D.rAcr.y > D.lAcr.y ? "Elevation Left" : "Elevation Right";
      const st: Status = deg < 5 ? "good" : deg < 12 ? "warn" : "bad";
      F.push({
        id:"shoulders", region:"Shoulders", icon:"🦴", status:st,
        alignment: deg<5 ? "Aligned" : `${side} ${deg}%`,
        angleVal:deg, angleUnit:"%", angleLbl:"Height Diff", normal:"< 5% width",
        barPct: Math.min(deg/20*100, 100),
        metric1Lbl:"HEIGHT DIFF", metric1Val:`${deg}%`,                                     metric1St:st,
        metric2Lbl:"SPINAL LOAD", metric2Val:deg<5 ? "Normal" : `${Math.round(deg*2.8)}%↑`,metric2St:st,
        bar1Lbl:"Height Diff",bar1Val:deg,              bar1Max:20,  bar1St:st,
        bar2Lbl:"Spinal Load", bar2Val:Math.min(deg*2.8,100),bar2Max:100,bar2Unit:"%↑",bar2St:st,
        causes:       deg<5 ? ["N/A"] : ["Scoliosis","Upper trapezius shortening","Scalene tightness"],
        consequences: deg<5 ? ["N/A"] : ["Spinal posture alteration","Cervical pain","Altered shoulder movement"],
        rehab:        deg<5 ? [] : ["Scapular squeeze: retract blades 5s ×15","Lower trapezius: Y-T-W raises 3×12","Thoracic manual mobilisation"],
        evidence:"Kang et al. (2012) Clin.Biomech. Shoulder asymmetry >15mm (≈12%) associated with scoliosis.",
      });
    }
    if (D.rASIS && D.lASIS) {
      const pw  = dist(D.rASIS, D.lASIS);
      const deg = pct(Math.abs(D.rASIS.y - D.lASIS.y), pw);
      const st: Status = deg < 4 ? "good" : deg < 10 ? "warn" : "bad";
      const lld = Math.round(deg * 1.2);
      F.push({
        id:"pelvis", region:"Pelvis", icon:"🔰", status:st,
        alignment: deg<4 ? "Neutral" : `Pelvic Obliquity ${deg}%`,
        angleVal:deg, angleUnit:"%", angleLbl:"Obliquity", normal:"< 4% (≈6mm)",
        barPct: Math.min(deg/20*100, 100),
        metric1Lbl:"OBLIQUITY",    metric1Val:`${deg}%`, metric1St:st,
        metric2Lbl:"LLD ESTIMATE", metric2Val:`${lld}mm`,metric2St:st,
        bar1Lbl:"Obliquity",   bar1Val:deg,                    bar1Max:20,  bar1St:st,
        bar2Lbl:"LLD Estimate",bar2Val:Math.min(lld/10*100,100),bar2Max:100,bar2Unit:"mm",bar2St:st,
        causes:       deg<4 ? ["N/A"] : ["Leg length discrepancy","Hip abductor weakness"],
        consequences: deg<4 ? ["N/A"] : ["Lumbar overload","Hip OA risk"],
        rehab:        deg<4 ? [] : ["Hip flexor stretch: lunge ×30s each side","Hip abductor strengthen: side-lying raises 3×20","SIJ mobilisation: knees-to-chest 3×10"],
        evidence:"Khamis & Yizhar (2007) Spine. Pelvic obliquity >4% (≈6mm) shifts spinal balance.",
      });
    }
    if (D.rASIS && D.rPat && D.rMal) {
      const dev = parseFloat(Math.abs(180 - vecAngle(D.rASIS, D.rPat, D.rMal)).toFixed(1));
      const type = (D.rPat.x + 10) > (D.rASIS.x + D.rMal.x) / 2 ? "Valgus" : "Varus";
      const st: Status = dev < 7 ? "good" : dev < 12 ? "warn" : "bad";
      const pfLoad = Math.round(dev * 8);
      F.push({
        id:"rknee", region:"Right Knee", icon:"🦵", status:st,
        alignment: dev<7 ? `Neutral ${dev}°` : `${type} ${dev}°`,
        angleVal:dev, angleUnit:`° ${type}`, angleLbl:"Q-Angle", normal:"Valgus 0–7°",
        barPct: Math.min(dev/15*100, 100),
        metric1Lbl:"VALGUS",  metric1Val:`${dev}°`,    metric1St:st,
        metric2Lbl:"PF LOAD", metric2Val:`${pfLoad}%↑`,metric2St:st,
        bar1Lbl:"Valgus", bar1Val:dev,              bar1Max:15,  bar1St:st,
        bar2Lbl:"PF Load",bar2Val:Math.min(pfLoad,100),bar2Max:100,bar2Unit:"%↑",bar2St:st,
        causes:       dev<7 ? ["N/A"] : ["Hip abductor weakness","Increased pronation"],
        consequences: dev<7 ? ["N/A"] : ["Patellofemoral overload","ACL risk"],
        rehab:        dev<7 ? [] : ["Hip abductor strengthen: side-lying raises 3×15","VMO activation: terminal knee extension 3×15","Single-leg squat with knee tracking cue 3×10"],
        evidence:"Hewett et al. (2005) AJSM. Dynamic valgus >8° predicts ACL injury OR 2.1 (p=0.04).",
      });
    }
    if (D.lASIS && D.lPat && D.lMal) {
      const dev = parseFloat(Math.abs(180 - vecAngle(D.lASIS, D.lPat, D.lMal)).toFixed(1));
      const type = (D.lPat.x - 10) < (D.lASIS.x + D.lMal.x) / 2 ? "Valgus" : "Varus";
      const st: Status = dev < 7 ? "good" : dev < 12 ? "warn" : "bad";
      const pfLoad = Math.round(dev * 8);
      F.push({
        id:"lknee", region:"Left Knee", icon:"🦵", status:st,
        alignment: dev<7 ? `Neutral ${dev}°` : `${type} ${dev}°`,
        angleVal:dev, angleUnit:`° ${type}`, angleLbl:"Q-Angle", normal:"Valgus 0–7°",
        barPct: Math.min(dev/15*100, 100),
        metric1Lbl:"VALGUS",  metric1Val:`${dev}°`,    metric1St:st,
        metric2Lbl:"PF LOAD", metric2Val:`${pfLoad}%↑`,metric2St:st,
        bar1Lbl:"Valgus", bar1Val:dev,              bar1Max:15,  bar1St:st,
        bar2Lbl:"PF Load",bar2Val:Math.min(pfLoad,100),bar2Max:100,bar2Unit:"%↑",bar2St:st,
        causes:       dev<7 ? ["N/A"] : ["Hip abductor weakness","Increased pronation"],
        consequences: dev<7 ? ["N/A"] : ["MCL stress","OA risk"],
        rehab:        dev<7 ? [] : ["Hip abductor progression: band walks 3×20","Proprioceptive training: wobble board 3×30s"],
        evidence:"Powers (2010) JOSPT. PF contact stress increases 25% per 5° valgus deviation.",
      });
    }
    if (D.rASIS && D.lASIS && D.rAcr && D.lAcr) {
      const dev = pct(Math.abs((D.rAcr.x+D.lAcr.x)/2 - (D.rASIS.x+D.lASIS.x)/2), dist(D.rAcr, D.lAcr));
      const st: Status = dev < 3 ? "good" : dev < 8 ? "warn" : "bad";
      F.push({
        id:"spine", region:"Spine", icon:"🦴", status:st,
        alignment: dev<3 ? `Neutral ${dev}%` : `Lateral Lean ${dev}%`,
        angleVal:dev, angleUnit:"%", angleLbl:"Lateral Dev.", normal:"< 3% offset",
        barPct: Math.min(dev/15*100, 100),
        metric1Lbl:"LATERAL DEV.", metric1Val:`${dev}%`,                                      metric1St:st,
        metric2Lbl:"COBB EST.",    metric2Val:dev>5 ? `~${(dev*1.8).toFixed(1)}°` : "<5°",   metric2St:st,
        bar1Lbl:"Lateral Dev.",bar1Val:dev,              bar1Max:15,  bar1St:st,
        bar2Lbl:"Cobb Est.",   bar2Val:Math.min(dev*6.6,100),bar2Max:100,bar2Unit:"°",bar2St:st,
        causes:       dev<3 ? ["N/A"] : ["Functional scoliosis","Asymmetric core","LLD compensation"],
        consequences: dev<3 ? ["N/A"] : ["Asymmetric disc loading","Contralateral QL strain"],
        rehab:        dev<3 ? [] : ["Contralateral side stretch 3×30s","Schroth method exercises for scoliosis","Unilateral core activation (convex side)"],
        evidence:"Negrini et al. (2018) SOSORT. Cobb angle >10° = scoliosis. Schroth reduces Cobb 3-12° in AIS.",
      });
    }
  } else {
    if (D.ear && D.cVert) {
      const dx = D.ear.x - D.cVert.x, dy = D.cVert.y - D.ear.y;
      const cva = parseFloat((Math.atan2(Math.abs(dy), Math.abs(dx)) * 180/Math.PI).toFixed(1));
      const st: Status = cva > 49 ? "good" : cva > 45 ? "warn" : "bad";
      const extra = cva < 49 ? parseFloat(((49-cva)*0.9).toFixed(1)) : 0;
      F.push({
        id:"cva", region:"CVA / FHP", icon:"🔄", status:st,
        alignment: cva>49 ? `Normal CVA ${cva}°` : `FHP CVA ${cva}°`,
        angleVal:cva, angleUnit:"°", angleLbl:"CVA", normal:"> 49°",
        barPct: Math.min((70-cva)/40*100, 100),
        metric1Lbl:"CVA",        metric1Val:`${cva}°`,    metric1St:st,
        metric2Lbl:"EXTRA LOAD", metric2Val:`+${extra}kg`,metric2St:st,
        bar1Lbl:"CVA",       bar1Val:cva,               bar1Max:70,  bar1St:st,
        bar2Lbl:"Extra Load",bar2Val:Math.min(extra*5,100),bar2Max:100,bar2Unit:"kg",bar2St:st,
        causes:       st!=="good" ? ["Prolonged screen use","Poor ergonomic setup","Thoracic kyphosis"] : ["N/A"],
        consequences: st!=="good" ? [`+${extra}kg cervical load`,"Disc degeneration C4-C7","Cervicogenic headaches"] : ["N/A"],
        rehab:        st!=="good" ? ["Chin tuck (DCF activation) 3×15 ×10s hold","Thoracic extension over foam roller 5min","Screen ergonomics: eye level adjustment"] : [],
        evidence:"Harman et al. (2005) JOSPT. CVA <49° = FHP. Szeto (2009): 10° FHP = +4.3kg cervical compression.",
      });
    }
    if (D.rASIS && D.rPSIS) {
      const dx = D.rASIS.x - D.rPSIS.x, dy = D.rPSIS.y - D.rASIS.y;
      const pt = parseFloat((Math.atan2(Math.abs(dy), Math.abs(dx)) * 180/Math.PI).toFixed(1));
      const st: Status = (pt >= 7 && pt <= 15) ? "good" : (pt < 5 || pt > 20) ? "bad" : "warn";
      F.push({
        id:"pelvis", region:"Pelvic Tilt", icon:"🔰", status:st,
        alignment: (pt>=7&&pt<=15) ? `Normal ${pt}°` : pt>15 ? `Anterior ${pt}°` : `Flat Back ${pt}°`,
        angleVal:pt, angleUnit:"°", angleLbl:"Pelvic Tilt", normal:"7 – 15°",
        barPct: Math.min(pt/25*100, 100),
        metric1Lbl:"PELVIC TILT",metric1Val:`${pt}°`,              metric1St:st,
        metric2Lbl:"LORDOSIS",   metric2Val:pt>15?"Hyper":"Normal",metric2St:st,
        bar1Lbl:"Pelvic Tilt",bar1Val:pt,                         bar1Max:25,  bar1St:st,
        bar2Lbl:"Load Index",  bar2Val:Math.min(Math.abs(pt-11)*5,100),bar2Max:100,bar2Unit:"%",bar2St:st,
        causes:       st!=="good" ? (pt>15 ? ["Tight hip flexors","Weak gluteals/abdominals"] : ["Tight hamstrings","Weak lumbar extensors"]) : ["N/A"],
        consequences: st!=="good" ? ["Lumbar facet compression","L4-L5/L5-S1 disc stress"] : ["N/A"],
        rehab:        st!=="good" ? (pt>15 ? ["Iliopsoas stretch: kneeling lunge 3×30s","Posterior pelvic tilt against wall 3×20"] : ["McKenzie extension: prone press-up 3×10","Hamstring stretching 3×30s"]) : [],
        evidence:"Herrington & Davies (2005) Physiotherapy. ASIS-PSIS angle 7-15° normal. >15° increases L4-L5 compression.",
      });
    }
  }
  return F;
}

function calcScore(findings: Finding[]): number {
  if (!findings.length) return 75;
  const g = findings.filter(f => f.status === "good").length;
  const w = findings.filter(f => f.status === "warn").length;
  return Math.round((g + w * 0.5) / findings.length * 100);
}

// ── Status helpers ────────────────────────────────────────
const STATUS_COLOR = { good: "#22c55e", warn: "#f97316", bad: "#ef4444" } as const;
const STATUS_CLASS = {
  good: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  warn: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  bad:  "text-error bg-error/10 border-error/20",
} as const;

// ── Canvas drawing ────────────────────────────────────────
interface DrawState {
  img: HTMLImageElement | null
  dots: RelDots                                    // image-relative coords
  sc: number; ox: number; oy: number; imgW: number; imgH: number
  zoomLevel: number; panX: number; panY: number   // zoom/pan overlay
  showGrid: boolean; showPlumb: boolean; showLabels: boolean
  isLateral: boolean
  landmarks: LM[]
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y,   x+w, y+r,   r);
  ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
  ctx.lineTo(x+r, y+h); ctx.arcTo(x,   y+h, x,   y+h-r, r);
  ctx.lineTo(x, y+r);   ctx.arcTo(x,   y,   x+r, y,     r);
  ctx.closePath();
}

function drawCanvas(cv: HTMLCanvasElement, s: DrawState) {
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, cv.width, cv.height);
  if (!s.img) return;

  // Effective transform: base fit scale × zoom, with pan offset
  const effSc = s.sc * s.zoomLevel;
  const effOX = s.ox + s.panX;
  const effOY = s.oy + s.panY;

  ctx.drawImage(s.img, effOX, effOY, s.imgW * effSc, s.imgH * effSc);

  // Convert relative dots → canvas pixels for all drawing
  const D: Dots = {};
  Object.entries(s.dots).forEach(([id, d]) => {
    D[id] = { x: effOX + d.rx * s.imgW * effSc, y: effOY + d.ry * s.imgH * effSc };
  });

  if (s.showGrid) {
    ctx.save(); ctx.strokeStyle = "rgba(0,180,216,.15)"; ctx.lineWidth = .7;
    for (let x = 0; x < cv.width; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,cv.height); ctx.stroke(); }
    for (let y = 0; y < cv.height; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(cv.width,y); ctx.stroke(); }
    ctx.restore();
  }

  if (s.showPlumb) {
    ctx.save(); ctx.strokeStyle = "rgba(251,191,36,.7)"; ctx.setLineDash([6,4]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cv.width/2, 0); ctx.lineTo(cv.width/2, cv.height); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
  }

  const conn = s.isLateral
    ? [["ear","cVert"],["cVert","acr"],["acr","gTroc"],["gTroc","fibHd"],["fibHd","lMal"],["rASIS","rPSIS"]]
    : [["rEar","lEar"],["rEar","rAcr"],["lEar","lAcr"],["rAcr","lAcr"],
       ["rAcr","rElb"],["rElb","rWrist"],["lAcr","lElb"],["lElb","lWrist"],
       ["rAcr","rASIS"],["lAcr","lASIS"],["rASIS","lASIS"],
       ["rASIS","rPat"],["lASIS","lPat"],["rPat","rMal"],["lPat","lMal"]];
  ctx.save(); ctx.strokeStyle = "var(--color-primary)"; ctx.lineWidth = 2;
  ctx.shadowColor = "var(--color-primary)"; ctx.shadowBlur = 5;
  conn.forEach(([a,b]) => {
    if (!D[a] || !D[b]) return;
    ctx.beginPath(); ctx.moveTo(D[a].x, D[a].y); ctx.lineTo(D[b].x, D[b].y); ctx.stroke();
  });
  ctx.restore();

  const badge = (x: number, y: number, txt: string, col: string) => {
    ctx.save(); ctx.font = "bold 11px Inter,sans-serif";
    const tw = ctx.measureText(txt).width, bw = tw + 14, bh = 20;
    roundRect(ctx, x - bw/2, y - bh/2, bw, bh, 5);
    ctx.fillStyle = col; ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 6; ctx.fill();
    ctx.fillStyle = "#fff"; ctx.shadowBlur = 0; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(txt, x, y); ctx.restore();
  };

  if (!s.isLateral) {
    if (D.rEar && D.lEar) {
      const a = Math.abs(horizAngleDeg(D.rEar, D.lEar));
      const c = a < 2 ? STATUS_COLOR.good : a < 5 ? STATUS_COLOR.warn : STATUS_COLOR.bad;
      ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.setLineDash([4,3]);
      ctx.beginPath(); ctx.moveTo(D.rEar.x, D.rEar.y); ctx.lineTo(D.lEar.x, D.lEar.y); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
      badge((D.rEar.x+D.lEar.x)/2, Math.min(D.rEar.y,D.lEar.y)-16, `Tilt ${a.toFixed(1)}°`, c);
    }
    if (D.rAcr && D.lAcr) {
      const p = pct(Math.abs(D.rAcr.y-D.lAcr.y), dist(D.rAcr,D.lAcr));
      const c = p < 5 ? STATUS_COLOR.good : p < 12 ? STATUS_COLOR.warn : STATUS_COLOR.bad;
      ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.setLineDash([4,3]);
      ctx.beginPath(); ctx.moveTo(D.rAcr.x, D.rAcr.y); ctx.lineTo(D.lAcr.x, D.lAcr.y); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
      badge((D.rAcr.x+D.lAcr.x)/2, Math.min(D.rAcr.y,D.lAcr.y)-16, `Sh ${p.toFixed(1)}%`, c);
    }
    if (D.rASIS && D.lASIS) {
      const p = pct(Math.abs(D.rASIS.y-D.lASIS.y), dist(D.rASIS,D.lASIS));
      const c = p < 4 ? STATUS_COLOR.good : p < 10 ? STATUS_COLOR.warn : STATUS_COLOR.bad;
      ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(D.rASIS.x, D.rASIS.y); ctx.lineTo(D.lASIS.x, D.lASIS.y); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
      badge((D.rASIS.x+D.lASIS.x)/2, Math.min(D.rASIS.y,D.lASIS.y)-16, `Pelvis ${p.toFixed(1)}%`, c);
    }
    ([["rASIS","rPat","rMal","R"],["lASIS","lPat","lMal","L"]] as [string,string,string,string][])
      .forEach(([aid,pid,bid,side]) => {
        const a = D[aid], p = D[pid], b = D[bid];
        if (!a||!p||!b) return;
        const dev = Math.abs(180 - vecAngle(a,p,b));
        const c = dev < 7 ? STATUS_COLOR.good : dev < 12 ? STATUS_COLOR.warn : STATUS_COLOR.bad;
        const a1 = Math.atan2(a.y-p.y, a.x-p.x), a2 = Math.atan2(b.y-p.y, b.x-p.x);
        ctx.save(); ctx.beginPath(); ctx.arc(p.x, p.y, 24, a1, a2, false);
        ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2; ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 5; ctx.stroke();
        ctx.restore();
        badge(p.x + (side==="R" ? -52 : 28), p.y, `${side}K ${dev.toFixed(1)}°`, c);
      });
  } else {
    if (D.ear && D.cVert) {
      const dx = D.ear.x-D.cVert.x, dy = D.cVert.y-D.ear.y;
      const cva = (Math.atan2(Math.abs(dy),Math.abs(dx))*180/Math.PI).toFixed(1);
      const c = +cva>49 ? STATUS_COLOR.good : +cva>45 ? STATUS_COLOR.warn : STATUS_COLOR.bad;
      badge(D.cVert.x+18, D.cVert.y-20, `CVA ${cva}°`, c);
    }
  }

  s.landmarks.forEach(l => {
    const d = D[l.id]; if (!d) return;
    ctx.save();
    ctx.beginPath(); ctx.arc(d.x, d.y, 11, 0, Math.PI*2);
    ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.fill();
    ctx.beginPath(); ctx.arc(d.x, d.y, 7, 0, Math.PI*2);
    ctx.fillStyle = "#fff"; ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 5; ctx.fill();
    ctx.beginPath(); ctx.arc(d.x, d.y, 3.5, 0, Math.PI*2);
    ctx.fillStyle = "var(--color-primary)"; ctx.shadowBlur = 0; ctx.fill();
    if (s.showLabels) {
      ctx.font = "bold 8px Inter,sans-serif";
      ctx.fillStyle = "#fbbf24"; ctx.shadowColor = "rgba(0,0,0,.9)"; ctx.shadowBlur = 3;
      ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.fillText(l.lbl, d.x, d.y - 10);
    }
    ctx.restore();
  });
}

// ── Main component ────────────────────────────────────────
interface Props { mode: string; patient: Patient | null; onBack: () => void }

export function LandmarkAnalysis({ mode, patient, onBack }: Props) {
  const isLateral = mode === "lateral";
  const landmarks = isLateral ? LM_LATERAL : LM_FRONT;
  const meta = MODE_META[mode] ?? { label: mode, hint: "Upload a patient photo to begin." };

  const { user } = useAuth();
  const navigate = useNavigate();

  // Canvas / image refs
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef       = useRef<HTMLImageElement | null>(null);
  const dotsRef      = useRef<RelDots>({});
  const dragIdRef    = useRef<string | null>(null);
  const scRef        = useRef({ sc: 1, ox: 0, oy: 0, imgW: 1, imgH: 1 });
  // Toggle refs for draw (avoid stale state in canvas event handlers)
  const gridRef      = useRef(false);
  const plumbRef     = useRef(false);
  const labelsRef    = useRef(true);
  // Zoom/pan refs
  const zoomRef      = useRef({ level: 1, panX: 0, panY: 0 });
  // Interaction refs
  const isPanningRef    = useRef(false);
  const lastPanPosRef   = useRef({ x: 0, y: 0 });
  const pinchRef        = useRef<{ x0:number; y0:number; x1:number; y1:number; dist:number } | null>(null);

  // UI state
  const [view,         setView]        = useState<"upload"|"work"|"results">("upload");
  const [imageVersion, setImageVersion] = useState(0);
  const [showGrid,     setShowGrid]    = useState(false);
  const [showPlumb,    setShowPlumb]   = useState(false);
  const [showLabels,   setShowLabels]  = useState(true);
  const [zoomPct,      setZoomPct]     = useState(100);
  const [findings,     setFindings]    = useState<Finding[]>([]);
  const [score,        setScore]       = useState(0);
  const [showModal,    setShowModal]   = useState(false);
  const [saving,       setSaving]      = useState(false);

  // ── Core draw ─────────────────────────────────────────
  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const s = scRef.current;
    const z = zoomRef.current;
    drawCanvas(cv, {
      img: imgRef.current,
      dots: dotsRef.current,
      sc: s.sc, ox: s.ox, oy: s.oy, imgW: s.imgW, imgH: s.imgH,
      zoomLevel: z.level, panX: z.panX, panY: z.panY,
      showGrid:   gridRef.current,
      showPlumb:  plumbRef.current,
      showLabels: labelsRef.current,
      isLateral, landmarks,
    });
  }, [isLateral, landmarks]);

  // Keep a stable ref to draw so wheel/pinch handlers don't go stale
  const drawRef = useRef(draw);
  useEffect(() => { drawRef.current = draw; }, [draw]);

  // ── Resize ───────────────────────────────────────────
  const resize = useCallback(() => {
    const cv  = canvasRef.current;
    const con = containerRef.current;
    if (!cv || !con) return;
    cv.width  = con.clientWidth;
    cv.height = con.clientHeight;
    if (imgRef.current) {
      const { imgW, imgH } = scRef.current;
      const sc = Math.min(cv.width / imgW, cv.height / imgH);
      scRef.current = { sc, ox: (cv.width - imgW*sc)/2, oy: (cv.height - imgH*sc)/2, imgW, imgH };
    }
    draw();
  }, [draw]);

  // ResizeObserver — depends on view so it re-attaches when canvas mounts
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const obs = new ResizeObserver(resize);
    obs.observe(el);
    return () => obs.disconnect();
  }, [resize, view]);

  // After React renders the canvas (view="work"), initialise with current image
  useEffect(() => {
    if (!imgRef.current) return;
    const tid = setTimeout(() => { resize(); placeDots(); draw(); }, 0);
    return () => clearTimeout(tid);
  }, [imageVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Wheel zoom (non-passive so we can preventDefault) ─
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || view !== "work") return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const r   = cv.getBoundingClientRect();
      const mx  = (e.clientX - r.left) * (cv.width  / r.width);
      const my  = (e.clientY - r.top)  * (cv.height / r.height);
      const { sc, ox, oy } = scRef.current;
      const z   = zoomRef.current;
      const factor   = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const newLevel = Math.max(0.25, Math.min(10, z.level * factor));
      const oldSc = sc * z.level, newSc = sc * newLevel;
      const eox = ox + z.panX, eoy = oy + z.panY;
      const wx  = (mx - eox) / oldSc, wy = (my - eoy) / oldSc;
      zoomRef.current = { level: newLevel, panX: mx - wx * newSc - ox, panY: my - wy * newSc - oy };
      setZoomPct(Math.round(newLevel * 100));
      drawRef.current();
    };
    cv.addEventListener("wheel", handler, { passive: false });
    return () => cv.removeEventListener("wheel", handler);
  }, [view]);

  // ── Dot placement ─────────────────────────────────────
  const placeDots = useCallback(() => {
    const d: RelDots = {};
    landmarks.forEach(l => { d[l.id] = { rx: l.rx, ry: l.ry }; });
    dotsRef.current = d;
  }, [landmarks]);

  // ── Photo load ───────────────────────────────────────
  const loadPhoto = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        scRef.current.imgW = img.naturalWidth;
        scRef.current.imgH = img.naturalHeight;
        // Reset zoom/pan when a new photo is loaded
        zoomRef.current = { level: 1, panX: 0, panY: 0 };
        setZoomPct(100);
        setView("work");
        setImageVersion(v => v + 1);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  // ── Helper: canvas position → nearest dot id ─────────
  const nearDot = (cx: number, cy: number, thresh = 26): string | null => {
    const { sc, ox, oy, imgW, imgH } = scRef.current;
    const z = zoomRef.current;
    const effSc = sc * z.level, effOX = ox + z.panX, effOY = oy + z.panY;
    let best: string | null = null, bd = Infinity;
    Object.entries(dotsRef.current).forEach(([id, d]) => {
      const dcx = effOX + d.rx * imgW * effSc;
      const dcy = effOY + d.ry * imgH * effSc;
      const dd  = Math.hypot(cx - dcx, cy - dcy);
      if (dd < thresh && dd < bd) { bd = dd; best = id; }
    });
    return best;
  };

  // ── Helper: canvas px → relative dot position ────────
  const canvasToRel = (cx: number, cy: number): { rx: number; ry: number } => {
    const { sc, ox, oy, imgW, imgH } = scRef.current;
    const z = zoomRef.current;
    const effSc = sc * z.level, effOX = ox + z.panX, effOY = oy + z.panY;
    return { rx: (cx - effOX) / (imgW * effSc), ry: (cy - effOY) / (imgH * effSc) };
  };

  // ── Pointer helpers ───────────────────────────────────
  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const cv = canvasRef.current!;
    const r  = cv.getBoundingClientRect();
    const sx = cv.width / r.width, sy = cv.height / r.height;
    const src = "touches" in e ? e.touches[0] : e;
    return { x: (src.clientX - r.left) * sx, y: (src.clientY - r.top) * sy };
  };

  const getTwoPos = (e: React.TouchEvent) => {
    const cv = canvasRef.current!;
    const r  = cv.getBoundingClientRect();
    const sx = cv.width / r.width, sy = cv.height / r.height;
    const t0 = e.touches[0], t1 = e.touches[1];
    return {
      x0: (t0.clientX - r.left) * sx, y0: (t0.clientY - r.top) * sy,
      x1: (t1.clientX - r.left) * sx, y1: (t1.clientY - r.top) * sy,
    };
  };

  // ── Zoom helpers ──────────────────────────────────────
  const applyZoom = (cx: number, cy: number, factor: number) => {
    const { sc, ox, oy } = scRef.current;
    const z = zoomRef.current;
    const newLevel = Math.max(0.25, Math.min(10, z.level * factor));
    const oldSc = sc * z.level, newSc = sc * newLevel;
    const eox = ox + z.panX, eoy = oy + z.panY;
    const wx = (cx - eox) / oldSc, wy = (cy - eoy) / oldSc;
    zoomRef.current = { level: newLevel, panX: cx - wx * newSc - ox, panY: cy - wy * newSc - oy };
    setZoomPct(Math.round(newLevel * 100));
  };

  const zoomIn = () => {
    const cv = canvasRef.current; if (!cv) return;
    applyZoom(cv.width / 2, cv.height / 2, 1.3);
    draw();
  };
  const zoomOut = () => {
    const cv = canvasRef.current; if (!cv) return;
    applyZoom(cv.width / 2, cv.height / 2, 1 / 1.3);
    draw();
  };
  const zoomFit = () => {
    zoomRef.current = { level: 1, panX: 0, panY: 0 };
    setZoomPct(100);
    draw();
  };

  // ── Mouse events ──────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    const pos = getPos(e);
    const hit = nearDot(pos.x, pos.y);
    if (hit) {
      dragIdRef.current = hit;
      if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
    } else {
      isPanningRef.current = true;
      lastPanPosRef.current = pos;
      if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const pos = getPos(e);
    if (dragIdRef.current) {
      dotsRef.current[dragIdRef.current] = canvasToRel(pos.x, pos.y);
      draw();
    } else if (isPanningRef.current) {
      zoomRef.current.panX += pos.x - lastPanPosRef.current.x;
      zoomRef.current.panY += pos.y - lastPanPosRef.current.y;
      lastPanPosRef.current = pos;
      draw();
    } else {
      // Hover cursor feedback
      if (canvasRef.current) {
        canvasRef.current.style.cursor = nearDot(pos.x, pos.y) ? "crosshair" : "grab";
      }
    }
  };

  const onMouseUp = () => {
    dragIdRef.current = null;
    isPanningRef.current = false;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
  };

  // ── Touch events ──────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const pos = getPos(e);
      const hit = nearDot(pos.x, pos.y, 32);
      if (hit) { dragIdRef.current = hit; }
      else { isPanningRef.current = true; lastPanPosRef.current = pos; }
    } else if (e.touches.length === 2) {
      dragIdRef.current = null;
      isPanningRef.current = false;
      const { x0, y0, x1, y1 } = getTwoPos(e);
      pinchRef.current = { x0, y0, x1, y1, dist: Math.hypot(x1-x0, y1-y0) };
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2 && pinchRef.current) {
      const { x0: ox0, y0: oy0, x1: ox1, y1: oy1, dist: oldDist } = pinchRef.current;
      const { x0, y0, x1, y1 } = getTwoPos(e);
      const newDist = Math.hypot(x1-x0, y1-y0);
      // Pinch zoom toward midpoint
      const midX = (x0+x1)/2, midY = (y0+y1)/2;
      applyZoom(midX, midY, newDist / oldDist);
      // Pan by midpoint delta
      const oldMidX = (ox0+ox1)/2, oldMidY = (oy0+oy1)/2;
      zoomRef.current.panX += midX - oldMidX;
      zoomRef.current.panY += midY - oldMidY;
      pinchRef.current = { x0, y0, x1, y1, dist: newDist };
      draw();
    } else if (e.touches.length === 1) {
      const pos = getPos(e);
      if (dragIdRef.current) {
        dotsRef.current[dragIdRef.current] = canvasToRel(pos.x, pos.y);
        draw();
      } else if (isPanningRef.current) {
        zoomRef.current.panX += pos.x - lastPanPosRef.current.x;
        zoomRef.current.panY += pos.y - lastPanPosRef.current.y;
        lastPanPosRef.current = pos;
        draw();
      }
    }
  };

  const onTouchEnd = () => {
    dragIdRef.current = null;
    isPanningRef.current = false;
    pinchRef.current = null;
  };

  // ── Analyse ───────────────────────────────────────────
  const handleAnalyse = () => {
    const { imgW, imgH } = scRef.current;
    // Convert relative dots to image-pixel space for scale-invariant calculations
    const imgDots: Dots = {};
    Object.entries(dotsRef.current).forEach(([id, d]) => {
      imgDots[id] = { x: d.rx * imgW, y: d.ry * imgH };
    });
    const f = calcFindings(imgDots, isLateral);
    if (!f.length) return;
    setFindings(f); setScore(calcScore(f)); setView("results");
  };

  // ── Save ──────────────────────────────────────────────
  const handleSave = async (pid: string) => {
    if (!user) return;
    setSaving(true);
    try {
      await addDoc(collection(firebaseDB, "assessments"), {
        patientId: pid,
        physioId: user.uid,
        toolType: "posture",
        data: {
          analysisType: "landmark",
          mode,
          modeName: meta.label,
          score,
          findings: findings.map(f => ({
            region: f.region, icon: f.icon, status: f.status,
            alignment: f.alignment, angleVal: f.angleVal, angleUnit: f.angleUnit,
            normal: f.normal, causes: f.causes, consequences: f.consequences, rehab: f.rehab,
          })),
        },
        createdAt: serverTimestamp(),
      });
      setShowModal(false);
      toast.success("Posture Analysis saved!");
      setTimeout(() => navigate("/physio/reports"), 1200);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // ── Toolbar toggles ───────────────────────────────────
  const toggleGrid   = () => { const v = !gridRef.current;   gridRef.current   = v; setShowGrid(v);   draw(); };
  const togglePlumb  = () => { const v = !plumbRef.current;  plumbRef.current  = v; setShowPlumb(v);  draw(); };
  const toggleLabels = () => { const v = !labelsRef.current; labelsRef.current = v; setShowLabels(v); draw(); };
  const resetDots    = () => { placeDots(); draw(); };

  // ── Render ────────────────────────────────────────────
  const scoreColor = score >= 80 ? "text-emerald-500" : score >= 50 ? "text-amber-500" : "text-error";
  const grades = score < 40
    ? ["POOR","Multiple significant deviations"]
    : score < 60 ? ["FAIR","Moderate postural concerns"]
    : score < 80 ? ["GOOD","Minor imbalances present"]
    : ["EXCELLENT","Optimal postural alignment"];

  return (
    <div className="flex flex-col h-full max-w-6xl" style={{ minHeight: "calc(100vh - 140px)" }}>

      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-0.5">
            <div className="h-1.5 w-8 bg-amber-500 rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">
              Posture Analysis · {meta.label}
            </span>
          </div>
          <h1 className="text-xl font-black text-text truncate">{meta.label}</h1>
          {patient && (
            <p className="text-text-muted text-xs mt-0.5">
              Patient: <span className="text-text font-semibold">{patient.name}</span>
              {" · "}{patient.age}y · {patient.gender}
            </p>
          )}
        </div>
        {view === "work" && (
          <Button variant="primary" size="sm" onClick={handleAnalyse}>
            Analyse →
          </Button>
        )}
        {view === "results" && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setView("work")}>← Edit</Button>
            <Button variant="ghost" size="sm" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5" /><span>Print</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
              Save Report
            </Button>
          </div>
        )}
      </div>

      {/* ── Upload view ── */}
      {view === "upload" && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <label className="w-full max-w-lg cursor-pointer group">
            <input type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) loadPhoto(f); }} />
            <div className="border-2 border-dashed border-border group-hover:border-primary/40 bg-input group-hover:bg-surface rounded-2xl p-12 flex flex-col items-center gap-4 transition-all">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-black text-text text-base mb-1">Upload Patient Photo</p>
                <p className="text-text-muted text-xs leading-relaxed max-w-xs">{meta.hint}</p>
              </div>
              <span className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 group-hover:bg-primary/80 transition">
                Choose Photo
              </span>
            </div>
          </label>
          <p className="mt-4 text-[10px] text-text-muted uppercase tracking-widest font-bold">
            {landmarks.length} landmarks · Drag to adjust · Scroll/pinch to zoom
          </p>
        </div>
      )}

      {/* ── Work view ── */}
      {view === "work" && (
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          {/* Canvas */}
          <div
            ref={containerRef}
            className="relative flex-1 rounded-2xl overflow-hidden bg-black border border-border"
            style={{ minHeight: 340 }}
          >
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full touch-none"
              style={{ cursor: "grab" }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            />
          </div>

          {/* Toolbar */}
          <div className="flex-shrink-0 flex items-center gap-1.5 p-3 rounded-2xl bg-input border border-border overflow-x-auto">
            {/* View toggles */}
            {[
              { label:"Grid",  icon:<Grid3X3 className="w-4 h-4" />,    active:showGrid,   fn:toggleGrid  },
              { label:"Plumb", icon:<AlignCenter className="w-4 h-4" />, active:showPlumb,  fn:togglePlumb },
              { label:"Labels",icon:<Tag className="w-4 h-4" />,         active:showLabels, fn:toggleLabels},
            ].map(({ label, icon, active, fn }) => (
              <button key={label} onClick={fn}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  active ? "bg-primary/15 text-primary border border-primary/25" : "text-text-muted hover:text-text hover:bg-surface border border-transparent"
                }`}
              >
                {icon}<span>{label}</span>
              </button>
            ))}

            <button onClick={resetDots}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-text-muted hover:text-text hover:bg-surface border border-transparent transition-all"
            >
              <RotateCcw className="w-4 h-4" /><span>Reset</span>
            </button>

            {/* Divider */}
            <div className="w-px h-8 bg-border mx-1 flex-shrink-0" />

            {/* Zoom controls */}
            <button onClick={zoomOut}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-text-muted hover:text-text hover:bg-surface border border-transparent transition-all"
            >
              <ZoomOut className="w-4 h-4" /><span>Out</span>
            </button>
            <div className="flex flex-col items-center justify-center px-2 min-w-[44px]">
              <span className="text-[11px] font-black text-primary tabular-nums">{zoomPct}%</span>
              <span className="text-[8px] text-text-muted uppercase tracking-wider">Zoom</span>
            </div>
            <button onClick={zoomIn}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-text-muted hover:text-text hover:bg-surface border border-transparent transition-all"
            >
              <ZoomIn className="w-4 h-4" /><span>In</span>
            </button>
            <button onClick={zoomFit}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-text-muted hover:text-text hover:bg-surface border border-transparent transition-all"
            >
              <Maximize2 className="w-4 h-4" /><span>Fit</span>
            </button>

            {/* Divider */}
            <div className="w-px h-8 bg-border mx-1 flex-shrink-0" />

            <label className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-text-muted hover:text-text hover:bg-surface border border-transparent transition-all cursor-pointer">
              <Upload className="w-4 h-4" /><span>New Photo</span>
              <input type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) loadPhoto(f); }} />
            </label>

            <div className="flex-1" />
            <Button variant="primary" size="sm" onClick={handleAnalyse}>Analyse →</Button>
          </div>
        </div>
      )}

      {/* ── Results view ── */}
      {view === "results" && (
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          <div className="flex items-center gap-5 p-5 rounded-2xl bg-input border border-border">
            <div className="text-center flex-shrink-0">
              <p className={`text-5xl font-black tabular-nums ${scoreColor}`}>{score}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mt-0.5">/ 100</p>
            </div>
            <div className="w-px h-12 bg-border flex-shrink-0" />
            <div className="flex-1">
              <p className={`text-lg font-black ${scoreColor}`}>{grades[0]}</p>
              <p className="text-text-muted text-xs mt-0.5">{grades[1]}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {findings.map(f => (
                  <span key={f.id} className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${STATUS_CLASS[f.status]}`}>
                    {f.icon} {f.region}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">
              Clinical Assessment · {findings.length} regions analysed
            </p>
            {findings.map(f => (
              <div key={f.id} className="bg-input border border-border rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                    f.status === "good" ? "bg-emerald-500/10" : f.status === "warn" ? "bg-amber-500/10" : "bg-error/10"
                  }`}>
                    {f.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-text text-sm">{f.region}</p>
                    <p className="text-text-muted text-xs mt-0.5">{f.alignment}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-xl font-black tabular-nums ${STATUS_CLASS[f.status].split(" ")[0]}`}>
                      {f.angleVal}{f.angleUnit.split(" ")[0]}
                    </p>
                    <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Normal: {f.normal}</p>
                  </div>
                </div>
                <div className="px-5 pb-3">
                  <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${f.barPct}%`, background: STATUS_COLOR[f.status] }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-px mx-5 mb-4">
                  {([
                    [f.metric1Lbl, f.metric1Val, f.metric1St],
                    [f.metric2Lbl, f.metric2Val, f.metric2St],
                  ] as [string, string, Status][]).map(([lbl, val, st]) => (
                    <div key={lbl} className="bg-surface rounded-xl px-3 py-2">
                      <p className="text-[9px] font-black uppercase tracking-wider text-text-muted">{lbl}</p>
                      <p className={`text-base font-black tabular-nums mt-0.5 ${STATUS_CLASS[st].split(" ")[0]}`}>{val}</p>
                    </div>
                  ))}
                </div>
                {f.status !== "good" && (
                  <div className="grid sm:grid-cols-3 gap-px border-t border-border">
                    {[
                      { title:"Causes",         items:f.causes       },
                      { title:"Consequences",   items:f.consequences },
                      { title:"Rehab Protocol", items:f.rehab        },
                    ].map(({ title, items }) => (
                      <div key={title} className="px-5 py-3 bg-surface/50">
                        <p className="text-[9px] font-black uppercase tracking-wider text-text-muted mb-1.5">{title}</p>
                        {items.map(item => (
                          <p key={item} className="text-xs text-text-muted flex gap-1.5 mb-1">
                            <span className="text-primary flex-shrink-0 mt-0.5">›</span>{item}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                <div className="px-5 py-2 border-t border-border">
                  <p className="text-[10px] text-text-muted/70 leading-relaxed">
                    <span className="text-primary font-bold">📚 </span>{f.evidence}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <PatientSelectSaveModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        saving={saving}
        preselectedPatientId={patient?.id}
      />
    </div>
  );
}
