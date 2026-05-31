import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp, getDoc, doc } from "firebase/firestore";
import { firebaseDB } from "../../core/firebase";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { ArrowLeft } from "lucide-react";
import type { Patient } from "../../types";
import toast from "react-hot-toast";
import { PatientSelectSaveModal } from "./patients/PatientSelectSaveModal";

interface ROMTest {
  id: string;
  name: string;
  normalRange: number;
  normalLabel: string;
  bilateral?: boolean;
}

interface JointCategory {
  id: string;
  name: string;
  color: string;
  tests: ROMTest[];
}

const CATEGORIES: JointCategory[] = [
  {
    id: "shoulder",
    name: "Shoulder",
    color: "primary",
    tests: [
      { id: "shoulder_flex", name: "Flexion", normalRange: 180, normalLabel: "0–180°", bilateral: true },
      { id: "shoulder_ext", name: "Extension", normalRange: 60, normalLabel: "0–60°", bilateral: true },
      { id: "shoulder_abd", name: "Abduction", normalRange: 180, normalLabel: "0–180°", bilateral: true },
      { id: "shoulder_ir", name: "Int. Rotation", normalRange: 70, normalLabel: "0–70°", bilateral: true },
      { id: "shoulder_er", name: "Ext. Rotation", normalRange: 90, normalLabel: "0–90°", bilateral: true },
    ],
  },
  {
    id: "hip",
    name: "Hip",
    color: "violet-500",
    tests: [
      { id: "hip_flex", name: "Flexion", normalRange: 120, normalLabel: "0–120°", bilateral: true },
      { id: "hip_ext", name: "Extension", normalRange: 30, normalLabel: "0–30°", bilateral: true },
      { id: "hip_abd", name: "Abduction", normalRange: 45, normalLabel: "0–45°", bilateral: true },
      { id: "hip_ir", name: "Int. Rotation", normalRange: 45, normalLabel: "0–45°", bilateral: true },
      { id: "hip_er", name: "Ext. Rotation", normalRange: 45, normalLabel: "0–45°", bilateral: true },
    ],
  },
  {
    id: "knee",
    name: "Knee",
    color: "emerald-500",
    tests: [
      { id: "knee_flex", name: "Flexion", normalRange: 135, normalLabel: "0–135°", bilateral: true },
      { id: "knee_ext", name: "Extension", normalRange: 0, normalLabel: "0°", bilateral: true },
    ],
  },
  {
    id: "ankle",
    name: "Ankle",
    color: "amber-500",
    tests: [
      { id: "ankle_df", name: "Dorsiflexion", normalRange: 20, normalLabel: "0–20°", bilateral: true },
      { id: "ankle_pf", name: "Plantarflexion", normalRange: 50, normalLabel: "0–50°", bilateral: true },
      { id: "ankle_inv", name: "Inversion", normalRange: 35, normalLabel: "0–35°", bilateral: true },
      { id: "ankle_ev", name: "Eversion", normalRange: 15, normalLabel: "0–15°", bilateral: true },
    ],
  },
  {
    id: "spine",
    name: "Spine",
    color: "sky-500",
    tests: [
      { id: "cx_flex", name: "Cervical Flexion", normalRange: 45, normalLabel: "0–45°" },
      { id: "cx_ext", name: "Cervical Extension", normalRange: 45, normalLabel: "0–45°" },
      { id: "lx_flex", name: "Lumbar Flexion", normalRange: 90, normalLabel: "0–90°" },
      { id: "lx_ext", name: "Lumbar Extension", normalRange: 30, normalLabel: "0–30°" },
    ],
  },
];

type Side = "L" | "R";

interface ROMValue {
  L?: number;
  R?: number;
  single?: number;
}

function getStatus(measured: number, normal: number): "normal" | "mild" | "severe" | "hyper" {
  if (normal === 0) {
    return measured === 0 ? "normal" : "hyper";
  }
  const pct = measured / normal;
  if (pct > 1.1) return "hyper";
  if (pct >= 0.85) return "normal";
  if (pct >= 0.6) return "mild";
  return "severe";
}

const STATUS_COLORS = {
  normal: "text-emerald-600 dark:text-emerald-400",
  mild: "text-amber-600 dark:text-amber-400",
  severe: "text-red-600 dark:text-red-400",
  hyper: "text-violet-600 dark:text-violet-400",
};

export function ROMAssessment() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const patientId = params.get("patientId") ?? "";
  const [patient, setPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [values, setValues] = useState<Record<string, ROMValue>>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    getDoc(doc(firebaseDB, "patients", patientId)).then((d) => {
      if (d.exists()) setPatient({ id: d.id, ...d.data() } as Patient);
    });
  }, [patientId]);

  const setValue = (testId: string, side: Side | "single", val: string) => {
    const num = val === "" ? undefined : Number(val);
    setValues((prev) => ({
      ...prev,
      [testId]: { ...prev[testId], [side]: num },
    }));
  };

  const handleSave = async (pid: string) => {
    if (!user) return;
    setSaving(true);
    try {
      await addDoc(collection(firebaseDB, "assessments"), {
        patientId: pid,
        physioId: user.uid,
        toolType: "rom",
        data: { joints: values, notes },
        createdAt: serverTimestamp(),
      });
      setShowModal(false);
      toast.success("ROM Assessment saved!");
      setTimeout(() => navigate("/physio/reports"), 1200);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const cat = CATEGORIES[activeTab];

  const inputClass = "w-20 rounded-xl border border-border bg-surface px-3 py-1.5 text-sm text-text outline-none focus:border-primary/50 text-center tabular-nums transition shadow-inner";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-1.5 w-8 bg-emerald-500 rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">ROM Assessment</span>
          </div>
          <h1 className="text-2xl font-black text-text">Range of Motion</h1>
          {patient && <p className="text-text-muted text-sm">Patient: <span className="text-text font-semibold">{patient.name}</span></p>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl bg-input border border-border overflow-x-auto shadow-sm">
        {CATEGORIES.map((c, i) => (
          <button
            key={c.id}
            onClick={() => setActiveTab(i)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === i ? `bg-primary text-white shadow-md active:scale-95` : "text-text-muted hover:text-text hover:bg-surface"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Tests */}
      <div className="bg-input border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-5 py-3 border-b border-border bg-surface/50">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Movement</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted text-center w-20">Left (°)</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted text-center w-20">Right (°)</p>
        </div>

        {cat.tests.map((test) => {
          const val = values[test.id] ?? {};
          const lStatus = val.L !== undefined ? getStatus(val.L, test.normalRange) : null;
          const rStatus = val.R !== undefined ? getStatus(val.R, test.normalRange) : null;
          const sStatus = val.single !== undefined ? getStatus(val.single, test.normalRange) : null;

          return (
            <div key={test.id} className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-center px-5 py-3 border-b border-border last:border-0 hover:bg-surface transition-all duration-200">
              <p className="text-sm font-bold text-text">{test.name}</p>

              {test.bilateral ? (
                <>
                  <div className="flex flex-col items-center gap-0.5">
                    <input
                      type="number"
                      min={0}
                      max={360}
                      placeholder="—"
                      value={val.L ?? ""}
                      onChange={(e) => setValue(test.id, "L", e.target.value)}
                      className={inputClass}
                    />
                    {lStatus && <span className={`text-[9px] font-bold uppercase ${STATUS_COLORS[lStatus]}`}>{lStatus}</span>}
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <input
                      type="number"
                      min={0}
                      max={360}
                      placeholder="—"
                      value={val.R ?? ""}
                      onChange={(e) => setValue(test.id, "R", e.target.value)}
                      className={inputClass}
                    />
                    {rStatus && <span className={`text-[9px] font-bold uppercase ${STATUS_COLORS[rStatus]}`}>{rStatus}</span>}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-0.5">
                    <input
                      type="number"
                      min={0}
                      max={360}
                      placeholder="—"
                      value={val.single ?? ""}
                      onChange={(e) => setValue(test.id, "single", e.target.value)}
                      className={inputClass}
                    />
                    {sStatus && <span className={`text-[9px] font-bold uppercase ${STATUS_COLORS[sStatus]}`}>{sStatus}</span>}
                  </div>
                  <div /> {/* empty right column */}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Notes & Save */}
      <div className="space-y-3">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Clinical observations…"
          className="w-full rounded-2xl border border-border bg-input px-4 py-3 text-sm text-text outline-none focus:border-primary/50 placeholder:text-text-muted/60 transition resize-none shadow-sm"
        />
        <div className="flex justify-end">
          <Button variant="primary" size="lg" onClick={() => setShowModal(true)}>
            Save ROM Assessment
          </Button>
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

