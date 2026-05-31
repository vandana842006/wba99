import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import toast from "react-hot-toast";
import { firebaseDB } from "../../core/firebase";
import { useAuth } from "../../context/AuthContext";
import type { Patient } from "../../types";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import {
  Activity,
  Ruler,
  Bone,
  Accessibility,
  Footprints,
  Gauge,
  Brain,
  Layers,
  Search,
  ChevronRight,
  Users,
  AlertCircle,
  Scan,
  Zap,
  Gamepad2,
  Sparkles,
  FlaskConical,
  ClipboardList,
  UserPlus,
} from "lucide-react";
import { AddPatientModal } from "./patients/AddPatientModal";

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
    description: "7 analysis methods — landmark angles, anterior/lateral/posterior views, CVA, and manual 20-point checklist.",
    color: "amber-500",
    badge: "Visual",
  },
  {
    id: "gait",
    label: "Gait Analysis",
    Icon: Footprints,
    description: "Quick 5-parameter Gait Score (out of 15) or full 8-phase Clinical Gait Analysis (out of 24) with phase-by-phase deviations and rehab protocol.",
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
  {
    id: "ai-manuscript",
    label: "AI Manuscript Generator",
    Icon: Sparkles,
    description: "Generate exercise demonstration videos using Sora 2 AI — choose from presets or write a custom prompt with duration and resolution control.",
    color: "violet-500",
    badge: "AI-Powered",
  },
  {
    id: "research",
    label: "Research Hub",
    Icon: FlaskConical,
    description: "Live biomechanics dataset, cohort ROM statistics, latest physiotherapy research papers, and certification tracking.",
    color: "sky-600",
    badge: "Research",
  },
  {
    id: "prescription",
    label: "Smart Prescription",
    Icon: ClipboardList,
    description: "Build and save exercise prescriptions — search the exercise library, set sets/reps/frequency, and generate a PDF for the patient.",
    color: "rose-500",
    badge: "Rx",
  },
];

type Step = "patient" | "tool";

export function ToolsHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedToolId = searchParams.get("tool") ?? null;
  const preselectedTool = preselectedToolId ? TOOLS.find((t) => t.id === preselectedToolId) ?? null : null;

  const [step, setStep] = useState<Step>("patient");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddPatient, setShowAddPatient] = useState(false);

  const loadPatients = () => {
    if (!user) return;
    setLoading(true);
    setError(null);
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
      .catch((err) => {
        console.error("[ToolsHub] Failed to load patients:", err);
        setError("Could not load your patients. Please check your connection.");
        toast.error("Failed to load patients");
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadPatients, [user]);

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.condition.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectTool = (toolId: string) => {
    if (!selectedPatient) return;
    navigate(`/physio/tools/${toolId}?patientId=${selectedPatient.id}`);
  };

  const handleSelectPatient = (p: Patient) => {
    setSelectedPatient(p);
    if (preselectedToolId) {
      navigate(`/physio/tools/${preselectedToolId}?patientId=${p.id}`);
    } else {
      setStep("tool");
    }
  };

  const handlePatientCreated = (newPatientId: string) => {
    // Reload the list then auto-select the new patient
    if (!user) return;
    const q = query(collection(firebaseDB, "patients"), where("physioId", "==", user.uid));
    getDocs(q).then((snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Patient));
      docs.sort((a, b) => {
        const at = (a.createdAt as unknown as { toMillis?: () => number })?.toMillis?.() ?? 0;
        const bt = (b.createdAt as unknown as { toMillis?: () => number })?.toMillis?.() ?? 0;
        return bt - at;
      });
      setPatients(docs);
      const newPatient = docs.find((p) => p.id === newPatientId);
      if (newPatient) handleSelectPatient(newPatient);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-1.5 w-8 bg-primary rounded-full" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Assessment Tools</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-text tracking-tight">Tools Hub</h1>

        {/* Steps */}
        <div className="flex items-center gap-2 mt-4">
          <StepBadge num={1} label="Select Patient" active={step === "patient"} done={step === "tool"} />
          <ChevronRight className="w-4 h-4 text-slate-600" />
          <StepBadge num={2} label={preselectedTool ? preselectedTool.label : "Select Tool"} active={step === "tool"} done={false} />
        </div>

        {/* Pre-selection context banner */}
        {preselectedTool && step === "patient" && (
          <div className="mt-3 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-primary/5 border border-primary/15">
            <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
              <preselectedTool.Icon className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-xs text-text-muted">
              Starting <span className="font-bold text-text">{preselectedTool.label}</span> — pick a patient to begin.
            </p>
          </div>
        )}
      </div>

      {/* Step 1: Patient Selection */}
      {step === "patient" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-text-muted text-sm">Choose the patient you want to assess.</p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddPatient(true)}
              className="flex items-center gap-1.5 flex-shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              New Patient
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search patients…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-border bg-input pl-12 pr-4 py-3 text-sm text-text outline-none focus:border-primary/50 focus:bg-surface placeholder:text-text-muted transition shadow-sm"
            />
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-text-muted text-sm">Loading patients…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-red-500" />
              </div>
              <p className="text-text-muted text-center text-sm">{error}</p>
              <Button variant="ghost" size="md" onClick={loadPatients}>Try Again</Button>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Users className="w-10 h-10 text-text-muted" />
              <p className="text-text-muted">{search ? "No patients match your search" : "No patients yet"}</p>
              {!search && (
                <Button variant="primary" size="md" onClick={() => setShowAddPatient(true)} className="flex items-center gap-2 mt-1">
                  <UserPlus className="w-4 h-4" />
                  Add First Patient
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {filteredPatients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPatient(p)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-300 min-h-[64px] shadow-sm ${
                    selectedPatient?.id === p.id
                      ? "border-primary/40 bg-primary/10"
                      : "border-border bg-input hover:border-primary/30 hover:bg-surface hover:shadow-md active:scale-[0.98]"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-black text-primary">
                      {p.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-text text-sm truncate">{p.name}</p>
                    <p className="text-xs text-text-muted truncate">{p.condition}</p>
                  </div>
                  <Badge variant="muted">{p.age}y</Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <AddPatientModal
        open={showAddPatient}
        onClose={() => setShowAddPatient(false)}
        onCreated={handlePatientCreated}
      />

      {/* Step 2: Tool Selection */}
      {step === "tool" && selectedPatient && (
        <div className="space-y-4">
          {/* Selected patient banner */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-primary/5 border border-primary/15">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-black text-primary">
                  {selectedPatient.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-text font-bold text-sm truncate">{selectedPatient.name}</p>
                <p className="text-xs text-text-muted truncate">{selectedPatient.condition}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep("patient")} className="flex-shrink-0">
              Change
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.map(({ id, label, Icon, description, color, badge }) => (
              <button
                key={id}
                onClick={() => handleSelectTool(id)}
                className="group bg-input border border-border rounded-2xl p-5 hover:border-primary/30 hover:bg-surface active:scale-[0.98] transition-all duration-300 text-left shadow-sm hover:shadow-lg"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-11 h-11 rounded-xl bg-${color}/10 flex items-center justify-center group-hover:bg-${color}/20 transition`}>
                    <Icon className={`w-5 h-5 text-${color}`} />
                  </div>
                  <Badge variant="muted">{badge}</Badge>
                </div>
                <p className="font-bold text-text text-sm">{label}</p>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">{description}</p>
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
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition shadow-sm ${
      active ? "bg-primary/15 text-primary border border-primary/30" :
      done ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" :
      "bg-input text-text-muted border border-border"
    }`}>
      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black bg-current/20">
        {num}
      </span>
      {label}
    </div>
  );
}
