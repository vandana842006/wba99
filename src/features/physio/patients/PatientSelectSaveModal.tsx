import { useState, useEffect, useRef } from "react";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { firebaseDB } from "../../../core/firebase";
import { useAuth } from "../../../context/AuthContext";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Search, UserPlus, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Patient } from "../../../types";
import toast from "react-hot-toast";

interface PatientSelectSaveModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (patientId: string) => void;
  saving: boolean;
  preselectedPatientId?: string;
}

const ACTIVITY_LEVELS = ["Sedentary", "Light", "Moderate", "Active", "Athlete"] as const;

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  age: z.string().min(1, "Age is required").transform(Number),
  gender: z.enum(["Male", "Female", "Other"]),
  condition: z.string().min(2, "Condition is required"),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  occupation: z.string().optional(),
  activityLevel: z.string().optional(),
  sport: z.string().optional(),
  medicalHistory: z.string().optional(),
  medications: z.string().optional(),
});
type FormInput = {
  name: string;
  age: string;
  gender: "Male" | "Female" | "Other";
  condition: string;
  phone?: string;
  dateOfBirth?: string;
  height?: string;
  weight?: string;
  occupation?: string;
  activityLevel?: string;
  sport?: string;
  medicalHistory?: string;
  medications?: string;
};

export function PatientSelectSaveModal({ open, onClose, onSave, saving, preselectedPatientId }: PatientSelectSaveModalProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"select" | "create">("select");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [creating, setCreating] = useState(false);
  // Guards against React StrictMode double-firing the auto-save effect
  const autoSaveFiredRef = useRef(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(schema) as any,
  });

  useEffect(() => {
    if (!open) {
      autoSaveFiredRef.current = false; // Reset so next open can auto-save again
      return;
    }

    // Patient was already selected when opening the tool — save immediately, no modal needed.
    // The ref guard prevents a double-save from React StrictMode's double effect invocation.
    if (preselectedPatientId) {
      if (!autoSaveFiredRef.current) {
        autoSaveFiredRef.current = true;
        onSave(preselectedPatientId);
      }
      return;
    }

    if (!user) return;
    setLoadingPatients(true);
    setSearch("");
    setTab("select");
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
      .finally(() => setLoadingPatients(false));
  }, [open, user, preselectedPatientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.condition.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateAndSave = async (data: any) => {
    if (!user) return;
    setCreating(true);
    try {
      // The data is already validated and transformed by zodResolver(schema)
      const d = data as z.infer<typeof schema>;
      const formData = data as FormInput;
      const ref = await addDoc(collection(firebaseDB, "patients"), {
        physioId: user.uid,
        name: d.name,
        age: d.age,
        gender: d.gender,
        condition: d.condition,
        phone: d.phone ?? "",
        createdAt: serverTimestamp(),
        ...(formData.dateOfBirth && { dateOfBirth: formData.dateOfBirth }),
        ...(formData.height && { height: Number(formData.height) }),
        ...(formData.weight && { weight: Number(formData.weight) }),
        ...(formData.occupation && { occupation: formData.occupation }),
        ...(formData.activityLevel && { activityLevel: formData.activityLevel }),
        ...(formData.sport && { sport: formData.sport }),
        ...(formData.medicalHistory && { medicalHistory: formData.medicalHistory }),
        ...(formData.medications && { medications: formData.medications }),
      });
      toast.success("Patient created!");
      reset();
      onSave(ref.id);
    } catch (e) {
      console.error("Error creating patient:", e);
      toast.error("Failed to create patient");
    } finally {
      setCreating(false);
    }
  };

  const inputClass =
    "w-full rounded-2xl border border-border bg-input px-4 py-3 text-sm text-text outline-none transition focus:border-primary/50 focus:bg-surface placeholder:text-text-muted/60 shadow-sm";

  // When a preselected patient is present, the effect auto-saves without showing the modal.
  // We only surface a minimal retry UI if saving failed (open=true but autoSave already fired).
  if (preselectedPatientId) {
    if (!open) return null;
    // saving=false + autoSaveFired=true means the save attempt completed (success closes modal,
    // failure leaves open=true) — show a slim retry so the user isn't stuck silently.
    if (!saving && autoSaveFiredRef.current) {
      return (
        <Modal open={open} onClose={onClose} title="Save Failed" size="sm">
          <div className="space-y-4 text-center py-2">
            <p className="text-sm text-text-muted">Could not save the assessment. Please try again.</p>
            <div className="flex gap-3 justify-center">
              <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
              <Button variant="primary" size="md" onClick={() => { autoSaveFiredRef.current = false; onSave(preselectedPatientId); }}>
                Retry
              </Button>
            </div>
          </div>
        </Modal>
      );
    }
    return null;
  }

  return (
    <Modal open={open} onClose={onClose} title="Save Assessment" size="lg">
      <div className="space-y-4">
        <p className="text-text-muted text-sm">
          Select a patient to link this assessment to, or create a new one.
        </p>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab("select")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
              tab === "select"
                ? "bg-primary text-white shadow-md active:scale-95 border-primary"
                : "text-text-muted bg-input border border-border hover:bg-surface hover:text-text"
            }`}
          >
            <Users className="w-4 h-4" />
            Select Patient
          </button>
          <button
            onClick={() => setTab("create")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
              tab === "create"
                ? "bg-primary text-white shadow-md active:scale-95 border-primary"
                : "text-text-muted bg-input border border-border hover:bg-surface hover:text-text"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            New Patient
          </button>
        </div>

        {/* Select existing */}
        {tab === "select" && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search by name or condition…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-border bg-input pl-12 pr-4 py-3 text-sm text-text outline-none focus:border-primary/50 focus:bg-surface placeholder:text-text-muted/60 transition shadow-inner"
              />
            </div>

            {loadingPatients ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-xs text-text-muted font-bold">Loading your patients…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2 text-text-muted">
                <Users className="w-8 h-8 opacity-20" />
                <p className="text-sm font-bold">{search ? "No patients match" : "No patients yet — create one above"}</p>
              </div>
            ) : (
              <div className="max-h-48 sm:max-h-64 overflow-y-auto space-y-2 pr-1">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPatient(p)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all min-h-[52px] active:scale-[0.98] shadow-sm ${
                      selectedPatient?.id === p.id
                        ? "border-primary/40 bg-primary/10 ring-1 ring-primary/20"
                        : "border-border bg-input hover:border-primary/20 hover:bg-surface"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-black text-primary">
                        {p.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-text text-sm">{p.name}</p>
                      <p className="text-xs text-text-muted truncate">{p.condition}</p>
                    </div>
                    <Badge variant="muted">{p.age}y</Badge>
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-2 border-t border-border">
              <Button variant="ghost" size="md" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                className="flex-1"
                disabled={!selectedPatient}
                loading={saving}
                onClick={() => selectedPatient && onSave(selectedPatient.id)}
              >
                {selectedPatient ? `Save for ${selectedPatient.name}` : "Select a patient"}
              </Button>
            </div>
          </div>
        )}

        {/* Create new */}
        {tab === "create" && (
          <form onSubmit={handleSubmit(handleCreateAndSave)} className="space-y-4">

            {/* Basic Information */}
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-text-muted/60">Basic Information</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Full Name</label>
                <input type="text" placeholder="John Doe" className={`${inputClass} ${errors.name ? "border-red-500/50" : ""}`} {...register("name")} />
                {errors.name && <p className="text-xs text-red-600 dark:text-red-400 font-bold">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Date of Birth</label>
                <input type="date" className={inputClass} {...register("dateOfBirth")} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Age</label>
                <input type="number" placeholder="35" className={`${inputClass} ${errors.age ? "border-red-500/50" : ""}`} {...register("age")} />
                {errors.age && <p className="text-xs text-red-600 dark:text-red-400 font-bold">{errors.age.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Gender</label>
                <select className={`${inputClass} ${errors.gender ? "border-red-500/50" : ""}`} {...register("gender")}>
                  <option value="" className="bg-surface text-text">Select…</option>
                  {["Male", "Female", "Other"].map((g) => (
                    <option key={g} value={g} className="bg-surface text-text">{g}</option>
                  ))}
                </select>
                {errors.gender && <p className="text-xs text-red-600 dark:text-red-400 font-bold">{errors.gender.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Phone (optional)</label>
                <input type="tel" placeholder="+1 555 000 0000" className={inputClass} {...register("phone")} />
              </div>
            </div>

            {/* Physical & Lifestyle */}
            <div className="border-t border-border/50 pt-4 space-y-4">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-text-muted/60">Physical &amp; Lifestyle</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Height (cm)</label>
                  <input type="number" placeholder="175" className={inputClass} {...register("height")} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Weight (kg)</label>
                  <input type="number" placeholder="70" className={inputClass} {...register("weight")} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Occupation</label>
                  <input type="text" placeholder="e.g. Software Engineer" className={inputClass} {...register("occupation")} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Activity Level</label>
                  <select className={inputClass} {...register("activityLevel")}>
                    <option value="" className="bg-surface text-text">Select…</option>
                    {ACTIVITY_LEVELS.map((l) => (
                      <option key={l} value={l} className="bg-surface text-text">{l}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Sport / Activity (optional)</label>
                  <input type="text" placeholder="e.g. Cricket, Football, Swimming" className={inputClass} {...register("sport")} />
                </div>
              </div>
            </div>

            {/* Clinical Details */}
            <div className="border-t border-border/50 pt-4 space-y-4">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-text-muted/60">Clinical Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Primary Condition</label>
                  <input type="text" placeholder="e.g. Lower back pain" className={`${inputClass} ${errors.condition ? "border-red-500/50" : ""}`} {...register("condition")} />
                  {errors.condition && <p className="text-xs text-red-600 dark:text-red-400 font-bold">{errors.condition.message}</p>}
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Medical History (optional)</label>
                  <textarea rows={2} placeholder="Prior surgeries, fractures, neurological conditions…" className={`${inputClass} resize-none`} {...register("medicalHistory")} />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Medications (optional)</label>
                  <textarea rows={2} placeholder="NSAIDs, anticoagulants, corticosteroids…" className={`${inputClass} resize-none`} {...register("medications")} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-border">
              <Button variant="ghost" size="md" className="flex-1" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" size="md" className="flex-1" loading={creating || saving} type="submit">
                Save Assessment
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}

