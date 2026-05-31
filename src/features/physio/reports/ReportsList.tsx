import { useEffect, useRef, useState, type ReactElement } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import toast from "react-hot-toast";
import { firebaseDB } from "../../../core/firebase";
import { useAuth } from "../../../context/AuthContext";
import type { Assessment, Patient } from "../../../types";
import { Badge } from "../../../components/ui/Badge";
import {
  Activity,
  AlignCenter,
  Brain,
  Calendar,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Compass,
  Download,
  FileText,
  Filter,
  Gamepad2,
  Layers,
  MapPin,
  RefreshCw,
  Scan,
  Search,
  Share2,
  Footprints,
  Users,
  X,
  Zap,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { downloadAssessmentPDF, shareAssessmentPDF } from "../../../core/utils/generatePDF";

// ── Tool metadata ─────────────────────────────────────────────────────────────

const TOOL_META: Record<
  string,
  {
    label: string;
    color: "primary" | "success" | "warning" | "error" | "muted";
    icon: React.ElementType;
    accent: string;
  }
> = {
  fms:          { label: "FMS",          color: "primary",  icon: Activity,      accent: "from-primary/20 to-primary/5 border-primary/30" },
  rom:          { label: "ROM",          color: "success",  icon: RefreshCw,     accent: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30" },
  msk:          { label: "MSK",          color: "muted",    icon: MapPin,        accent: "from-violet-500/20 to-violet-500/5 border-violet-500/30" },
  posture:      { label: "Posture",      color: "warning",  icon: AlignCenter,   accent: "from-amber-500/20 to-amber-500/5 border-amber-500/30" },
  gait:          { label: "Gait Score",   color: "primary",  icon: Footprints,    accent: "from-sky-500/20 to-sky-500/5 border-sky-500/30" },
  gait_clinical: { label: "Clinical Gait", color: "success", icon: FileText,      accent: "from-teal-500/20 to-teal-500/5 border-teal-500/30" },
  prescription: { label: "Rx",           color: "error",    icon: ClipboardList, accent: "from-rose-500/20 to-rose-500/5 border-rose-500/30" },
  inclinometer:  { label: "Inclinometer", color: "muted",    icon: Compass,       accent: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30" },
  facial_stress: { label: "Facial Stress", color: "error",   icon: Brain,         accent: "from-rose-500/20 to-rose-500/5 border-rose-500/30" },
  spinal:        { label: "Spinal",        color: "success",  icon: Layers,        accent: "from-teal-500/20 to-teal-500/5 border-teal-500/30" },
  "live-pose":    { label: "Live Pose",    color: "muted",    icon: Scan,          accent: "from-indigo-500/20 to-indigo-500/5 border-indigo-500/30" },
  "cricket-live": { label: "Cricket Pose", color: "warning",  icon: Zap,           accent: "from-orange-500/20 to-orange-500/5 border-orange-500/30" },
  "rehab-game":   { label: "Rehab Game",   color: "muted",    icon: Gamepad2,      accent: "from-orange-400/20 to-orange-400/5 border-orange-400/30" },
};

interface EnrichedAssessment extends Assessment {
  patientName: string;
  patientCondition: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

function toDate(ts: unknown): Date | null {
  try {
    return (ts as { toDate?: () => Date })?.toDate?.() ?? new Date(ts as string);
  } catch {
    return null;
  }
}

function formatRelative(ts: unknown): string {
  const d = toDate(ts);
  return d ? formatDistanceToNow(d, { addSuffix: true }) : "—";
}

function formatExact(ts: unknown): string {
  const d = toDate(ts);
  return d ? format(d, "dd MMM yyyy, h:mm a") : "—";
}

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function MetricChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center justify-center px-3 py-2 rounded-xl bg-input border border-border min-w-[64px] shadow-sm">
      <span className="text-[11px] text-text-muted uppercase tracking-wider font-bold">{label}</span>
      <span className="text-sm font-black text-text mt-0.5">{value}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-2">{children}</p>
  );
}

type FmsRenderedTest = {
  id: string;
  name: string;
  finalScore: number;
  leftScore?: number;
  rightScore?: number;
  asymmetry?: boolean;
  clearingPositive?: boolean;
  notes?: string;
};

function normalizeFMSData(d: Record<string, unknown>) {
  const legacyScores = d.scores as Record<string, number> | undefined;
  const tests: FmsRenderedTest[] = Array.isArray(d.tests)
    ? (d.tests as Array<Record<string, unknown>>).map((test) => ({
        id: str(test.id),
        name: str(test.name || test.id).replace(/_/g, " "),
        finalScore: Number(test.finalScore ?? 0),
        leftScore: test.leftScore == null ? undefined : Number(test.leftScore),
        rightScore: test.rightScore == null ? undefined : Number(test.rightScore),
        asymmetry: Boolean(test.asymmetry),
        clearingPositive: Boolean(test.clearingPositive),
        notes: str(test.notes),
      }))
    : legacyScores
    ? Object.entries(legacyScores).map(([id, score]) => ({
        id,
        name: id.replace(/_/g, " "),
        finalScore: Number(score),
      }))
    : [];

  const total = Number(d.total ?? tests.reduce((sum, test) => sum + test.finalScore, 0));
  return { total, tests };
}

// ── Tool renderers ────────────────────────────────────────────────────────────

function RenderFMS({ d }: { d: Record<string, unknown> }) {
  const { total, tests } = normalizeFMSData(d);
  const riskColor = total > 14 ? "bg-emerald-400" : total >= 10 ? "bg-amber-400" : "bg-red-400";
  const riskLabel = total > 14 ? "Low Risk" : total >= 10 ? "Moderate Risk" : "High Risk";
  const riskText = total > 14 ? "text-emerald-400" : total >= 10 ? "text-amber-400" : "text-red-400";
  const asymmetryCount = tests.filter((test) => test.asymmetry).length;
  const clearingCount = tests.filter((test) => test.clearingPositive).length;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <SectionLabel>Total Score</SectionLabel>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black ${riskText}`}>{total}</span>
            <span className="text-text-muted text-sm font-bold">/ 21</span>
          </div>
          <span className={`text-xs font-bold ${riskText}`}>{riskLabel}</span>
        </div>
        <div className="w-32">
          <ScoreBar value={total} max={21} color={riskColor} />
        </div>
      </div>

      {(asymmetryCount > 0 || clearingCount > 0) && (
        <div className="flex gap-3">
          {asymmetryCount > 0 && <MetricChip label="Asymmetry" value={asymmetryCount} />}
          {clearingCount > 0 && <MetricChip label="Clearing +" value={clearingCount} />}
        </div>
      )}

      {tests.length > 0 && (
        <div>
          <SectionLabel>Movement Scores</SectionLabel>
          <div className="space-y-2">
            {tests.map((test) => (
              <div key={test.id} className="rounded-xl bg-input border border-border px-3 py-3 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-text capitalize">{test.name}</span>
                  <span className={`text-sm font-black ml-2 ${test.finalScore >= 2 ? "text-emerald-500" : test.finalScore === 1 ? "text-amber-500" : "text-red-500"}`}>
                    {test.finalScore}
                  </span>
                </div>
                {(test.leftScore != null || test.rightScore != null) && (
                  <p className="mt-1 text-xs text-text-muted">
                    Left {test.leftScore ?? 0} / Right {test.rightScore ?? 0}
                  </p>
                )}
                {(test.asymmetry || test.clearingPositive) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {test.asymmetry && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        Asymmetry
                      </span>
                    )}
                    {test.clearingPositive && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                        Clearing Positive
                      </span>
                    )}
                  </div>
                )}
                {!!test.notes && (
                  <p className="mt-2 text-xs text-text-muted border-t border-border pt-2">{test.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!!d.notes && (
        <div>
          <SectionLabel>Notes</SectionLabel>
          <p className="text-sm text-text-muted bg-input rounded-xl px-4 py-3 border border-border shadow-inner">{str(d.notes)}</p>
        </div>
      )}
    </div>
  );
}

function parseNormalMax(normal: string | undefined): number | null {
  if (!normal) return null;
  const rangeMatch = normal.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (rangeMatch) return parseInt(rangeMatch[2], 10);
  const singleMatch = normal.match(/\d+/);
  if (singleMatch) return parseInt(singleMatch[0], 10);
  return null;
}

type ROMDeficit = "none" | "mild" | "severe";

function getROMDeficit(value: number | undefined, normalMax: number | null): ROMDeficit {
  if (value == null || normalMax == null || normalMax === 0) return "none";
  if (value < normalMax * 0.75) return "severe";
  if (value < normalMax) return "mild";
  return "none";
}

function romCellClass(deficit: ROMDeficit, defaultClass: string): string {
  if (deficit === "severe") return "bg-red-500/10 text-red-600 dark:text-red-400";
  if (deficit === "mild") return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  return defaultClass;
}

function RenderROM({ d }: { d: Record<string, unknown> }) {
  const joints = d.joints as Record<string, { active?: number; passive?: number; normal?: string }> | undefined;

  const deficitCount = joints
    ? Object.values(joints).filter(v => {
        const max = parseNormalMax(v.normal);
        return getROMDeficit(v.active, max) !== "none" || getROMDeficit(v.passive, max) !== "none";
      }).length
    : 0;

  return (
    <div className="space-y-4">
      {joints && Object.keys(joints).length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <SectionLabel>{Object.keys(joints).length} Joints Measured</SectionLabel>
            {deficitCount > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                {deficitCount} joint{deficitCount > 1 ? "s" : ""} below normal
              </span>
            )}
          </div>
          <div className="rounded-2xl border border-border overflow-hidden bg-input shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-text-muted">Joint</th>
                  <th className="text-center px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-text-muted">Active</th>
                  <th className="text-center px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-text-muted">Passive</th>
                  <th className="text-center px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-text-muted">Normal</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(joints).map(([joint, vals], i) => {
                  const normalMax = parseNormalMax(vals.normal);
                  const activeDeficit = getROMDeficit(vals.active, normalMax);
                  const passiveDeficit = getROMDeficit(vals.passive, normalMax);
                  return (
                    <tr key={joint} className={i % 2 === 0 ? "bg-surface/30" : ""}>
                      <td className="px-4 py-2.5 text-text font-medium capitalize">{joint.replace(/_/g, " ")}</td>
                      <td className={`px-4 py-2.5 text-center font-bold ${romCellClass(activeDeficit, "text-emerald-600 dark:text-emerald-400")}`}>
                        {vals.active != null ? (
                          <span className="inline-flex items-center gap-0.5">
                            {vals.active}°
                            {activeDeficit === "severe" && <span className="text-[9px] leading-none">▼▼</span>}
                            {activeDeficit === "mild" && <span className="text-[9px] leading-none">▼</span>}
                          </span>
                        ) : "—"}
                      </td>
                      <td className={`px-4 py-2.5 text-center font-bold ${romCellClass(passiveDeficit, "text-sky-600 dark:text-sky-400")}`}>
                        {vals.passive != null ? (
                          <span className="inline-flex items-center gap-0.5">
                            {vals.passive}°
                            {passiveDeficit === "severe" && <span className="text-[9px] leading-none">▼▼</span>}
                            {passiveDeficit === "mild" && <span className="text-[9px] leading-none">▼</span>}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-center text-text-muted text-xs">{vals.normal ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {deficitCount > 0 && (
            <div className="flex items-center gap-3 mt-2 px-1">
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                <span>▼</span> Mild deficit (&lt;25% below normal)
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400">
                <span>▼▼</span> Significant deficit (&gt;25% below normal)
              </span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-text-muted">No joint data recorded.</p>
      )}

      {!!d.notes && (
        <div>
          <SectionLabel>Notes</SectionLabel>
          <p className="text-sm text-text-muted bg-input rounded-xl px-4 py-3 border border-border shadow-inner">{str(d.notes)}</p>
        </div>
      )}
    </div>
  );
}

type MSKBilRow = { label: string; left: string; right: string; goal?: string };
function MSKMiniTable({ title, rows }: { title: string; rows: MSKBilRow[] }): ReactElement | null {
  const visible = rows.filter(r => r.left || r.right);
  if (!visible.length) return null;
  return (
    <div>
      <SectionLabel>{title}</SectionLabel>
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-input border-b border-border">
              <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-text-muted">Test</th>
              <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-wider text-text-muted w-20">Left</th>
              <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-wider text-text-muted w-20">Right</th>
              <th className="px-3 py-2 text-right text-[10px] font-black uppercase tracking-wider text-text-muted w-28">Goal</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              <tr key={i} className="border-b border-border last:border-0 even:bg-surface/30">
                <td className="px-3 py-2 text-text">{row.label}</td>
                <td className="px-3 py-2 text-center font-semibold text-text">{row.left || "—"}</td>
                <td className="px-3 py-2 text-center font-semibold text-text">{row.right || "—"}</td>
                <td className="px-3 py-2 text-right text-text-muted">{row.goal ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RenderMSK({ d }: { d: Record<string, unknown> }) {
  // New structured format
  const isStructured = !!(d.shoulder || d.spine || d.lowerLimb || d.core || d.posture || d.keyFindings);

  if (isStructured) {
    const sh  = (d.shoulder    ?? {}) as Record<string, unknown>;
    const sp  = (d.spine       ?? {}) as Record<string, unknown>;
    const ll  = (d.lowerLimb  ?? {}) as Record<string, unknown>;
    const co  = (d.core        ?? {}) as Record<string, unknown>;
    const po  = (d.posture     ?? {}) as Record<string, unknown>;
    const ybt = (d.ybt         ?? {}) as Record<string, unknown>;
    const pm  = (d.pastMedical ?? {}) as Record<string, unknown>;
    const kf  = Array.isArray(d.keyFindings)
      ? (d.keyFindings as Array<Record<string, unknown>>)
      : [];
    const palp = (d.palpation ?? {}) as Record<string, Record<string, unknown>>;

    const hasPosture  = Object.values(po).some(v => str(v));
    const hasPalp     = Object.values(palp).some(v => str(v.left) || str(v.right));
    const hasFindings = kf.some(r => str(r.finding));
    const hasYbt      = Object.values(ybt).some(v => str(v));

    return (
      <div className="space-y-5">
        {/* Summary chips */}
        <div className="flex flex-wrap gap-2">
          {str(d.assessmentDate) && <MetricChip label="Date" value={str(d.assessmentDate)} />}
          {str(d.assessorName)   && <MetricChip label="Assessor" value={str(d.assessorName)} />}
          {str(d.vas)            && <MetricChip label="VAS" value={`${str(d.vas)} / 10`} />}
        </div>

        {/* History summary */}
        {(str(d.cc) || str(d.diagnostic)) && (
          <div className="grid sm:grid-cols-2 gap-3">
            {str(d.cc) && (
              <div>
                <SectionLabel>Chief Complaint</SectionLabel>
                <p className="text-sm text-text-muted bg-input rounded-xl px-4 py-3 border border-border">{str(d.cc)}</p>
              </div>
            )}
            {str(d.diagnostic) && (
              <div>
                <SectionLabel>Diagnostic</SectionLabel>
                <p className="text-sm text-text-muted bg-input rounded-xl px-4 py-3 border border-border">{str(d.diagnostic)}</p>
              </div>
            )}
          </div>
        )}

        {/* Past Medical */}
        {Object.values(pm).some(v => str(v)) && (
          <div>
            <SectionLabel>Past Medical History</SectionLabel>
            <div className="rounded-xl border border-border overflow-hidden text-xs">
              {Object.entries(pm).filter(([, v]) => str(v)).map(([k, v]) => (
                <div key={k} className="flex border-b border-border last:border-0">
                  <span className="px-3 py-2 bg-input font-semibold text-text-muted w-44 border-r border-border capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                  <span className="px-3 py-2 text-text">{str(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <MSKMiniTable title="Shoulder Tests" rows={[
          { label: "IR at 90° Abduction",       left: str(sh.irAt90Left),          right: str(sh.irAt90Right),          goal: ">90°" },
          { label: "ER at 90° Abduction",        left: str(sh.erAt90Left),          right: str(sh.erAt90Right),          goal: ">90°" },
          { label: "GIRD / ERG Ratio (dominant)",left: str(sh.girdErg),             right: "",                            goal: "+'ve: GIRD>ERG" },
          { label: "Hawkins-Kennedy",            left: str(sh.hkLeft),              right: str(sh.hkRight) },
          { label: "Empty Can Test",             left: str(sh.emptyCanLeft),        right: str(sh.emptyCanRight) },
          { label: "O'Brien's Test",             left: str(sh.obrienLeft),          right: str(sh.obrienRight) },
          { label: "Infraspinatus Strength",     left: str(sh.infraspinatusLeft),   right: str(sh.infraspinatusRight),   goal: "MMT 5/5" },
          { label: "Scapula Slide – neutral",    left: str(sh.scapulaNeutralLeft),  right: str(sh.scapulaNeutralRight),  goal: "<2.0 cms" },
          { label: "Scapula Slide – 45°",        left: str(sh.scapula45Left),       right: str(sh.scapula45Right),       goal: "<2.0 cms" },
          { label: "Scapula Slide – 90°",        left: str(sh.scapula90Left),       right: str(sh.scapula90Right),       goal: "<2.0 cms" },
          { label: "Scapula Slide – 135°",       left: str(sh.scapula135Left),      right: str(sh.scapula135Right),      goal: "<2.0 cms" },
        ]} />

        <MSKMiniTable title="Spine Tests" rows={[
          { label: "Combined Elevation",    left: str(sp.combinedElevationLeft),  right: str(sp.combinedElevationRight) },
          { label: "Single Leg Lumbar Extn",left: str(sp.singleLegLumbarLeft),   right: str(sp.singleLegLumbarRight) },
          { label: "Lumbar Spine ROM",      left: str(sp.lumbarFlexLeft),         right: str(sp.lumbarExtRight),        goal: "Flex>+5 / Ext>-2" },
          { label: "Trunk Side Flexion",    left: str(sp.trunkSideLeft),          right: str(sp.trunkSideRight),        goal: "+/-3.0 cms" },
          { label: "Thoracic Rotation",     left: str(sp.thoracicRotLeft),        right: str(sp.thoracicRotRight) },
          { label: "Slump Test",            left: str(sp.slumpLeft),              right: str(sp.slumpRight) },
          { label: "Lumbar Quadrant",       left: str(sp.lumbarQuadrantLeft),     right: str(sp.lumbarQuadrantRight) },
        ]} />

        <MSKMiniTable title="Lower Limb Tests" rows={[
          { label: "Knee to Wall",            left: str(ll.kneeToWallLeft),      right: str(ll.kneeToWallRight),      goal: ">10 cms" },
          { label: "Foot Posture",            left: str(ll.footPostureLeft),     right: str(ll.footPostureRight) },
          { label: "Single Leg Standing",     left: str(ll.singleLegStandLeft),  right: str(ll.singleLegStandRight),  goal: ">30 sec" },
          { label: "Hamstring Length (90/90)",left: str(ll.hamstringLeft),       right: str(ll.hamstringRight),       goal: ">170°" },
          { label: "Thomas – Knee Flexion",   left: str(ll.thomasKneeLeft),      right: str(ll.thomasKneeRight),      goal: ">80°" },
          { label: "Thomas – Hip Flexion",    left: str(ll.thomasHipLeft),       right: str(ll.thomasHipRight),       goal: "≤5°" },
          { label: "Hip IR (prone)",          left: str(ll.hipIRLeft),           right: str(ll.hipIRRight),           goal: "≥30°" },
          { label: "Hip ER (prone)",          left: str(ll.hipERLeft),           right: str(ll.hipERRight),           goal: "≥45°" },
          { label: "Piriformis",              left: str(ll.piriformisLeft),      right: str(ll.piriformisRight),      goal: "<10°" },
          { label: "Active Knee Ext (90/90)", left: str(ll.activeKneeExtLeft),   right: str(ll.activeKneeExtRight),   goal: "≥160°" },
          { label: "1st MTP Extension",       left: str(ll.mtpExtLeft),          right: str(ll.mtpExtRight) },
          { label: "Ankle PF (Impingement)",  left: str(ll.anklePFLeft),         right: str(ll.anklePFRight) },
          { label: "Posterior Impingement",   left: str(ll.posteriorImpLeft),    right: str(ll.posteriorImpRight),    goal: "-VE" },
          { label: "True Leg Length",         left: str(ll.trueLegLengthLeft),   right: str(ll.trueLegLengthRight),   goal: "+/-2 cms" },
          { label: "Single Leg Hop",          left: str(ll.singleHopLeft),       right: str(ll.singleHopRight) },
          { label: "Calf Endurance",          left: str(ll.calfEnduranceLeft),   right: str(ll.calfEnduranceRight),   goal: ">30 reps" },
        ]} />

        <MSKMiniTable title="Core & Stability" rows={[
          { label: "TA Control Level (PBU)",   left: str(co.taControlLevel),     right: "" },
          { label: "Plank",                    left: str(co.plank),              right: "",                     goal: "180 sec" },
          { label: "Side Plank",               left: str(co.sidePlankLeft),      right: str(co.sidePlankRight),  goal: "80 sec" },
          { label: "Single Leg Bridge (90/90)",left: str(co.singleLegBridgeLeft),right: str(co.singleLegBridgeRight) },
          { label: "SLHB Test",                left: str(co.slhbLeft),           right: str(co.slhbRight),       goal: ">30 Rep" },
          { label: "RC Strength (IR & ER)",    left: str(co.rcStrengthLeft),     right: str(co.rcStrengthRight), goal: "MMT" },
          { label: "Glute Control",            left: str(co.gluteControlLeft),   right: str(co.gluteControlRight) },
        ]} />

        {/* Postural */}
        {hasPosture && (
          <div>
            <SectionLabel>Postural Assessment</SectionLabel>
            <div className="rounded-xl border border-border overflow-hidden text-xs">
              {(
                [
                  ["Head",             str(po.head)],
                  ["Shoulders L / R",  `${str(po.shoulderLeft) || "—"} / ${str(po.shoulderRight) || "—"}`],
                  ["Thoracic Spine",   str(po.thoracicSpine)],
                  ["Lumbar Spine",     str(po.lumbarSpine)],
                  ["Pelvis",           str(po.pelvis)],
                  ["Knees L / R",      `${str(po.kneeLeft) || "—"} / ${str(po.kneeRight) || "—"}`],
                  ["Foot Arch L / R",  `${str(po.footLeftArch) || "—"} / ${str(po.footRightArch) || "—"}`],
                ] as [string, string][]
              ).filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex border-b border-border last:border-0">
                  <span className="px-3 py-2 bg-input font-semibold text-text-muted w-40 border-r border-border">{k}</span>
                  <span className="px-3 py-2 text-text">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Palpation */}
        {hasPalp && (
          <div>
            <SectionLabel>Palpation</SectionLabel>
            <div className="rounded-xl border border-border overflow-hidden text-xs">
              <table className="w-full">
                <thead>
                  <tr className="bg-input border-b border-border">
                    {["Structure", "Left", "Right", "Notes"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-text-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(palp)
                    .filter(([, v]) => str(v.left) || str(v.right) || str(v.notes))
                    .map(([k, v]) => (
                      <tr key={k} className="border-b border-border last:border-0 even:bg-surface/30">
                        <td className="px-3 py-2 text-text">{k}</td>
                        <td className="px-3 py-2 text-center text-text">{str(v.left) || "—"}</td>
                        <td className="px-3 py-2 text-center text-text">{str(v.right) || "—"}</td>
                        <td className="px-3 py-2 text-text-muted">{str(v.notes)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Key Findings */}
        {hasFindings && (
          <div>
            <SectionLabel>Key Findings & Follow Up</SectionLabel>
            <div className="rounded-xl border border-border overflow-hidden text-xs">
              <table className="w-full">
                <thead>
                  <tr className="bg-input border-b border-border">
                    {["#", "Date", "Finding", "Action", "Re-test"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-text-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {kf.filter(r => str(r.finding)).map((r, i) => (
                    <tr key={i} className="border-b border-border last:border-0 even:bg-surface/30">
                      <td className="px-3 py-2 text-text-muted">{i + 1}</td>
                      <td className="px-3 py-2 text-text-muted">{str(r.initialDate) || "—"}</td>
                      <td className="px-3 py-2 text-text">{str(r.finding)}</td>
                      <td className="px-3 py-2 text-text-muted">{str(r.action) || "—"}</td>
                      <td className="px-3 py-2 text-text-muted">{str(r.retest) || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* YBT */}
        {hasYbt && (
          <div>
            <SectionLabel>Y Balance Test</SectionLabel>
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="px-3 py-2 bg-input border-b border-border font-bold text-text-muted text-[10px] uppercase tracking-wider">Lower Limb</div>
                <div className="grid grid-cols-3 divide-x divide-border">
                  {(
                    [
                      ["R Ant", str(ybt.lowerRytAnterior)], ["R PM", str(ybt.lowerRpm)], ["R PL", str(ybt.lowerRpl)],
                      ["L Ant", str(ybt.lowerLa)], ["L PM", str(ybt.lowerLpm)], ["L PL", str(ybt.lowerPl)],
                    ] as [string, string][]
                  ).filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="px-3 py-2 text-center">
                      <div className="text-[10px] text-text-muted">{k}</div>
                      <div className="font-bold text-text">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="px-3 py-2 bg-input border-b border-border font-bold text-text-muted text-[10px] uppercase tracking-wider">Upper Limb</div>
                <div className="grid grid-cols-3 divide-x divide-border">
                  {(
                    [
                      ["R Med", str(ybt.upperRm)], ["R SL", str(ybt.upperRsl)], ["R IL", str(ybt.upperRil)],
                      ["L Med", str(ybt.upperLm)], ["L SL", str(ybt.upperLsl)], ["L IL", str(ybt.upperLil)],
                    ] as [string, string][]
                  ).filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="px-3 py-2 text-center">
                      <div className="text-[10px] text-text-muted">{k}</div>
                      <div className="font-bold text-text">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Legacy format (old selectedAreas-based records)
  const areas = d.selectedAreas as Record<string, string[]> | undefined;
  const filled = areas ? Object.entries(areas).filter(([, arr]) => arr.length > 0) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <MetricChip label="Findings" value={str(d.totalAffected) || filled.reduce((s, [, a]) => s + a.length, 0)} />
        <MetricChip label="Regions" value={filled.length} />
      </div>
      {filled.length > 0 && (
        <div>
          <SectionLabel>Affected Regions</SectionLabel>
          <div className="space-y-2">
            {filled.map(([region, symptoms]) => (
              <div key={region} className="rounded-xl bg-input border border-border px-4 py-3 shadow-sm">
                <p className="text-xs font-bold capitalize mb-2 text-violet-600 dark:text-violet-400">
                  {region.replace(/_/g, " ")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {symptoms.map(s => (
                    <span key={s} className="text-[11px] px-2 py-0.5 rounded-full border bg-surface text-text-muted border-border">
                      {s.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const STATUS_TEXT: Record<string, string> = {
  good: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  bad:  "text-red-600 dark:text-red-400",
};
const STATUS_CHIP: Record<string, string> = {
  good: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  warn: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  bad:  "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

function RenderPosture({ d }: { d: Record<string, unknown> }) {
  const score    = (d.score as number) ?? 0;
  const scoreColor = score >= 80 ? "bg-emerald-400" : score >= 50 ? "bg-amber-400" : "bg-red-400";
  const scoreText  = score >= 80 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";

  // ── Landmark analysis ──────────────────────────────────
  if (d.analysisType === "landmark") {
    type LmFinding = { region: string; icon: string; status: string; alignment: string; angleVal: number; angleUnit: string; normal: string; causes?: string[]; consequences?: string[]; rehab?: string[] };
    const findings = (d.findings as LmFinding[]) ?? [];
    const modeName = str(d.modeName) || str(d.mode);

    return (
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <SectionLabel>Landmark Analysis · {modeName}</SectionLabel>
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-black ${scoreText}`}>{score}</span>
              <span className="text-text-muted text-sm font-bold">/ 100</span>
            </div>
          </div>
          <MetricChip label="Regions" value={findings.length} />
        </div>
        <ScoreBar value={score} max={100} color={scoreColor} />

        {findings.length > 0 && (
          <div>
            <SectionLabel>{findings.length} Region{findings.length !== 1 ? "s" : ""} Analysed</SectionLabel>
            <div className="space-y-2">
              {findings.map((f, i) => (
                <div key={i} className="rounded-xl bg-input border border-border px-4 py-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span>{f.icon}</span>
                      <span className="text-sm font-bold text-text">{f.region}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_CHIP[f.status] ?? STATUS_CHIP.warn}`}>
                      {f.status?.toUpperCase()}
                    </span>
                  </div>
                  <p className={`text-xs font-bold ${STATUS_TEXT[f.status] ?? "text-text-muted"}`}>
                    {f.alignment} · Normal: {f.normal}
                  </p>
                  {f.status !== "good" && f.rehab && f.rehab.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-[9px] font-black uppercase tracking-wider text-text-muted mb-1">Rehab</p>
                      {f.rehab.map((r, ri) => (
                        <p key={ri} className="text-xs text-text-muted flex gap-1.5">
                          <span className="text-primary flex-shrink-0">›</span>{r}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Manual checklist ───────────────────────────────────
  const checkpoints = d.checkpoints as string[] | undefined;
  const passed = checkpoints?.length ?? 0;
  const total  = (d.totalCheckpoints as number) ?? 20;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <SectionLabel>Manual Posture Score</SectionLabel>
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-black ${scoreText}`}>{score}</span>
            <span className="text-text-muted text-sm font-bold">%</span>
          </div>
        </div>
        <div className="flex gap-3">
          <MetricChip label="Passed" value={passed} />
          <MetricChip label="Total" value={total} />
        </div>
      </div>
      <ScoreBar value={score} max={100} color={scoreColor} />

      {checkpoints && checkpoints.length > 0 && (
        <div>
          <SectionLabel>Passed Checkpoints</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {checkpoints.map((cp) => (
              <span key={cp} className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {cp.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {!!d.notes && (
        <div>
          <SectionLabel>Notes</SectionLabel>
          <p className="text-sm text-text-muted bg-input rounded-xl px-4 py-3 border border-border shadow-inner">{str(d.notes)}</p>
        </div>
      )}
    </div>
  );
}

function RenderGait({ d }: { d: Record<string, unknown> }) {
  const total = (d.total as number) ?? 0;
  const scoreColor = total >= 12 ? "bg-emerald-400" : total >= 8 ? "bg-amber-400" : "bg-red-400";
  const scoreText = total >= 12 ? "text-emerald-400" : total >= 8 ? "text-amber-400" : "text-red-400";
  const scores = d.scores as Record<string, number> | undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <SectionLabel>Gait Score</SectionLabel>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black ${scoreText}`}>{total}</span>
            <span className="text-text-muted text-sm font-bold">/ 15</span>
          </div>
        </div>
        <div className="flex gap-3">
          {d.cadence !== undefined && <MetricChip label="Cadence" value={`${str(d.cadence)} spm`} />}
          {d.speed !== undefined && <MetricChip label="Speed" value={`${str(d.speed)} m/s`} />}
        </div>
      </div>
      <ScoreBar value={total} max={15} color={scoreColor} />

      {scores && Object.keys(scores).length > 0 && (
        <div>
          <SectionLabel>Component Scores</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(scores).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between px-3 py-2 rounded-xl bg-input border border-border shadow-sm">
                <span className="text-xs text-text-muted capitalize">{k.replace(/_/g, " ")}</span>
                <span className="text-sm font-black text-text ml-2">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!!d.observations && (
        <div>
          <SectionLabel>Observations</SectionLabel>
          <p className="text-sm text-text-muted bg-input rounded-xl px-4 py-3 border border-border shadow-inner">{str(d.observations)}</p>
        </div>
      )}
    </div>
  );
}

const CLINICAL_PHASES = [
  { id: "ic",  abbr: "IC",  label: "Initial Contact",  phase: "Stance" },
  { id: "lr",  abbr: "LR",  label: "Loading Response", phase: "Stance" },
  { id: "ms",  abbr: "MS",  label: "Mid Stance",       phase: "Stance" },
  { id: "ts",  abbr: "TS",  label: "Terminal Stance",  phase: "Stance" },
  { id: "ps",  abbr: "PS",  label: "Pre-Swing",        phase: "Stance" },
  { id: "is",  abbr: "IS",  label: "Initial Swing",    phase: "Swing"  },
  { id: "msw", abbr: "MSw", label: "Mid Swing",        phase: "Swing"  },
  { id: "tsw", abbr: "TSw", label: "Terminal Swing",   phase: "Swing"  },
];

function RenderClinicalGait({ d }: { d: Record<string, unknown> }) {
  const total = (d.total_score as number) ?? 0;
  const scoreColor = total >= 20 ? "bg-teal-400" : total >= 13 ? "bg-amber-400" : "bg-red-400";
  const scoreText = total >= 20 ? "text-teal-500" : total >= 13 ? "text-amber-400" : "text-red-400";
  const riskLabel = total >= 20 ? "Low Risk" : total >= 13 ? "Moderate Risk" : "High Risk";
  const phases = d.phases as Record<string, { quality: number; deviations: string[]; notes?: string }> | undefined;
  const spatiotemporal = d.spatiotemporal as Record<string, unknown> | undefined;
  const kinematic = d.kinematic as Record<string, unknown> | undefined;
  const kinetic = d.kinetic as Record<string, unknown> | undefined;
  const rehabProtocol = Array.isArray(d.rehab_protocol) ? d.rehab_protocol as Array<Record<string, unknown>> : [];
  const allDeviations = phases
    ? CLINICAL_PHASES.flatMap((p) => phases[p.id]?.deviations ?? []).filter((v, i, a) => a.indexOf(v) === i)
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <SectionLabel>Clinical Gait Score</SectionLabel>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black ${scoreText}`}>{total}</span>
            <span className="text-text-muted text-sm font-bold">/ 24</span>
          </div>
          {!!d.view_mode && <p className="text-[10px] font-black uppercase tracking-[0.25em] text-teal-500 mt-1">View: {str(d.view_mode)}</p>}
          <span className={`text-xs font-bold ${scoreText}`}>{riskLabel}</span>
        </div>
        <div className="flex gap-3 flex-wrap justify-end">
          {(spatiotemporal?.cadence ?? d.cadence) != null && <MetricChip label="Cadence" value={str(spatiotemporal?.cadence ?? `${str(d.cadence)} spm`)} />}
          {(spatiotemporal?.speed ?? d.speed) != null && <MetricChip label="Speed" value={str(spatiotemporal?.speed ?? `${str(d.speed)} m/s`)} />}
          {(spatiotemporal?.stride_length ?? d.stride_length) != null && <MetricChip label="Stride" value={str(spatiotemporal?.stride_length ?? `${str(d.stride_length)} cm`)} />}
        </div>
      </div>
      <ScoreBar value={total} max={24} color={scoreColor} />

      {Boolean(d.gait_cycle_breakdown || d.biomechanical_lines) && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl bg-input border border-border px-4 py-3 shadow-sm">
            <SectionLabel>WBA99 Cycle</SectionLabel>
            <p className="text-xs text-text-muted">
              Stance {str((d.gait_cycle_breakdown as Record<string, unknown> | undefined)?.stance_phase_percent ?? 60)}% · Swing {str((d.gait_cycle_breakdown as Record<string, unknown> | undefined)?.swing_phase_percent ?? 40)}%
            </p>
          </div>
          <div className="rounded-xl bg-input border border-border px-4 py-3 shadow-sm">
            <SectionLabel>Biomechanical Lines</SectionLabel>
            <p className="text-xs text-text-muted">{Array.isArray(d.biomechanical_lines) ? (d.biomechanical_lines as string[]).join(", ") : "Hip Line, Femur Line, Tibia Line, Foot Line"}</p>
          </div>
        </div>
      )}

      {phases && (
        <div>
          <SectionLabel>Phase Summary</SectionLabel>
          <div className="rounded-2xl border border-border overflow-hidden bg-input shadow-sm">
            {CLINICAL_PHASES.map((p) => {
              const pd = phases[p.id];
              const q = pd?.quality ?? -1;
              const qLabel = q === 3 ? "Normal" : q === 2 ? "Mild" : q === 1 ? "Moderate" : q === 0 ? "Severe" : null;
              const qColor = q === 3 ? "text-emerald-500" : q === 2 ? "text-sky-500" : q === 1 ? "text-amber-500" : q === 0 ? "text-red-500" : "text-text-muted";
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-b-0">
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md flex-shrink-0 ${
                    p.phase === "Stance" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                  }`}>{p.abbr}</span>
                  <span className="flex-1 text-xs font-bold text-text">{p.label}</span>
                  {(pd?.deviations?.length ?? 0) > 0 && (
                    <span className="text-[10px] text-amber-500 font-bold">{pd.deviations.length} dev.</span>
                  )}
                  <span className={`text-xs font-black ${qColor}`}>
                    {q >= 0 ? `${q}/3` : "—"} {qLabel && <span className="font-normal text-[10px]">({qLabel})</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {allDeviations.length > 0 && (
        <div>
          <SectionLabel>Key Deviations ({allDeviations.length})</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {allDeviations.map((dev) => (
              <span key={dev} className="text-xs px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-medium">
                {dev}
              </span>
            ))}
          </div>
        </div>
      )}

      {(spatiotemporal || kinematic || kinetic) && (
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-input border border-border px-4 py-3 shadow-sm">
            <SectionLabel>Spatiotemporal</SectionLabel>
            <p className="text-xs text-text-muted">Step: {str(spatiotemporal?.step_length ?? "—")}</p>
            <p className="text-xs text-text-muted">Stride: {str(spatiotemporal?.stride_length ?? "—")}</p>
            <p className="text-xs text-text-muted">Cadence: {str(spatiotemporal?.cadence ?? "—")}</p>
            <p className="text-xs text-text-muted">Speed: {str(spatiotemporal?.speed ?? "—")}</p>
          </div>
          <div className="rounded-xl bg-input border border-border px-4 py-3 shadow-sm">
            <SectionLabel>Kinematic</SectionLabel>
            <p className="text-xs text-text-muted">Joint angles: {str(kinematic?.joint_angles ?? "—")}</p>
            <p className="text-xs text-text-muted mt-1">ROM: {str(kinematic?.rom ?? "—")}</p>
          </div>
          <div className="rounded-xl bg-input border border-border px-4 py-3 shadow-sm">
            <SectionLabel>Kinetic</SectionLabel>
            <p className="text-xs text-text-muted">GRF: {str(kinetic?.ground_reaction_force ?? "—")}</p>
            <p className="text-xs text-text-muted mt-1">Pressure: {str(kinetic?.pressure_mapping ?? "—")}</p>
          </div>
        </div>
      )}

      {rehabProtocol.length > 0 && (
        <div>
          <SectionLabel>WBA99 Rehab Protocol</SectionLabel>
          <div className="space-y-2">
            {rehabProtocol.map((item, idx) => (
              <div key={idx} className="rounded-xl bg-input border border-border px-4 py-3 shadow-sm">
                <p className="text-sm font-bold text-text">{str(item.problem)}</p>
                <p className="text-xs text-text-muted mt-1">Cause: {str(item.cause)}</p>
                <p className="text-xs text-text-muted mt-1">Solution: {str(item.solution)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!!d.observations && (
        <div>
          <SectionLabel>Observations</SectionLabel>
          <p className="text-sm text-text-muted bg-input rounded-xl px-4 py-3 border border-border shadow-inner">{str(d.observations)}</p>
        </div>
      )}
    </div>
  );
}

function RenderPrescription({ d }: { d: Record<string, unknown> }) {
  const exs = d.exercises as Array<{
    name: string; sets: number; reps: number; frequency: string;
    hold_duration?: string; load?: string; progression?: string; precautions?: string; notes?: string;
  }> | undefined;

  const hasHold = exs?.some(e => e.hold_duration);
  const hasLoad = exs?.some(e => e.load);
  const hasProgression = exs?.some(e => e.progression);
  const hasPrecautions = exs?.some(e => e.precautions);

  return (
    <div className="space-y-4">
      {!!d.diagnosis && (
        <div>
          <SectionLabel>Diagnosis</SectionLabel>
          <p className="text-sm text-white font-bold bg-rose-500/5 border border-rose-500/10 rounded-xl px-4 py-3">{str(d.diagnosis)}</p>
        </div>
      )}

      {exs && exs.length > 0 && (
        <div>
          <SectionLabel>{exs.length} Exercise{exs.length > 1 ? "s" : ""} Prescribed</SectionLabel>
          <div className="rounded-2xl border border-border overflow-hidden bg-input shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-text-muted">Exercise</th>
                  <th className="text-center px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-text-muted">Sets</th>
                  <th className="text-center px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-text-muted">Reps</th>
                  {hasHold && <th className="text-center px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-text-muted hidden sm:table-cell">Hold / Duration</th>}
                  {hasLoad && <th className="text-center px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-text-muted hidden sm:table-cell">Load / Intensity</th>}
                  <th className="text-center px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-text-muted hidden sm:table-cell">Frequency</th>
                </tr>
              </thead>
              <tbody>
                {exs.map((e, i) => (
                  <tr key={i} className={`align-top ${i % 2 === 0 ? "bg-surface/30" : ""}`}>
                    <td className="px-4 py-2.5">
                      <p className="text-text font-medium">{e.name}</p>
                      {e.notes && <p className="text-[11px] text-text-muted mt-0.5">{e.notes}</p>}
                      {(hasProgression || hasPrecautions) && (
                        <div className="mt-1.5 space-y-0.5">
                          {e.progression && (
                            <p className="text-[10px] text-sky-500 font-medium">
                              <span className="font-black uppercase">Progress:</span> {e.progression}
                            </p>
                          )}
                          {e.precautions && (
                            <p className="text-[10px] text-amber-500 font-medium">
                              <span className="font-black uppercase">Precaution:</span> {e.precautions}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center text-primary font-bold">{e.sets}</td>
                    <td className="px-3 py-2.5 text-center text-primary font-bold">{e.reps}</td>
                    {hasHold && <td className="px-3 py-2.5 text-center text-text-muted text-xs hidden sm:table-cell">{e.hold_duration ?? "—"}</td>}
                    {hasLoad && <td className="px-3 py-2.5 text-center text-text-muted text-xs hidden sm:table-cell">{e.load ?? "—"}</td>}
                    <td className="px-3 py-2.5 text-center text-text-muted text-xs hidden sm:table-cell">{e.frequency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!!d.notes && (
        <div>
          <SectionLabel>Notes</SectionLabel>
          <p className="text-sm text-text-muted bg-input rounded-xl px-4 py-3 border border-border shadow-inner">{str(d.notes)}</p>
        </div>
      )}
    </div>
  );
}

function RenderInclinometer({ d }: { d: Record<string, unknown> }) {
  const measurements = d.measurements as Array<{
    id: string; jointName: string; angle: number; timestamp: unknown;
  }> | undefined;

  const JOINT_NORMAL: Record<string, string> = {
    "Cervical Flexion": "0–45°",
    "Cervical Extension": "0–45°",
    "Cervical Lat. Flex (L)": "0–45°",
    "Cervical Lat. Flex (R)": "0–45°",
    "Cervical Rotation (L)": "0–60°",
    "Cervical Rotation (R)": "0–60°",
    "Thoracic Spine": "30–40°",
    "Lumbar Spine": "50–60°",
    "Shoulder": "150–180°",
    "Hip Joint": "100–120°",
    "Knee Joint": "130–140°",
    "Ankle": "45–50°",
  };

  // [min, max] in degrees — min=0 means "0 is resting position; target is max"
  const JOINT_NORMAL_RANGES: Record<string, [number, number]> = {
    "Cervical Flexion": [0, 45],
    "Cervical Extension": [0, 45],
    "Cervical Lat. Flex (L)": [0, 45],
    "Cervical Lat. Flex (R)": [0, 45],
    "Cervical Rotation (L)": [0, 60],
    "Cervical Rotation (R)": [0, 60],
    "Thoracic Spine": [30, 40],
    "Lumbar Spine": [50, 60],
    "Shoulder": [150, 180],
    "Hip Joint": [100, 120],
    "Knee Joint": [130, 140],
    "Ankle": [45, 50],
  };

  if (!measurements || measurements.length === 0) {
    return <p className="text-sm text-text-muted">No measurements recorded.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <MetricChip label="Measurements" value={measurements.length} />
      </div>
      <div>
        <SectionLabel>Joint Measurements</SectionLabel>
        <div className="rounded-2xl border border-border overflow-hidden bg-input shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-text-muted">Joint</th>
                <th className="text-center px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-text-muted">Angle</th>
                <th className="text-center px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-text-muted hidden sm:table-cell">Normal Range</th>
                <th className="text-center px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-text-muted">Status</th>
              </tr>
            </thead>
            <tbody>
              {measurements.map((m, i) => {
                const abs = Math.abs(m.angle);
                const range = JOINT_NORMAL_RANGES[m.jointName];
                let status: { label: string; cls: string };
                if (!range) {
                  status = { label: "—", cls: "bg-surface text-text-muted border-border" };
                } else {
                  const [rangeMin, rangeMax] = range;
                  // For joints with rangeMin=0 the full expected ROM is rangeMax; otherwise rangeMin is the lower acceptable bound
                  const target = rangeMin > 0 ? rangeMin : rangeMax;
                  if (abs >= target) {
                    status = { label: "Normal", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
                  } else if (abs >= target * 0.75) {
                    status = { label: "Mild", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
                  } else {
                    status = { label: "Abnormal", cls: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" };
                  }
                }
                return (
                  <tr key={m.id ?? i} className={i % 2 === 0 ? "bg-surface/30" : ""}>
                    <td className="px-4 py-2.5 text-text font-medium">{m.jointName}</td>
                    <td className="px-4 py-2.5 text-center text-cyan-600 dark:text-cyan-400 font-black">{m.angle}°</td>
                    <td className="px-4 py-2.5 text-center text-text-muted text-xs hidden sm:table-cell">
                      {JOINT_NORMAL[m.jointName] ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.cls}`}>
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RenderFacialStress({ d }: { d: Record<string, unknown> }) {
  const stressScore    = (d.stressScore    as number) ?? 0;
  const fatigueScore   = (d.fatigueScore   as number) ?? 0;
  const attentionScore = (d.attentionScore as number) ?? 0;
  const stressLevel    = str(d.stressLevel ?? "—");
  const dominantEmotion = str(d.dominantEmotion ?? "—");
  const expressionVar  = (d.expressionVariability as number) ?? 0;
  const frameCount     = (d.frameCount     as number) ?? 0;
  const aiInterp       = str(d.aiInterpretation ?? "");
  const recommendations = (d.recommendations as string[]) ?? [];
  const emotionAverages = (d.emotionAverages as Record<string, number>) ?? {};

  const stressCls = stressScore >= 65
    ? "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20"
    : stressScore >= 40
    ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
    : "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";

  const EMOTION_COLORS: Record<string, string> = {
    neutral: "bg-slate-400", happy: "bg-emerald-500", sad: "bg-blue-500",
    angry: "bg-red-500", fearful: "bg-orange-500", disgusted: "bg-yellow-500", surprised: "bg-violet-500",
  };
  const EMOTION_TEXT: Record<string, string> = {
    neutral: "text-slate-400", happy: "text-emerald-500", sad: "text-blue-500",
    angry: "text-red-500", fearful: "text-orange-500", disgusted: "text-yellow-500", surprised: "text-violet-500",
  };

  return (
    <div className="space-y-4">
      {/* Score trio */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Stress Index",   value: stressScore,    level: stressLevel },
          { label: "Fatigue Score",  value: fatigueScore,   level: fatigueScore >= 60 ? "Elevated" : "Normal" },
          { label: "Attention",      value: attentionScore, level: attentionScore >= 60 ? "Good" : "Reduced" },
        ].map(({ label, value, level }) => (
          <div key={label} className="rounded-xl bg-surface border border-border p-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-wider text-text-muted mb-1">{label}</p>
            <p className="text-2xl font-black text-text">{value}<span className="text-xs text-text-muted">/100</span></p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stressCls}`}>{level}</span>
          </div>
        ))}
      </div>

      {/* Emotion bars */}
      {Object.keys(emotionAverages).length > 0 && (
        <div>
          <SectionLabel>Emotion Distribution</SectionLabel>
          <div className="space-y-1.5">
            {Object.entries(emotionAverages)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([key, val]) => {
                const pct = Math.round((val as number) * 100);
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-20 text-xs text-text-muted capitalize">{key}</span>
                    <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${EMOTION_COLORS[key] ?? "bg-slate-400"}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={`w-9 text-right text-xs font-bold ${EMOTION_TEXT[key] ?? "text-text-muted"}`}>{pct}%</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Session meta */}
      <div className="flex flex-wrap gap-3 text-xs text-text-muted">
        <MetricChip label="Dominant" value={dominantEmotion} />
        <MetricChip label="Frames" value={frameCount} />
        <MetricChip label="Variability" value={`${expressionVar}%`} />
      </div>

      {/* AI Interpretation */}
      {aiInterp && (
        <div>
          <SectionLabel>AI Interpretation</SectionLabel>
          <p className="text-sm text-text-muted bg-rose-500/5 border border-rose-500/15 rounded-xl px-4 py-3">{aiInterp}</p>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <SectionLabel>Recommendations</SectionLabel>
          <ul className="space-y-1.5">
            {recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!d.notes && (
        <div>
          <SectionLabel>Notes</SectionLabel>
          <p className="text-sm text-text-muted bg-input rounded-xl px-4 py-3 border border-border">{str(d.notes)}</p>
        </div>
      )}
    </div>
  );
}

// ── Spinal renderer ───────────────────────────────────────────────────────────

type SpinalGrade = "normal" | "borderline" | "abnormal";

const SPINAL_GRADE_TEXT: Record<SpinalGrade, string> = {
  normal:     "text-emerald-600 dark:text-emerald-400",
  borderline: "text-amber-600 dark:text-amber-400",
  abnormal:   "text-red-600 dark:text-red-400",
};

const SPINAL_GRADE_CHIP: Record<SpinalGrade, string> = {
  normal:     "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  borderline: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  abnormal:   "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

function RenderSpinal({ d }: { d: Record<string, unknown> }) {
  type SpinalValue = { label: string; value: number; unit: string; grade: SpinalGrade };
  type SpinalTest  = { testId: string; testName: string; values: SpinalValue[] };

  const tests  = (d.tests  as SpinalTest[]) ?? [];
  const summary = d.summary as { normalCount?: number; borderlineCount?: number; abnormalCount?: number } | undefined;
  const notes  = str(d.notes ?? "");

  const normalCount     = summary?.normalCount     ?? tests.flatMap((t) => t.values).filter((v) => v.grade === "normal").length;
  const borderlineCount = summary?.borderlineCount ?? tests.flatMap((t) => t.values).filter((v) => v.grade === "borderline").length;
  const abnormalCount   = summary?.abnormalCount   ?? tests.flatMap((t) => t.values).filter((v) => v.grade === "abnormal").length;

  if (!tests.length) return <p className="text-sm text-text-muted">No spinal test data recorded.</p>;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Normal",     count: normalCount,     cls: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/5 border-emerald-500/20" },
          { label: "Borderline", count: borderlineCount, cls: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-500/5 border-amber-500/20"    },
          { label: "Abnormal",   count: abnormalCount,   cls: "text-red-600 dark:text-red-400",         bg: "bg-red-500/5 border-red-500/20"        },
        ].map(({ label, count, cls, bg }) => (
          <div key={label} className={`rounded-xl border p-3 text-center ${bg}`}>
            <p className={`text-2xl font-black ${cls}`}>{count}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Per-test rows */}
      <div>
        <SectionLabel>{tests.length} Test{tests.length !== 1 ? "s" : ""} Completed</SectionLabel>
        <div className="space-y-2">
          {tests.map((test) => {
            const worst: SpinalGrade = test.values.some((v) => v.grade === "abnormal") ? "abnormal"
              : test.values.some((v) => v.grade === "borderline") ? "borderline"
              : "normal";
            return (
              <div key={test.testId} className="rounded-xl bg-input border border-border px-4 py-3 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-bold text-text">{test.testName}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SPINAL_GRADE_CHIP[worst]}`}>
                    {worst.charAt(0).toUpperCase() + worst.slice(1)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {test.values.map((v) => (
                    <div key={v.label} className="flex items-center gap-1.5">
                      <span className="text-xs text-text-muted">{v.label}:</span>
                      <span className={`text-sm font-black tabular-nums ${SPINAL_GRADE_TEXT[v.grade]}`}>
                        {v.value}{v.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {notes && (
        <div>
          <SectionLabel>Clinical Notes</SectionLabel>
          <p className="text-sm text-text-muted bg-input rounded-xl px-4 py-3 border border-border shadow-inner">{notes}</p>
        </div>
      )}
    </div>
  );
}

// ── Live Pose renderer ────────────────────────────────────────────────────────

function RenderLivePose({ d }: { d: Record<string, unknown> }) {
  const mode = str(d.mode ?? "—");
  const duration = d.duration_s != null ? `${Math.round(Number(d.duration_s))}s` : "—";
  const postureScore = d.posture_score != null ? Number(d.posture_score) : null;
  const symmetryScore = d.symmetry_score != null ? Number(d.symmetry_score) : null;
  const reps = d.reps != null ? Number(d.reps) : null;
  const fps = d.avg_fps != null ? Number(d.avg_fps).toFixed(1) : "—";
  const maxAngles = (d.max_angles ?? {}) as Record<string, { angle: number }>;
  const maxAngleEntries = Object.entries(maxAngles).filter(([, v]) => v?.angle != null);

  const scoreColor = (s: number) => s >= 70 ? "text-emerald-500" : s >= 45 ? "text-amber-500" : "text-red-500";
  const barColor  = (s: number) => s >= 70 ? "bg-emerald-400" : s >= 45 ? "bg-amber-400" : "bg-red-400";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <MetricChip label="Mode" value={mode} />
        <MetricChip label="Duration" value={duration} />
        <MetricChip label="FPS" value={fps} />
        {reps != null && reps > 0 && <MetricChip label="Reps" value={reps} />}
      </div>

      {(postureScore != null || symmetryScore != null) && (
        <div className="grid sm:grid-cols-2 gap-3">
          {postureScore != null && (
            <div className="rounded-xl bg-input border border-border px-4 py-3 shadow-sm">
              <SectionLabel>Posture Score</SectionLabel>
              <div className="flex items-baseline gap-1 mb-1">
                <span className={`text-2xl font-black ${scoreColor(postureScore)}`}>{postureScore}</span>
                <span className="text-text-muted text-xs">/100</span>
              </div>
              <ScoreBar value={postureScore} max={100} color={barColor(postureScore)} />
            </div>
          )}
          {symmetryScore != null && (
            <div className="rounded-xl bg-input border border-border px-4 py-3 shadow-sm">
              <SectionLabel>Symmetry Score</SectionLabel>
              <div className="flex items-baseline gap-1 mb-1">
                <span className={`text-2xl font-black ${scoreColor(symmetryScore)}`}>{symmetryScore}</span>
                <span className="text-text-muted text-xs">/100</span>
              </div>
              <ScoreBar value={symmetryScore} max={100} color={barColor(symmetryScore)} />
            </div>
          )}
        </div>
      )}

      {maxAngleEntries.length > 0 && (
        <div>
          <SectionLabel>Peak Joint Angles</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {maxAngleEntries.map(([id, v]) => (
              <div key={id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-input border border-border shadow-sm">
                <span className="text-xs text-text-muted capitalize">{id.replace(/_/g, " ")}</span>
                <span className="text-sm font-black text-indigo-400 ml-2">{Math.round(v.angle)}°</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!!d.notes && (
        <div>
          <SectionLabel>Notes</SectionLabel>
          <p className="text-sm text-text-muted bg-input rounded-xl px-4 py-3 border border-border shadow-inner">{str(d.notes)}</p>
        </div>
      )}
    </div>
  );
}

// ── Cricket Live Pose renderer ────────────────────────────────────────────────

function RenderCricketLive({ d }: { d: Record<string, unknown> }) {
  const score    = d.score    != null ? Number(d.score)   : null;
  const optimal  = d.optimal  != null ? Number(d.optimal) : null;
  const minor    = d.minor    != null ? Number(d.minor)   : null;
  const major    = d.major    != null ? Number(d.major)   : null;
  const phases   = (d.phases ?? {}) as Record<string, Record<string, number>>;
  const phaseKeys = Object.keys(phases);
  const scoreColor = score != null ? (score >= 7 ? "text-emerald-500" : score >= 4 ? "text-amber-500" : "text-red-500") : "text-text-muted";
  const barColor   = score != null ? (score >= 7 ? "bg-emerald-400" : score >= 4 ? "bg-amber-400" : "bg-red-400") : "bg-border";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {str(d.playerLabel) && <MetricChip label="Role" value={str(d.playerLabel)} />}
        {str(d.view) && <MetricChip label="View" value={str(d.view)} />}
        {str(d.dominant) && <MetricChip label="Dominant" value={str(d.dominant)} />}
        {phaseKeys.length > 0 && <MetricChip label="Phases" value={phaseKeys.length} />}
      </div>

      {score != null && (
        <div>
          <SectionLabel>Overall Score</SectionLabel>
          <div className="flex items-end gap-3 mb-2">
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-black ${scoreColor}`}>{score}</span>
              <span className="text-text-muted text-sm font-bold">/ 10</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {optimal != null && <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">{optimal} Optimal</span>}
              {minor != null && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">{minor} Minor</span>}
              {major != null && <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-bold">{major} Major</span>}
            </div>
          </div>
          <ScoreBar value={score} max={10} color={barColor} />
        </div>
      )}

      {phaseKeys.length > 0 && (
        <div>
          <SectionLabel>{phaseKeys.length} Phase{phaseKeys.length !== 1 ? "s" : ""} Captured</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {phaseKeys.map((p) => (
              <span key={p} className="text-[11px] px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 font-medium">{p}</span>
            ))}
          </div>
        </div>
      )}

      {!!d.aiCoachText && (
        <div>
          <SectionLabel>AI Coach</SectionLabel>
          <p className="text-sm text-text-muted bg-orange-500/5 border border-orange-500/15 rounded-xl px-4 py-3">{str(d.aiCoachText)}</p>
        </div>
      )}

      {!!d.notes && (
        <div>
          <SectionLabel>Notes</SectionLabel>
          <p className="text-sm text-text-muted bg-input rounded-xl px-4 py-3 border border-border shadow-inner">{str(d.notes)}</p>
        </div>
      )}
    </div>
  );
}

// ── Rehab Game renderer ───────────────────────────────────────────────────────

function RenderRehabGame({ d }: { d: Record<string, unknown> }) {
  const games = Array.isArray(d.games) ? (d.games as string[]) : str(d.game) ? [str(d.game)] : [];
  const duration = d.duration_min != null ? `${str(d.duration_min)} min` : "—";
  const performance = str(d.performance ?? "");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <MetricChip label="Duration" value={duration} />
        {games.length > 0 && <MetricChip label="Games" value={games.length} />}
      </div>

      {games.length > 0 && (
        <div>
          <SectionLabel>Games Played</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {games.map((g) => (
              <span key={g} className="text-[11px] px-2.5 py-1 rounded-full bg-orange-400/10 text-orange-500 border border-orange-400/20 font-medium">{g}</span>
            ))}
          </div>
        </div>
      )}

      {performance && (
        <div>
          <SectionLabel>Performance Observations</SectionLabel>
          <p className="text-sm text-text-muted bg-input rounded-xl px-4 py-3 border border-border shadow-inner">{performance}</p>
        </div>
      )}

      {!!d.notes && (
        <div>
          <SectionLabel>Notes</SectionLabel>
          <p className="text-sm text-text-muted bg-input rounded-xl px-4 py-3 border border-border shadow-inner">{str(d.notes)}</p>
        </div>
      )}
    </div>
  );
}

// ── Assessment card ───────────────────────────────────────────────────────────

function AssessmentCard({ a, patientMap, physio }: {
  a: EnrichedAssessment;
  patientMap: Map<string, Patient>;
  physio: import("../../../types").AppUser;
}) {
  const [open, setOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState<"download" | "share" | null>(null);
  const meta = TOOL_META[a.toolType] ?? { label: a.toolType, color: "muted" as const, icon: FileText, accent: "from-white/5 to-transparent border-white/10" };
  const Icon = meta.icon;

  const renderData = () => {
    const d = a.data as Record<string, unknown>;
    if (!d) return null;
    if (a.toolType === "fms")          return <RenderFMS d={d} />;
    if (a.toolType === "rom")          return <RenderROM d={d} />;
    if (a.toolType === "msk")          return <RenderMSK d={d} />;
    if (a.toolType === "posture")      return <RenderPosture d={d} />;
    if (a.toolType === "gait")          return <RenderGait d={d} />;
    if (a.toolType === "gait_clinical") return <RenderClinicalGait d={d} />;
    if (a.toolType === "prescription") return <RenderPrescription d={d} />;
    if (a.toolType === "inclinometer")  return <RenderInclinometer d={d} />;
    if (a.toolType === "facial_stress") return <RenderFacialStress d={d} />;
    if (a.toolType === "spinal")        return <RenderSpinal d={d} />;
    if (a.toolType === "live-pose")     return <RenderLivePose d={d} />;
    if (a.toolType === "cricket-live")  return <RenderCricketLive d={d} />;
    if (a.toolType === "rehab-game")    return <RenderRehabGame d={d} />;
    return <p className="text-sm text-slate-400">No display available for this assessment type.</p>;
  };

  const getPDFOpts = () => {
    const patient = patientMap.get(a.patientId);
    if (!patient) return null;
    return {
      assessment: { id: a.id, toolType: a.toolType, data: a.data as Record<string, unknown>, createdAt: a.createdAt },
      patient,
      physio,
    };
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const opts = getPDFOpts();
    if (!opts) { toast.error("Patient data not found"); return; }
    setPdfLoading("download");
    try {
      await downloadAssessmentPDF(opts);
      toast.success("PDF downloaded");
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setPdfLoading(null);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const opts = getPDFOpts();
    if (!opts) { toast.error("Patient data not found"); return; }
    setPdfLoading("share");
    try {
      await shareAssessmentPDF(opts);
    } catch {
      toast.error("Failed to share PDF");
    } finally {
      setPdfLoading(null);
    }
  };

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all duration-300 shadow-sm ${open ? `bg-gradient-to-b ${meta.accent}` : "bg-input border-border hover:border-primary/30 hover:bg-surface hover:shadow-md"}`}>
      {/* Card header — flat div so real <button> elements can live inside */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Toggle area — takes up all space except the action buttons */}
        <div
          role="button"
          tabIndex={0}
          className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
          onClick={() => setOpen((o) => !o)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpen((o) => !o); }}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition ${open ? "bg-surface/30" : "bg-surface/10"}`}>
            <Icon className={`w-4 h-4 ${open ? "text-text" : "text-text-muted"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-text text-sm truncate">{a.patientName}</p>
            <p className="text-xs text-text-muted truncate">{a.patientCondition}</p>
          </div>
        </div>

        {/* Right-side actions — real buttons, siblings of toggle area */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <Badge variant={meta.color}>{meta.label}</Badge>
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs text-text-muted">{formatRelative(a.createdAt)}</span>
            <span className="text-[10px] text-text-muted/60">{formatExact(a.createdAt)}</span>
          </div>

          {/* PDF action buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Download PDF report"
              disabled={pdfLoading !== null}
              onClick={handleDownload}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-border bg-surface/50 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all text-text-muted disabled:opacity-40"
            >
              {pdfLoading === "download"
                ? <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                : <Download className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              title="Share PDF report"
              disabled={pdfLoading !== null}
              onClick={handleShare}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-border bg-surface/50 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all text-text-muted disabled:opacity-40"
            >
              {pdfLoading === "share"
                ? <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                : <Share2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Chevron toggle */}
          <div
            role="button"
            tabIndex={-1}
            className="cursor-pointer"
            onClick={() => setOpen((o) => !o)}
          >
            {open
              ? <ChevronUp className="w-4 h-4 text-text-muted" />
              : <ChevronDown className="w-4 h-4 text-text-muted" />}
          </div>
        </div>
      </div>

      {open && (
        <div className="px-5 pb-5 border-t border-text-muted/10 pt-4">
          {renderData()}
          {/* PDF buttons inside expanded view */}
          <div className="flex gap-2 mt-5 pt-4 border-t border-text-muted/10">
            <button
              type="button"
              disabled={pdfLoading !== null}
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface/50 hover:bg-primary/10 hover:border-primary/30 hover:text-primary text-text-muted text-sm font-bold transition-all disabled:opacity-40"
            >
              {pdfLoading === "download"
                ? <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                : <Download className="w-4 h-4" />}
              Download PDF
            </button>
            <button
              type="button"
              disabled={pdfLoading !== null}
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface/50 hover:bg-primary/10 hover:border-primary/30 hover:text-primary text-text-muted text-sm font-bold transition-all disabled:opacity-40"
            >
              {pdfLoading === "share"
                ? <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                : <Share2 className="w-4 h-4" />}
              Share Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Filter dropdown ───────────────────────────────────────────────────────────

const FILTER_OPTIONS = ["all", "fms", "rom", "msk", "posture", "gait", "gait_clinical", "prescription", "inclinometer", "facial_stress", "spinal", "live-pose", "cricket-live", "rehab-game"] as const;

function FilterDropdown({
  value,
  onChange,
  counts,
}: {
  value: string;
  onChange: (v: string) => void;
  counts: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const current = value === "all" ? "All Types" : (TOOL_META[value]?.label ?? value);
  const currentCount = counts[value] ?? 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-input border border-border hover:border-primary/30 hover:bg-surface hover:shadow-md transition-all duration-300 text-sm text-text font-bold min-w-[180px] justify-between shadow-sm"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-text-muted" />
          <span>{current}</span>
          {value !== "all" && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{currentCount}</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-text-muted transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 w-full z-20 bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {FILTER_OPTIONS.map((f) => {
            const isAll = f === "all";
            const label = isAll ? "All Types" : (TOOL_META[f]?.label ?? f);
            const count = isAll ? Object.values(counts).reduce((s, c) => s + c, 0) : (counts[f] ?? 0);
            const Icon = isAll ? FileText : (TOOL_META[f]?.icon ?? FileText);
            const active = f === value;

            return (
              <button
                key={f}
                type="button"
                onClick={() => { onChange(f); setOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition hover:bg-primary/5 ${active ? "bg-primary/10 text-primary" : "text-text-muted"}`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${active ? "text-primary" : "text-text-muted"}`} />
                  <span className={`font-${active ? "bold" : "medium"}`}>{label}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${active ? "bg-primary/20 text-primary" : "bg-input text-text-muted"}`}>{count}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ReportsList() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<EnrichedAssessment[]>([]);
  const [patientMap, setPatientMap] = useState<Map<string, Patient>>(new Map());
  const [loading, setLoading] = useState(true);
  const [toolFilter, setToolFilter] = useState<string>("all");
  const [patientSearch, setPatientSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [groupByPatient, setGroupByPatient] = useState(false);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    Promise.all([
      getDocs(query(collection(firebaseDB, "patients"), where("physioId", "==", uid))),
      getDocs(query(collection(firebaseDB, "assessments"), where("physioId", "==", uid))),
    ])
      .then(([pSnap, aSnap]) => {
        const pMap = new Map<string, Patient>();
        pSnap.docs.forEach((d) => pMap.set(d.id, { id: d.id, ...d.data() } as Patient));
        setPatientMap(pMap);

        const list: EnrichedAssessment[] = aSnap.docs.map((d) => {
          const data = d.data() as Assessment;
          const p = pMap.get(data.patientId);
          return { ...data, id: d.id, patientName: p?.name ?? "Unknown", patientCondition: p?.condition ?? "—" };
        });
        list.sort((a, b) => {
          const at = (a.createdAt as unknown as { toMillis?: () => number })?.toMillis?.() ?? 0;
          const bt = (b.createdAt as unknown as { toMillis?: () => number })?.toMillis?.() ?? 0;
          return bt - at;
        });
        setAssessments(list);
      })
      .catch((err) => {
        console.error("[ReportsList] Failed to load assessments:", err);
        toast.error("Failed to load reports. Please refresh and try again.");
      })
      .finally(() => setLoading(false));
  }, [user]);

  const counts = assessments.reduce<Record<string, number>>((acc, a) => {
    acc[a.toolType] = (acc[a.toolType] ?? 0) + 1;
    return acc;
  }, {});

  const filtered = assessments.filter((a) => {
    if (toolFilter !== "all" && a.toolType !== toolFilter) return false;
    if (patientSearch && !a.patientName.toLowerCase().includes(patientSearch.toLowerCase())) return false;
    if (dateFrom || dateTo) {
      const d = toDate(a.createdAt);
      if (!d) return false;
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
    }
    return true;
  });

  const hasActiveFilters = toolFilter !== "all" || patientSearch !== "" || dateFrom !== "" || dateTo !== "";

  const patientGroups: Array<{ patientId: string; name: string; condition: string; items: EnrichedAssessment[] }> = groupByPatient
    ? Array.from(
        filtered.reduce((map, a) => {
          if (!map.has(a.patientId)) map.set(a.patientId, { patientId: a.patientId, name: a.patientName, condition: a.patientCondition, items: [] });
          map.get(a.patientId)!.items.push(a);
          return map;
        }, new Map<string, { patientId: string; name: string; condition: string; items: EnrichedAssessment[] }>())
      ).map(([, g]) => g)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-1.5 w-8 bg-primary rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Reports</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-text tracking-tight">Assessment Reports</h1>
          <p className="text-text-muted mt-1 text-sm">
            {filtered.length !== assessments.length
              ? `${filtered.length} of ${assessments.length} record${assessments.length !== 1 ? "s" : ""}`
              : `${assessments.length} total record${assessments.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <FilterDropdown value={toolFilter} onChange={setToolFilter} counts={counts} />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2.5 items-center">
        {/* Patient search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search patient name…"
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-input border border-border hover:border-primary/30 focus:border-primary/50 focus:outline-none text-sm text-text placeholder:text-text-muted transition-all shadow-sm"
          />
          {patientSearch && (
            <button
              type="button"
              onClick={() => setPatientSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Date from */}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            title="From date"
            className="pl-9 pr-3 py-2.5 rounded-2xl bg-input border border-border hover:border-primary/30 focus:border-primary/50 focus:outline-none text-sm text-text transition-all shadow-sm"
          />
        </div>

        {/* Date to */}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            title="To date"
            className="pl-9 pr-3 py-2.5 rounded-2xl bg-input border border-border hover:border-primary/30 focus:border-primary/50 focus:outline-none text-sm text-text transition-all shadow-sm"
          />
        </div>

        {/* Group by patient toggle */}
        <button
          type="button"
          onClick={() => setGroupByPatient((g) => !g)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-sm font-bold transition-all shadow-sm ${
            groupByPatient
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-input border-border text-text-muted hover:border-primary/30 hover:bg-surface"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Group by Patient
        </button>

        {/* Clear all filters */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => { setToolFilter("all"); setPatientSearch(""); setDateFrom(""); setDateTo(""); }}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-sm text-text-muted hover:text-text transition"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-text-muted text-sm">Loading assessments…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-input flex items-center justify-center shadow-inner">
            <FileText className="w-8 h-8 text-text-muted" />
          </div>
          <p className="text-text-muted font-medium">
            {patientSearch
              ? `No assessments found for "${patientSearch}".`
              : hasActiveFilters
              ? "No assessments match the current filters."
              : "No assessments recorded yet."}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => { setToolFilter("all"); setPatientSearch(""); setDateFrom(""); setDateTo(""); }}
              className="text-sm text-primary underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : groupByPatient ? (
        <div className="space-y-6">
          {patientGroups.map((group) => (
            <div key={group.patientId} className="space-y-2.5">
              {/* Patient group header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-text text-sm">{group.name}</p>
                    <p className="text-xs text-text-muted">{group.condition}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold">
                    {group.items.length} assessment{group.items.length !== 1 ? "s" : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setPatientSearch(group.name); setGroupByPatient(false); }}
                    className="text-xs text-text-muted hover:text-primary transition underline"
                  >
                    View only
                  </button>
                </div>
              </div>
              {group.items.map((a) => (
                <AssessmentCard key={a.id} a={a} patientMap={patientMap} physio={user!} />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((a) => (
            <AssessmentCard key={a.id} a={a} patientMap={patientMap} physio={user!} />
          ))}
        </div>
      )}
    </div>
  );
}
