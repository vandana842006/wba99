import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import toast from "react-hot-toast";
import { firebaseDB } from "../../../core/firebase";
import { useAuth } from "../../../context/AuthContext";
import type { Patient } from "../../../types";
import { AddPatientModal } from "./AddPatientModal";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { UserPlus, Search, Users, AlertCircle } from "lucide-react";

export function PatientsList() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

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
        console.error("[PatientsList] Failed to load patients:", err);
        setError("Failed to load patients. Check your connection and try again.");
        toast.error("Could not load patients");
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadPatients, [user]);

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.condition.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-1.5 w-8 bg-primary rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Patients</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-text tracking-tight">Patient Manager</h1>
        </div>
        <Button variant="primary" size="md" onClick={() => setShowAdd(true)} className="flex-shrink-0">
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Patient</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Search by name or condition…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border border-border bg-input pl-12 pr-4 py-3 text-sm text-text outline-none focus:border-primary/50 focus:bg-surface placeholder:text-text-muted transition shadow-sm"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-text-muted text-sm">Loading patients…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <p className="text-text-muted font-medium text-center">{error}</p>
          <Button variant="ghost" size="md" onClick={loadPatients}>Try Again</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-input flex items-center justify-center">
            <Users className="w-8 h-8 text-text-muted" />
          </div>
          <p className="text-text-muted font-medium text-center">
            {search ? "No patients match your search" : "No patients yet. Add your first patient."}
          </p>
          {!search && (
            <Button variant="primary" size="md" onClick={() => setShowAdd(true)}>
              <UserPlus className="w-4 h-4" />
              Add Patient
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((patient) => (
            <PatientCard key={patient.id} patient={patient} />
          ))}
        </div>
      )}

      <AddPatientModal
        open={showAdd}
        onClose={() => { setShowAdd(false); loadPatients(); }}
      />
    </div>
  );
}

function PatientCard({ patient }: { patient: Patient }) {
  const initials = patient.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const genderColor =
    patient.gender === "Male" ? "primary" : patient.gender === "Female" ? "success" : "muted";

  const bmi =
    patient.height && patient.weight
      ? (patient.weight / Math.pow(patient.height / 100, 2)).toFixed(1)
      : null;

  return (
    <div className="bg-input border border-border rounded-2xl p-5 hover:border-primary/30 hover:bg-surface hover:shadow-lg transition-all duration-300 cursor-pointer group shadow-sm">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/25 transition">
          <span className="text-sm font-black text-primary">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-text truncate">{patient.name}</p>
          <p className="text-sm text-text-muted truncate">{patient.condition}</p>
          {(patient.occupation || patient.sport) && (
            <p className="text-xs text-text-muted/60 truncate mt-0.5">
              {[patient.occupation, patient.sport].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4 flex-wrap">
        <Badge variant={genderColor as "primary" | "success" | "muted"}>{patient.gender}</Badge>
        <Badge variant="muted">{patient.age} yrs</Badge>
        {bmi && <Badge variant="muted">BMI {bmi}</Badge>}
        {patient.activityLevel && <Badge variant="muted">{patient.activityLevel}</Badge>}
      </div>
    </div>
  );
}
