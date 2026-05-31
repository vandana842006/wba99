import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  collection, query, where, getDocs, addDoc, updateDoc,
  doc, serverTimestamp,
} from "firebase/firestore";
import jsPDF from "jspdf";
import toast from "react-hot-toast";
import { firebaseDB } from "../../core/firebase";
import { useAuth } from "../../context/AuthContext";
import type { Assessment, Patient } from "../../types";
import {
  Sparkles, Film, Loader2, Download, CheckCircle, XCircle,
  RefreshCw, Video, Copy, FileText, Search, Users, ChevronRight,
  CheckCircle2, ClipboardList,
} from "lucide-react";

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? "";

// ─────────────────────────────────────────────────────────────
// VIDEO GENERATOR – data
// ─────────────────────────────────────────────────────────────

const EXERCISE_PRESETS = [
  { name: "Quad Sets",             prompt: "Person performing quad sets exercise - tightening thigh muscles with knee fully extended while lying on a mat, clear demonstration from side angle" },
  { name: "Heel Slides",           prompt: "Person performing heel slides exercise - slowly sliding heel toward buttock while lying supine, demonstrating proper knee flexion technique" },
  { name: "Bird Dog",              prompt: "Person performing bird dog exercise on hands and knees - extending opposite arm and leg while maintaining neutral spine, core stability focus" },
  { name: "Wall Squats",           prompt: "Person performing wall squats - leaning against wall, sliding down to 90 degree knee bend, proper form demonstration with alignment markers" },
  { name: "Shoulder Ext. Rotation",prompt: "Person performing shoulder external rotation with resistance band - elbow at side, rotating forearm outward, rotator cuff strengthening" },
  { name: "Ankle Pumps",           prompt: "Close-up of feet performing ankle pump exercises - alternating dorsiflexion and plantarflexion, promoting circulation and mobility" },
  { name: "Clamshells",            prompt: "Person performing clamshell exercise lying on side - knees bent, lifting top knee while keeping feet together, hip abductor strengthening" },
  { name: "Bridges",               prompt: "Person performing glute bridge exercise - lying supine, lifting hips off mat, squeezing glutes at top, proper core engagement" },
];

type VideoStatus = "pending" | "generating" | "completed" | "failed";

interface VideoGenRecord {
  id: string;
  userId: string;
  exerciseName?: string;
  prompt?: string;
  duration: number;
  size: string;
  status: VideoStatus;
  taskId?: string;
  error?: string;
  createdAt: unknown;
}

interface ActiveVideoTask {
  firestoreId: string;
  taskId?: string;
  status: VideoStatus;
  error?: string;
}

// ─────────────────────────────────────────────────────────────
// DOCUMENT GENERATOR – data & helpers
// ─────────────────────────────────────────────────────────────

const DOC_TYPES = [
  { id: "assessment_report",    label: "Assessment Summary Report",  desc: "Full clinical summary of all completed assessments with findings and recommendations." },
  { id: "exercise_prescription",label: "Exercise Prescription",      desc: "Goal-directed exercise programme based on identified deficits." },
  { id: "soap_note",            label: "SOAP Progress Note",         desc: "Structured Subjective / Objective / Assessment / Plan note." },
  { id: "referral_letter",      label: "Referral Letter",            desc: "Formal referral with clinical summary for specialist or allied health." },
  { id: "discharge_summary",    label: "Discharge Summary",          desc: "Episode summary with goals achieved and home exercise programme." },
] as const;
type DocTypeId = typeof DOC_TYPES[number]["id"];

const ROM_NORMALS: Record<string, number> = {
  shoulder_flex: 180, shoulder_ext: 60, shoulder_abd: 180, shoulder_ir: 70, shoulder_er: 90,
  hip_flex: 120, hip_ext: 30, hip_abd: 45, hip_ir: 45, hip_er: 45,
  knee_flex: 135, knee_ext: 0,
  ankle_df: 20, ankle_pf: 50, ankle_inv: 35, ankle_ev: 15,
  cx_flex: 45, cx_ext: 45, lx_flex: 90, lx_ext: 30,
};

function latestByType(assessments: Assessment[]): Record<string, Assessment> {
  const map: Record<string, Assessment> = {};
  for (const a of assessments) { if (!map[a.toolType]) map[a.toolType] = a; }
  return map;
}

function fmsClinicalText(a: Assessment): string {
  const d = a.data as Record<string, unknown>;
  const total = Number(d.total ?? 0);
  const asymmetries = Array.isArray(d.asymmetries) ? (d.asymmetries as unknown[]).map(String) : [];
  const risk = total >= 14 ? "Low Risk" : total >= 11 ? "Moderate Risk" : "High Risk";
  const impression = total >= 14
    ? "Movement quality within normal functional range."
    : total >= 11
    ? "Moderate movement dysfunction — targeted intervention recommended."
    : "Significant movement dysfunction — comprehensive rehabilitation indicated.";
  return [
    `FUNCTIONAL MOVEMENT SCREEN (FMS)`,
    `Score: ${total}/21  |  Risk: ${risk}`,
    `Clinical Finding: ${impression}`,
    ...(asymmetries.length > 0 ? [`Asymmetries: ${asymmetries.join(", ")}.`] : []),
  ].join("\n");
}

function romClinicalText(a: Assessment): string {
  const joints = (a.data as Record<string, unknown>).joints as Record<string, { L?: number; R?: number; single?: number }> | undefined;
  const restrictions: string[] = [];
  if (joints) {
    for (const [joint, vals] of Object.entries(joints)) {
      const normal = ROM_NORMALS[joint]; if (!normal) continue;
      for (const [side, val] of [["L", vals.L], ["R", vals.R], ["", vals.single]] as [string, number | undefined][]) {
        if (val == null) continue;
        if (val / normal < 0.8) restrictions.push(`${joint.replace(/_/g, " ")}${side ? ` (${side})` : ""}: ${val}° (${Math.round(val / normal * 100)}% of normal)`);
      }
    }
  }
  return [
    `RANGE OF MOTION ASSESSMENT`,
    restrictions.length === 0
      ? "All measured ranges are within 80% of normal values."
      : `Restrictions below 80% of normal:\n${restrictions.map(r => `  • ${r}`).join("\n")}`,
    ...((a.data as Record<string, unknown>).notes ? [`Notes: ${(a.data as Record<string, unknown>).notes}`] : []),
  ].join("\n");
}

function gaitClinicalText(a: Assessment): string {
  const d = a.data as Record<string, unknown>;
  const total = Number(d.total ?? 0);
  const impression = total >= 12 ? "Gait pattern functionally adequate." : total >= 8 ? "Moderate gait impairment noted." : "Significant gait dysfunction — retraining indicated.";
  return [
    `GAIT ANALYSIS`,
    `Score: ${total}/15`,
    `Clinical Finding: ${impression}`,
    ...(d.observations ? [`Observations: ${d.observations}`] : []),
  ].join("\n");
}

function generateReport(patient: Patient, assessments: Assessment[], physioName: string, docType: DocTypeId): string {
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const latest = latestByType(assessments);
  const hr = "─".repeat(50);
  const sections: string[] = [];
  if (latest.fms) sections.push(fmsClinicalText(latest.fms));
  if (latest.rom) sections.push(romClinicalText(latest.rom));
  if (latest.gait) sections.push(gaitClinicalText(latest.gait));

  if (docType === "assessment_report") {
    return [
      `PHYSIOTHERAPY ASSESSMENT REPORT`, hr,
      `Patient: ${patient.name}  |  Age: ${patient.age}y  |  ${patient.gender}`,
      `Condition: ${patient.condition}`,
      `Clinician: ${physioName}  |  Date: ${today}`, ``,
      `REASON FOR ASSESSMENT`,
      `${patient.name} presents with ${patient.condition.toLowerCase()}. The following standardised assessments were administered.`, ``,
      ...(sections.length ? sections.flatMap(s => [s, ``]) : [`No completed assessments found. Complete assessment tools first.`, ``]),
      `CLINICAL IMPRESSION`,
      `${patient.name} presents with findings consistent with their condition. A structured physiotherapy programme is recommended.`, ``,
      `RECOMMENDATIONS`,
      `1. Commence structured physiotherapy addressing identified deficits.`,
      `2. Reassess at 4-week intervals to monitor progress.`,
      `3. Provide home exercise programme (HEP) to reinforce clinical gains.`,
      `4. Review goals collaboratively with patient at each appointment.`, ``,
      hr, `Clinician: ${physioName}  |  Date: ${today}`,
    ].join("\n");
  }

  if (docType === "exercise_prescription") {
    const review = new Date(); review.setDate(review.getDate() + 28);
    const reviewStr = review.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const exerciseLines: string[] = [];
    if (latest.fms && Number((latest.fms.data as Record<string, unknown>).total) < 14) {
      exerciseLines.push(`[A] MOVEMENT QUALITY`, `• Deadbug  |  3×10  |  3×/week`, `• Pallof press  |  3×12/side  |  3×/week`, `• Half-kneeling hip flexor stretch  |  3×30s  |  Daily`);
    }
    if (latest.rom) {
      const joints = (latest.rom.data as Record<string, unknown>).joints as Record<string, { L?: number; R?: number }> | undefined;
      const restricted = joints ? Object.entries(joints).filter(([j, v]) => {
        const n = ROM_NORMALS[j]; return n && ([v.L, v.R].some(val => val != null && val / n < 0.8));
      }).map(([j]) => j.replace(/_/g, " ")) : [];
      if (restricted.length) {
        exerciseLines.push(``, `[B] FLEXIBILITY`, ...restricted.map(j => `• ${j} stretch  |  3×30s  |  Twice daily`));
      }
    }
    if (latest.gait && Number((latest.gait.data as Record<string, unknown>).total) < 12) {
      exerciseLines.push(``, `[C] GAIT RETRAINING`, `• Treadmill gait training  |  15 min  |  3×/week`, `• Single-leg stance balance  |  3×30s/side  |  Daily`);
    }
    exerciseLines.push(``, `[D] GENERAL CONDITIONING`, `• Low-impact aerobic exercise  |  20–30 min  |  5×/week`, `• Core stability programme  |  3×/week`);
    return [
      `EXERCISE PRESCRIPTION`, hr,
      `Patient: ${patient.name}  |  ${patient.age}y  ${patient.gender}`,
      `Condition: ${patient.condition}  |  Date: ${today}  |  Review: ${reviewStr}`, ``,
      `SHORT-TERM GOALS (4 weeks)`,
      `• Reduce pain/limitation from ${patient.condition.toLowerCase()}.`,
      `• Improve neuromuscular control and movement quality.`,
      `• HEP compliance ≥4 sessions/week.`, ``,
      `LONG-TERM GOALS (12 weeks)`,
      `• Restore full functional capacity for daily activities.`,
      `• FMS score ≥14/21. Independent self-management.`, ``,
      `PRESCRIBED EXERCISES`, ...exerciseLines, ``,
      `PRECAUTIONS`,
      `• Stop if pain exceeds 4/10 VAS.`,
      `• No resisted exercise during acute flare.`, ``,
      hr, `Clinician: ${physioName}  |  Date: ${today}`,
    ].join("\n");
  }

  if (docType === "soap_note") {
    return [
      `SOAP PROGRESS NOTE`, hr,
      `Patient: ${patient.name}  |  ${patient.age}y  ${patient.gender}`,
      `Date: ${today}  |  Clinician: ${physioName}`, ``,
      `SUBJECTIVE (S)`,
      `Patient presents with ${patient.condition.toLowerCase()}. ${assessments.length} standardised assessment${assessments.length !== 1 ? "s" : ""} on record.`, ``,
      `OBJECTIVE (O)`,
      ...(latest.fms ? [`FMS: ${(latest.fms.data as Record<string, unknown>).total}/21`] : []),
      ...(latest.gait ? [`Gait Score: ${(latest.gait.data as Record<string, unknown>).total}/15`] : []),
      ...(latest.rom ? [`ROM: Restrictions documented — see ROM record.`] : []),
      ...(assessments.length === 0 ? [`No assessments on record.`] : []), ``,
      `ASSESSMENT (A)`,
      `${patient.name} presents with findings consistent with ${patient.condition.toLowerCase()}.`,
      latest.fms
        ? Number((latest.fms.data as Record<string, unknown>).total) < 14
          ? `Movement quality impaired (FMS ${(latest.fms.data as Record<string, unknown>).total}/21). Intervention directed at identified deficits.`
          : `Movement quality within functional range (FMS ${(latest.fms.data as Record<string, unknown>).total}/21). Maintenance programme recommended.`
        : `Assessment findings to be interpreted in context of presentation.`, ``,
      `PLAN (P)`,
      `1. Continue current physiotherapy programme.`,
      `2. Progress exercises per patient tolerance.`,
      `3. Review HEP compliance.`,
      `4. Reassess at 4-week interval.`,
      `5. Next appointment: _______________`, ``,
      hr, `Clinician: ${physioName}`,
    ].join("\n");
  }

  if (docType === "referral_letter") {
    return [
      `PHYSIOTHERAPY REFERRAL LETTER`, hr,
      `Date: ${today}`,
      `From: ${physioName}, Physiotherapist — WBA99 Clinic`,
      `Re: ${patient.name}  |  Age: ${patient.age}y  |  ${patient.gender}`, ``,
      `Dear Colleague,`, ``,
      `I am writing to refer the above patient for specialist assessment. ${patient.name} presents with ${patient.condition.toLowerCase()} and has been under physiotherapy care at our clinic.`, ``,
      `CLINICAL SUMMARY`,
      ...(latest.fms ? [`• FMS Score: ${(latest.fms.data as Record<string, unknown>).total}/21`] : []),
      ...(latest.gait ? [`• Gait Score: ${(latest.gait.data as Record<string, unknown>).total}/15`] : []),
      ...(latest.rom ? [`• ROM restrictions identified — see attached ROM report.`] : []),
      ...(assessments.length === 0 ? [`• Assessment data to be provided under separate cover.`] : []), ``,
      `CLINICAL QUERY`,
      `[Please complete the specific clinical query / reason for referral here.]`, ``,
      `I would be grateful for your review and recommendations. Please contact me if further information is required.`, ``,
      `Yours sincerely,`, ``,
      `${physioName}`,
      `Physiotherapist — WBA99 Clinic`,
    ].join("\n");
  }

  // discharge_summary
  const earliest = assessments[assessments.length - 1];
  const startDate = earliest ? (() => {
    try { return (earliest.createdAt as { toDate?: () => Date })?.toDate?.()?.toLocaleDateString("en-GB") ?? new Date(earliest.createdAt as string).toLocaleDateString("en-GB"); } catch { return "Unknown"; }
  })() : "Unknown";
  return [
    `PHYSIOTHERAPY DISCHARGE SUMMARY`, hr,
    `Patient: ${patient.name}  |  ${patient.age}y  ${patient.gender}`,
    `Condition: ${patient.condition}  |  Clinician: ${physioName}`,
    `Episode: ${startDate} → ${today}  |  Total Assessments: ${assessments.length}`, ``,
    `INITIAL PRESENTATION`,
    `${patient.name} presented with ${patient.condition.toLowerCase()} requiring physiotherapy assessment and management.`, ``,
    `PROGRESS SUMMARY`,
    ...(latest.fms ? [`• FMS: ${(latest.fms.data as Record<string, unknown>).total}/21 at discharge. ${Number((latest.fms.data as Record<string, unknown>).total) >= 14 ? "Goals achieved." : "Improvement noted from baseline."}`] : []),
    ...(latest.gait ? [`• Gait: ${(latest.gait.data as Record<string, unknown>).total}/15 at discharge.`] : []), ``,
    `GOALS ACHIEVED`,
    `☐ Pain reduction to patient-acceptable level`,
    `☐ Functional movement within normal limits`,
    `☐ Return to daily activities / sport / work`,
    `☐ Independent self-management strategies established`, ``,
    `HOME EXERCISE PROGRAMME ON DISCHARGE`,
    `• Core stability exercises  |  3×/week`,
    `• Joint-specific stretches as prescribed  |  Daily`,
    `• Aerobic conditioning  |  5×/week`, ``,
    `FOLLOW-UP`,
    `• Open re-referral if symptoms recur.`,
    `• GP follow-up at 3 months if no improvement.`, ``,
    hr, `Clinician: ${physioName}  |  Date: ${today}`,
  ].join("\n");
}

function exportPDF(text: string, label: string, patientName: string) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 20;
  const usable = pdf.internal.pageSize.getWidth() - margin * 2;
  let y = margin;
  (pdf.splitTextToSize(text, usable) as string[]).forEach((line: string) => {
    if (y > 272) { pdf.addPage(); y = margin; }
    const isHeading = /^[A-Z][A-Z \(\)\/\-]{4,}$/.test(line.trim());
    pdf.setFont("helvetica", isHeading ? "bold" : "normal");
    pdf.setFontSize(isHeading ? 10 : 9);
    pdf.text(line, margin, y);
    y += 6;
  });
  pdf.save(`${patientName.replace(/\s+/g, "_")}_${label.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

function toMs(ts: unknown): number {
  try { return (ts as { toMillis?: () => number })?.toMillis?.() ?? new Date(ts as string).getTime(); }
  catch { return 0; }
}

// ─────────────────────────────────────────────────────────────
// VIDEO GENERATOR TAB
// ─────────────────────────────────────────────────────────────

function VideoGeneratorTab() {
  const { user } = useAuth();
  const [prompt, setPrompt]         = useState("");
  const [exerciseName, setName]     = useState("");
  const [duration, setDuration]     = useState("4");
  const [size, setSize]             = useState("1280x720");
  const [generating, setGenerating] = useState(false);
  const [activeTask, setActiveTask] = useState<ActiveVideoTask | null>(null);
  const [history, setHistory]       = useState<VideoGenRecord[]>([]);
  const [pollRef, setPollRef]       = useState<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (pollRef) clearInterval(pollRef); }, [pollRef]);

  const getHeaders = useCallback((): Record<string, string> => {
    const token = localStorage.getItem("wba99_token");
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  }, []);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    try {
      const snap = await getDocs(query(collection(firebaseDB, "video_generations"), where("userId", "==", user.uid)));
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as VideoGenRecord));
      items.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
      setHistory(items);
    } catch { /* offline or no collection yet */ }
  }, [user]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const pollStatus = useCallback(async (taskId: string, fsId: string) => {
    if (!BACKEND) return;
    try {
      const res = await fetch(`${BACKEND}/api/video/status/${taskId}`, { headers: getHeaders() });
      if (!res.ok) return;
      const data = await res.json() as { status: string; error?: string };
      if (data.status === "completed" || data.status === "failed") {
        const newStatus = data.status as VideoStatus;
        setActiveTask((prev) => prev ? { ...prev, status: newStatus, error: data.error } : null);
        setGenerating(false);
        setPollRef((prev) => { if (prev) clearInterval(prev); return null; });
        if (fsId) {
          await updateDoc(doc(firebaseDB, "video_generations", fsId), { status: newStatus, ...(data.error ? { error: data.error } : {}) });
        }
        loadHistory();
      }
    } catch { /* poll silently */ }
  }, [getHeaders, loadHistory]);

  const handleGenerate = async () => {
    if (!prompt.trim() || !user) return;
    setGenerating(true);
    setActiveTask(null);

    // Always persist to Firebase first
    let fsId = "";
    try {
      const ref = await addDoc(collection(firebaseDB, "video_generations"), {
        userId: user.uid,
        exerciseName,
        prompt: prompt.trim(),
        duration: parseInt(duration),
        size,
        status: "pending" as VideoStatus,
        createdAt: serverTimestamp(),
      });
      fsId = ref.id;
    } catch { /* non-fatal */ }

    if (!BACKEND) {
      setActiveTask({ firestoreId: fsId, status: "pending" });
      setGenerating(false);
      loadHistory();
      toast("Request saved to Firebase. Set VITE_BACKEND_URL to enable AI video generation.", { icon: "ℹ️" });
      return;
    }

    try {
      const res = await fetch(`${BACKEND}/api/video/generate`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ prompt: prompt.trim(), exercise_name: exerciseName, duration: parseInt(duration), size }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json() as { task_id: string };
      setActiveTask({ firestoreId: fsId, taskId: data.task_id, status: "generating" });
      if (fsId) await updateDoc(doc(firebaseDB, "video_generations", fsId), { taskId: data.task_id, status: "generating" });
      const interval = setInterval(() => pollStatus(data.task_id, fsId), 5000);
      setPollRef(interval);
    } catch {
      setGenerating(false);
      if (fsId) await updateDoc(doc(firebaseDB, "video_generations", fsId), { status: "failed" }).catch(() => {});
      toast.error("Video generation failed to start.");
    }
  };

  const handleDownload = async (taskId: string, exerciseLabel?: string) => {
    if (!BACKEND || !taskId) { toast.error("No download available."); return; }
    try {
      const res = await fetch(`${BACKEND}/api/video/download/${taskId}`, { headers: getHeaders() });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `WBA99_Exercise_${(exerciseLabel ?? taskId).replace(/\s+/g, "_").slice(0, 20)}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Download failed."); }
  };

  const statusColor = (s: VideoStatus) =>
    s === "completed" ? "bg-emerald-500/15 text-emerald-600" :
    s === "generating" ? "bg-primary/15 text-primary" :
    s === "pending"    ? "bg-amber-500/15 text-amber-600" :
                         "bg-red-500/15 text-red-600";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      {/* Left: form */}
      <div className="xl:col-span-2 space-y-4">
        {/* Presets */}
        <div className="bg-surface border border-border rounded-2xl p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-violet-500" /> Quick Presets
          </p>
          <div className="flex flex-wrap gap-1.5">
            {EXERCISE_PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => { setName(p.name); setPrompt(p.prompt); }}
                className="px-3 py-1.5 rounded-full border border-border text-xs text-text-muted hover:border-primary/40 hover:text-text hover:bg-surface transition"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-text-muted block mb-1.5">Exercise Name</label>
            <input
              value={exerciseName}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Quad Sets, Bird Dog…"
              className="w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-text outline-none focus:border-primary/50 placeholder:text-text-muted transition"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-text-muted block mb-1.5">Video Description / Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the exercise video you want to generate…"
              rows={4}
              className="w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-text outline-none focus:border-primary/50 placeholder:text-text-muted transition resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-text-muted block mb-1.5">Duration</label>
              <select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-primary/50 transition">
                <option value="4">4 seconds</option>
                <option value="8">8 seconds</option>
                <option value="12">12 seconds</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-text-muted block mb-1.5">Resolution</label>
              <select value={size} onChange={(e) => setSize(e.target.value)} className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-primary/50 transition">
                <option value="1280x720">1280×720 (HD)</option>
                <option value="1024x1024">1024×1024 (Square)</option>
                <option value="1792x1024">1792×1024 (Wide)</option>
                <option value="1024x1792">1024×1792 (Portrait)</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
            {generating ? "Generating… (2–5 min)" : "Generate Video"}
          </button>
        </div>

        {/* Active task */}
        {activeTask && (
          <div className={`rounded-2xl border-2 p-5 ${
            activeTask.status === "completed" ? "border-emerald-500/30 bg-emerald-500/5" :
            activeTask.status === "failed"    ? "border-red-500/30 bg-red-500/5" :
            activeTask.status === "pending"   ? "border-amber-500/30 bg-amber-500/5" :
                                                "border-primary/30 bg-primary/5"
          }`}>
            <div className="flex items-center gap-3">
              {activeTask.status === "generating" && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
              {activeTask.status === "completed"  && <CheckCircle className="w-5 h-5 text-emerald-500" />}
              {activeTask.status === "failed"     && <XCircle className="w-5 h-5 text-red-500" />}
              {activeTask.status === "pending"    && <Loader2 className="w-5 h-5 text-amber-500" />}
              <div className="flex-1">
                <p className="font-bold text-text text-sm">
                  {activeTask.status === "generating" ? "Generating your video…" :
                   activeTask.status === "completed"  ? "Video Ready!" :
                   activeTask.status === "pending"    ? "Request Saved to Firebase" : "Generation Failed"}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {activeTask.status === "generating" && "Sora 2 is creating your exercise video. This typically takes 2–5 minutes."}
                  {activeTask.status === "completed"  && "Your video has been generated. Click Download to save it."}
                  {activeTask.status === "pending"    && "Request saved. Configure VITE_BACKEND_URL in .env to enable AI video generation."}
                  {activeTask.status === "failed"     && (activeTask.error ?? "Something went wrong. Please try again.")}
                </p>
              </div>
              {activeTask.status === "completed" && activeTask.taskId && (
                <button
                  onClick={() => handleDownload(activeTask.taskId!, exerciseName)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              )}
            </div>
            {activeTask.status === "generating" && (
              <div className="mt-3 h-1.5 rounded-full bg-primary/10 overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: history + tips */}
      <div className="space-y-4">
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">Generation History</p>
            <button onClick={loadHistory} className="flex items-center gap-1 text-xs text-text-muted hover:text-text transition">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
          {history.length === 0 ? (
            <div className="text-center py-8">
              <Video className="w-8 h-8 text-text-muted mx-auto mb-2" />
              <p className="text-xs text-text-muted">No videos generated yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {history.map((task) => (
                <div key={task.id} className="p-3 rounded-xl bg-input border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <Film className="w-3 h-3 text-text-muted flex-shrink-0" />
                    <span className="text-xs font-bold text-text flex-1 truncate">{task.exerciseName ?? "Custom Video"}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${statusColor(task.status)}`}>{task.status}</span>
                  </div>
                  <p className="text-[10px] text-text-muted truncate">{String(task.prompt ?? "").slice(0, 80)}…</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-text-muted">{new Date(toMs(task.createdAt)).toLocaleDateString()}</span>
                    <span className="text-[10px] text-text-muted">{task.duration}s · {task.size}</span>
                    {task.status === "completed" && task.taskId && (
                      <button onClick={() => handleDownload(task.taskId!, task.exerciseName)} className="ml-auto flex items-center gap-1 text-[10px] text-primary hover:underline">
                        <Download className="w-3 h-3" /> DL
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface border border-violet-500/20 rounded-2xl p-4">
          <p className="text-xs font-black text-violet-600 dark:text-violet-400 mb-2">Tips for Better Videos</p>
          <ul className="text-xs text-text-muted space-y-1 list-disc pl-4">
            <li>Be descriptive about the exercise form</li>
            <li>Mention camera angle (side, front, overhead)</li>
            <li>Include environment (clinic, gym, mat)</li>
            <li>4s for quick demos, 12s for full sequences</li>
            <li>Use presets as starting points and customize</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DOCUMENT GENERATOR TAB
// ─────────────────────────────────────────────────────────────

type DocStep = "patient" | "configure" | "preview";

function DocumentGeneratorTab() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [step, setStep]                     = useState<DocStep>("patient");
  const [patients, setPatients]             = useState<Patient[]>([]);
  const [patSearch, setPatSearch]           = useState("");
  const [loadingPat, setLoadingPat]         = useState(true);
  const [selectedPatient, setSelected]      = useState<Patient | null>(null);
  const [assessments, setAssessments]       = useState<Assessment[]>([]);
  const [loadingAss, setLoadingAss]         = useState(false);
  const [docType, setDocType]               = useState<DocTypeId>("assessment_report");
  const [manuscript, setManuscript]         = useState("");
  const [generating, setGenerating]         = useState(false);
  const [copied, setCopied]                 = useState(false);

  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(firebaseDB, "patients"), where("physioId", "==", user.uid)))
      .then((snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Patient));
        docs.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
        setPatients(docs);
        const pid = searchParams.get("patientId");
        if (pid) { const found = docs.find(p => p.id === pid); if (found) { setSelected(found); setStep("configure"); } }
      })
      .finally(() => setLoadingPat(false));
  }, [user, searchParams]);

  const loadAssessments = async (pid: string) => {
    setLoadingAss(true);
    const snap = await getDocs(query(collection(firebaseDB, "assessments"), where("patientId", "==", pid)));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Assessment));
    list.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
    setAssessments(list);
    setLoadingAss(false);
  };

  const handleSelectPatient = (p: Patient) => { setSelected(p); setManuscript(""); setStep("configure"); loadAssessments(p.id); };

  const handleGenerate = () => {
    if (!selectedPatient) return;
    setGenerating(true);
    setTimeout(() => {
      setManuscript(generateReport(selectedPatient, assessments, user?.name ?? "Clinician", docType));
      setStep("preview");
      setGenerating(false);
    }, 500);
  };

  const filtered = patients.filter(p => p.name.toLowerCase().includes(patSearch.toLowerCase()) || p.condition.toLowerCase().includes(patSearch.toLowerCase()));
  const selectedDoc = DOC_TYPES.find(d => d.id === docType)!;
  const stepOrder: DocStep[] = ["patient", "configure", "preview"];
  const stepLabels = ["Select Patient", "Document Type", "Preview & Export"];

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-2 flex-wrap">
        {stepOrder.map((s, i) => {
          const isDone = stepOrder.indexOf(step) > i;
          const isActive = step === s;
          return (
            <div key={s} className="flex items-center gap-2">
              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${isActive ? "bg-primary/15 text-primary border border-primary/30" : isDone ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30" : "bg-input text-text-muted border border-border"}`}>
                <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px] font-black">{i + 1}</span>
                {stepLabels[i]}
              </span>
              {i < stepOrder.length - 1 && <ChevronRight className="w-4 h-4 text-text-muted" />}
            </div>
          );
        })}
      </div>

      {/* Step 1 */}
      {step === "patient" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input value={patSearch} onChange={e => setPatSearch(e.target.value)} placeholder="Search patients…" className="w-full rounded-2xl border border-border bg-input pl-12 pr-4 py-3 text-sm text-text outline-none focus:border-primary/50 placeholder:text-text-muted transition shadow-sm" />
          </div>
          {loadingPat ? (
            <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16"><Users className="w-10 h-10 text-text-muted mx-auto mb-3" /><p className="text-text-muted text-sm">{patSearch ? "No patients match" : "No patients yet"}</p></div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {filtered.map(p => (
                <button key={p.id} onClick={() => handleSelectPatient(p)} className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-input hover:border-primary/30 hover:bg-surface hover:shadow-md text-left transition-all duration-300 active:scale-[0.98]">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-black text-primary">{p.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-text text-sm truncate">{p.name}</p>
                    <p className="text-xs text-text-muted truncate">{p.condition}</p>
                  </div>
                  <span className="text-xs font-bold text-text-muted flex-shrink-0">{p.age}y</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2 */}
      {step === "configure" && selectedPatient && (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-primary/5 border border-primary/15">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-black text-primary">{selectedPatient.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}</span>
              </div>
              <div className="min-w-0">
                <p className="font-bold text-text text-sm truncate">{selectedPatient.name}</p>
                <p className="text-xs text-text-muted">{selectedPatient.condition} · {selectedPatient.age}y</p>
              </div>
            </div>
            <button onClick={() => setStep("patient")} className="text-xs font-bold text-primary hover:underline flex-shrink-0">Change</button>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-widest text-text-muted mb-2">Available Assessment Data</p>
            {loadingAss ? (
              <div className="flex items-center gap-2 text-sm text-text-muted py-3"><div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />Loading…</div>
            ) : assessments.length === 0 ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-700 dark:text-amber-400">
                <ClipboardList className="w-4 h-4 flex-shrink-0" /> No assessments found. The document will use demographics only.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(assessments.map(a => a.toolType))).map(t => (
                  <span key={t} className="text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary">{t.replace(/_/g, " ").toUpperCase()}</span>
                ))}
                <span className="text-xs text-text-muted self-center">({assessments.length} record{assessments.length !== 1 ? "s" : ""})</span>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-widest text-text-muted mb-3">Select Document Type</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {DOC_TYPES.map(dt => (
                <button key={dt.id} onClick={() => setDocType(dt.id)} className={`text-left p-4 rounded-2xl border-2 transition-all ${docType === dt.id ? "border-primary/50 bg-primary/5" : "border-border bg-input hover:border-primary/30 hover:bg-surface"}`}>
                  <div className="flex items-start gap-2 mb-1">
                    <FileText className={`w-4 h-4 mt-0.5 flex-shrink-0 ${docType === dt.id ? "text-primary" : "text-text-muted"}`} />
                    <p className={`text-sm font-bold ${docType === dt.id ? "text-primary" : "text-text"}`}>{dt.label}</p>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">{dt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleGenerate} disabled={generating} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-60 transition">
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? "Generating…" : `Generate ${selectedDoc.label}`}
          </button>
        </div>
      )}

      {/* Step 3 */}
      {step === "preview" && selectedPatient && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep("configure")} className="text-xs font-bold text-primary hover:underline">← Back</button>
              <span className="text-text-muted">·</span>
              <span className="text-xs text-text-muted">{selectedDoc.label} for {selectedPatient.name}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { navigator.clipboard.writeText(manuscript).then(() => { setCopied(true); toast.success("Copied"); setTimeout(() => setCopied(false), 2000); }); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-surface text-sm font-bold text-text hover:border-primary/40 transition"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={() => { exportPDF(manuscript, selectedDoc.label, selectedPatient.name); toast.success("PDF downloaded"); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition"
              >
                <Download className="w-4 h-4" /> Export PDF
              </button>
            </div>
          </div>
          <p className="text-xs text-text-muted">Edit the generated text before exporting.</p>
          <textarea value={manuscript} onChange={e => setManuscript(e.target.value)} rows={32} className="w-full rounded-2xl border border-border bg-input px-5 py-4 text-sm text-text font-mono outline-none focus:border-primary/50 resize-y transition leading-relaxed" />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

type Tab = "video" | "document";

export function AIManuscriptGenerator() {
  const [tab, setTab] = useState<Tab>("video");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-1.5 w-8 bg-primary rounded-full" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">AI Tools</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-text tracking-tight">AI Manuscript Generator</h1>
        <p className="text-text-muted mt-1 text-sm">Generate AI exercise videos or professional clinical documents from your patient data</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-input rounded-2xl w-fit border border-border">
        {([["video", "AI Video Generator", Film], ["document", "Document Generator", FileText]] as [Tab, string, React.ElementType][]).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${tab === key ? "bg-surface text-text shadow-sm border border-border" : "text-text-muted hover:text-text"}`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "video"    && <VideoGeneratorTab />}
      {tab === "document" && <DocumentGeneratorTab />}
    </div>
  );
}
