import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp, getDoc, doc } from "firebase/firestore";
import { firebaseDB } from "../../../core/firebase";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/ui/Button";
import { ArrowLeft, CheckCircle } from "lucide-react";
import type { Patient } from "../../../types";
import toast from "react-hot-toast";
import { PatientSelectSaveModal } from "../patients/PatientSelectSaveModal";

const FMS_TESTS = [
  {
    id: "deep_squat",
    name: "Deep Squat",
    description: "Bilateral, symmetrical mobility of hips, knees, and ankles",
    scoring: {
      3: "Upper torso parallel with tibia, femur below horizontal, knees over feet, dowel aligned over feet",
      2: "With heel lift — upper torso parallel with tibia, femur below horizontal",
      1: "Tibia and torso not parallel, femur not below horizontal",
      0: "Pain during movement",
    },
  },
  {
    id: "hurdle_step",
    name: "Hurdle Step",
    description: "Bilateral mobility and stability of hips, knees, and ankles during stepping",
    scoring: {
      3: "Hips, knees, ankles aligned in sagittal plane, minimal lumbar movement, dowel remains parallel",
      2: "Alignment lost, compensatory movement",
      1: "Contact between foot and hurdle, loss of balance",
      0: "Pain during movement",
    },
  },
  {
    id: "inline_lunge",
    name: "Inline Lunge",
    description: "Trunk and hip stability, ankle and knee mobility",
    scoring: {
      3: "Maintains balance, dowel stays parallel, foot stays in contact with floor",
      2: "Some loss of balance or alignment",
      1: "Contact between dowel and body",
      0: "Pain during movement",
    },
  },
  {
    id: "shoulder_mobility",
    name: "Shoulder Mobility",
    description: "Bilateral shoulder ROM in internal/external rotation",
    scoring: {
      3: "Fists within one hand length",
      2: "Fists within one and a half hand lengths",
      1: "Fists not within one and a half hand lengths",
      0: "Pain during movement (or impingement test positive)",
    },
  },
  {
    id: "active_slr",
    name: "Active Straight Leg Raise",
    description: "Functional hamstring and hip flexor mobility",
    scoring: {
      3: "Ankle between mid-thigh and ASIS",
      2: "Ankle between mid-thigh and knee joint",
      1: "Ankle remains below knee joint",
      0: "Pain during movement",
    },
  },
  {
    id: "trunk_stability",
    name: "Trunk Stability Push-up",
    description: "Reflexive stabilization of spine in sagittal plane",
    scoring: {
      3: "Men: thumbs aligned with top of head — full push-up. Women: aligned with chin.",
      2: "Men: thumbs aligned with chin. Women: aligned with clavicle.",
      1: "Cannot perform proper push-up",
      0: "Pain during movement (or extension test positive)",
    },
  },
  {
    id: "rotary_stability",
    name: "Rotary Stability",
    description: "Multi-planar trunk stability during combined upper and lower extremity movement",
    scoring: {
      3: "Correct unilateral movement without difficulty",
      2: "Diagonal movement without difficulty",
      1: "Cannot perform movement",
      0: "Pain during movement",
    },
  },
];

const SCORE_COLORS = ["bg-red-500/20 text-red-400 border-red-500/30", "bg-amber-500/20 text-amber-400 border-amber-500/30", "bg-sky-500/20 text-sky-400 border-sky-500/30", "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"];

function getTotalColor(total: number) {
  if (total >= 14) return "text-emerald-400";
  if (total >= 10) return "text-amber-400";
  return "text-red-400";
}

export function FMSAssessment() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const patientId = params.get("patientId") ?? "";
  const [patient, setPatient] = useState<Patient | null>(null);
  const [activeTest, setActiveTest] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(FMS_TESTS.map((t) => [t.id, 0]))
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    getDoc(doc(firebaseDB, "patients", patientId)).then((d) => {
      if (d.exists()) setPatient({ id: d.id, ...d.data() } as Patient);
    });
  }, [patientId]);

  const total = Object.values(scores).reduce((s, v) => s + v, 0);

  const handleSave = async (pid: string) => {
    if (!user) return;
    setSaving(true);
    try {
      await addDoc(collection(firebaseDB, "assessments"), {
        patientId: pid,
        physioId: user.uid,
        toolType: "fms",
        data: { scores, total, notes },
        createdAt: serverTimestamp(),
      });
      setSaved(true);
      setShowModal(false);
      toast.success("FMS Assessment saved!");
      setTimeout(() => navigate("/physio/reports"), 1200);
    } catch {
      toast.error("Failed to save assessment");
    } finally {
      setSaving(false);
    }
  };

  const test = FMS_TESTS[activeTest];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-1.5 w-8 bg-primary rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">FMS Assessment</span>
          </div>
          <h1 className="text-2xl font-black text-white">Functional Movement Screen</h1>
          {patient && <p className="text-slate-400 text-sm mt-0.5">Patient: <span className="text-white font-semibold">{patient.name}</span></p>}
        </div>

        {/* Total score */}
        <div className="ml-auto text-right">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total Score</p>
          <p className={`text-4xl font-black ${getTotalColor(total)}`}>{total}<span className="text-lg text-slate-500 font-bold"> / 21</span></p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-4">
        {/* Test List */}
        <div className="space-y-1">
          {FMS_TESTS.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setActiveTest(i)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTest === i
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
              }`}
            >
              <span className="truncate">{t.name}</span>
              <span className={`ml-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border ${SCORE_COLORS[scores[t.id]]}`}>
                {scores[t.id]}
              </span>
            </button>
          ))}
        </div>

        {/* Active Test Detail */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="text-xl font-black text-white">{test.name}</h2>
            <p className="text-slate-400 text-sm mt-1">{test.description}</p>
          </div>

          {/* Score Selector */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Score</p>
            <div className="grid grid-cols-2 gap-2">
              {([3, 2, 1, 0] as const).map((score) => (
                <button
                  key={score}
                  onClick={() => setScores((s) => ({ ...s, [test.id]: score }))}
                  className={`flex flex-col gap-1.5 p-4 rounded-xl border text-left transition-all ${
                    scores[test.id] === score
                      ? `${SCORE_COLORS[score]} border-opacity-100`
                      : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-slate-400"
                  }`}
                >
                  <span className="text-2xl font-black">{score}</span>
                  <span className="text-[11px] leading-relaxed">{test.scoring[score]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes (last test) */}
          {activeTest === FMS_TESTS.length - 1 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Clinical Notes</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Optional observations…"
                className="w-full rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-primary/50 placeholder:text-slate-600 transition resize-none"
              />
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 pt-2">
            {activeTest > 0 && (
              <Button variant="ghost" size="md" onClick={() => setActiveTest((n) => n - 1)}>
                Previous
              </Button>
            )}
            {activeTest < FMS_TESTS.length - 1 ? (
              <Button variant="primary" size="md" className="ml-auto" onClick={() => setActiveTest((n) => n + 1)}>
                Next Test
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                className="ml-auto"
                onClick={() => setShowModal(true)}
              >
                {saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : "Save Assessment"}
              </Button>
            )}
          </div>
        </div>
      </div>
      <PatientSelectSaveModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        saving={saving}
        preselectedPatientId={patientId}
      />
    </div>
  );
}
