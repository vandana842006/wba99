import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp, getDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { firebaseDB, firebaseStorage } from "../../core/firebase";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { ArrowLeft, Upload, CheckCircle } from "lucide-react";
import type { Patient } from "../../types";
import toast from "react-hot-toast";
import { useDropzone } from "react-dropzone";
import { PatientSelectSaveModal } from "./patients/PatientSelectSaveModal";
import { LandmarkAnalysis } from "./LandmarkAnalysis";

// ── Analysis method definitions ───────────────────────────
const METHODS = [
  {
    key: "front",
    icon: "🧍",
    name: "Anterior View",
    desc: "Front · Head, shoulders, pelvis, knees",
    tag: "Most used",
    tagColor: "emerald" as const,
  },
  {
    key: "back",
    icon: "🔙",
    name: "Posterior View",
    desc: "Back · Scoliosis · Shoulder blade",
  },
  {
    key: "lateral",
    icon: "🚶",
    name: "Lateral View",
    desc: "Side · FHP · Kyphosis · Lordosis",
  },
  {
    key: "head",
    icon: "🔄",
    name: "Head-Neck",
    desc: "CVA · FHP · Craniovertebral angle",
  },
  {
    key: "trunk",
    icon: "⚖️",
    name: "Trunk Symmetry",
    desc: "Scoliosis · Rib cage · Obliquity",
  },
  {
    key: "quick",
    icon: "⚡",
    name: "Quick Analysis",
    desc: "Full body · Instant report",
    tag: "Fast",
    tagColor: "amber" as const,
  },
  {
    key: "manual",
    icon: "📋",
    name: "Manual Posture Analysis",
    desc: "Checklist-based · 20-point posture evaluation · Front & side photo · Print report",
    tag: "Manual",
    tagColor: "sky" as const,
    wide: true,
  },
] as const;

type MethodKey = typeof METHODS[number]["key"];

const TAG_CLASSES: Record<string, string> = {
  emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  amber:   "bg-amber-500/10  text-amber-500  border-amber-500/20",
  sky:     "bg-sky-500/10    text-sky-500    border-sky-500/20",
};

// ── Manual checklist data ─────────────────────────────────
const CHECKPOINTS = [
  { group: "Head & Neck",    items: ["Head centred (not tilted)", "Ears aligned horizontally", "Chin level", "No excessive forward head"] },
  { group: "Shoulders",      items: ["Shoulders level", "No protraction", "No elevation", "Shoulder blades symmetric"] },
  { group: "Spine & Pelvis", items: ["Lumbar curve normal", "No scoliosis (frontal)", "Pelvis level", "No anterior pelvic tilt", "No posterior pelvic tilt"] },
  { group: "Lower Limbs",    items: ["Hip crease symmetric", "Knees aligned (no valgus/varus)", "Patella facing forward", "Feet pointing forward", "Weight evenly distributed", "Arches present"] },
];
const ALL_ITEMS = CHECKPOINTS.flatMap((g) => g.items);

interface PhotoUpload { view: "front" | "side"; file: File; }

// ── Drop zone ─────────────────────────────────────────────
function DropZone({ onDrop, label, preview }: { onDrop: (f: File) => void; label: string; preview?: string }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [] },
    maxFiles: 1,
    onDrop: (files) => { if (files[0]) onDrop(files[0]); },
  });
  return (
    <div
      {...getRootProps()}
      className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${
        isDragActive
          ? "border-primary bg-primary/10"
          : "border-border hover:border-primary/30 bg-input"
      }`}
      style={{ minHeight: 160 }}
    >
      <input {...getInputProps()} />
      {preview ? (
        <img src={preview} alt={label} className="w-full h-full object-cover" style={{ minHeight: 160 }} />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 p-6 h-full" style={{ minHeight: 160 }}>
          <Upload className="w-6 h-6 text-text-muted" />
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider text-center">{label}</p>
          <p className="text-[10px] text-text-muted/60">JPG, PNG accepted</p>
        </div>
      )}
    </div>
  );
}


// ── Method selector ───────────────────────────────────────
function MethodSelector({
  patient,
  onSelect,
  onBack,
}: {
  patient: Patient | null;
  onSelect: (key: MethodKey) => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-1.5 w-8 bg-amber-500 rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">Posture Analysis</span>
          </div>
          <h1 className="text-2xl font-black text-text">Select Analysis Method</h1>
          {patient && (
            <p className="text-text-muted text-sm mt-0.5">
              Patient: <span className="text-text font-semibold">{patient.name}</span>
            </p>
          )}
        </div>
      </div>

      {/* Method grid */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-4">
          7 Analysis Methods Available
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {METHODS.map((m) => (
            <button
              key={m.key}
              onClick={() => onSelect(m.key)}
              className={`group relative flex flex-col items-center text-center p-5 rounded-2xl border border-border bg-input hover:border-primary/30 hover:bg-surface active:scale-[0.97] transition-all duration-200 shadow-sm hover:shadow-lg text-left ${
                "wide" in m && m.wide ? "sm:col-span-2 lg:col-span-3" : ""
              }`}
            >
              {"tag" in m && m.tag && (
                <span
                  className={`absolute top-3 right-3 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    TAG_CLASSES[m.tagColor]
                  }`}
                >
                  {m.tag}
                </span>
              )}
              <span className="text-3xl mb-3 block">{m.icon}</span>
              <p className="text-sm font-black text-text mb-1">{m.name}</p>
              <p className="text-[11px] text-text-muted leading-relaxed">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Manual checklist ──────────────────────────────────────
function ManualChecklist({
  patient,
  patientId,
  onBack,
}: {
  patient: Patient | null;
  patientId: string;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [frontPhoto, setFrontPhoto] = useState<PhotoUpload | null>(null);
  const [sidePhoto,  setSidePhoto]  = useState<PhotoUpload | null>(null);
  const [checked,   setChecked]    = useState<Set<string>>(new Set());
  const [notes,     setNotes]      = useState("");
  const [saving,    setSaving]     = useState(false);
  const [showModal, setShowModal]  = useState(false);

  const toggleItem = (item: string) => {
    setChecked((prev) => {
      const s = new Set(prev);
      s.has(item) ? s.delete(item) : s.add(item);
      return s;
    });
  };

  const score = Math.round((checked.size / ALL_ITEMS.length) * 100);

  const getScoreColor = () => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 50) return "text-amber-500";
    return "text-error";
  };

  const handleSave = async (pid: string) => {
    if (!user) return;
    setSaving(true);
    try {
      const photos: { view: string; url: string }[] = [];
      for (const photo of [frontPhoto, sidePhoto]) {
        if (!photo) continue;
        const storageRef = ref(
          firebaseStorage,
          `posture/${user.uid}/${pid}/${Date.now()}_${photo.view}.jpg`
        );
        const snap = await uploadBytes(storageRef, photo.file);
        photos.push({ view: photo.view, url: await getDownloadURL(snap.ref) });
      }
      await addDoc(collection(firebaseDB, "assessments"), {
        patientId: pid,
        physioId: user.uid,
        toolType: "posture",
        data: { photos, checkpoints: Array.from(checked), score, notes },
        createdAt: serverTimestamp(),
      });
      setShowModal(false);
      toast.success("Posture Analysis saved!");
      setTimeout(() => navigate("/physio/reports"), 1200);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-1.5 w-8 bg-amber-500 rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">
              Manual Posture Analysis
            </span>
          </div>
          <h1 className="text-2xl font-black text-text">Posture Evaluation</h1>
          {patient && (
            <p className="text-text-muted text-sm mt-0.5">
              Patient: <span className="text-text font-semibold">{patient.name}</span>
            </p>
          )}
        </div>
        {/* Score */}
        <div className="text-right">
          <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Score</p>
          <p className={`text-4xl font-black ${getScoreColor()} tabular-nums`}>
            {score}<span className="text-lg text-text-muted font-bold">%</span>
          </p>
        </div>
      </div>

      {/* Photos */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-3">
          Photos (optional)
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-bold text-text-muted mb-2">Front View</p>
            <DropZone
              label="Upload front photo"
              onDrop={(f) => setFrontPhoto({ view: "front", file: f })}
              preview={frontPhoto ? URL.createObjectURL(frontPhoto.file) : undefined}
            />
          </div>
          <div>
            <p className="text-xs font-bold text-text-muted mb-2">Side View</p>
            <DropZone
              label="Upload side photo"
              onDrop={(f) => setSidePhoto({ view: "side", file: f })}
              preview={sidePhoto ? URL.createObjectURL(sidePhoto.file) : undefined}
            />
          </div>
        </div>
      </div>

      {/* Checkpoint Grid */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
            Posture Checkpoints
          </p>
          <p className="text-xs text-text-muted font-bold">
            {checked.size} / {ALL_ITEMS.length} passed
          </p>
        </div>

        {CHECKPOINTS.map(({ group, items }) => (
          <div key={group} className="space-y-2">
            <p className="text-xs font-black uppercase tracking-widest text-text-muted">{group}</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {items.map((item) => {
                const isChecked = checked.has(item);
                return (
                  <button
                    key={item}
                    onClick={() => toggleItem(item)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-bold transition-all text-left shadow-sm active:scale-95 ${
                      isChecked
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 ring-1 ring-emerald-500/20"
                        : "border-border bg-input text-text-muted hover:border-primary/20 hover:text-text"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isChecked
                          ? "border-emerald-500 bg-emerald-500 shadow-sm"
                          : "border-border"
                      }`}
                    >
                      {isChecked && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
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
            Save Posture Analysis
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

// ── Root component ────────────────────────────────────────
export function PostureAnalysis() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const patientId = params.get("patientId") ?? "";
  const [patient, setPatient]           = useState<Patient | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<MethodKey | null>(null);

  useEffect(() => {
    if (!patientId) return;
    getDoc(doc(firebaseDB, "patients", patientId)).then((d) => {
      if (d.exists()) setPatient({ id: d.id, ...d.data() } as Patient);
    });
  }, [patientId]);

  // Landmark analysis — native React component
  if (selectedMethod && selectedMethod !== "manual") {
    return (
      <LandmarkAnalysis
        mode={selectedMethod}
        patient={patient}
        onBack={() => setSelectedMethod(null)}
      />
    );
  }

  // Manual 20-point checklist
  if (selectedMethod === "manual") {
    return (
      <ManualChecklist
        patient={patient}
        patientId={patientId}
        onBack={() => setSelectedMethod(null)}
      />
    );
  }

  // Default: method selector
  return (
    <MethodSelector
      patient={patient}
      onSelect={setSelectedMethod}
      onBack={() => navigate(-1)}
    />
  );
}

