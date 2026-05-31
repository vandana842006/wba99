import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { firebaseAuth, firebaseDB } from "../../../core/firebase";
import { useAuth } from "../../../context/AuthContext";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import toast from "react-hot-toast";

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

interface AddPatientModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (patientId: string) => void;
}

export function AddPatientModal({ open, onClose, onCreated }: AddPatientModalProps) {
  const { user } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({ resolver: zodResolver(schema) as any });

  const onSubmit = async (data: FormInput) => {
    if (!user) return;
    try {
      await firebaseAuth.currentUser?.getIdToken(true);
      const ref = await addDoc(collection(firebaseDB, "patients"), {
        physioId: user.uid,
        name: data.name,
        age: Number(data.age),
        gender: data.gender,
        condition: data.condition,
        phone: data.phone || "",
        createdAt: serverTimestamp(),
        ...(data.dateOfBirth && { dateOfBirth: data.dateOfBirth }),
        ...(data.height && { height: Number(data.height) }),
        ...(data.weight && { weight: Number(data.weight) }),
        ...(data.occupation && { occupation: data.occupation }),
        ...(data.activityLevel && { activityLevel: data.activityLevel }),
        ...(data.sport && { sport: data.sport }),
        ...(data.medicalHistory && { medicalHistory: data.medicalHistory }),
        ...(data.medications && { medications: data.medications }),
      });
      toast.success("Patient added successfully");
      reset();
      onCreated?.(ref.id);
      onClose();
    } catch (err) {
      console.error("[AddPatientModal] addDoc failed:", err);
      toast.error("Failed to add patient");
    }
  };

  const inputClass =
    "w-full rounded-2xl border border-border bg-input px-4 py-3 text-sm text-text outline-none transition focus:border-primary/50 focus:bg-surface placeholder:text-text-muted/60 shadow-sm";

  return (
    <Modal open={open} onClose={onClose} title="Add New Patient" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

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
              <textarea
                rows={2}
                placeholder="Prior surgeries, fractures, neurological conditions…"
                className={`${inputClass} resize-none`}
                {...register("medicalHistory")}
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Medications (optional)</label>
              <textarea
                rows={2}
                placeholder="NSAIDs, anticoagulants, corticosteroids…"
                className={`${inputClass} resize-none`}
                {...register("medications")}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" size="md" className="flex-1" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="md" className="flex-1" loading={isSubmitting}>
            Add Patient
          </Button>
        </div>
      </form>
    </Modal>
  );
}
