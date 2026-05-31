import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp, getDoc, doc } from "firebase/firestore";
import { firebaseDB } from "../../../core/firebase";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/ui/Button";
import { ArrowLeft, Timer } from "lucide-react";
import type { Patient } from "../../../types";
import toast from "react-hot-toast";
import { PatientSelectSaveModal } from "../patients/PatientSelectSaveModal";

interface GaitParam {
  id: string;
  label: string;
  description: string;
  unit?: string;
  type: "number" | "rating";
  ratings?: string[];
  normal?: string;
}

const PARAMS: GaitParam[] = [
  {
    id: "cadence",
    label: "Cadence",
    description: "Steps per minute during comfortable walking",
    unit: "steps/min",
    type: "number",
    normal: "Normal: 100–120 steps/min",
  },
  {
    id: "stride_length",
    label: "Stride Length",
    description: "Distance of one full gait cycle (both steps)",
    unit: "cm",
    type: "number",
    normal: "Normal: 130–170 cm",
  },
  {
    id: "symmetry",
    label: "Step Symmetry",
    description: "Comparison of left and right step length/timing",
    type: "rating",
    ratings: ["Severely asymmetric", "Mildly asymmetric", "Near symmetric", "Fully symmetric"],
    normal: "Score 3 = normal",
  },
  {
    id: "foot_clearance",
    label: "Foot Clearance",
    description: "Ability to lift foot during swing phase",
    type: "rating",
    ratings: ["Toe drag present", "Minimal clearance", "Good clearance", "Full clearance"],
    normal: "Score 3 = normal",
  },
  {
    id: "trunk_stability",
    label: "Trunk Stability",
    description: "Lateral trunk movement and control during gait",
    type: "rating",
    ratings: ["Excessive sway", "Moderate sway", "Mild instability", "Fully stable"],
    normal: "Score 3 = normal",
  },
];

const RATING_COLORS = ["bg-red-500/15 text-red-400 border-red-500/25", "bg-amber-500/15 text-amber-400 border-amber-500/25", "bg-sky-500/15 text-sky-400 border-sky-500/25", "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"];

function getScoreFromCadence(cadence: number): number {
  if (cadence > 110) return 3;
  if (cadence >= 100) return 2;
  if (cadence >= 80) return 1;
  return 0;
}

function getScoreFromStride(stride: number): number {
  if (stride >= 150) return 3;
  if (stride >= 120) return 2;
  if (stride >= 90) return 1;
  return 0;
}

export function GaitAnalysis() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const patientId = params.get("patientId") ?? "";
  const [patient, setPatient] = useState<Patient | null>(null);
  const [values, setValues] = useState<Record<string, number | null>>({});
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [observations, setObservations] = useState("");
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Cadence timer
  const [timerActive, setTimerActive] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!patientId) return;
    getDoc(doc(firebaseDB, "patients", patientId)).then((d) => {
      if (d.exists()) setPatient({ id: d.id, ...d.data() } as Patient);
    });
  }, [patientId]);

  // Timer logic
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((s) => {
          if (s >= 60) {
            setTimerActive(false);
            // Calculate cadence from taps
            setValues((prev) => ({ ...prev, cadence: tapCount }));
            clearInterval(timerRef.current!);
            return 60;
          }
          return s + 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive, tapCount]);

  const startTimer = () => {
    setTapCount(0);
    setTimerSeconds(0);
    setTimerActive(true);
  };

  const stopTimer = () => {
    setTimerActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    const cadence = timerSeconds > 0 ? Math.round((tapCount / timerSeconds) * 60) : 0;
    setValues((prev) => ({ ...prev, cadence }));
  };

  const computedScore = () => {
    let total = 0;
    const cadence = values["cadence"];
    const stride = values["stride_length"];
    if (cadence !== null && cadence !== undefined) total += getScoreFromCadence(cadence);
    if (stride !== null && stride !== undefined) total += getScoreFromStride(stride);
    total += ratings["symmetry"] ?? 0;
    total += ratings["foot_clearance"] ?? 0;
    total += ratings["trunk_stability"] ?? 0;
    return total;
  };

  const total = computedScore();

  const getScoreColor = () => {
    if (total >= 12) return "text-emerald-400";
    if (total >= 8) return "text-amber-400";
    return "text-red-400";
  };

  const handleSave = async (pid: string) => {
    if (!user) return;
    setSaving(true);
    try {
      await addDoc(collection(firebaseDB, "assessments"), {
        patientId: pid,
        physioId: user.uid,
        toolType: "gait",
        data: { cadence: values["cadence"], stride_length: values["stride_length"], symmetry: ratings["symmetry"], foot_clearance: ratings["foot_clearance"], trunk_stability: ratings["trunk_stability"], total, observations },
        createdAt: serverTimestamp(),
      });
      setShowModal(false);
      toast.success("Gait Analysis saved!");
      setTimeout(() => navigate("/physio/reports"), 1200);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-primary/50 placeholder:text-slate-600 transition";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-1.5 w-8 bg-sky-500 rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Gait Analysis</span>
          </div>
          <h1 className="text-2xl font-black text-white">Walking Assessment</h1>
          {patient && <p className="text-slate-400 text-sm">Patient: <span className="text-white font-semibold">{patient.name}</span></p>}
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Score</p>
          <p className={`text-4xl font-black ${getScoreColor()}`}>{total}<span className="text-lg text-slate-500 font-bold"> / 15</span></p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Cadence — special with timer */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-black text-white">Cadence</p>
              <p className="text-xs text-slate-400 mt-0.5">Steps per minute during comfortable walking</p>
              <p className="text-[10px] text-slate-500 mt-1">Normal: 100–120 steps/min</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={200}
              placeholder="Enter cadence…"
              value={values["cadence"] ?? ""}
              onChange={(e) => setValues((p) => ({ ...p, cadence: e.target.value === "" ? null : Number(e.target.value) }))}
              className={inputClass}
            />
            <div className="flex-shrink-0 flex flex-col items-center gap-1">
              {!timerActive ? (
                <Button variant="ghost" size="sm" onClick={startTimer}>
                  <Timer className="w-4 h-4" />
                  Tap timer
                </Button>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => setTapCount((n) => n + 1)}
                    className="w-16 h-16 rounded-full bg-sky-500/20 border-2 border-sky-500/50 text-sky-400 font-black text-lg active:scale-95 transition"
                  >
                    {tapCount}
                  </button>
                  <p className="text-xs text-slate-400">{timerSeconds}s</p>
                  <button onClick={stopTimer} className="text-xs text-red-400 hover:underline">Stop</button>
                </div>
              )}
            </div>
          </div>
          {values["cadence"] !== undefined && values["cadence"] !== null && (() => {
            const score = getScoreFromCadence(values["cadence"] as number);
            const barColors = ["bg-red-500", "bg-amber-500", "bg-sky-500", "bg-emerald-500"];
            return (
              <div className="space-y-1.5">
                <div className="text-xs font-bold">
                  Score: <span className={RATING_COLORS[score].split(" ")[1]}>{score} / 3</span>
                </div>
                <div className="flex gap-1.5">
                  {[1, 2, 3].map((seg) => (
                    <div key={seg} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${seg <= score ? barColors[score] : "bg-white/10"}`} />
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Stride Length */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-3">
          <p className="font-black text-white">Stride Length</p>
          <p className="text-xs text-slate-400">Distance of one full gait cycle. Normal: 130–170 cm</p>
          <input
            type="number"
            min={0}
            max={300}
            placeholder="Enter stride length in cm…"
            value={values["stride_length"] ?? ""}
            onChange={(e) => setValues((p) => ({ ...p, stride_length: e.target.value === "" ? null : Number(e.target.value) }))}
            className={inputClass}
          />
          {values["stride_length"] !== undefined && values["stride_length"] !== null && (
            <div className="text-xs font-bold">
              Score: <span className={RATING_COLORS[getScoreFromStride(values["stride_length"] as number)].split(" ")[1]}>{getScoreFromStride(values["stride_length"] as number)} / 3</span>
            </div>
          )}
        </div>

        {/* Rating Params */}
        {PARAMS.filter((p) => p.type === "rating").map((param) => (
          <div key={param.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-3">
            <div>
              <p className="font-black text-white">{param.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{param.description}</p>
              <p className="text-[10px] text-slate-500 mt-1">{param.normal}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {param.ratings!.map((r, i) => (
                <button
                  key={r}
                  onClick={() => setRatings((prev) => ({ ...prev, [param.id]: i }))}
                  className={`p-3 rounded-xl border text-left text-sm font-bold transition-all ${
                    ratings[param.id] === i
                      ? `${RATING_COLORS[i]} border-opacity-100`
                      : "border-white/5 bg-white/[0.02] text-slate-400 hover:bg-white/[0.05]"
                  }`}
                >
                  <span className="text-xl font-black block">{i}</span>
                  {r}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Observations */}
        <textarea
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          rows={3}
          placeholder="Clinical observations during gait assessment…"
          className="w-full rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-primary/50 placeholder:text-slate-600 transition resize-none"
        />

        <div className="flex justify-end">
          <Button variant="primary" size="lg" onClick={() => setShowModal(true)}>
            Save Gait Analysis
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
