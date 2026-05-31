import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp, getDoc, doc } from "firebase/firestore";
import { firebaseDB } from "../../../core/firebase";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { ArrowLeft, Plus, Trash2, Search } from "lucide-react";
import type { Patient } from "../../../types";
import toast from "react-hot-toast";
import { PatientSelectSaveModal } from "../patients/PatientSelectSaveModal";

interface Exercise {
  id: string;
  name: string;
  category: string;
  muscle: string;
  description: string;
}

interface PrescribedExercise extends Exercise {
  sets: number;
  reps: number;
  frequency: string;
  notes: string;
}

const EXERCISE_LIBRARY: Exercise[] = [
  { id: "bird_dog", name: "Bird Dog", category: "Strengthening", muscle: "Core", description: "Quadruped opposite arm/leg extension for core stability" },
  { id: "dead_bug", name: "Dead Bug", category: "Strengthening", muscle: "Core", description: "Supine core stabilisation with limb extensions" },
  { id: "glute_bridge", name: "Glute Bridge", category: "Strengthening", muscle: "Glutes", description: "Supine hip extension to activate gluteus maximus" },
  { id: "squat", name: "Bodyweight Squat", category: "Strengthening", muscle: "Legs", description: "Basic squat for lower limb strength and mobility" },
  { id: "lunge", name: "Forward Lunge", category: "Strengthening", muscle: "Legs", description: "Forward step lunge for unilateral lower limb strength" },
  { id: "wall_sit", name: "Wall Sit", category: "Strengthening", muscle: "Quads", description: "Isometric quad hold against wall for endurance" },
  { id: "calf_raise", name: "Calf Raise", category: "Strengthening", muscle: "Calves", description: "Standing calf raise for ankle/calf strengthening" },
  { id: "shoulder_press", name: "Shoulder Press", category: "Strengthening", muscle: "Shoulder", description: "Overhead press for deltoid and rotator cuff" },
  { id: "row", name: "Band Row", category: "Strengthening", muscle: "Back", description: "Resistance band row for scapular retractors" },
  { id: "push_up", name: "Push-Up", category: "Strengthening", muscle: "Chest/Triceps", description: "Standard push-up for upper body and core" },
  { id: "hip_flexor_stretch", name: "Hip Flexor Stretch", category: "Flexibility", muscle: "Hip Flexors", description: "Kneeling hip flexor stretch for lumbar mobility" },
  { id: "hamstring_stretch", name: "Hamstring Stretch", category: "Flexibility", muscle: "Hamstrings", description: "Supine or standing hamstring lengthening" },
  { id: "calf_stretch", name: "Calf Stretch", category: "Flexibility", muscle: "Calves", description: "Wall calf stretch for ankle dorsiflexion" },
  { id: "thoracic_rotation", name: "Thoracic Rotation", category: "Flexibility", muscle: "Thoracic Spine", description: "Seated rotation for mid-back mobility" },
  { id: "chest_stretch", name: "Doorway Chest Stretch", category: "Flexibility", muscle: "Pectorals", description: "Doorway stretch for pectoral flexibility" },
  { id: "single_leg_stand", name: "Single Leg Stand", category: "Balance", muscle: "Full Body", description: "Static single-leg balance for proprioception" },
  { id: "bosu_squat", name: "Balance Board Squat", category: "Balance", muscle: "Full Body", description: "Squat on unstable surface for dynamic balance" },
  { id: "tandem_walk", name: "Tandem Walk", category: "Balance", muscle: "Full Body", description: "Heel-toe walking for dynamic balance and gait" },
  { id: "walking", name: "Walking Programme", category: "Cardio", muscle: "Full Body", description: "Graded walking for aerobic conditioning and gait" },
  { id: "cycling", name: "Stationary Cycling", category: "Cardio", muscle: "Legs/Cardio", description: "Low-impact aerobic cycling for endurance" },
  { id: "swimming", name: "Swimming / Hydrotherapy", category: "Cardio", muscle: "Full Body", description: "Aquatic exercise for joint-friendly aerobic work" },
];

const FREQUENCIES = ["Daily", "Every 2 days", "3x per week", "Twice a week", "Weekly"];
const CATEGORIES = ["All", "Strengthening", "Flexibility", "Balance", "Cardio"];

const CATEGORY_COLORS: Record<string, string> = {
  Strengthening: "primary",
  Flexibility: "success",
  Balance: "warning",
  Cardio: "muted",
};

export function SmartPrescription() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const patientId = params.get("patientId") ?? "";
  const [patient, setPatient] = useState<Patient | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState<PrescribedExercise[]>([]);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    getDoc(doc(firebaseDB, "patients", patientId)).then((d) => {
      if (d.exists()) setPatient({ id: d.id, ...d.data() } as Patient);
    });
  }, [patientId]);

  const filteredLibrary = EXERCISE_LIBRARY.filter((e) => {
    const matchCat = catFilter === "All" || e.category === catFilter;
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.muscle.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const addExercise = (ex: Exercise) => {
    if (prescription.find((p) => p.id === ex.id)) { toast.error("Already added"); return; }
    setPrescription((p) => [...p, { ...ex, sets: 3, reps: 10, frequency: "3x per week", notes: "" }]);
  };

  const removeExercise = (id: string) => {
    setPrescription((p) => p.filter((e) => e.id !== id));
  };

  const updateExercise = (id: string, field: keyof PrescribedExercise, value: string | number) => {
    setPrescription((p) => p.map((e) => e.id === id ? { ...e, [field]: value } : e));
  };

  const handleSave = async (pid: string) => {
    if (!user) return;
    setSaving(true);
    try {
      await addDoc(collection(firebaseDB, "assessments"), {
        patientId: pid,
        physioId: user.uid,
        toolType: "prescription",
        data: {
          diagnosis,
          exercises: prescription.map(({ id, name, category, sets, reps, frequency, notes }) => ({
            id, name, category, sets, reps, frequency, notes,
          })),
        },
        createdAt: serverTimestamp(),
      });
      setShowModal(false);
      toast.success("Prescription saved!");
      setTimeout(() => navigate("/physio/reports"), 1200);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "rounded-xl border border-white/5 bg-white/[0.03] px-3 py-1.5 text-sm text-white outline-none focus:border-primary/50 transition";

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-1.5 w-8 bg-rose-500 rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Smart Prescription</span>
          </div>
          <h1 className="text-2xl font-black text-white">Exercise Prescription</h1>
          {patient && <p className="text-slate-400 text-sm">Patient: <span className="text-white font-semibold">{patient.name}</span></p>}
        </div>
        <Badge variant="muted">{prescription.length} exercises</Badge>
      </div>

      {/* Diagnosis */}
      <input
        type="text"
        placeholder="Clinical diagnosis / reason for prescription…"
        value={diagnosis}
        onChange={(e) => setDiagnosis(e.target.value)}
        className="w-full rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-primary/50 placeholder:text-slate-600 transition"
      />

      <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
        {/* Exercise Library */}
        <div className="space-y-3">
          <p className="text-sm font-black uppercase tracking-widest text-slate-400">Exercise Library</p>

          {/* Filters */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                  catFilter === c ? "bg-primary text-white" : "bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search exercises…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-white/5 bg-white/[0.03] pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-primary/50 placeholder:text-slate-600 transition"
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {filteredLibrary.map((ex) => {
              const inPrescription = prescription.some((p) => p.id === ex.id);
              return (
                <div key={ex.id} className={`flex items-start gap-3 p-3 rounded-xl border transition ${inPrescription ? "border-primary/20 bg-primary/5" : "border-white/5 bg-white/[0.02] hover:border-white/15"}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold text-white truncate">{ex.name}</p>
                      <Badge variant={CATEGORY_COLORS[ex.category] as "primary" | "success" | "warning" | "muted"}>{ex.category}</Badge>
                    </div>
                    <p className="text-xs text-slate-400">{ex.muscle} — {ex.description}</p>
                  </div>
                  <button
                    onClick={() => inPrescription ? removeExercise(ex.id) : addExercise(ex)}
                    className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition ${
                      inPrescription ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-primary/20 text-primary hover:bg-primary/30"
                    }`}
                  >
                    {inPrescription ? <Trash2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Prescription Builder */}
        <div className="space-y-3">
          <p className="text-sm font-black uppercase tracking-widest text-slate-400">Prescription ({prescription.length})</p>

          {prescription.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-white/10 rounded-2xl">
              <Plus className="w-8 h-8 text-slate-600" />
              <p className="text-slate-400 text-sm">Add exercises from the library</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {prescription.map((ex) => (
                <div key={ex.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-white text-sm">{ex.name}</p>
                      <p className="text-xs text-slate-400">{ex.muscle}</p>
                    </div>
                    <button onClick={() => removeExercise(ex.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Sets</label>
                      <input type="number" min={1} max={10} value={ex.sets} onChange={(e) => updateExercise(ex.id, "sets", Number(e.target.value))} className={`${inputClass} w-full text-center`} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Reps</label>
                      <input type="number" min={1} max={100} value={ex.reps} onChange={(e) => updateExercise(ex.id, "reps", Number(e.target.value))} className={`${inputClass} w-full text-center`} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Frequency</label>
                      <select value={ex.frequency} onChange={(e) => updateExercise(ex.id, "frequency", e.target.value)} className={`${inputClass} w-full`}>
                        {FREQUENCIES.map((f) => <option key={f} value={f} className="bg-[#0d1526]">{f}</option>)}
                      </select>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Notes for this exercise…"
                    value={ex.notes}
                    onChange={(e) => updateExercise(ex.id, "notes", e.target.value)}
                    className={`${inputClass} w-full`}
                  />
                </div>
              ))}
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!prescription.length}
            onClick={() => {
              if (!prescription.length) { toast.error("Add at least one exercise"); return; }
              setShowModal(true);
            }}
          >
            Save Prescription
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
