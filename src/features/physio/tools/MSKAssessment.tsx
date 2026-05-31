import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp, getDoc, doc } from "firebase/firestore";
import { firebaseDB } from "../../../core/firebase";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { ArrowLeft } from "lucide-react";
import type { Patient } from "../../../types";
import toast from "react-hot-toast";
import { PatientSelectSaveModal } from "../patients/PatientSelectSaveModal";

interface Region {
  id: string;
  name: string;
  areas: string[];
}

const BODY_REGIONS: Region[] = [
  { id: "head_neck", name: "Head & Neck", areas: ["Headache", "Cervical stiffness", "Referred pain to arm", "Dizziness", "TMJ pain"] },
  { id: "shoulder", name: "Shoulder", areas: ["Anterior pain", "Posterior pain", "Impingement", "AC joint", "Rotator cuff issue", "SLAP lesion suspicion"] },
  { id: "elbow_wrist", name: "Elbow & Wrist", areas: ["Lateral epicondyle", "Medial epicondyle", "Carpal tunnel", "Wrist stiffness", "Grip weakness"] },
  { id: "thoracic", name: "Thoracic Spine", areas: ["Mid-back pain", "Rib pain", "Breathing discomfort", "Kyphosis", "Scoliosis"] },
  { id: "lumbar", name: "Lumbar Spine", areas: ["Central LBP", "Unilateral LBP", "Disc pain", "Facet joint", "Radiculopathy", "SIJ dysfunction"] },
  { id: "hip_pelvis", name: "Hip & Pelvis", areas: ["Anterior hip pain", "Lateral hip pain", "Posterior hip pain", "Groin pain", "Pelvic tilt", "FAI suspicion"] },
  { id: "knee", name: "Knee", areas: ["Anterior knee pain", "Medial pain", "Lateral pain", "Posterior pain", "Patellar tracking", "Ligament laxity"] },
  { id: "ankle_foot", name: "Ankle & Foot", areas: ["Ankle instability", "Achilles pain", "Plantar fascia", "Metatarsal pain", "Hallux valgus"] },
];

const SEVERITY_OPTIONS = ["Mild (1–3)", "Moderate (4–6)", "Severe (7–10)"] as const;

interface SymptomEntry {
  severity: string;
  onset: string;
  aggravating: string;
  easing: string;
  notes: string;
}

export function MSKAssessment() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const patientId = params.get("patientId") ?? "";
  const [patient, setPatient] = useState<Patient | null>(null);
  const [activeRegion, setActiveRegion] = useState<string>(BODY_REGIONS[0].id);
  const [selectedAreas, setSelectedAreas] = useState<Record<string, string[]>>({});
  const [symptoms, setSymptoms] = useState<Record<string, SymptomEntry>>({});
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    getDoc(doc(firebaseDB, "patients", patientId)).then((d) => {
      if (d.exists()) setPatient({ id: d.id, ...d.data() } as Patient);
    });
  }, [patientId]);

  const toggleArea = (regionId: string, area: string) => {
    setSelectedAreas((prev) => {
      const current = prev[regionId] ?? [];
      return {
        ...prev,
        [regionId]: current.includes(area)
          ? current.filter((a) => a !== area)
          : [...current, area],
      };
    });
  };

  const updateSymptom = (regionId: string, field: keyof SymptomEntry, value: string) => {
    setSymptoms((prev) => ({
      ...prev,
      [regionId]: { ...prev[regionId], [field]: value } as SymptomEntry,
    }));
  };

  const totalAffected = Object.values(selectedAreas).reduce((s, arr) => s + arr.length, 0);

  const handleSave = async (pid: string) => {
    if (!user) return;
    setSaving(true);
    try {
      await addDoc(collection(firebaseDB, "assessments"), {
        patientId: pid,
        physioId: user.uid,
        toolType: "msk",
        data: { selectedAreas, symptoms, totalAffected },
        createdAt: serverTimestamp(),
      });
      setShowModal(false);
      toast.success("MSK Assessment saved!");
      setTimeout(() => navigate("/physio/reports"), 1200);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const region = BODY_REGIONS.find((r) => r.id === activeRegion)!;
  const regionAreas = selectedAreas[activeRegion] ?? [];
  const regionSymptom = symptoms[activeRegion];

  const inputClass = "w-full rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-primary/50 placeholder:text-slate-600 transition";

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-1.5 w-8 bg-violet-500 rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">MSK Assessment</span>
          </div>
          <h1 className="text-2xl font-black text-white">Musculoskeletal Screening</h1>
          {patient && <p className="text-slate-400 text-sm">Patient: <span className="text-white font-semibold">{patient.name}</span></p>}
        </div>
        <Badge variant="muted">{totalAffected} findings</Badge>
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-4">
        {/* Region List */}
        <div className="space-y-1">
          {BODY_REGIONS.map((r) => {
            const count = (selectedAreas[r.id] ?? []).length;
            return (
              <button
                key={r.id}
                onClick={() => setActiveRegion(r.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  activeRegion === r.id
                    ? "bg-violet-500/15 text-violet-400 border border-violet-500/30"
                    : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
                }`}
              >
                <span>{r.name}</span>
                {count > 0 && (
                  <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 text-[10px] font-black flex items-center justify-center">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Region Detail */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-black text-white">{region.name}</h2>

          {/* Area checkboxes */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Findings / Symptoms</p>
            <div className="flex flex-wrap gap-2">
              {region.areas.map((area) => (
                <button
                  key={area}
                  onClick={() => toggleArea(region.id, area)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    regionAreas.includes(area)
                      ? "bg-violet-500/20 text-violet-400 border-violet-500/30"
                      : "border-white/10 text-slate-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          {/* Symptom detail */}
          {regionAreas.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-white/5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Symptom Details</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Severity</label>
                  <select
                    value={regionSymptom?.severity ?? ""}
                    onChange={(e) => updateSymptom(region.id, "severity", e.target.value)}
                    className={inputClass}
                  >
                    <option value="" className="bg-[#0d1526]">Select…</option>
                    {SEVERITY_OPTIONS.map((o) => <option key={o} value={o} className="bg-[#0d1526]">{o}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Onset</label>
                  <input
                    type="text"
                    placeholder="e.g. 3 months ago"
                    value={regionSymptom?.onset ?? ""}
                    onChange={(e) => updateSymptom(region.id, "onset", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Aggravating Factors</label>
                  <input
                    type="text"
                    placeholder="e.g. sitting, lifting"
                    value={regionSymptom?.aggravating ?? ""}
                    onChange={(e) => updateSymptom(region.id, "aggravating", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Easing Factors</label>
                  <input
                    type="text"
                    placeholder="e.g. rest, heat"
                    value={regionSymptom?.easing ?? ""}
                    onChange={(e) => updateSymptom(region.id, "easing", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Notes</label>
                <textarea
                  rows={2}
                  value={regionSymptom?.notes ?? ""}
                  onChange={(e) => updateSymptom(region.id, "notes", e.target.value)}
                  className="w-full rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-primary/50 placeholder:text-slate-600 transition resize-none"
                  placeholder="Additional observations…"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="primary" size="lg" onClick={() => setShowModal(true)}>
          Save MSK Assessment
        </Button>
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
