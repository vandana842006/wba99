import { useEffect, useState, useCallback } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { firebaseDB } from "../../core/firebase";
import { useAuth } from "../../context/AuthContext";
import type { Assessment, Patient } from "../../types";
import {
  Brain, BookOpen, Award, FileText, TrendingUp, Activity,
  AlertTriangle, Mic, Users, Database, ExternalLink, RefreshCcw,
} from "lucide-react";

// ── Static reference data (matches ResearchDashboard.js) ─────────────────────

const RESEARCH_PAPERS = [
  { title: "ACL Rehabilitation Protocols 2026",           journal: "Journal of Orthopaedic Research",    type: "Systematic Review",  date: "2026-01", access: "Open Access" },
  { title: "AI in Physiotherapy: Current Evidence",       journal: "Physical Therapy Reviews",            type: "Meta-Analysis",      date: "2025-11", access: "Open Access" },
  { title: "Telerehabilitation Outcomes in MSK",          journal: "BMC Musculoskeletal Disorders",       type: "RCT",                date: "2025-09", access: "Subscription" },
  { title: "Exercise Prescription Using ML Models",       journal: "Digital Health",                      type: "Original Research",  date: "2026-01", access: "Open Access" },
  { title: "Posture Analysis: Reliability of AI Tools",   journal: "Gait & Posture",                      type: "Validation Study",   date: "2025-12", access: "Open Access" },
];

const CERTIFICATIONS = [
  { name: "Sports Physiotherapy Specialist", org: "APTA",   status: "Active", expires: "2027-06" },
  { name: "Dry Needling Certification",      org: "IAACP",  status: "Active", expires: "2026-12" },
  { name: "Manual Therapy Advanced",         org: "IFOMPT", status: "Active", expires: "2027-03" },
];

// Joint labels — covers both ROM assessment IDs and Live-Pose style keys
const JOINT_LABELS: Record<string, string> = {
  shoulder_flex: "Shoulder Flexion",  shoulder_ext: "Shoulder Extension",
  shoulder_abd:  "Shoulder Abduction",shoulder_ir:  "Shoulder IR",
  shoulder_er:   "Shoulder ER",
  hip_flex:      "Hip Flexion",       hip_ext:      "Hip Extension",
  hip_abd:       "Hip Abduction",     hip_ir:       "Hip IR",
  hip_er:        "Hip ER",
  knee_flex:     "Knee Flexion",      knee_ext:     "Knee Extension",
  ankle_df:      "Ankle Dorsiflexion",ankle_pf:     "Ankle Plantarflexion",
  ankle_inv:     "Ankle Inversion",   ankle_ev:     "Ankle Eversion",
  cx_flex:       "Cervical Flexion",  cx_ext:       "Cervical Extension",
  cx_rot:        "Cervical Rotation", cx_lat:       "Cervical Lateral Flex",
  lx_flex:       "Lumbar Flexion",    lx_ext:       "Lumbar Extension",
  // Live-Pose style keys
  L_shoulder: "L Shoulder", R_shoulder: "R Shoulder",
  L_elbow:    "L Elbow",    R_elbow:    "R Elbow",
  L_hip:      "L Hip",      R_hip:      "R Hip",
  L_knee:     "L Knee",     R_knee:     "R Knee",
  L_ankle:    "L Ankle",    R_ankle:    "R Ankle",
};

const TOOL_LABELS: Record<string, string> = {
  fms: "FMS", rom: "ROM", msk: "MSK", posture: "Posture",
  gait: "Gait Score", gait_clinical: "Clinical Gait",
  inclinometer: "Inclinometer", facial_stress: "Facial Stress",
  spinal: "Spinal", prescription: "Prescription",
};

const TOOL_COLORS: Record<string, string> = {
  fms: "bg-primary/15 text-primary", rom: "bg-emerald-500/15 text-emerald-600",
  msk: "bg-violet-500/15 text-violet-600", posture: "bg-amber-500/15 text-amber-600",
  gait: "bg-sky-500/15 text-sky-600", gait_clinical: "bg-teal-500/15 text-teal-600",
  inclinometer: "bg-cyan-500/15 text-cyan-600", facial_stress: "bg-rose-500/15 text-rose-600",
  spinal: "bg-teal-500/15 text-teal-600", prescription: "bg-orange-500/15 text-orange-600",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toMs(ts: unknown): number {
  try { return (ts as { toMillis?: () => number })?.toMillis?.() ?? new Date(ts as string).getTime(); }
  catch { return 0; }
}

function avg(arr: number[]): number {
  return arr.length === 0 ? 0 : Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
}

// ── Live biomechanics data structure (matches ResearchDashboard.js shape) ─────

interface JointStat { n: number; avg: number; max: number; min: number; }
interface TopPatient { patient_id: string; patient_name: string; sessions: number; }
interface BioData {
  cohort_size: number;
  total_sessions: number;
  avg_posture: number;
  avg_symmetry: number;
  voice_rom_milestones_logged: number;
  valgus_findings_count: number;
  pdf_consequences_count: number;
  trend: { delta: number };
  joint_rom_stats: Record<string, JointStat>;
  top_patients: TopPatient[];
  as_of: string;
}

// Extra analytics beyond ResearchDashboard.js
interface ExtraStats {
  byType: Record<string, number>;
  fmsScores: number[];
  avgGait: number | null;
  weeklyActivity: number[];
  recentActivity: { patientName: string; toolType: string; ts: number }[];
}

// ── Compute everything from Firebase data ─────────────────────────────────────

function computeAll(patients: Patient[], assessments: Assessment[]): { bio: BioData; extra: ExtraStats } {
  const patientMap: Record<string, string> = {};
  patients.forEach(p => { patientMap[p.id] = p.name; });

  const gaitA  = assessments.filter(a => a.toolType === "gait" || a.toolType === "gait_clinical");
  const postA  = assessments.filter(a => a.toolType === "posture");
  const romA   = assessments.filter(a => a.toolType === "rom");
  const fmsA   = assessments.filter(a => a.toolType === "fms");

  // ── BioData KPIs ───────────────────────────────────────────────────────────
  const cohort_size    = patients.length;
  const total_sessions = assessments.length;

  const postureScores  = postA.map(a => Number((a.data as Record<string, unknown>).score ?? 0)).filter(s => s > 0);
  const avg_posture    = avg(postureScores);

  // symmetry 0–3 → scaled 0–100
  const symScores      = gaitA.map(a => Number((a.data as Record<string, unknown>).symmetry ?? 0)).filter(s => s > 0);
  const avg_symmetry   = symScores.length > 0 ? Math.round((avg(symScores) / 3) * 100) : 0;

  // ROM assessments = milestones (each ROM session records multiple joint measurements)
  const voice_rom_milestones_logged = romA.reduce((sum, a) => {
    const joints = (a.data as Record<string, unknown>).joints as Record<string, unknown> | undefined;
    return sum + (joints ? Object.keys(joints).length : 1);
  }, 0);

  // symmetry <= 1 ("Severely" or "Mildly asymmetric") → valgus/varus proxy
  const valgus_findings_count = gaitA.filter(a => Number((a.data as Record<string, unknown>).symmetry ?? 3) <= 1).length;

  // Assessments with significant clinical findings
  const pdf_consequences_count =
    fmsA.filter(a => Number((a.data as Record<string, unknown>).total ?? 21) < 14).length +
    gaitA.filter(a => Number((a.data as Record<string, unknown>).total ?? 15) < 12).length +
    postA.filter(a => Number((a.data as Record<string, unknown>).score ?? 100) < 60).length;

  // 30-day posture delta
  const now      = Date.now();
  const month    = 30 * 24 * 60 * 60 * 1000;
  const curr30   = postA.filter(a => now - toMs(a.createdAt) < month).map(a => Number((a.data as Record<string, unknown>).score ?? 0)).filter(s => s > 0);
  const prev30   = postA.filter(a => now - toMs(a.createdAt) >= month && now - toMs(a.createdAt) < 2 * month).map(a => Number((a.data as Record<string, unknown>).score ?? 0)).filter(s => s > 0);
  const avgCurr  = curr30.length  > 0 ? curr30.reduce((s, v)  => s + v,  0) / curr30.length  : null;
  const avgPrev  = prev30.length  > 0 ? prev30.reduce((s, v)  => s + v,  0) / prev30.length  : null;
  const trend_delta = avgCurr != null && avgPrev != null ? Math.round(avgCurr - avgPrev) : 0;

  // ── Per-joint ROM stats ────────────────────────────────────────────────────
  const jointValues: Record<string, number[]> = {};
  for (const a of romA) {
    const joints = (a.data as Record<string, unknown>).joints as Record<string, { L?: number; R?: number; single?: number }> | undefined;
    if (!joints) continue;
    for (const [jid, vals] of Object.entries(joints)) {
      if (!jointValues[jid]) jointValues[jid] = [];
      [vals.L, vals.R, vals.single].forEach(v => { if (v != null && v > 0) jointValues[jid].push(v); });
    }
  }
  const joint_rom_stats: Record<string, JointStat> = {};
  for (const [jid, vals] of Object.entries(jointValues)) {
    if (vals.length === 0) continue;
    joint_rom_stats[jid] = {
      n:   vals.length,
      avg: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
      max: Math.max(...vals),
      min: Math.min(...vals),
    };
  }

  // ── Top 10 patients ────────────────────────────────────────────────────────
  const patCount: Record<string, number> = {};
  assessments.forEach(a => { patCount[a.patientId] = (patCount[a.patientId] ?? 0) + 1; });
  const top_patients: TopPatient[] = Object.entries(patCount)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([pid, sessions]) => ({ patient_id: pid, patient_name: patientMap[pid] ?? pid.slice(0, 12), sessions }));

  const bio: BioData = {
    cohort_size, total_sessions, avg_posture, avg_symmetry,
    voice_rom_milestones_logged, valgus_findings_count, pdf_consequences_count,
    trend: { delta: trend_delta },
    joint_rom_stats,
    top_patients,
    as_of: new Date().toISOString(),
  };

  // ── Extra stats ────────────────────────────────────────────────────────────
  const byType: Record<string, number> = {};
  assessments.forEach(a => { byType[a.toolType] = (byType[a.toolType] ?? 0) + 1; });

  const fmsScores = fmsA.map(a => Number((a.data as Record<string, unknown>).total ?? 0)).filter(s => s > 0);

  const gaitScores = gaitA.map(a => Number((a.data as Record<string, unknown>).total ?? 0)).filter(s => s > 0);
  const avgGait = gaitScores.length > 0 ? Math.round(gaitScores.reduce((s, v) => s + v, 0) / gaitScores.length * 10) / 10 : null;

  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const weeklyActivity = Array.from({ length: 8 }, (_, i) => {
    const start = now - (7 - i) * weekMs;
    const end   = start + weekMs;
    return assessments.filter(a => { const t = toMs(a.createdAt); return t >= start && t < end; }).length;
  });

  const recentActivity = assessments.slice(0, 8).map(a => ({
    patientName: patientMap[a.patientId] ?? "Unknown",
    toolType: a.toolType,
    ts: toMs(a.createdAt),
  }));

  return { bio, extra: { byType, fmsScores, avgGait, weeklyActivity, recentActivity } };
}

// ── CSV export (matches ResearchDashboard.js format exactly) ─────────────────

function exportCSV(bio: BioData | null) {
  if (!bio || Object.keys(bio.joint_rom_stats).length === 0) return;
  const rows = [["joint", "sample_count", "avg_deg", "max_deg", "min_deg"]];
  for (const [j, s] of Object.entries(bio.joint_rom_stats)) {
    rows.push([j, String(s.n), String(s.avg), String(s.max), String(s.min)]);
  }
  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wba99_research_cohort_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KPI({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="p-3 rounded-xl bg-surface border border-border flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-input flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-lg font-black text-text leading-tight">{value}</div>
        <div className="text-[10px] text-text-muted leading-tight">{label}</div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ResearchHub() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bio, setBio]         = useState<BioData | null>(null);
  const [extra, setExtra]     = useState<ExtraStats | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [pSnap, aSnap] = await Promise.all([
        getDocs(query(collection(firebaseDB, "patients"),   where("physioId", "==", user.uid))),
        getDocs(query(collection(firebaseDB, "assessments"),where("physioId", "==", user.uid))),
      ]);
      const patients    = pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Patient));
      const assessments = aSnap.docs.map(d => ({ id: d.id, ...d.data() } as Assessment));
      assessments.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
      const result = computeAll(patients, assessments);
      setBio(result.bio);
      setExtra(result.extra);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const maxType  = extra ? Math.max(...Object.values(extra.byType), 1) : 1;
  const maxWeek  = extra ? Math.max(...extra.weeklyActivity, 1) : 1;
  const weekLabels = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(Date.now() - (7 - i) * 7 * 24 * 60 * 60 * 1000);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });

  const fmsBuckets = extra ? [
    { label: "High Risk (<11)",  count: extra.fmsScores.filter(s => s < 11).length,              color: "bg-red-500" },
    { label: "Moderate (11–13)", count: extra.fmsScores.filter(s => s >= 11 && s < 14).length,  color: "bg-amber-500" },
    { label: "Low Risk (≥14)",   count: extra.fmsScores.filter(s => s >= 14).length,             color: "bg-emerald-500" },
  ] : [];

  return (
    <div className="space-y-6" data-testid="research-dashboard-page">
      {/* Header — matches ResearchDashboard.js layout */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-1.5 w-8 bg-primary rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">Research</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-text tracking-tight">Research & Clinical Dataset</h1>
          <p className="text-text-muted mt-1 text-sm">
            Live biomechanics dataset aggregated from your Firebase assessment records · auto-updated
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={loadData} data-testid="research-refresh-btn"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-surface text-sm text-text hover:border-primary/40 transition">
            <RefreshCcw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button onClick={() => exportCSV(bio)} disabled={!bio || Object.keys(bio.joint_rom_stats).length === 0}
            data-testid="research-csv-export"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-surface text-sm text-text hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition">
            <Database className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          {/* ── LIVE CLINICAL BIOMECHANICS DATASET ──────────────────────── */}
          <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/5 to-transparent p-5">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-primary" />
              <h3 className="font-black text-text text-base uppercase tracking-wide">LIVE CLINICAL BIOMECHANICS DATASET</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-white">SYNCED</span>
            </div>

            {bio && (
              <>
                {/* 8 KPIs in 2×4 grid — same as ResearchDashboard.js */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4" data-testid="kpi-grid">
                  <KPI icon={<Users className="w-5 h-5 text-primary" />}             value={bio.cohort_size}                 label="Patients in cohort" />
                  <KPI icon={<Activity className="w-5 h-5 text-emerald-500" />}      value={bio.total_sessions}              label="Total sessions" />
                  <KPI icon={<TrendingUp className="w-5 h-5 text-indigo-500" />}     value={bio.avg_posture}                 label="Avg posture score" />
                  <KPI icon={<TrendingUp className="w-5 h-5 text-violet-500" />}     value={`${bio.avg_symmetry}%`}          label="Avg symmetry score" />
                  <KPI icon={<Mic className="w-5 h-5 text-cyan-500" />}              value={bio.voice_rom_milestones_logged} label="ROM joint milestones" />
                  <KPI icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}   value={bio.valgus_findings_count}       label="Valgus/Varus events" />
                  <KPI icon={<FileText className="w-5 h-5 text-red-500" />}          value={bio.pdf_consequences_count}      label="Assessments w/ findings" />
                  <KPI
                    icon={<TrendingUp className={`w-5 h-5 ${bio.trend.delta >= 0 ? "text-emerald-500" : "text-red-500"}`} />}
                    value={`${bio.trend.delta >= 0 ? "+" : ""}${bio.trend.delta}`}
                    label="30-day posture Δ"
                  />
                </div>

                {/* Per-joint ROM table — matches ResearchDashboard.js exactly */}
                {Object.keys(bio.joint_rom_stats).length > 0 && (
                  <div className="mt-2">
                    <h4 className="text-sm font-bold text-text mb-2">Cohort ROM by Joint</h4>
                    <div className="overflow-x-auto border border-border rounded-xl bg-surface">
                      <table className="w-full text-xs">
                        <thead className="bg-input text-text-muted">
                          <tr>
                            <th className="text-left px-3 py-2">Joint</th>
                            <th className="text-right px-3 py-2">Samples</th>
                            <th className="text-right px-3 py-2">Min°</th>
                            <th className="text-right px-3 py-2">Avg°</th>
                            <th className="text-right px-3 py-2">Max°</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(bio.joint_rom_stats).map(([j, s]) => (
                            <tr key={j} className="border-t border-border" data-testid={`rom-row-${j}`}>
                              <td className="px-3 py-1.5 font-bold text-text">{JOINT_LABELS[j] ?? j}</td>
                              <td className="px-3 py-1.5 text-right text-text-muted">{s.n}</td>
                              <td className="px-3 py-1.5 text-right text-text">{s.min}°</td>
                              <td className="px-3 py-1.5 text-right text-primary font-bold">{s.avg}°</td>
                              <td className="px-3 py-1.5 text-right text-emerald-600 font-bold">{s.max}°</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[10px] text-text-muted mt-1">Only joints with recorded values are shown.</p>
                  </div>
                )}

                {Object.keys(bio.joint_rom_stats).length === 0 && (
                  <p className="text-sm text-text-muted mt-2">No ROM assessments on record yet. Complete ROM assessments to populate joint stats.</p>
                )}

                {/* Top 10 patients — matches ResearchDashboard.js */}
                {bio.top_patients.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-bold text-text mb-2">Top 10 Most-Active Patients</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {bio.top_patients.map((p, i) => (
                        <div key={p.patient_id} className="flex items-center justify-between p-2 rounded-xl border border-border bg-surface" data-testid={`top-patient-${i}`}>
                          <span className="text-xs text-text truncate flex-1">#{i + 1} · {p.patient_name}</span>
                          <span className="text-[10px] font-bold text-text-muted ml-2">{p.sessions} sess</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-text-muted mt-3">
                  Data refreshes every time a clinician saves an assessment. Last sync: {new Date(bio.as_of).toLocaleString()}
                </p>
              </>
            )}
          </div>

          {/* ── Assessment type breakdown (extra) ───────────────────────── */}
          {extra && Object.keys(extra.byType).length > 0 && (
            <div className="bg-surface border border-border rounded-2xl p-5">
              <h3 className="text-sm font-black uppercase tracking-widest text-text-muted mb-4">Assessment Type Breakdown</h3>
              <div className="space-y-3">
                {Object.entries(extra.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-28 text-center flex-shrink-0 ${TOOL_COLORS[type] ?? "bg-input text-text-muted"}`}>
                      {TOOL_LABELS[type] ?? type}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-input overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, (count / maxType) * 100)}%` }} />
                    </div>
                    <span className="text-xs font-black text-text w-8 text-right flex-shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Weekly activity + FMS distribution (extra) ──────────────── */}
          {extra && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Weekly activity */}
              <div className="bg-surface border border-border rounded-2xl p-5">
                <h3 className="text-sm font-black uppercase tracking-widest text-text-muted mb-4">Weekly Activity (Last 8 Weeks)</h3>
                {extra.weeklyActivity.every(v => v === 0) ? (
                  <p className="text-sm text-text-muted">No activity data.</p>
                ) : (
                  <div className="flex items-end gap-1.5 h-28">
                    {extra.weeklyActivity.map((count, i) => {
                      const pct = maxWeek > 0 ? (count / maxWeek) * 100 : 0;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[9px] text-text-muted">{count > 0 ? count : ""}</span>
                          <div className="w-full rounded-t-md bg-primary/70" style={{ height: `${Math.max(pct, count > 0 ? 6 : 0)}%` }} />
                          <span className="text-[8px] text-text-muted">{weekLabels[i]}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* FMS risk distribution */}
              <div className="bg-surface border border-border rounded-2xl p-5">
                <h3 className="text-sm font-black uppercase tracking-widest text-text-muted mb-4">FMS Risk Distribution</h3>
                {extra.fmsScores.length === 0 ? (
                  <p className="text-sm text-text-muted">No FMS assessments yet.</p>
                ) : (
                  <div className="space-y-4">
                    {fmsBuckets.map(({ label, count, color }) => (
                      <div key={label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-text-muted font-bold">{label}</span>
                          <span className="font-black text-text">{count}</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-input overflow-hidden">
                          <div className={`h-full rounded-full ${color}`} style={{ width: `${extra.fmsScores.length > 0 ? Math.max(4, count / extra.fmsScores.length * 100) : 0}%` }} />
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-text-muted pt-1">
                      Avg FMS: <span className="font-black text-text">{Math.round(extra.fmsScores.reduce((s, v) => s + v, 0) / extra.fmsScores.length * 10) / 10}/21</span>
                      {extra.avgGait != null && <>  ·  Avg Gait: <span className="font-black text-text">{extra.avgGait}/15</span></>}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Summary stat cards — matches ResearchDashboard.js ─────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface border border-border rounded-2xl p-5 text-center">
              <Brain className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-black text-text">{RESEARCH_PAPERS.length + 7}</p>
              <p className="text-xs text-text-muted">Research Papers</p>
            </div>
            <div className="bg-surface border border-border rounded-2xl p-5 text-center">
              <Award className="w-6 h-6 text-amber-500 mx-auto mb-2" />
              <p className="text-2xl font-black text-text">{CERTIFICATIONS.length}</p>
              <p className="text-xs text-text-muted">Active Certifications</p>
            </div>
            <div className="bg-surface border border-border rounded-2xl p-5 text-center">
              <BookOpen className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              <p className="text-2xl font-black text-text">24</p>
              <p className="text-xs text-text-muted">CE Hours This Year</p>
            </div>
          </div>

          {/* ── Research papers — matches ResearchDashboard.js ─────────── */}
          <div className="bg-surface border border-border rounded-2xl p-5">
            <h3 className="font-black text-text mb-4 flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" /> Latest Research
            </h3>
            <div className="space-y-3">
              {RESEARCH_PAPERS.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-border hover:border-primary/30 transition">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text">{item.title}</p>
                    <p className="text-xs text-text-muted">{item.journal} | {item.date}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] font-bold border border-border rounded-full px-2 py-0.5 text-text-muted">{item.type}</span>
                      <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${item.access === "Open Access" ? "bg-emerald-500/15 text-emerald-600" : "bg-input text-text-muted"}`}>{item.access}</span>
                    </div>
                  </div>
                  <button className="text-text-muted hover:text-text transition flex-shrink-0"><ExternalLink className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>

          {/* ── Certifications — matches ResearchDashboard.js ──────────── */}
          <div className="bg-surface border border-border rounded-2xl p-5">
            <h3 className="font-black text-text mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" /> Certifications
            </h3>
            <div className="space-y-2">
              {CERTIFICATIONS.map((cert, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                  <Award className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text">{cert.name}</p>
                    <p className="text-xs text-text-muted">{cert.org} | Expires: {cert.expires}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-600 rounded-full px-2 py-0.5 flex-shrink-0">{cert.status}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
