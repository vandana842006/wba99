import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp, getDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { firebaseDB, firebaseStorage } from "../../../core/firebase";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/ui/Button";
import { ArrowLeft, Upload, CheckCircle } from "lucide-react";
import type { Patient } from "../../../types";
import toast from "react-hot-toast";
import { useDropzone } from "react-dropzone";
import { PatientSelectSaveModal } from "../patients/PatientSelectSaveModal";

const CHECKPOINTS = [
  { group: "Head & Neck", items: ["Head centred (not tilted)", "Ears aligned horizontally", "Chin level", "No excessive forward head"] },
  { group: "Shoulders", items: ["Shoulders level", "No protraction", "No elevation", "Shoulder blades symmetric"] },
  { group: "Spine & Pelvis", items: ["Lumbar curve normal", "No scoliosis (frontal)", "Pelvis level", "No anterior pelvic tilt", "No posterior pelvic tilt"] },
  { group: "Lower Limbs", items: ["Hip crease symmetric", "Knees aligned (no valgus/varus)", "Patella facing forward", "Feet pointing forward", "Weight evenly distributed", "Arches present"] },
];

const ALL_ITEMS = CHECKPOINTS.flatMap((g) => g.items);

interface PhotoUpload {
  view: "front" | "side";
  file: File;
  url?: string;
}

function DropZone({ onDrop, label, preview }: { onDrop: (file: File) => void; label: string; preview?: string }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [] },
    maxFiles: 1,
    onDrop: (files) => { if (files[0]) onDrop(files[0]); },
  });

  return (
    <div
      {...getRootProps()}
      className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${
        isDragActive ? "border-primary bg-primary/10" : "border-white/10 hover:border-white/25 bg-white/[0.02]"
      }`}
      style={{ minHeight: 160 }}
    >
      <input {...getInputProps()} />
      {preview ? (
        <img src={preview} alt={label} className="w-full h-full object-cover" style={{ minHeight: 160 }} />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 p-6 h-full" style={{ minHeight: 160 }}>
          <Upload className="w-6 h-6 text-slate-500" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">{label}</p>
          <p className="text-[10px] text-slate-600">JPG, PNG accepted</p>
        </div>
      )}
    </div>
  );
}

export function PostureAnalysis() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const patientId = params.get("patientId") ?? "";
  const [patient, setPatient] = useState<Patient | null>(null);
  const [frontPhoto, setFrontPhoto] = useState<PhotoUpload | null>(null);
  const [sidePhoto, setSidePhoto] = useState<PhotoUpload | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    getDoc(doc(firebaseDB, "patients", patientId)).then((d) => {
      if (d.exists()) setPatient({ id: d.id, ...d.data() } as Patient);
    });
  }, [patientId]);

  const toggleItem = (item: string) => {
    setChecked((prev) => {
      const s = new Set(prev);
      s.has(item) ? s.delete(item) : s.add(item);
      return s;
    });
  };

  const score = Math.round((checked.size / ALL_ITEMS.length) * 100);

  const getScoreColor = () => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 50) return "text-amber-400";
    return "text-red-400";
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
        const url = await getDownloadURL(snap.ref);
        photos.push({ view: photo.view, url });
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
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-1.5 w-8 bg-amber-500 rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Posture Analysis</span>
          </div>
          <h1 className="text-2xl font-black text-white">Posture Evaluation</h1>
          {patient && <p className="text-slate-400 text-sm">Patient: <span className="text-white font-semibold">{patient.name}</span></p>}
        </div>
        {/* Score */}
        <div className="text-right">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Score</p>
          <p className={`text-4xl font-black ${getScoreColor()}`}>{score}<span className="text-lg text-slate-500 font-bold">%</span></p>
        </div>
      </div>

      {/* Photos */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Photos (optional)</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-bold text-slate-400 mb-2">Front View</p>
            <DropZone
              label="Upload front photo"
              onDrop={(f) => setFrontPhoto({ view: "front", file: f })}
              preview={frontPhoto ? URL.createObjectURL(frontPhoto.file) : undefined}
            />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 mb-2">Side View</p>
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
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Posture Checkpoints</p>
          <p className="text-xs text-slate-400 font-bold">{checked.size} / {ALL_ITEMS.length} passed</p>
        </div>

        {CHECKPOINTS.map(({ group, items }) => (
          <div key={group} className="space-y-2">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">{group}</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {items.map((item) => {
                const isChecked = checked.has(item);
                return (
                  <button
                    key={item}
                    onClick={() => toggleItem(item)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-bold transition-all text-left ${
                      isChecked
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/15 hover:text-white"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                      isChecked ? "border-emerald-500 bg-emerald-500" : "border-slate-600"
                    }`}>
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
          className="w-full rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-primary/50 placeholder:text-slate-600 transition resize-none"
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
