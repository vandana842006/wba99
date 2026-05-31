import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { firebaseDB } from "../../../core/firebase";
import { useAuth } from "../../../context/AuthContext";
import type { Assessment } from "../../../types";
import { StatCard } from "../../../components/ui/StatCard";
import { Badge } from "../../../components/ui/Badge";
import {
  Users,
  ClipboardList,
  Activity,
  Brain,
  Gauge,
  Layers,
  Ruler,
  Bone,
  Accessibility,
  Footprints,
  FileText,
  ArrowRight,
  Scan,
  Zap,
  Gamepad2,
  Sparkles,
  FlaskConical,
  AlertTriangle,
  Clock,
  UserX,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const TOOL_CONFIG = [
  { id: "fms", label: "FMS Assessment", Icon: Activity, description: "Functional Movement Screen", color: "primary" },
  { id: "rom", label: "ROM Assessment", Icon: Ruler, description: "Range of motion by joint", color: "emerald-500" },
  { id: "msk", label: "MSK Assessment", Icon: Bone, description: "Musculoskeletal screening", color: "violet-500" },
  { id: "posture", label: "Posture Analysis", Icon: Accessibility, description: "Photo-based posture scoring", color: "amber-500" },
  { id: "gait", label: "Gait Analysis", Icon: Footprints, description: "Walking pattern assessment", color: "sky-500" },
  { id: "inclinometer",  label: "Digital Inclinometer",    Icon: Gauge,  description: "Joint angle & range of motion measurement", color: "cyan-400" },
  { id: "facial-stress", label: "Facial Stress Analysis",  Icon: Brain,   description: "AI micro-expression stress & psychology profile", color: "rose-500" },
  { id: "spinal",        label: "Spinal Analysis",         Icon: Layers,  description: "6-test clinical spinal battery with sensor guidance", color: "teal-500" },
  { id: "live-pose",     label: "Live Pose Analysis",      Icon: Scan,    description: "Real-time AI biomechanics — 10 joint angles, posture & symmetry scores, ROM voice coach", color: "indigo-500" },
  { id: "live-pose-2",   label: "Cricket Live Pose",       Icon: Zap,       description: "Cricket biomechanics — batting & bowling phase capture with benchmark scoring", color: "orange-500" },
  { id: "rehab-games",   label: "Rehab Games",             Icon: Gamepad2,  description: "8 pose-controlled games — gamified rehab for balance, coordination & strength", color: "orange-400" },
  { id: "ai-manuscript", label: "AI Manuscript Generator", Icon: Sparkles,  description: "Generate AI exercise demonstration videos with Sora 2", color: "violet-500" },
  { id: "research",      label: "Research Hub",            Icon: FlaskConical, description: "Live biomechanics dataset, research papers & certifications", color: "sky-600" },
];

const TOOL_LABELS: Record<string, string> = {
  fms: "FMS",
  rom: "ROM",
  msk: "MSK",
  posture: "Posture",
  gait: "Gait",
  inclinometer:  "Inclinometer",
  facial_stress: "Facial Stress",
  spinal:        "Spinal",
  live_pose:     "Live Pose",
  live_pose_2:   "Cricket Pose",
};

export function PhysioDashboard() {
  const { user } = useAuth();
  const [patientCount, setPatientCount] = useState(0);
  const [totalAssessments, setTotalAssessments] = useState(0);
  const [thisWeekCount, setThisWeekCount] = useState(0);
  const [highRiskCount, setHighRiskCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [notAssessedCount, setNotAssessedCount] = useState(0);
  const [recentAssessments, setRecentAssessments] = useState<(Assessment & { patientName?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const uid = user!.uid;

      // Patient count
      const pSnap = await getDocs(
        query(collection(firebaseDB, "patients"), where("physioId", "==", uid))
      );
      setPatientCount(pSnap.size);

      // Recent assessments (last 6, sorted client-side to avoid composite index)
      const aSnap = await getDocs(
        query(collection(firebaseDB, "assessments"), where("physioId", "==", uid))
      );

      // Enrich assessments with patient names, sort desc, take 6
      const assessments: (Assessment & { patientName?: string })[] = aSnap.docs.map((d) => {
        const data = d.data() as Assessment;
        const pDoc = pSnap.docs.find((pd) => pd.id === data.patientId);
        const { id: _unused, ...rest } = data;
        return { id: d.id, ...rest, patientName: pDoc?.data().name ?? "Unknown" };
      });
      assessments.sort((a, b) => {
        const at = (a.createdAt as unknown as { toMillis?: () => number })?.toMillis?.() ?? 0;
        const bt = (b.createdAt as unknown as { toMillis?: () => number })?.toMillis?.() ?? 0;
        return bt - at;
      });

      // Per-patient assessment map (already sorted desc, so first match = most recent)
      const patientMap = new Map<string, typeof assessments>();
      for (const a of assessments) {
        if (!patientMap.has(a.patientId)) patientMap.set(a.patientId, []);
        patientMap.get(a.patientId)!.push(a);
      }

      const fourWeeksMs = 28 * 24 * 60 * 60 * 1000;
      let highRisk = 0;
      let overdue = 0;
      for (const pAssessments of patientMap.values()) {
        const latestFms = pAssessments.find((a) => a.toolType === "fms");
        const latestGait = pAssessments.find((a) => a.toolType === "gait");
        const fmsScore = latestFms ? (latestFms.data as Record<string, unknown>).total : undefined;
        const gaitScore = latestGait ? (latestGait.data as Record<string, unknown>).total : undefined;
        if ((typeof fmsScore === "number" && fmsScore < 10) || (typeof gaitScore === "number" && gaitScore < 8)) {
          highRisk++;
        }
        const mostRecent = pAssessments[0];
        if (mostRecent?.createdAt) {
          try {
            const ts = (mostRecent.createdAt as unknown as { toDate: () => Date }).toDate?.() ?? new Date(mostRecent.createdAt as string);
            if (Date.now() - ts.getTime() > fourWeeksMs) overdue++;
          } catch { /* skip */ }
        }
      }

      const assessedIds = new Set(assessments.map((a) => a.patientId));
      const notAssessed = pSnap.docs.filter((d) => !assessedIds.has(d.id)).length;

      const weekMs = 7 * 24 * 60 * 60 * 1000;
      const weekCount = assessments.filter((a) => {
        if (!a.createdAt) return false;
        try {
          const ts = (a.createdAt as unknown as { toDate: () => Date }).toDate?.() ?? new Date(a.createdAt as string);
          return Date.now() - ts.getTime() < weekMs;
        } catch { return false; }
      }).length;

      setTotalAssessments(assessments.length);
      setThisWeekCount(weekCount);
      setHighRiskCount(highRisk);
      setOverdueCount(overdue);
      setNotAssessedCount(notAssessed);
      setRecentAssessments(assessments.slice(0, 6));
      setLoading(false);
    }

    load().catch(() => setLoading(false));
  }, [user]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-1.5 w-8 bg-primary rounded-full" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">Overview</span>
        </div>
        <h1 className="text-3xl font-black text-text tracking-tight">
          Welcome back, <span className="text-primary">{user?.name?.split(" ")[0]}</span>
        </h1>
        <p className="text-text-muted mt-1">Your clinical workspace is ready.</p>
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Total Patients" value={patientCount} Icon={Users} accent="primary" />
          <StatCard label="This Week" value={thisWeekCount} Icon={ClipboardList} accent="emerald-500" sub="assessments" />
          <StatCard label="Total Sessions" value={totalAssessments} Icon={Activity} accent="violet-500" sub="all time" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="High-Risk Patients" value={highRiskCount} Icon={AlertTriangle} accent="red-500" sub="FMS < 10 or Gait < 8" />
          <StatCard label="Overdue Reassessment" value={overdueCount} Icon={Clock} accent="amber-500" sub="> 4 weeks since last" />
          <StatCard label="Not Yet Assessed" value={notAssessedCount} Icon={UserX} accent="primary" sub={`of ${patientCount} patients`} />
        </div>
      </div>

      {/* Tools Grid */}
      <div>
        <h2 className="text-sm font-black uppercase tracking-widest text-text-muted mb-4">Quick Start — Assessment Tools</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TOOL_CONFIG.map(({ id, label, Icon, description, color }) => (
            <Link
              key={id}
              to={`/physio/tools?tool=${id}`}
              className="group bg-surface border border-border rounded-2xl p-5 hover:border-primary/50 hover:bg-surface hover:shadow-xl hover:-translate-y-1 transition-all duration-300 shadow-sm"
            >
              <div className={`w-11 h-11 rounded-xl bg-${color}/10 flex items-center justify-center mb-3 group-hover:bg-${color}/20 transition`}>
                <Icon className={`w-5 h-5 text-${color}`} />
              </div>
              <p className="font-bold text-text text-sm">{label}</p>
              <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Assessments */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-text-muted">Recent Assessments</h2>
          <Link to="/physio/reports" className="flex items-center gap-1 text-xs text-primary font-bold hover:underline">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : recentAssessments.length === 0 ? (
          <div className="bg-input border border-border rounded-2xl p-8 text-center">
            <FileText className="w-8 h-8 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">No assessments yet. Start by selecting a patient and tool.</p>
            <Link to="/physio/tools" className="inline-flex items-center gap-2 mt-4 text-sm font-bold text-primary hover:underline">
              Go to Tools <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentAssessments.map((a) => (
              <div key={a.id} className="flex items-center gap-4 p-4 rounded-2xl bg-input border border-border hover:bg-surface hover:shadow-md hover:border-primary/20 transition-all duration-300">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-text text-sm truncate">{a.patientName}</p>
                  <p className="text-xs text-text-muted">{TOOL_LABELS[a.toolType] ?? a.toolType} assessment</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <Badge variant="primary">{TOOL_LABELS[a.toolType]}</Badge>
                  <p className="text-[10px] text-text-muted mt-1">
                    {a.createdAt
                      ? (() => {
                          try {
                            const ts = (a.createdAt as unknown as { toDate: () => Date }).toDate?.() ?? new Date(a.createdAt as string);
                            return formatDistanceToNow(ts, { addSuffix: true });
                          } catch { return "—"; }
                        })()
                      : "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
