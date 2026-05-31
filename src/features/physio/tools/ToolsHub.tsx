import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { firebaseDB } from "../../../core/firebase";
import { useAuth } from "../../../context/AuthContext";
import type { Patient } from "../../../types";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import {
  Activity,
  Ruler,
  Bone,
  Accessibility,
  Footprints,
  Gauge,
  Brain,
  Layers,
  Scan,
  Zap,
  Gamepad2,
  Search,
  ChevronRight,
  Users,
} from "lucide-react";

const TOOLS = [
  {
    id: "fms",
    label: "FMS Assessment",
    Icon: Activity,
    description: "7 movement screen patterns scored 0–3. Total out of 21.",
    color: "primary",
    badge: "Gold Standard",
  },
  {
    id: "rom",
    label: "ROM Assessment",
    Icon: Ruler,
    description: "Goniometry — joint range of motion with normal range comparison.",
    color: "emerald-500",
    badge: "Clinical",
  },
  {
    id: "msk",
    label: "MSK Assessment",
    Icon: Bone,
    description: "Musculoskeletal body region symptom mapping and scoring.",
    color: "violet-500",
    badge: "Comprehensive",
  },
  {
    id: "posture",
    label: "Posture Analysis",
    Icon: Accessibility,
    description: "Photo-based posture evaluation with 20-point checklist.",
    color: "amber-500",
    badge: "Visual",
  },
  {
    id: "gait",
    label: "Gait Analysis",
    Icon: Footprints,
    description: "5-parameter walking pattern assessment. Total out of 15.",
    color: "sky-500",
    badge: "Functional",
  },
  {
    id: "inclinometer",
    label: "Digital Inclinometer",
    Icon: Gauge,
    description: "Sensor-based joint angle & range of motion measurement with calibration.",
    color: "cyan-400",
    badge: "ROM Tool",
  },
  {
    id: "facial-stress",
    label: "Facial Stress Analysis",
    Icon: Brain,
    description: "AI-powered 30-second facial micro-expression session — stress index, fatigue, anxiety tendency, attention score, and psychology profile.",
    color: "rose-500",
    badge: "AI-Powered",
  },
  {
    id: "spinal",
    label: "Spinal Analysis",
    Icon: Layers,
    description: "6-test clinical spinal battery — Schober, lateral flexion, thoracic kyphosis, cervical ROM, finger-to-floor, and SLR — with sensor-guided measurement and graded results.",
    color: "teal-500",
    badge: "Clinical",
  },
  {
    id: "live-pose",
    label: "Live Pose Analysis",
    Icon: Scan,
    description: "Real-time MediaPipe AI — 33 landmarks, 10 joint angles, posture & symmetry scoring, ROM voice coach, squat counter, gait phase detection, and 3D avatar.",
    color: "indigo-500",
    badge: "AI Live",
  },
  {
    id: "live-pose-2",
    label: "Cricket Live Pose",
    Icon: Zap,
    description: "Cricket-specific biomechanics — batsman & bowler phase capture (Stance → Follow-through), per-phase benchmark scoring, PDF report, and AI coaching.",
    color: "orange-500",
    badge: "Cricket",
  },
  {
    id: "rehab-games",
    label: "Rehab Games",
    Icon: Gamepad2,
    description: "8 pose-controlled real-time games — gamified rehabilitation for trunk control, shoulder flexion, limb ROM, balance, and bilateral coordination.",
    color: "orange-400",
    badge: "Gamified",
  },
];

type Step = "patient" | "tool";

export function ToolsHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("patient");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(firebaseDB, "patients"), where("physioId", "==", user.uid));
    getDocs(q)
      .then((snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Patient));
        docs.sort((a, b) => {
          const at = (a.createdAt as unknown as { toMillis?: () => number })?.toMillis?.() ?? 0;
          const bt = (b.createdAt as unknown as { toMillis?: () => number })?.toMillis?.() ?? 0;
          return bt - at;
        });
        setPatients(docs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.condition.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectTool = (toolId: string) => {
    if (!selectedPatient) return;
    navigate(`/physio/tools/${toolId}?patientId=${selectedPatient.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-1.5 w-8 bg-primary rounded-full" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Assessment Tools</span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Tools Hub</h1>

        {/* Steps */}
        <div className="flex items-center gap-2 mt-4">
          <StepBadge num={1} label="Select Patient" active={step === "patient"} done={step === "tool"} />
          <ChevronRight className="w-4 h-4 text-slate-600" />
          <StepBadge num={2} label="Select Tool" active={step === "tool"} done={false} />
        </div>
      </div>

      {/* Step 1: Patient Selection */}
      {step === "patient" && (
        <div className="space-y-4">
          <p className="text-slate-400 text-sm">Choose the patient you want to assess.</p>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search patients…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-white/5 bg-white/[0.03] pl-12 pr-4 py-3 text-sm text-white outline-none focus:border-primary/50 placeholder:text-slate-600 transition"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Users className="w-10 h-10 text-slate-600" />
              <p className="text-slate-400">{search ? "No patients match" : "No patients yet"}</p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {filteredPatients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPatient(p);
                    setStep("tool");
                  }}
                  className={`flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-150 ${
                    selectedPatient?.id === p.id
                      ? "border-primary/40 bg-primary/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-black text-primary">
                      {p.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">{p.name}</p>
                    <p className="text-xs text-slate-400 truncate">{p.condition}</p>
                  </div>
                  <Badge variant="muted">{p.age}y</Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Tool Selection */}
      {step === "tool" && selectedPatient && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">
                Assessing: <span className="text-white font-bold">{selectedPatient.name}</span>
                <span className="text-slate-500"> — {selectedPatient.condition}</span>
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep("patient")}>
              Change patient
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.map(({ id, label, Icon, description, color, badge }) => (
              <button
                key={id}
                onClick={() => handleSelectTool(id)}
                className="group bg-white/[0.03] border border-white/10 rounded-2xl p-5 hover:border-white/25 hover:bg-white/[0.07] transition-all duration-200 text-left"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-11 h-11 rounded-xl bg-${color}/10 flex items-center justify-center group-hover:bg-${color}/20 transition`}>
                    <Icon className={`w-5 h-5 text-${color}`} />
                  </div>
                  <Badge variant="muted">{badge}</Badge>
                </div>
                <p className="font-bold text-white text-sm">{label}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StepBadge({ num, label, active, done }: { num: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition ${
      active ? "bg-primary/15 text-primary border border-primary/30" :
      done ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" :
      "bg-white/5 text-slate-500 border border-white/10"
    }`}>
      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black bg-current/20">
        {num}
      </span>
      {label}
    </div>
  );
}
