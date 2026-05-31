import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp, getDoc, doc as fsDoc } from "firebase/firestore";
import { firebaseDB } from "../../core/firebase";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import {
  ArrowLeft, RotateCcw, CheckCircle2, ChevronRight,
  Layers, Target, Info,
} from "lucide-react";
import type { Patient } from "../../types";
import toast from "react-hot-toast";
import { PatientSelectSaveModal } from "./patients/PatientSelectSaveModal";

// ── Types ──────────────────────────────────────────────────────────────────────

type Phase = "overview" | "running" | "results";
type GradeKey = "normal" | "borderline" | "abnormal";

interface ResultValue {
  label: string;
  value: number;
  unit: string;
  grade: GradeKey;
}

interface TestResult {
  testId: string;
  testName: string;
  values: ResultValue[];
  completedAt: Date;
}

interface SpinalTestDef {
  id: string;
  name: string;
  category: "Lumbar" | "Thoracic" | "Cervical" | "Neural";
  catColor: string;
  description: string;
  placementNote: string;
  calibrateNote: string;
  measureNotes: Record<string, string>;
  measurementLabels: string[];
  method: "sensor" | "manual";
  unit: string;
  normalRange: string;
  gradeNotes: string;
  sensorAxis?: "beta" | "gamma";
  getGrade: (v: number) => GradeKey;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const GRADE_TEXT: Record<GradeKey, string> = {
  normal:     "text-emerald-600 dark:text-emerald-400",
  borderline: "text-amber-600 dark:text-amber-400",
  abnormal:   "text-red-600 dark:text-red-400",
};

const GRADE_CHIP: Record<GradeKey, string> = {
  normal:     "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  borderline: "bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400",
  abnormal:   "bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400",
};

const GRADE_LABEL: Record<GradeKey, string> = {
  normal: "Normal",
  borderline: "Borderline",
  abnormal: "Abnormal",
};

const CAT_CHIP: Record<string, string> = {
  teal:   "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20",
  blue:   "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20",
  rose:   "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
  amber:  "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
};

const CAT_ICON: Record<string, string> = {
  teal:   "text-teal-600 dark:text-teal-400",
  blue:   "text-blue-600 dark:text-blue-400",
  violet: "text-violet-600 dark:text-violet-400",
  rose:   "text-rose-600 dark:text-rose-400",
  amber:  "text-amber-600 dark:text-amber-400",
};

const CAT_BG: Record<string, string> = {
  teal:   "bg-teal-500/10",
  blue:   "bg-blue-500/10",
  violet: "bg-violet-500/10",
  rose:   "bg-rose-500/10",
  amber:  "bg-amber-500/10",
};

// ── Test definitions ───────────────────────────────────────────────────────────

const TESTS: SpinalTestDef[] = [
  {
    id: "schober",
    name: "Schober Test",
    category: "Lumbar",
    catColor: "teal",
    description: "Lumbar flexion mobility via phone sensor at L5-S1. Gold-standard screen for lumbar mobility restriction.",
    placementNote: "Hold phone FLAT against lower back, centred over L5-S1 (align with posterior iliac crests level). Patient stands upright, feet shoulder-width apart.",
    calibrateNote: "Patient stands tall in neutral upright position. Tap ZERO to set the baseline before flexion.",
    measureNotes: {
      "Forward Flexion": "Patient bends forward — chin towards chest — as far as comfortable keeping knees STRAIGHT. Tap CAPTURE at maximum forward flexion.",
    },
    measurementLabels: ["Forward Flexion"],
    method: "sensor",
    unit: "°",
    normalRange: "≥60°",
    gradeNotes: "Normal ≥60° · Borderline 40–59° · Abnormal <40°",
    sensorAxis: "beta",
    getGrade: (v) => v >= 60 ? "normal" : v >= 40 ? "borderline" : "abnormal",
  },
  {
    id: "lateral_flex",
    name: "Lateral Flexion",
    category: "Lumbar",
    catColor: "teal",
    description: "Bilateral lumbar lateral bending — measures left and right side-bending mobility and asymmetry.",
    placementNote: "Hold phone flat against mid-lumbar spine (L2-L3 level). Patient stands with feet shoulder-width apart, arms at sides.",
    calibrateNote: "Patient stands upright with arms hanging relaxed at sides. Tap ZERO to calibrate the neutral standing position.",
    measureNotes: {
      "Left Bend":  "Patient slides LEFT hand slowly down the lateral thigh as far as comfortable. Tap CAPTURE at maximum left lateral flexion.",
      "Right Bend": "Patient straightens up, then slides RIGHT hand down the lateral thigh as far as comfortable. Tap CAPTURE at maximum right lateral flexion.",
    },
    measurementLabels: ["Left Bend", "Right Bend"],
    method: "sensor",
    unit: "°",
    normalRange: "≥20° each",
    gradeNotes: "Normal ≥20° · Borderline 10–19° · Abnormal <10°",
    sensorAxis: "gamma",
    getGrade: (v) => Math.abs(v) >= 20 ? "normal" : Math.abs(v) >= 10 ? "borderline" : "abnormal",
  },
  {
    id: "thoracic_kyphosis",
    name: "Thoracic Kyphosis",
    category: "Thoracic",
    catColor: "blue",
    description: "Standing thoracic curvature angle — screens for hyperkyphosis (>40°) or flat-back (<20°).",
    placementNote: "Hold phone flat against mid-thoracic spine (T6-T8 level). Patient stands in their NATURAL relaxed posture.",
    calibrateNote: "Patient stands in their natural resting posture — do NOT ask them to correct. Tap ZERO to capture the natural baseline.",
    measureNotes: {
      "Kyphosis Angle": "Patient now stands as TALL as possible — maximum voluntary correction. Tap CAPTURE. The recorded angle reflects the degree of postural kyphosis present.",
    },
    measurementLabels: ["Kyphosis Angle"],
    method: "sensor",
    unit: "°",
    normalRange: "20–40°",
    gradeNotes: "Normal 20–40° · Borderline 15–19° or 41–55° · Abnormal <15° or >55°",
    sensorAxis: "beta",
    getGrade: (v) => {
      const a = Math.abs(v);
      if (a >= 20 && a <= 40) return "normal";
      if ((a >= 15 && a < 20) || (a > 40 && a <= 55)) return "borderline";
      return "abnormal";
    },
  },
  {
    id: "cervical_rom",
    name: "Cervical ROM",
    category: "Cervical",
    catColor: "violet",
    description: "Cervical flexion & extension ROM — screens for cervical movement restriction and upper quadrant dysfunction.",
    placementNote: "Rest the phone GENTLY on top of the patient's head (flat face). Patient faces straight ahead in neutral head-neck position.",
    calibrateNote: "Patient looks straight ahead — neutral cervical position. Tap ZERO to set the cervical neutral baseline.",
    measureNotes: {
      "Flexion":   "Patient slowly brings chin towards chest — maximum cervical flexion. Tap CAPTURE at end-range.",
      "Extension": "Patient returns to neutral, then slowly tilts head backward — maximum cervical extension. Tap CAPTURE at end-range.",
    },
    measurementLabels: ["Flexion", "Extension"],
    method: "sensor",
    unit: "°",
    normalRange: "≥45° each",
    gradeNotes: "Normal ≥45° · Borderline 25–44° · Abnormal <25°",
    sensorAxis: "beta",
    getGrade: (v) => Math.abs(v) >= 45 ? "normal" : Math.abs(v) >= 25 ? "borderline" : "abnormal",
  },
  {
    id: "finger_floor",
    name: "Finger-to-Floor",
    category: "Lumbar",
    catColor: "amber",
    description: "Distance from middle fingertip to floor during maximal forward bend — combined lumbar + hip mobility screen.",
    placementNote: "Patient stands with feet together, bends forward with knees FULLY STRAIGHT. Measure shortest distance from floor to the longest fingertip with a tape measure.",
    calibrateNote: "",
    measureNotes: {
      "Distance": "Enter the measured distance from the longest fingertip to the floor in centimetres. Enter 0 if the patient can touch or reach the floor.",
    },
    measurementLabels: ["Distance"],
    method: "manual",
    unit: "cm",
    normalRange: "≤10 cm",
    gradeNotes: "Normal ≤10 cm (reaches floor) · Borderline 11–25 cm · Abnormal >25 cm",
    getGrade: (v) => v <= 10 ? "normal" : v <= 25 ? "borderline" : "abnormal",
  },
  {
    id: "slr",
    name: "SLR Test",
    category: "Neural",
    catColor: "rose",
    description: "Straight Leg Raise — screens for lumbosacral nerve root tension (L4–S1). Records angle at onset of radicular symptoms.",
    placementNote: "Patient SUPINE on plinth. Raise leg with knee FULLY EXTENDED. Record the angle at which radicular symptoms (pain, tingling or numbness below the knee) are first reproduced.",
    calibrateNote: "",
    measureNotes: {
      "Left Leg":  "Slowly raise the LEFT leg. Enter the angle (°) at which radicular symptoms below the knee first appear. If no symptoms at full range, enter 90.",
      "Right Leg": "Slowly raise the RIGHT leg. Enter the angle (°) at which radicular symptoms below the knee first appear. If no symptoms at full range, enter 90.",
    },
    measurementLabels: ["Left Leg", "Right Leg"],
    method: "manual",
    unit: "°",
    normalRange: "≥70° pain-free",
    gradeNotes: "Normal ≥70° pain-free · Borderline 45–69° · Abnormal <45°",
    getGrade: (v) => v >= 70 ? "normal" : v >= 45 ? "borderline" : "abnormal",
  },
];

// ── Step helpers ───────────────────────────────────────────────────────────────

type StepType = "instruction" | "calibrate" | "measure" | "input";

interface RunStep {
  type: StepType;
  label?: string;
}

function buildSteps(test: SpinalTestDef): RunStep[] {
  const steps: RunStep[] = [{ type: "instruction" }];
  if (test.method === "sensor") {
    steps.push({ type: "calibrate" });
    test.measurementLabels.forEach((label) => steps.push({ type: "measure", label }));
  } else {
    test.measurementLabels.forEach((label) => steps.push({ type: "input", label }));
  }
  return steps;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function LiveAngleDisplay({ angle, isCalibrated }: { angle: number; isCalibrated: boolean }) {
  const abs = Math.abs(angle);
  const color = abs < 20 ? "#22c55e" : abs < 50 ? "#06b6d4" : "#f59e0b";
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="relative flex items-baseline gap-1">
        <div className="absolute inset-0 blur-3xl opacity-20 rounded-full" style={{ backgroundColor: color }} />
        <span
          className="relative text-8xl font-black tabular-nums tracking-tighter transition-all duration-150"
          style={{ color }}
        >
          {angle}
        </span>
        <span className="relative text-3xl font-black opacity-50 self-start mt-3" style={{ color }}>°</span>
      </div>
      <div className={`flex items-center gap-1.5 text-xs font-bold ${isCalibrated ? "text-emerald-600 dark:text-emerald-400" : "text-text-muted"}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${isCalibrated ? "bg-emerald-500 animate-pulse" : "bg-text-muted/30"}`} />
        {isCalibrated ? "Calibrated · Live reading" : "Not calibrated — tap Zero first"}
      </div>
    </div>
  );
}

function StepDots({ steps, current }: { steps: RunStep[]; current: number }) {
  return (
    <div className="flex items-center gap-1.5 justify-center">
      {steps.map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i < current  ? "w-5 h-2 bg-emerald-500" :
            i === current ? "w-5 h-2 bg-teal-500 shadow-sm" :
            "w-2 h-2 bg-border"
          }`}
        />
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function SpinalAnalysis() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("patientId");

  const [patient, setPatient] = useState<Patient | null>(null);
  const [phase, setPhase] = useState<Phase>("overview");
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [testResults, setTestResults] = useState<Map<string, TestResult>>(new Map());

  // Running test state
  const [activeTestIdx, setActiveTestIdx] = useState(0);
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [capturedValues, setCapturedValues] = useState<number[]>([]);
  const [manualInput, setManualInput] = useState("");

  // Sensor state
  const [currentAngle, setCurrentAngle] = useState(0);
  const [calibrationOffset, setCalibrationOffset] = useState(0);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const calibrationOffsetRef = useRef(0);
  const sensorAxisRef = useRef<"beta" | "gamma">("beta");

  // Save modal
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [clinicalNotes, setClinicalNotes] = useState("");

  // Load patient
  useEffect(() => {
    if (!patientId) return;
    getDoc(fsDoc(firebaseDB, "patients", patientId)).then((snap) => {
      if (snap.exists()) setPatient({ id: snap.id, ...snap.data() } as Patient);
    });
  }, [patientId]);

  // Sensor setup — mount once, use refs for live values
  useEffect(() => {
    let demoAngle = 0;
    let demoDir = 1;
    let demoInterval: ReturnType<typeof setInterval> | null = null;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const raw = sensorAxisRef.current === "gamma" ? (e.gamma ?? 0) : (e.beta ?? 0);
      setCurrentAngle(Math.round(raw - calibrationOffsetRef.current));
    };

    const startDemo = () => {
      setIsDemoMode(true);
      demoInterval = setInterval(() => {
        demoAngle += demoDir * 1.5;
        if (demoAngle > 65) demoDir = -1;
        if (demoAngle < -65) demoDir = 1;
        setCurrentAngle(Math.round(demoAngle - calibrationOffsetRef.current));
      }, 100);
    };

    if (typeof DeviceOrientationEvent !== "undefined") {
      const DevOrEvent = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<"granted" | "denied"> };
      if (typeof DevOrEvent.requestPermission === "function") {
        DevOrEvent.requestPermission()
          .then((r) => {
            if (r === "granted") window.addEventListener("deviceorientation", handleOrientation);
            else startDemo();
          })
          .catch(() => startDemo());
      } else {
        window.addEventListener("deviceorientation", handleOrientation);
      }
    } else {
      startDemo();
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
      if (demoInterval) clearInterval(demoInterval);
    };
  }, []);

  // Sync sensor axis ref when active test changes
  useEffect(() => {
    sensorAxisRef.current = TESTS[activeTestIdx]?.sensorAxis ?? "beta";
  }, [activeTestIdx]);

  // ── Test navigation ────────────────────────────────────────────────────────

  const startTest = useCallback((testIdx: number) => {
    setActiveTestIdx(testIdx);
    setActiveStepIdx(0);
    setCapturedValues([]);
    setManualInput("");
    setCalibrationOffset(0);
    calibrationOffsetRef.current = 0;
    setIsCalibrated(false);
    setPhase("running");
  }, []);

  const calibrate = useCallback(() => {
    const raw = sensorAxisRef.current === "gamma"
      ? (currentAngle + calibrationOffset)
      : (currentAngle + calibrationOffset);
    calibrationOffsetRef.current = raw;
    setCalibrationOffset(raw);
    setCurrentAngle(0);
    setIsCalibrated(true);
    toast.success("Calibrated — neutral set to 0°");
  }, [currentAngle, calibrationOffset]);

  const captureAngle = useCallback((testDef: SpinalTestDef, steps: RunStep[], stepIdx: number) => {
    const absVal = Math.abs(currentAngle);
    const newCaptured = [...capturedValues, absVal];
    const measureSteps = steps.filter((s) => s.type === "measure");
    const currentMeasureIdx = stepIdx - 2;

    toast.success(`Captured: ${absVal}${testDef.unit}`);
    setCapturedValues(newCaptured);

    if (currentMeasureIdx >= measureSteps.length - 1) {
      // All measurements done
      finishTest(testDef, newCaptured);
    } else {
      setActiveStepIdx(stepIdx + 1);
    }
  }, [currentAngle, capturedValues]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmManual = useCallback((testDef: SpinalTestDef, steps: RunStep[], stepIdx: number) => {
    const val = parseFloat(manualInput);
    if (isNaN(val) || val < 0) {
      toast.error("Enter a valid positive number");
      return;
    }
    const newCaptured = [...capturedValues, val];
    const inputSteps = steps.filter((s) => s.type === "input");
    const currentInputIdx = stepIdx - 1;

    toast.success(`Recorded: ${val}${testDef.unit}`);
    setCapturedValues(newCaptured);
    setManualInput("");

    if (currentInputIdx >= inputSteps.length - 1) {
      finishTest(testDef, newCaptured);
    } else {
      setActiveStepIdx(stepIdx + 1);
    }
  }, [manualInput, capturedValues]); // eslint-disable-line react-hooks/exhaustive-deps

  const finishTest = useCallback((testDef: SpinalTestDef, values: number[]) => {
    const resultValues: ResultValue[] = values.map((v, i) => ({
      label: testDef.measurementLabels[i],
      value: v,
      unit: testDef.unit,
      grade: testDef.getGrade(v),
    }));
    const result: TestResult = {
      testId: testDef.id,
      testName: testDef.name,
      values: resultValues,
      completedAt: new Date(),
    };
    setTestResults((prev) => new Map(prev).set(testDef.id, result));
    toast.success(`${testDef.name} complete!`);
    setPhase("overview");
  }, []);

  // ── Save assessment ────────────────────────────────────────────────────────

  const handleSave = async (pid: string) => {
    if (!user) return;
    setSaving(true);
    try {
      const resultsArr = Array.from(testResults.values()).map((r) => ({
        testId: r.testId,
        testName: r.testName,
        values: r.values,
        completedAt: r.completedAt.toISOString(),
      }));
      const normalCount = resultsArr.flatMap((r) => r.values).filter((v) => v.grade === "normal").length;
      const borderlineCount = resultsArr.flatMap((r) => r.values).filter((v) => v.grade === "borderline").length;
      const abnormalCount = resultsArr.flatMap((r) => r.values).filter((v) => v.grade === "abnormal").length;

      await addDoc(collection(firebaseDB, "assessments"), {
        patientId: pid,
        physioId: user.uid,
        toolType: "spinal",
        data: {
          tests: resultsArr,
          summary: { normalCount, borderlineCount, abnormalCount },
          notes: clinicalNotes,
          isDemoMode,
        },
        createdAt: serverTimestamp(),
      });
      setShowModal(false);
      toast.success("Spinal assessment saved!");
      navigate("/physio/reports");
    } catch {
      toast.error("Failed to save assessment");
    } finally {
      setSaving(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const completedCount = testResults.size;
  const totalValues = Array.from(testResults.values()).flatMap((r) => r.values);
  const normalCount = totalValues.filter((v) => v.grade === "normal").length;
  const borderlineCount = totalValues.filter((v) => v.grade === "borderline").length;
  const abnormalCount = totalValues.filter((v) => v.grade === "abnormal").length;

  const activeTest = TESTS[activeTestIdx];
  const steps = activeTest ? buildSteps(activeTest) : [];
  const activeStep = steps[activeStepIdx];

  // ── Render ─────────────────────────────────────────────────────────────────

  if (phase === "running" && activeTest && activeStep) {
    return <RunningView
      test={activeTest}
      steps={steps}
      stepIdx={activeStepIdx}
      currentAngle={currentAngle}
      isCalibrated={isCalibrated}
      isDemoMode={isDemoMode}
      manualInput={manualInput}
      capturedValues={capturedValues}
      onBack={() => setPhase("overview")}
      onNext={() => setActiveStepIdx((i) => i + 1)}
      onCalibrate={calibrate}
      onCapture={() => captureAngle(activeTest, steps, activeStepIdx)}
      onManualChange={setManualInput}
      onManualConfirm={() => confirmManual(activeTest, steps, activeStepIdx)}
    />;
  }

  if (phase === "results") {
    return <ResultsView
      results={testResults}
      patient={patient}
      normalCount={normalCount}
      borderlineCount={borderlineCount}
      abnormalCount={abnormalCount}
      clinicalNotes={clinicalNotes}
      onNotesChange={setClinicalNotes}
      onBack={() => setPhase("overview")}
      onSave={() => setShowModal(true)}
      saving={saving}
      showModal={showModal}
      onCloseModal={() => setShowModal(false)}
      onConfirmSave={handleSave}
      preselectedPatientId={patientId ?? undefined}
    />;
  }

  // ── Overview ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-input border border-border flex items-center justify-center hover:bg-surface transition shadow-sm active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-text-muted" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="h-1 w-5 bg-teal-500 rounded-full shadow-sm" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">Assessment Tool</span>
            </div>
            <h1 className="text-2xl font-black text-text tracking-tight">Spinal Analysis</h1>
          </div>
        </div>
        {isDemoMode && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-full">
            Demo Mode
          </span>
        )}
      </div>

      {/* Patient badge */}
      {patient && (
        <div className="flex items-center gap-3 p-3 bg-input border border-border rounded-2xl shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-teal-500/15 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-black text-teal-600 dark:text-teal-400">
              {patient.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
            </span>
          </div>
          <div>
            <p className="font-bold text-text text-sm">{patient.name}</p>
            <p className="text-xs text-text-muted">{(patient as any).condition}</p>
          </div>
        </div>
      )}

      {/* Demo mode notice */}
      {isDemoMode && (
        <div className="flex items-start gap-3 p-3 bg-amber-400/5 border border-amber-400/20 rounded-2xl text-xs text-amber-300">
          <span className="flex-shrink-0 mt-0.5">⚠</span>
          <span>Accelerometer not detected — sensor tests will run in demo mode with simulated angles. For real clinical measurements, use a physical mobile device.</span>
        </div>
      )}

      {/* Tests header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-1.5 w-8 bg-teal-500 rounded-full" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
            {completedCount}/{TESTS.length} Tests
          </span>
        </div>
        <p className="text-text-muted text-sm">Run each spinal test individually. Completed tests are shown with results.</p>
      </div>

      {/* Test cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {TESTS.map((test, idx) => {
          const result = testResults.get(test.id);
          const isDone = !!result;
          return (
            <button
              key={test.id}
              onClick={() => startTest(idx)}
              className={`group text-left p-4 rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.98] ${
                isDone
                  ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10"
                  : "border-border bg-input hover:border-teal-500/30 hover:bg-surface"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${CAT_BG[test.catColor]} group-hover:opacity-80 transition`}>
                  <Layers className={`w-4 h-4 ${CAT_ICON[test.catColor]}`} />
                </div>
                <div className="flex items-center gap-1.5">
                  {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CAT_CHIP[test.catColor]}`}>
                    {test.category}
                  </span>
                </div>
              </div>
              <p className="font-bold text-text text-sm mb-1">{test.name}</p>
              <p className="text-xs text-text-muted leading-relaxed mb-2">{test.description}</p>

              {isDone ? (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {result.values.map((v) => (
                    <span key={v.label} className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${GRADE_CHIP[v.grade]}`}>
                      {v.label}: {v.value}{v.unit} · {GRADE_LABEL[v.grade]}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[10px] font-bold text-text-muted">
                  <span className="uppercase tracking-widest">Normal range:</span>
                  <span className="text-teal-600 dark:text-teal-400">{test.normalRange}</span>
                  <span className="ml-auto text-text-muted opacity-60">{test.method === "sensor" ? "📱 Sensor" : "📏 Manual"}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Results button */}
      {completedCount > 0 && (
        <Button
          onClick={() => setPhase("results")}
          className="w-full"
        >
          View Report · {completedCount} test{completedCount !== 1 ? "s" : ""} complete
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      )}

      {/* How to use */}
      <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-teal-500" />
          <p className="font-bold text-text text-sm">How to Use</p>
        </div>
        <ol className="space-y-1.5 text-xs text-text-muted font-semibold">
          <li>1. Tap any test card to open the guided step-by-step runner</li>
          <li>2. Follow the device placement instructions carefully</li>
          <li>3. For sensor tests — calibrate in neutral, then capture at end-range</li>
          <li>4. For manual tests — measure with a tape/goniometer, then enter the value</li>
          <li>5. Complete all relevant tests, then tap <strong className="text-text">View Report</strong> to review and save</li>
        </ol>
      </div>
    </div>
  );
}

// ── Running test view ──────────────────────────────────────────────────────────

function RunningView({
  test, steps, stepIdx, currentAngle, isCalibrated, isDemoMode,
  manualInput, capturedValues,
  onBack, onNext, onCalibrate, onCapture, onManualChange, onManualConfirm,
}: {
  test: SpinalTestDef;
  steps: RunStep[];
  stepIdx: number;
  currentAngle: number;
  isCalibrated: boolean;
  isDemoMode: boolean;
  manualInput: string;
  capturedValues: number[];
  onBack: () => void;
  onNext: () => void;
  onCalibrate: () => void;
  onCapture: () => void;
  onManualChange: (v: string) => void;
  onManualConfirm: () => void;
}) {
  const step = steps[stepIdx];
  const currentLabel = step.label ?? "";

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* Runner header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-input border border-border flex items-center justify-center hover:bg-surface transition shadow-sm active:scale-95 flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-text-muted" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CAT_CHIP[test.catColor]}`}>
              {test.category}
            </span>
            {isDemoMode && (
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                Demo
              </span>
            )}
          </div>
          <h2 className="text-lg font-black text-text truncate">{test.name}</h2>
        </div>
      </div>

      {/* Step dots */}
      <StepDots steps={steps} current={stepIdx} />

      {/* Captured values so far */}
      {capturedValues.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {capturedValues.map((v, i) => (
            <span key={i} className={`text-xs font-bold px-2.5 py-1 rounded-full ${GRADE_CHIP[test.getGrade(v)]}`}>
              {test.measurementLabels[i]}: {v}{test.unit} · {GRADE_LABEL[test.getGrade(v)]}
            </span>
          ))}
        </div>
      )}

      {/* Step: Instruction */}
      {step.type === "instruction" && (
        <div className="space-y-4">
          <div className="bg-input border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${CAT_BG[test.catColor]}`}>
                <Target className={`w-4 h-4 ${CAT_ICON[test.catColor]}`} />
              </div>
              <div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${CAT_ICON[test.catColor]}`}>Step 1 of {steps.length}</p>
                <p className="text-sm font-bold text-text">Setup & Placement</p>
              </div>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">{test.placementNote}</p>
          </div>

          <div className="bg-teal-500/5 border border-teal-500/20 rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400 mb-2">Grade Reference</p>
            <p className="text-xs text-text-muted">{test.gradeNotes}</p>
          </div>

          <Button onClick={onNext} className="w-full">
            Ready — Continue
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Step: Calibrate */}
      {step.type === "calibrate" && (
        <div className="space-y-4">
          <div className="bg-input border border-border rounded-2xl p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">Step {stepIdx + 1} of {steps.length} · Calibrate</p>
            <p className="text-sm text-text-muted leading-relaxed">{test.calibrateNote}</p>
          </div>

          <div className="bg-gradient-to-b from-input to-surface border border-border rounded-[2rem] p-6 flex flex-col items-center relative overflow-hidden shadow-xl">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />
            <LiveAngleDisplay angle={currentAngle} isCalibrated={isCalibrated} />
            <button
              onClick={onCalibrate}
              className="flex items-center gap-2 bg-surface border border-border rounded-2xl px-6 py-3 hover:bg-input transition shadow-sm active:scale-95"
            >
              <RotateCcw className="w-4 h-4 text-text-muted" />
              <span className="text-sm font-bold text-text-muted">Zero</span>
            </button>
          </div>

          <Button onClick={onNext} disabled={!isCalibrated} className="w-full">
            {isCalibrated ? "Calibrated — Start Measuring" : "Calibrate First"}
            {isCalibrated && <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
        </div>
      )}

      {/* Step: Measure (sensor) */}
      {step.type === "measure" && (
        <div className="space-y-4">
          <div className="bg-input border border-border rounded-2xl p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">
              Step {stepIdx + 1} of {steps.length} · {currentLabel}
            </p>
            <p className="text-sm text-text-muted leading-relaxed">{test.measureNotes[currentLabel]}</p>
          </div>

          <div className="bg-gradient-to-b from-input to-surface border border-border rounded-[2rem] p-6 flex flex-col items-center gap-4 relative overflow-hidden shadow-xl">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />
            <LiveAngleDisplay angle={currentAngle} isCalibrated={isCalibrated} />

            {/* Progress bar */}
            <div className="w-full">
              <p className="text-[10px] text-text-muted text-center mb-1.5 uppercase tracking-widest font-bold">Range Progress</p>
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-100"
                  style={{ width: `${Math.min(100, (Math.abs(currentAngle) / 90) * 100)}%` }}
                />
              </div>
            </div>

            <button
              onClick={onCapture}
              className="w-full bg-teal-500 hover:bg-teal-600 text-white font-black text-sm py-3.5 rounded-2xl transition active:scale-95 shadow-lg shadow-teal-500/20"
            >
              Capture {currentLabel} · {Math.abs(currentAngle)}°
            </button>
          </div>
        </div>
      )}

      {/* Step: Manual input */}
      {step.type === "input" && (
        <div className="space-y-4">
          <div className="bg-input border border-border rounded-2xl p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">
              Step {stepIdx + 1} of {steps.length} · {currentLabel}
            </p>
            <p className="text-sm text-text-muted leading-relaxed">{test.measureNotes[currentLabel]}</p>
          </div>

          <div className="bg-input border border-border rounded-2xl p-5 shadow-sm">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted block mb-3">
              {currentLabel} ({test.unit})
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={manualInput}
                onChange={(e) => onManualChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onManualConfirm()}
                placeholder="0"
                min="0"
                max="999"
                step="0.5"
                className="flex-1 text-4xl font-black text-center bg-surface border border-border rounded-2xl py-4 text-text outline-none focus:border-teal-500/50 tabular-nums transition shadow-inner"
              />
              <span className="text-2xl font-black text-text-muted">{test.unit}</span>
            </div>
            {manualInput && !isNaN(parseFloat(manualInput)) && (
              <div className="mt-3 text-center">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${GRADE_CHIP[test.getGrade(parseFloat(manualInput))]}`}>
                  {GRADE_LABEL[test.getGrade(parseFloat(manualInput))]} — {test.gradeNotes.split("·").find((s) => s.toLowerCase().includes(GRADE_LABEL[test.getGrade(parseFloat(manualInput))].toLowerCase()))?.trim() ?? ""}
                </span>
              </div>
            )}
          </div>

          <Button
            onClick={onManualConfirm}
            disabled={!manualInput || isNaN(parseFloat(manualInput))}
            className="w-full"
          >
            Confirm {currentLabel}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Results view ───────────────────────────────────────────────────────────────

function ResultsView({
  results, patient,
  normalCount, borderlineCount, abnormalCount,
  clinicalNotes, onNotesChange,
  onBack, onSave, saving,
  showModal, onCloseModal, onConfirmSave,
  preselectedPatientId,
}: {
  results: Map<string, TestResult>;
  patient: Patient | null;
  normalCount: number;
  borderlineCount: number;
  abnormalCount: number;
  clinicalNotes: string;
  onNotesChange: (v: string) => void;
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
  showModal: boolean;
  onCloseModal: () => void;
  onConfirmSave: (pid: string) => void;
  preselectedPatientId?: string;
}) {
  const resultsList = Array.from(results.values());
  const totalMeasurements = resultsList.flatMap((r) => r.values).length;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-input border border-border flex items-center justify-center hover:bg-surface transition shadow-sm active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-text-muted" />
        </button>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="h-1 w-5 bg-teal-500 rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">Spinal Report</span>
          </div>
          <h1 className="text-2xl font-black text-text tracking-tight">Assessment Results</h1>
        </div>
      </div>

      {/* Patient */}
      {patient && (
        <div className="flex items-center gap-3 p-3 bg-input border border-border rounded-2xl shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-teal-500/15 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-black text-teal-600 dark:text-teal-400">
              {patient.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
            </span>
          </div>
          <div>
            <p className="font-bold text-text text-sm">{patient.name}</p>
            <p className="text-xs text-text-muted">{(patient as any).condition}</p>
          </div>
        </div>
      )}

      {/* Summary metric cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{normalCount}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mt-1">Normal</p>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-amber-600 dark:text-amber-400">{borderlineCount}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mt-1">Borderline</p>
        </div>
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-red-600 dark:text-red-400">{abnormalCount}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mt-1">Abnormal</p>
        </div>
      </div>

      {/* Per-test results */}
      <div className="space-y-3">
        {resultsList.map((result) => {
          const testDef = TESTS.find((t) => t.id === result.testId);
          if (!testDef) return null;
          const worstGrade: GradeKey = result.values.some((v) => v.grade === "abnormal") ? "abnormal"
            : result.values.some((v) => v.grade === "borderline") ? "borderline"
            : "normal";

          return (
            <div
              key={result.testId}
              className={`bg-input border rounded-2xl p-4 shadow-sm ${
                worstGrade === "abnormal" ? "border-red-500/20" :
                worstGrade === "borderline" ? "border-amber-500/20" :
                "border-emerald-500/20"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${CAT_BG[testDef.catColor]}`}>
                    <Layers className={`w-3.5 h-3.5 ${CAT_ICON[testDef.catColor]}`} />
                  </div>
                  <div>
                    <p className="font-bold text-text text-sm">{result.testName}</p>
                    <p className="text-[10px] text-text-muted">{testDef.category}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${GRADE_CHIP[worstGrade]}`}>
                  {GRADE_LABEL[worstGrade]}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {result.values.map((v) => (
                  <div key={v.label} className="bg-surface rounded-xl px-3 py-2.5 shadow-inner">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold mb-0.5">{v.label}</p>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-xl font-black tabular-nums ${GRADE_TEXT[v.grade]}`}>{v.value}</span>
                      <span className="text-xs text-text-muted font-bold">{v.unit}</span>
                    </div>
                    <span className={`text-[10px] font-bold ${GRADE_TEXT[v.grade]}`}>{GRADE_LABEL[v.grade]}</span>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-text-muted mt-2 pt-2 border-t border-border">{testDef.gradeNotes}</p>
            </div>
          );
        })}
      </div>

      {/* Clinical notes */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2">Clinical Notes</p>
        <textarea
          value={clinicalNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Additional findings, relevant history, clinical impressions…"
          rows={4}
          className="w-full rounded-2xl border border-border bg-input px-4 py-3 text-sm text-text outline-none focus:border-teal-500/50 focus:bg-surface placeholder:text-text-muted/60 transition shadow-sm resize-none"
        />
      </div>

      {/* Save button */}
      <Button
        onClick={onSave}
        disabled={resultsList.length === 0}
        loading={saving}
        className="w-full"
      >
        Save Assessment · {totalMeasurements} measurement{totalMeasurements !== 1 ? "s" : ""}
      </Button>

      <PatientSelectSaveModal
        open={showModal}
        onClose={onCloseModal}
        onSave={onConfirmSave}
        saving={saving}
        preselectedPatientId={preselectedPatientId}
      />
    </div>
  );
}
