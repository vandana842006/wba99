import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp, getDoc, doc } from "firebase/firestore";
import * as faceapi from "@vladmandic/face-api";
import { firebaseDB } from "../../core/firebase";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import {
  ArrowLeft, Brain, Camera, Eye, Activity, Shield,
  AlertCircle, CheckCircle2, RefreshCw, Save,
  TrendingUp, TrendingDown, Upload, Tag, Microscope,
  Download,
} from "lucide-react";
import type { Patient } from "../../types";
import toast from "react-hot-toast";
import { PatientSelectSaveModal } from "./patients/PatientSelectSaveModal";

// ── Types ──────────────────────────────────────────────────────────────────────

type Phase = "intro" | "loading" | "analysis" | "results";
type ActiveTab = "camera" | "upload";
type ActiveRegion = "all" | "eyes" | "nose" | "mouth" | "jawline" | "brows";

interface EmotionFrame {
  neutral: number; happy: number; sad: number; angry: number;
  fearful: number; disgusted: number; surprised: number;
}

interface FaceMeasurements {
  faceWidth: number; faceHeight: number; eyeDistance: number;
  jawAngle: number; symmetryScore: number; headTilt: number;
  mouthWidth: number; noseLength: number; eyeWidthRatio: number;
  faceShapeIndex: number;
}

interface FacialResult {
  sessionDuration: number; frameCount: number; dominantEmotion: string;
  emotionAverages: EmotionFrame; stressScore: number;
  stressLevel: "Low" | "Moderate" | "High";
  fatigueScore: number; attentionScore: number; expressionVariability: number;
  aiInterpretation: string; recommendations: string[];
  faceMeasurements?: FaceMeasurements;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const MODELS_PATH = "/models/face-api";
const SESSION_SECONDS = 30;
const DETECT_MS = 300;

const EMOTION_COLORS: Record<keyof EmotionFrame, string> = {
  neutral: "bg-slate-400", happy: "bg-emerald-500", sad: "bg-blue-500",
  angry: "bg-red-500", fearful: "bg-orange-500", disgusted: "bg-yellow-500",
  surprised: "bg-violet-500",
};
const EMOTION_TEXT_COLORS: Record<keyof EmotionFrame, string> = {
  neutral: "text-slate-400", happy: "text-emerald-500", sad: "text-blue-500",
  angry: "text-red-500", fearful: "text-orange-500", disgusted: "text-yellow-500",
  surprised: "text-violet-500",
};
const EMOTION_EMOJIS: Record<keyof EmotionFrame, string> = {
  neutral: "😐", happy: "😊", sad: "😢", angry: "😠",
  fearful: "😨", disgusted: "🤢", surprised: "😲",
};

const REGION_INDICES: Record<ActiveRegion, number[]> = {
  all: Array.from({ length: 68 }, (_, i) => i),
  jawline: Array.from({ length: 17 }, (_, i) => i),
  brows: [...Array.from({ length: 5 }, (_, i) => 17 + i), ...Array.from({ length: 5 }, (_, i) => 22 + i)],
  nose: [...Array.from({ length: 4 }, (_, i) => 27 + i), ...Array.from({ length: 5 }, (_, i) => 31 + i)],
  eyes: [...Array.from({ length: 6 }, (_, i) => 36 + i), ...Array.from({ length: 6 }, (_, i) => 42 + i)],
  mouth: [...Array.from({ length: 12 }, (_, i) => 48 + i), ...Array.from({ length: 8 }, (_, i) => 60 + i)],
};

// ── Landmark helpers ───────────────────────────────────────────────────────────

type Pt = { x: number; y: number };

function ptDist(a: Pt, b: Pt) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
function ptCentroid(pts: Pt[]): Pt {
  return { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length };
}

function computeFaceMeasurements(pos: Pt[]): FaceMeasurements {
  if (pos.length < 68) return { faceWidth: 0, faceHeight: 0, eyeDistance: 0, jawAngle: 0, symmetryScore: 0, headTilt: 0, mouthWidth: 0, noseLength: 0, eyeWidthRatio: 0, faceShapeIndex: 0 };

  const faceWidth = Math.round(ptDist(pos[0], pos[16]));
  const glabella: Pt = { x: (pos[21].x + pos[22].x) / 2, y: (pos[21].y + pos[22].y) / 2 };
  const faceHeight = Math.round(ptDist(glabella, pos[8]));
  const leftEyeC = ptCentroid([pos[36], pos[37], pos[38], pos[39], pos[40], pos[41]]);
  const rightEyeC = ptCentroid([pos[42], pos[43], pos[44], pos[45], pos[46], pos[47]]);
  const eyeDistance = Math.round(ptDist(leftEyeC, rightEyeC));
  const tiltRad = Math.atan2(rightEyeC.y - leftEyeC.y, rightEyeC.x - leftEyeC.x);
  const headTilt = Math.round(Math.abs(tiltRad * 180 / Math.PI) * 10) / 10;
  const v1: Pt = { x: pos[4].x - pos[8].x, y: pos[4].y - pos[8].y };
  const v2: Pt = { x: pos[12].x - pos[8].x, y: pos[12].y - pos[8].y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const jawAngle = Math.round(Math.acos(Math.max(-1, Math.min(1, dot / (ptDist(pos[4], pos[8]) * ptDist(pos[12], pos[8]) + 1e-6)))) * 180 / Math.PI);
  const midX = (pos[27].x + pos[8].x) / 2;
  const pairs: [Pt, Pt][] = [
    [pos[0], pos[16]], [pos[1], pos[15]], [pos[2], pos[14]], [pos[3], pos[13]],
    [pos[4], pos[12]], [pos[5], pos[11]], [pos[6], pos[10]], [pos[7], pos[9]],
    [pos[17], pos[26]], [pos[18], pos[25]], [pos[19], pos[24]], [pos[20], pos[23]],
    [pos[36], pos[45]], [pos[39], pos[42]], [pos[48], pos[54]], [pos[49], pos[53]],
  ];
  const avgError = pairs.reduce((s, [l, r]) => {
    const lD = Math.abs(l.x - midX), rD = Math.abs(r.x - midX);
    return s + Math.abs(lD - rD) / Math.max(lD, rD, 1);
  }, 0) / pairs.length;
  const symmetryScore = Math.round(Math.max(0, Math.min(100, (1 - avgError) * 100)));
  const mouthWidth = Math.round(ptDist(pos[48], pos[54]));
  const noseLength = Math.round(ptDist(pos[27], pos[33]));
  const eyeWidthRatio = faceWidth > 0 ? Math.round((eyeDistance / faceWidth) * 100) / 100 : 0;
  const faceShapeIndex = faceWidth > 0 ? Math.round((faceHeight / faceWidth) * 100) / 100 : 0;
  return { faceWidth, faceHeight, eyeDistance, jawAngle, symmetryScore, headTilt, mouthWidth, noseLength, eyeWidthRatio, faceShapeIndex };
}

function getFaceShapeLabel(idx: number) {
  if (idx < 1.0) return "Wide"; if (idx < 1.2) return "Round";
  if (idx < 1.4) return "Oval"; if (idx < 1.6) return "Long"; return "Narrow";
}

function getMeasurementNotes(m: FaceMeasurements): string {
  const n: string[] = [];
  if (m.symmetryScore >= 85) n.push("Good bilateral symmetry.");
  else if (m.symmetryScore >= 70) n.push("Mild facial asymmetry.");
  else n.push("Notable asymmetry detected.");
  n.push(m.headTilt <= 3 ? "Neutral head position." : `Head tilt ${m.headTilt}° noted.`);
  n.push(`${getFaceShapeLabel(m.faceShapeIndex)} face morphology.`);
  return n.join(" ");
}

function drawColoredLandmarks(ctx: CanvasRenderingContext2D, pos: Pt[], activeRegion: ActiveRegion, showLabels: boolean) {
  if (pos.length < 68) return;
  ctx.save();

  const groups: { key: ActiveRegion; color: string }[] = [
    { key: "jawline", color: "#f59e0b" },
    { key: "brows",   color: "#38bdf8" },
    { key: "nose",    color: "#f472b6" },
    { key: "eyes",    color: "#22d3ee" },
    { key: "mouth",   color: "#fb7185" },
  ];

  for (const { key, color } of groups) {
    if (activeRegion !== "all" && activeRegion !== key) continue;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 5;
    for (const i of REGION_INDICES[key]) {
      if (i >= pos.length) continue;
      ctx.beginPath();
      ctx.arc(pos[i].x, pos[i].y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.shadowBlur = 0;

  if (showLabels) {
    const glabellaY = Math.min(pos[21].y, pos[22].y) - 10;
    const namedPoints: { p: Pt; text: string; color: string }[] = [
      { p: { x: (pos[21].x + pos[22].x) / 2, y: glabellaY }, text: "GLABELLA",   color: "#38bdf8" },
      { p: pos[27],                                            text: "NASION",     color: "#f472b6" },
      { p: pos[33],                                            text: "PRONASALE", color: "#f472b6" },
      { p: pos[39],                                            text: "CANTHUS-L",  color: "#22d3ee" },
      { p: pos[42],                                            text: "CANTHUS-R",  color: "#22d3ee" },
      { p: pos[0],                                             text: "TRAGION-L",  color: "#f59e0b" },
      { p: pos[16],                                            text: "TRAGION-R",  color: "#f59e0b" },
      { p: pos[8],                                             text: "GNATHION",   color: "#f59e0b" },
    ];
    ctx.font = "bold 8px monospace";
    for (const { p, text, color } of namedPoints) {
      const tw = ctx.measureText(text).width;
      let tx = p.x + 6;
      let ty = p.y - 3;
      if (tx + tw + 8 > ctx.canvas.width) tx = p.x - tw - 14;
      if (ty - 12 < 0) ty = p.y + 13;
      ctx.fillStyle = "rgba(8,8,24,0.78)";
      ctx.fillRect(tx - 4, ty - 11, tw + 8, 14);
      ctx.fillStyle = color;
      ctx.fillText(text, tx, ty);
    }
  }
  ctx.restore();
}

// ── Scoring helpers ────────────────────────────────────────────────────────────

function calcStress(avg: EmotionFrame): number {
  const raw = avg.fearful * 3.5 + avg.angry * 2.5 + avg.disgusted * 1.5 + avg.sad * 1.0 + avg.surprised * 0.5 - avg.happy * 2.0;
  return Math.max(0, Math.min(100, (raw / 3.5) * 100));
}
function calcFatigue(avg: EmotionFrame, v: number): number {
  return Math.max(0, Math.min(100, (avg.neutral * 0.45 + avg.sad * 0.35 + (1 - avg.happy) * 0.20) * 100 * (1 - v * 0.25)));
}
function calcAttention(avg: EmotionFrame, v: number): number {
  return Math.max(0, Math.min(100, (avg.neutral * 0.5 + avg.happy * 0.3 + v * 0.2) * 100));
}
function calcVariability(frames: EmotionFrame[]): number {
  if (frames.length < 2) return 0;
  const doms = frames.map((f) => (Object.entries(f) as [string, number][]).sort((a, b) => b[1] - a[1])[0][0]);
  return Math.min(1, new Set(doms).size / 4);
}

function buildInterpretation(r: Omit<FacialResult, "aiInterpretation" | "recommendations">): string {
  const p: string[] = [];
  if (r.stressScore >= 65) p.push("Subject demonstrates elevated cognitive stress with significant facial tension indicators.");
  else if (r.stressScore >= 40) p.push("Subject shows moderate stress patterns with intermittent facial tension markers.");
  else p.push("Subject exhibits a predominantly calm emotional state with minimal stress indicators.");
  if (r.fatigueScore >= 60) p.push("Fatigue markers are prominent, suggesting reduced emotional expression variability.");
  if (r.emotionAverages.fearful >= 0.20) p.push("Anxiety-related micro-expressions were detected at a clinically notable frequency.");
  if (r.expressionVariability < 20) p.push("Low expression variability may indicate emotional suppression or cognitive overload.");
  if (r.emotionAverages.happy >= 0.30) p.push("Positive affect indicators suggest intact baseline emotional resilience.");
  return p.join(" ") || "Analysis complete. No significant abnormalities detected.";
}

function buildRecommendations(r: Omit<FacialResult, "aiInterpretation" | "recommendations">): string[] {
  const recs: string[] = [];
  if (r.stressScore >= 65) { recs.push("Diaphragmatic breathing exercises (4-7-8 technique), 3× daily"); recs.push("Progressive muscle relaxation (PMR) protocol before sleep"); recs.push("Structured mindfulness meditation — 10 min/day"); }
  else if (r.stressScore >= 40) { recs.push("Box breathing exercises (4-4-4-4 pattern)"); recs.push("Light aerobic activity ≥ 30 min/day"); }
  if (r.fatigueScore >= 60) { recs.push("Sleep hygiene optimisation — 7–9 hours per night"); recs.push("Scheduled micro-breaks every 90 minutes during cognitive work"); }
  if (r.emotionAverages.fearful >= 0.20) { recs.push("Cognitive reframing exercises for anxiety management"); recs.push("Refer to psychologist if anxiety symptoms persist > 2 weeks"); }
  if (r.attentionScore < 50) { recs.push("Attentional focus training and sustained concentration exercises"); recs.push("Limit screen exposure ≥ 1 hour before sleep"); }
  if (recs.length === 0) { recs.push("Maintain current wellness practices — results within normal range"); recs.push("Regular physical activity and balanced nutrition"); }
  return recs;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function FacialStressAnalysis() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const patientId = searchParams.get("patientId") ?? "";

  const [patient, setPatient]               = useState<Patient | null>(null);
  const [phase, setPhase]                   = useState<Phase>("intro");
  const [activeTab, setActiveTab]           = useState<ActiveTab>("camera");
  const [loadError, setLoadError]           = useState<string | null>(null);
  const [timeLeft, setTimeLeft]             = useState(SESSION_SECONDS);
  const [liveEmotion, setLiveEmotion]       = useState<EmotionFrame | null>(null);
  const [faceDetected, setFaceDetected]     = useState(false);
  const [capturedFrames, setCapturedFrames] = useState(0);
  const [result, setResult]                 = useState<FacialResult | null>(null);
  const [notes, setNotes]                   = useState("");
  const [saving, setSaving]                 = useState(false);
  const [showModal, setShowModal]           = useState(false);

  // New state
  const [showLabels, setShowLabels]             = useState(true);
  const [activeRegion, setActiveRegion]         = useState<ActiveRegion>("all");
  const [liveMeasurements, setLiveMeasurements] = useState<FaceMeasurements | null>(null);
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [uploadMeasurements, setUploadMeasurements] = useState<FaceMeasurements | null>(null);
  const [uploadDetecting, setUploadDetecting]   = useState(false);
  const [uploadFaceFound, setUploadFaceFound]   = useState<boolean | null>(null);

  const videoRef       = useRef<HTMLVideoElement>(null);
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const detectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const framesRef      = useRef<EmotionFrame[]>([]);
  const finishedRef    = useRef(false);
  const showLabelsRef  = useRef(true);
  const activeRegionRef = useRef<ActiveRegion>("all");
  const liveMeasurementsRef = useRef<FaceMeasurements | null>(null);
  const uploadImgRef   = useRef<HTMLImageElement>(null);
  const uploadCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);

  useEffect(() => { showLabelsRef.current = showLabels; }, [showLabels]);
  useEffect(() => { activeRegionRef.current = activeRegion; }, [activeRegion]);

  useEffect(() => {
    if (!patientId) return;
    getDoc(doc(firebaseDB, "patients", patientId)).then((snap) => {
      if (snap.exists()) setPatient({ id: snap.id, ...snap.data() } as Patient);
    });
  }, [patientId]);

  useEffect(() => () => stopSession(), []);

  const stopSession = useCallback(() => {
    if (detectTimerRef.current) clearInterval(detectTimerRef.current);
    if (countdownRef.current)   clearInterval(countdownRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const runDetection = useCallback(async () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.35 });
    const det  = await faceapi
      .detectSingleFace(video, opts)
      .withFaceLandmarks(true)
      .withFaceExpressions();

    if (!det) { setFaceDetected(false); return; }
    setFaceDetected(true);

    // Sync canvas pixel dims to the video's decoded frame size so there is no
    // scale/crop offset between what face-api detected and what we draw.
    const vw = video.videoWidth  || video.clientWidth;
    const vh = video.videoHeight || video.clientHeight;
    if (canvas.width !== vw)  canvas.width  = vw;
    if (canvas.height !== vh) canvas.height = vh;

    const dims    = { width: vw, height: vh };
    const resized = faceapi.resizeResults(det, dims);
    const ctx     = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const positions = resized.landmarks.positions as unknown as Pt[];
      drawColoredLandmarks(ctx, positions, activeRegionRef.current, showLabelsRef.current);
      if (positions.length >= 68) {
        const m = computeFaceMeasurements(positions);
        liveMeasurementsRef.current = m;
        setLiveMeasurements(m);
      }
    }

    const e: EmotionFrame = {
      neutral: det.expressions.neutral, happy: det.expressions.happy,
      sad: det.expressions.sad, angry: det.expressions.angry,
      fearful: det.expressions.fearful, disgusted: det.expressions.disgusted,
      surprised: det.expressions.surprised,
    };
    framesRef.current.push(e);
    setCapturedFrames(framesRef.current.length);
    setLiveEmotion(e);
  }, []);

  const finishSession = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    stopSession();

    const allFrames = framesRef.current;
    if (allFrames.length === 0) {
      toast.error("No face detected during session. Please try again.");
      setPhase("intro");
      finishedRef.current = false;
      return;
    }

    const count = allFrames.length;
    const sum   = allFrames.reduce((acc, f) => ({
      neutral: acc.neutral + f.neutral, happy: acc.happy + f.happy,
      sad: acc.sad + f.sad, angry: acc.angry + f.angry,
      fearful: acc.fearful + f.fearful, disgusted: acc.disgusted + f.disgusted,
      surprised: acc.surprised + f.surprised,
    }), { neutral: 0, happy: 0, sad: 0, angry: 0, fearful: 0, disgusted: 0, surprised: 0 });
    const avg = Object.fromEntries(Object.entries(sum).map(([k, v]) => [k, (v as number) / count])) as unknown as EmotionFrame;
    const dominant = (Object.entries(avg) as [keyof EmotionFrame, number][]).sort((a, b) => b[1] - a[1])[0][0];
    const variability    = calcVariability(allFrames);
    const stressScore    = Math.round(calcStress(avg));
    const fatigueScore   = Math.round(calcFatigue(avg, variability));
    const attentionScore = Math.round(calcAttention(avg, variability));
    const expressionVariability = Math.round(variability * 100);

    const partial = {
      sessionDuration: SESSION_SECONDS, frameCount: count, dominantEmotion: dominant,
      emotionAverages: avg, stressScore,
      stressLevel: (stressScore >= 65 ? "High" : stressScore >= 40 ? "Moderate" : "Low") as FacialResult["stressLevel"],
      fatigueScore, attentionScore, expressionVariability,
      faceMeasurements: liveMeasurementsRef.current ?? undefined,
    };

    setResult({
      ...partial,
      aiInterpretation: buildInterpretation(partial),
      recommendations:  buildRecommendations(partial),
    });
    setPhase("results");
  }, [stopSession]);

  const startSession = useCallback(async () => {
    setPhase("loading");
    setLoadError(null);
    framesRef.current   = [];
    finishedRef.current = false;
    liveMeasurementsRef.current = null;
    setCapturedFrames(0);
    setLiveEmotion(null);
    setFaceDetected(false);
    setLiveMeasurements(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_PATH),
        faceapi.nets.faceExpressionNet.loadFromUri(MODELS_PATH),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_PATH),
      ]);

      if (videoRef.current) videoRef.current.srcObject = stream;

      setTimeLeft(SESSION_SECONDS);
      setPhase("analysis");

      detectTimerRef.current = setInterval(runDetection, DETECT_MS);

      let remaining = SESSION_SECONDS;
      countdownRef.current = setInterval(() => {
        remaining -= 1;
        setTimeLeft(remaining);
        if (remaining <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          finishSession();
        }
      }, 1000);
    } catch (err: unknown) {
      const msg = (err as Error)?.message?.includes("ermission")
        ? "Camera permission denied. Please allow access and try again."
        : `Failed to initialise: ${(err as Error)?.message ?? "Unknown error"}`;
      setLoadError(msg);
      setPhase("intro");
    }
  }, [runDetection, finishSession]);

  const handleCapture = useCallback(() => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;
    const cap = document.createElement("canvas");
    cap.width  = canvas.width;
    cap.height = canvas.height;
    const ctx = cap.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, cap.width, cap.height);
    ctx.drawImage(canvas, 0, 0);
    const link = document.createElement("a");
    link.download = `face-capture-${Date.now()}.png`;
    link.href = cap.toDataURL("image/png");
    link.click();
  }, []);

  const analyzeUploadedPhoto = useCallback(async () => {
    const img    = uploadImgRef.current;
    const canvas = uploadCanvasRef.current;
    if (!img || !canvas) return;

    setUploadDetecting(true);
    setUploadMeasurements(null);
    setUploadFaceFound(null);

    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_PATH),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_PATH),
      ]);

      const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.30 });
      const det  = await faceapi.detectSingleFace(img, opts).withFaceLandmarks(true);

      if (!det) { setUploadFaceFound(false); setUploadDetecting(false); return; }
      setUploadFaceFound(true);

      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const dims    = faceapi.matchDimensions(canvas, img);
      const resized = faceapi.resizeResults(det, dims);
      const ctx     = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const positions = resized.landmarks.positions as unknown as Pt[];
        drawColoredLandmarks(ctx, positions, "all", true);
        if (positions.length >= 68) setUploadMeasurements(computeFaceMeasurements(positions));
      }
    } catch {
      toast.error("Failed to analyze photo.");
    } finally {
      setUploadDetecting(false);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedImageSrc(ev.target?.result as string);
      setUploadMeasurements(null);
      setUploadFaceFound(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (pid: string) => {
    if (!result || !user) return;
    setSaving(true);
    try {
      await addDoc(collection(firebaseDB, "assessments"), {
        patientId: pid, physioId: user.uid, toolType: "facial_stress",
        data: { ...result, notes }, createdAt: serverTimestamp(),
      });
      setShowModal(false);
      toast.success("Facial stress assessment saved!");
      setTimeout(() => navigate("/physio/reports"), 1200);
    } catch {
      toast.error("Failed to save assessment.");
    } finally { setSaving(false); }
  };

  const stressColor = (s: number) => s >= 65 ? "text-red-500" : s >= 40 ? "text-amber-500" : "text-emerald-500";
  const stressBg    = (s: number) => s >= 65 ? "bg-red-500"   : s >= 40 ? "bg-amber-500"   : "bg-emerald-500";

  return (
    <>
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-1.5 w-8 bg-rose-500 rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">AI Facial Analysis</span>
          </div>
          <h1 className="text-2xl font-black text-text">Facial Stress Analysis</h1>
          {patient && (
            <p className="text-text-muted text-sm mt-0.5">
              Patient: <span className="font-semibold text-text">{patient.name}</span>
              {" · "}{patient.age}y · {patient.condition}
            </p>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex rounded-2xl border border-border bg-input p-1 gap-1">
        {([
          { id: "camera",   label: "Live Camera",   Icon: Camera },
          { id: "upload",   label: "Photo Upload",  Icon: Upload },
        ] as { id: ActiveTab; label: string; Icon: React.ElementType; disabled?: boolean }[]).map(({ id, label, Icon, disabled }) => (
          <button
            key={id}
            onClick={() => !disabled && setActiveTab(id)}
            disabled={!!disabled}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === id
                ? "bg-rose-500/15 text-rose-500 border border-rose-500/30"
                : disabled
                  ? "text-text-muted/30 cursor-not-allowed"
                  : "text-text-muted hover:text-text hover:bg-surface"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ═══ CAMERA TAB ═══ */}
      {activeTab === "camera" && (
        <>
          {/* Intro */}
          {phase === "intro" && (
            <div className="rounded-2xl border border-border bg-input p-6 shadow-sm space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                  <Brain className="w-7 h-7 text-rose-500" />
                </div>
                <div>
                  <p className="font-black text-text text-lg mb-1">AI-Assisted Facial Stress Assessment</p>
                  <p className="text-text-muted text-sm leading-relaxed">
                    A {SESSION_SECONDS}-second camera session analyses facial micro-expressions,
                    emotion distribution, and physiological stress markers using on-device computer vision.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { Icon: Eye,      label: "Micro-expressions", sub: "7 emotion categories" },
                  { Icon: Activity, label: "Stress Index",      sub: "0–100 scored" },
                  { Icon: Brain,    label: "Psych Profile",     sub: "Anxiety · Fatigue · Attention" },
                  { Icon: Shield,   label: "On-device AI",      sub: "No data sent to cloud" },
                ].map(({ Icon, label, sub }) => (
                  <div key={label} className="rounded-xl bg-rose-500/5 border border-rose-500/15 p-3">
                    <Icon className="w-4 h-4 text-rose-500 mb-1.5" />
                    <p className="text-xs font-bold text-text">{label}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">{sub}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-red-500/8 border border-red-500/25 p-4 flex gap-3">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="text-xs font-black text-red-400 uppercase tracking-wide">Important Clinical Limitations</p>
                  <p className="text-xs text-text-muted leading-relaxed">
                    This tool produces <span className="font-semibold text-text">AI-generated screening indicators only</span>.
                    It is <span className="font-semibold text-red-400">not a validated clinical psychological assessment</span> and must{" "}
                    <span className="font-semibold text-red-400">not be used to diagnose mental health conditions</span> (including
                    anxiety disorders, depression, or any DSM/ICD-defined condition). Results fall outside the physiotherapist's
                    scope of practice for psychological diagnosis. Refer patients to a registered psychologist or psychiatrist
                    for any psychological concerns.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Session Instructions</p>
                {[
                  "Ensure adequate, even lighting — avoid strong backlighting or direct glare",
                  "Position face centrally in the camera, approximately 40–60 cm from the screen",
                  "Maintain a natural, relaxed posture throughout the 30-second session",
                  "Camera access permission will be requested when you press Start",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-rose-500/15 text-rose-500 text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-sm text-text-muted">{step}</p>
                  </div>
                ))}
              </div>

              {loadError && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/25 p-3 flex gap-3">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-500">{loadError}</p>
                </div>
              )}

              <Button variant="primary" size="lg" onClick={startSession} className="w-full sm:w-auto">
                <Camera className="w-4 h-4 mr-2" />
                Start {SESSION_SECONDS}-Second Analysis
              </Button>
            </div>
          )}

          {/* Loading + Analysis — video must stay in DOM during loading so srcObject can be set before phase flips */}
          {(phase === "loading" || phase === "analysis") && (
            <>
              {phase === "loading" && (
                <div className="rounded-2xl border border-border bg-input p-12 flex flex-col items-center gap-4 shadow-sm">
                  <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                    <Brain className="w-8 h-8 text-rose-500 animate-pulse" />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-text text-lg">Initialising AI Models</p>
                    <p className="text-text-muted text-sm mt-1">Loading facial expression models and activating camera…</p>
                  </div>
                  <div className="w-48 h-1.5 bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full w-3/5 animate-pulse" />
                  </div>
                  <p className="text-xs text-text-muted">First launch may take 5–10 seconds</p>
                </div>
              )}

              {/* Video element always in DOM while loading/analysis so ref is valid when stream is attached */}
              <div className={phase === "loading" ? "sr-only" : "space-y-4"}>
              {/* Camera view */}
              <div className="rounded-2xl border border-border bg-black overflow-hidden shadow-lg relative">
                <video ref={videoRef} className="w-full block" autoPlay muted playsInline />
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

                {/* Corner brackets */}
                <div className="absolute top-3 left-3 w-7 h-7 border-t-2 border-l-2 border-cyan-400/80" />
                <div className="absolute top-3 right-3 w-7 h-7 border-t-2 border-r-2 border-cyan-400/80" />
                <div className="absolute bottom-3 left-3 w-7 h-7 border-b-2 border-l-2 border-cyan-400/80" />
                <div className="absolute bottom-3 right-3 w-7 h-7 border-b-2 border-r-2 border-cyan-400/80" />

                {/* Face detected badge */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2">
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-sm text-[11px] font-black border ${
                    faceDetected ? "bg-black/60 text-cyan-400 border-cyan-400/40" : "bg-black/60 text-red-400 border-red-400/30"
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${faceDetected ? "bg-cyan-400 animate-pulse" : "bg-red-400"}`} />
                    {faceDetected ? "FACE DETECTED" : "NO FACE"}
                  </div>
                </div>

                {/* Countdown */}
                <div className="absolute bottom-3 right-14 w-11 h-11 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/10">
                  <span className={`text-base font-black ${timeLeft <= 10 ? "text-red-400" : "text-white"}`}>{timeLeft}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex gap-2 justify-center flex-wrap">
                <Button variant="ghost" size="sm" onClick={finishSession} className="border border-red-500/30 text-red-400 hover:bg-red-500/10">
                  <Camera className="w-3.5 h-3.5 mr-1.5" />Stop Camera
                </Button>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => setShowLabels((v) => !v)}
                  className={`border ${showLabels ? "border-cyan-400/40 text-cyan-400 bg-cyan-400/10" : "border-border text-text-muted"}`}
                >
                  <Tag className="w-3.5 h-3.5 mr-1.5" />Labels
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCapture} className="border border-border text-text-muted">
                  <Download className="w-3.5 h-3.5 mr-1.5" />Capture
                </Button>
              </div>

              {/* Real-time measurements */}
              <div className="rounded-2xl border border-border bg-input p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse inline-block" />
                  Real-Time Measurements
                </p>
                {liveMeasurements ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { label: "Face Width",     value: liveMeasurements.faceWidth,     unit: "px" },
                      { label: "Face Height",    value: liveMeasurements.faceHeight,    unit: "px" },
                      { label: "Eye Distance",   value: liveMeasurements.eyeDistance,   unit: "px" },
                      { label: "Jaw Angle",      value: liveMeasurements.jawAngle,      unit: "°"  },
                      { label: "Symmetry Score", value: liveMeasurements.symmetryScore, unit: "%"  },
                      { label: "Head Tilt",      value: liveMeasurements.headTilt,      unit: "°"  },
                    ].map(({ label, value, unit }) => (
                      <div key={label} className="rounded-xl bg-surface border border-border p-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-text-muted mb-1">{label}</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-black text-cyan-400">{value}</span>
                          <span className="text-xs text-text-muted">{unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted text-center py-4">Waiting for face detection…</p>
                )}
              </div>

              {/* Active Regions + Live Emotion */}
              <div className="grid sm:grid-cols-2 gap-3">
                {/* Active regions */}
                <div className="rounded-2xl border border-border bg-input p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-3">Active Regions</p>
                  <div className="flex flex-wrap gap-2">
                    {(["all", "eyes", "nose", "mouth", "jawline", "brows"] as ActiveRegion[]).map((region) => (
                      <button
                        key={region}
                        onClick={() => setActiveRegion(region)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                          activeRegion === region
                            ? "bg-cyan-400/15 text-cyan-400 border-cyan-400/40"
                            : "border-border text-text-muted hover:border-cyan-400/30 hover:text-text"
                        }`}
                      >
                        {region === "all" ? "All Points" : region.charAt(0).toUpperCase() + region.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live emotion feed */}
                <div className="rounded-2xl border border-border bg-input p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-3">Live Emotion Feed</p>
                  {liveEmotion ? (
                    <div className="space-y-1.5">
                      {(Object.keys(EMOTION_COLORS) as (keyof EmotionFrame)[]).map((key) => {
                        const pct = Math.round((liveEmotion[key] ?? 0) * 100);
                        return (
                          <div key={key}>
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-[10px] text-text-muted capitalize flex items-center gap-1">
                                <span>{EMOTION_EMOJIS[key]}</span>{key}
                              </span>
                              <span className={`text-[10px] font-bold ${EMOTION_TEXT_COLORS[key]}`}>{pct}%</span>
                            </div>
                            <div className="h-1 bg-border rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-200 ${EMOTION_COLORS[key]}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-center text-xs text-text-muted py-4">Waiting for face…</p>
                  )}
                </div>
              </div>

              {/* Session progress */}
              <div className="rounded-2xl border border-border bg-input p-4 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-bold text-text">Session Progress</p>
                  <span className="text-xs text-text-muted">{SESSION_SECONDS - timeLeft}s / {SESSION_SECONDS}s · {capturedFrames} frames</span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full transition-all duration-1000"
                    style={{ width: `${((SESSION_SECONDS - timeLeft) / SESSION_SECONDS) * 100}%` }} />
                </div>
              </div>
            </div>
            </>
          )}

          {/* Results phase */}
          {phase === "results" && result && (
            <div className="space-y-5">
              {/* Scope-of-practice disclaimer */}
              <div className="rounded-2xl border border-amber-500/35 bg-amber-500/8 p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-amber-400 uppercase tracking-wide mb-1.5">
                    Screening Indicators Only — Not a Clinical Psychological Assessment
                  </p>
                  <p className="text-xs text-text-muted leading-relaxed">
                    The scores below are <span className="font-semibold text-text">AI-generated estimates derived from facial micro-expressions</span>.
                    They have <span className="font-semibold text-amber-400">no clinical validation</span> for psychological diagnosis and do not
                    constitute a psychiatric or psychological assessment. These results must <span className="font-semibold text-amber-400">not be used
                    to diagnose anxiety, depression, or any other mental health condition</span>. Interpreting psychological results beyond
                    a physiotherapist's regulated scope of practice may breach professional obligations. Where psychological concerns are
                    identified, refer to a qualified mental health professional.
                  </p>
                </div>
              </div>

              {/* Stress hero */}
              <div className="rounded-2xl border border-border bg-input p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-4">Assessment Summary</p>
                <div className="grid grid-cols-3 gap-4 mb-5">
                  {[
                    { label: "Stress Index",  value: result.stressScore,    color: stressColor(result.stressScore),                                                        sub: result.stressLevel },
                    { label: "Fatigue Score", value: result.fatigueScore,   color: result.fatigueScore >= 60 ? "text-amber-500" : "text-emerald-500",                      sub: result.fatigueScore >= 60 ? "Elevated" : "Normal" },
                    { label: "Attention",     value: result.attentionScore, color: result.attentionScore >= 60 ? "text-emerald-500" : "text-amber-500",                     sub: result.attentionScore >= 60 ? "Good" : "Reduced" },
                  ].map(({ label, value, color, sub }) => (
                    <div key={label} className="rounded-xl bg-surface border border-border p-4 text-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-text-muted mb-1">{label}</p>
                      <div className="flex items-end justify-center gap-0.5 mb-0.5">
                        <span className={`text-3xl font-black ${color}`}>{value}</span>
                        <span className="text-sm text-text-muted mb-1">/100</span>
                      </div>
                      <p className={`text-xs font-bold ${color}`}>{sub}</p>
                    </div>
                  ))}
                </div>
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-text-muted mb-1.5">
                    <span>Stress Level</span>
                    <span className={stressColor(result.stressScore)}>{result.stressLevel}</span>
                  </div>
                  <div className="h-2.5 bg-border rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${stressBg(result.stressScore)}`} style={{ width: `${result.stressScore}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-text-muted mt-1">
                    <span>Low (0–39)</span><span>Moderate (40–64)</span><span>High (65–100)</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border text-xs text-text-muted">
                  <span><span className="font-semibold text-text">Dominant: </span>{EMOTION_EMOJIS[result.dominantEmotion as keyof EmotionFrame]} {result.dominantEmotion}</span>
                  <span><span className="font-semibold text-text">Frames: </span>{result.frameCount}</span>
                  <span><span className="font-semibold text-text">Variability: </span>{result.expressionVariability}%</span>
                </div>
              </div>

              {/* Clinical Face Analysis */}
              {result.faceMeasurements && (
                <div className="rounded-2xl border border-border bg-input p-5 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-4 flex items-center gap-2">
                    <Microscope className="w-3.5 h-3.5 text-rose-500" />Clinical Face Analysis Report
                  </p>
                  <div className="space-y-2.5">
                    {([
                      { label: "Face Shape Index",         value: `${result.faceMeasurements.faceShapeIndex} (${getFaceShapeLabel(result.faceMeasurements.faceShapeIndex)})` },
                      { label: "Face Width",               value: `${result.faceMeasurements.faceWidth} px` },
                      { label: "Face Height",              value: `${result.faceMeasurements.faceHeight} px` },
                      { label: "Inter-Pupillary Distance", value: `${result.faceMeasurements.eyeDistance} px` },
                      { label: "Eye-Width Ratio",          value: `${result.faceMeasurements.eyeWidthRatio}` },
                      { label: "Jaw Angle",                value: `${result.faceMeasurements.jawAngle}°` },
                      { label: "Mouth Width",              value: `${result.faceMeasurements.mouthWidth} px` },
                      { label: "Nose Length",              value: `${result.faceMeasurements.noseLength} px` },
                      { label: "Head Tilt",                value: `${result.faceMeasurements.headTilt}°` },
                    ] as { label: string; value: string }[]).map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center border-b border-border pb-2 last:border-0 last:pb-0">
                        <span className="text-sm text-text-muted">{label}</span>
                        <span className="text-sm font-bold text-cyan-400">{value}</span>
                      </div>
                    ))}
                    <div className="pt-1">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm text-text-muted">Facial Symmetry</span>
                        <span className="text-sm font-bold text-cyan-400">{result.faceMeasurements.symmetryScore}%</span>
                      </div>
                      <div className="relative h-2 rounded-full overflow-hidden bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500">
                        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-slate-800 shadow"
                          style={{ left: `calc(${result.faceMeasurements.symmetryScore}% - 6px)` }} />
                      </div>
                    </div>
                    <div className="flex justify-between items-start pt-1 border-t border-border">
                      <span className="text-sm text-text-muted">Clinical Notes</span>
                      <span className="text-xs text-text-muted text-right max-w-xs">{getMeasurementNotes(result.faceMeasurements)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Emotion distribution */}
              <div className="rounded-2xl border border-border bg-input p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-4">Emotion Distribution</p>
                <div className="space-y-2.5">
                  {(Object.keys(EMOTION_COLORS) as (keyof EmotionFrame)[])
                    .sort((a, b) => result.emotionAverages[b] - result.emotionAverages[a])
                    .map((key) => {
                      const pct = Math.round(result.emotionAverages[key] * 100);
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <span className="w-5 text-sm">{EMOTION_EMOJIS[key]}</span>
                          <span className="w-20 text-xs text-text-muted capitalize">{key}</span>
                          <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${EMOTION_COLORS[key]}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className={`w-9 text-right text-xs font-bold ${EMOTION_TEXT_COLORS[key]}`}>{pct}%</span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Psychology parameters */}
              <div className="rounded-2xl border border-border bg-input p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-4">Psychology Parameters</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { label: "Anxiety Tendency",     value: Math.round(result.emotionAverages.fearful * 100), status: result.emotionAverages.fearful >= 0.20 ? "Elevated" : "Normal", good: result.emotionAverages.fearful < 0.20, color: "bg-orange-500" },
                    { label: "Cognitive Load",       value: Math.min(100, Math.round(result.stressScore * 0.8 + result.fatigueScore * 0.2)), status: result.stressScore >= 65 ? "High" : result.stressScore >= 40 ? "Moderate" : "Low", good: result.stressScore < 40, color: "bg-violet-500" },
                    { label: "Emotional Resilience", value: Math.min(100, Math.round(result.emotionAverages.happy * 100 + result.expressionVariability * 0.3)), status: result.emotionAverages.happy >= 0.25 ? "Good" : "Reduced", good: result.emotionAverages.happy >= 0.25, color: "bg-emerald-500" },
                    { label: "Expression Variability", value: result.expressionVariability, status: result.expressionVariability >= 25 ? "Normal" : "Low", good: result.expressionVariability >= 25, color: "bg-blue-500" },
                  ].map(({ label, value, status, good, color }) => (
                    <div key={label} className="rounded-xl bg-surface border border-border p-3">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-bold text-text">{label}</p>
                        <div className={`flex items-center gap-1 text-[10px] font-bold ${good ? "text-emerald-500" : "text-amber-500"}`}>
                          {good ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{status}
                        </div>
                      </div>
                      <div className="h-1.5 bg-border rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
                      </div>
                      <p className="text-right text-xs text-text-muted mt-1">{Math.min(100, value)}%</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Interpretation */}
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-4 h-4 text-rose-500" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">AI Interpretation</p>
                </div>
                <p className="text-sm text-text leading-relaxed">{result.aiInterpretation}</p>
                <p className="text-[10px] text-text-muted mt-3 italic">AI-generated screening indicator only — not a clinical psychological assessment. Not to be used for diagnosis of any mental health condition. Clinical judgement and comprehensive evaluation remain primary.</p>
              </div>

              {/* Recommendations */}
              <div className="rounded-2xl border border-border bg-input p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-3">Clinical Recommendations</p>
                <div className="space-y-2">
                  {result.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-text-muted">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clinical notes */}
              <div className="rounded-2xl border border-border bg-input p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-2">Clinical Notes (Optional)</p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add clinical observations, context, or follow-up notes…"
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-text-muted outline-none focus:border-rose-500/50 resize-none min-h-[90px] transition"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" size="lg" onClick={() => setShowModal(true)} className="flex-1 sm:flex-none">
                  <Save className="w-4 h-4 mr-2" />Save Assessment
                </Button>
                <Button variant="ghost" size="lg" onClick={() => {
                  setPhase("intro"); setResult(null);
                  framesRef.current = []; finishedRef.current = false;
                  liveMeasurementsRef.current = null; setLiveMeasurements(null);
                }}>
                  <RefreshCw className="w-4 h-4 mr-2" />Re-analyse
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ UPLOAD TAB ═══ */}
      {activeTab === "upload" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-input p-6 shadow-sm space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                <Upload className="w-6 h-6 text-rose-500" />
              </div>
              <div>
                <p className="font-black text-text mb-1">Photo Upload Analysis</p>
                <p className="text-sm text-text-muted">Upload a clear frontal face photo to extract landmarks and facial measurements.</p>
              </div>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <Button variant="primary" size="lg" onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto">
              <Upload className="w-4 h-4 mr-2" />
              {uploadedImageSrc ? "Change Photo" : "Select Photo"}
            </Button>
          </div>

          {uploadedImageSrc && (
            <>
              {/* Image + canvas overlay */}
              <div className="rounded-2xl border border-border bg-black overflow-hidden shadow-lg relative">
                <img
                  ref={uploadImgRef}
                  src={uploadedImageSrc}
                  alt="Uploaded face"
                  className="w-full object-contain"
                  style={{ maxHeight: 480 }}
                  onLoad={analyzeUploadedPhoto}
                />
                <canvas
                  ref={uploadCanvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ objectFit: "contain" }}
                />
                {/* Status badge */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2">
                  {uploadDetecting ? (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[11px] font-black text-amber-400 border border-amber-400/40">
                      <RefreshCw className="w-3 h-3 animate-spin" />ANALYSING…
                    </div>
                  ) : uploadFaceFound === true ? (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[11px] font-black text-cyan-400 border border-cyan-400/40">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />FACE DETECTED
                    </div>
                  ) : uploadFaceFound === false ? (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[11px] font-black text-red-400 border border-red-400/30">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400" />NO FACE FOUND
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Upload measurements */}
              {uploadMeasurements && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-input p-4 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-3">Facial Measurements</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { label: "Face Width",     value: uploadMeasurements.faceWidth,     unit: "px" },
                        { label: "Face Height",    value: uploadMeasurements.faceHeight,    unit: "px" },
                        { label: "Eye Distance",   value: uploadMeasurements.eyeDistance,   unit: "px" },
                        { label: "Jaw Angle",      value: uploadMeasurements.jawAngle,      unit: "°"  },
                        { label: "Symmetry Score", value: uploadMeasurements.symmetryScore, unit: "%"  },
                        { label: "Head Tilt",      value: uploadMeasurements.headTilt,      unit: "°"  },
                      ].map(({ label, value, unit }) => (
                        <div key={label} className="rounded-xl bg-surface border border-border p-3">
                          <p className="text-[9px] font-black uppercase tracking-widest text-text-muted mb-1">{label}</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-black text-cyan-400">{value}</span>
                            <span className="text-xs text-text-muted">{unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Clinical report from upload */}
                  <div className="rounded-2xl border border-border bg-input p-5 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-3 flex items-center gap-2">
                      <Microscope className="w-3.5 h-3.5 text-rose-500" />Clinical Face Analysis Report
                    </p>
                    <div className="space-y-2">
                      {([
                        { label: "Face Shape Index",         value: `${uploadMeasurements.faceShapeIndex} (${getFaceShapeLabel(uploadMeasurements.faceShapeIndex)})` },
                        { label: "Face Width",               value: `${uploadMeasurements.faceWidth} px` },
                        { label: "Face Height",              value: `${uploadMeasurements.faceHeight} px` },
                        { label: "Inter-Pupillary Distance", value: `${uploadMeasurements.eyeDistance} px` },
                        { label: "Eye-Width Ratio",          value: `${uploadMeasurements.eyeWidthRatio}` },
                        { label: "Jaw Angle",                value: `${uploadMeasurements.jawAngle}°` },
                        { label: "Mouth Width",              value: `${uploadMeasurements.mouthWidth} px` },
                        { label: "Nose Length",              value: `${uploadMeasurements.noseLength} px` },
                        { label: "Head Tilt",                value: `${uploadMeasurements.headTilt}°` },
                      ] as { label: string; value: string }[]).map(({ label, value }) => (
                        <div key={label} className="flex justify-between items-center border-b border-border pb-2 last:border-0 last:pb-0">
                          <span className="text-sm text-text-muted">{label}</span>
                          <span className="text-sm font-bold text-cyan-400">{value}</span>
                        </div>
                      ))}
                      {/* Symmetry row with bar */}
                      <div className="pt-1">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-sm text-text-muted">Facial Symmetry</span>
                          <span className="text-sm font-bold text-cyan-400">{uploadMeasurements.symmetryScore}%</span>
                        </div>
                        <div className="relative h-2 rounded-full overflow-hidden bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500">
                          <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-slate-800 shadow"
                            style={{ left: `calc(${uploadMeasurements.symmetryScore}% - 6px)` }} />
                        </div>
                      </div>
                      <div className="flex justify-between items-start pt-1">
                        <span className="text-sm text-text-muted">Clinical Notes</span>
                        <span className="text-xs text-text-muted text-right max-w-xs">{getMeasurementNotes(uploadMeasurements)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

    </div>

    <PatientSelectSaveModal
      open={showModal}
      onClose={() => setShowModal(false)}
      onSave={handleSave}
      saving={saving}
      preselectedPatientId={patientId}
    />
    </>
  );
}
