import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Info,
  ShieldAlert,
} from "lucide-react";
import toast from "react-hot-toast";
import { firebaseDB } from "../../core/firebase";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import type { Patient } from "../../types";
import { PatientSelectSaveModal } from "./patients/PatientSelectSaveModal";

type TestId =
  | "deep_squat"
  | "hurdle_step"
  | "inline_lunge"
  | "shoulder_mobility"
  | "active_straight_leg_raise"
  | "trunk_stability_pushup"
  | "rotary_stability";

type ScoreValue = 0 | 1 | 2 | 3;
type Side = "left" | "right";

interface FmsTestDefinition {
  id: TestId;
  name: string;
  description: string;
  instructions: string[];
  scoring: Record<ScoreValue, string>;
  clearingTest?: string;
  bilateral?: boolean; // false = single composite score (Deep Squat, Trunk Push-Up)
}

interface SideScores {
  left: ScoreValue;
  right: ScoreValue;
}

const FMS_TESTS: FmsTestDefinition[] = [
  {
    id: "deep_squat",
    name: "Deep Squat",
    description: "Assesses bilateral ankle, knee, hip, and thoracic mobility with trunk control.",
    bilateral: false,
    instructions: [
      "Stand with feet shoulder-width apart.",
      "Hold a dowel overhead with elbows extended.",
      "Descend into the deepest squat possible.",
      "Keep heels grounded and the dowel stacked over the feet.",
    ],
    scoring: {
      3: "Torso remains parallel to tibia, femur drops below horizontal, knees track over feet.",
      2: "Movement is completed only with heel elevation or a board assist.",
      1: "Depth, alignment, or trunk position breaks down during the squat.",
      0: "Pain is reported during the movement.",
    },
  },
  {
    id: "hurdle_step",
    name: "Hurdle Step",
    description: "Assesses unilateral stance stability and stepping mechanics through the hip, knee, and ankle.",
    instructions: [
      "Stand tall with feet together and dowel across the shoulders.",
      "Step over the hurdle with one leg and touch the heel lightly to the floor.",
      "Return to the start under control.",
      "Repeat on both sides without losing posture.",
    ],
    scoring: {
      3: "Hips, knees, and ankles stay aligned with minimal lumbar movement.",
      2: "Movement is completed with compensation or alignment loss.",
      1: "Balance is lost or the foot contacts the hurdle.",
      0: "Pain is reported during the movement.",
    },
  },
  {
    id: "inline_lunge",
    name: "In-Line Lunge",
    description: "Assesses trunk stability with hip, knee, ankle, and foot alignment in a narrow base.",
    instructions: [
      "Place the dowel behind the back touching head, thoracic spine, and sacrum.",
      "Position the feet in line using the patient's tibial length.",
      "Lower the rear knee to the board just behind the front heel.",
      "Return without losing the three points of dowel contact.",
    ],
    scoring: {
      3: "The lunge is completed with balance, alignment, and full dowel contact maintained.",
      2: "The movement is completed with compensation or control loss.",
      1: "The patient cannot complete the lunge pattern successfully.",
      0: "Pain is reported during the movement.",
    },
  },
  {
    id: "shoulder_mobility",
    name: "Shoulder Mobility",
    description: "Assesses reciprocal shoulder mobility, thoracic extension, and scapular control.",
    instructions: [
      "Make fists with thumbs tucked inside.",
      "Reach one hand overhead and the other behind the back simultaneously.",
      "Measure the distance between the fists.",
      "Repeat with the opposite hand positions.",
    ],
    scoring: {
      3: "Fists are within one hand length.",
      2: "Fists are within one and a half hand lengths.",
      1: "Fists are farther apart than one and a half hand lengths.",
      0: "Pain is reported during movement.",
    },
    clearingTest: "Shoulder Impingement Clearing Test",
  },
  {
    id: "active_straight_leg_raise",
    name: "Active Straight Leg Raise",
    description: "Assesses active hamstring flexibility, hip mobility, and pelvic control.",
    instructions: [
      "Lie supine with arms by the sides and both knees fully extended.",
      "Keep the non-test leg flat on the floor.",
      "Raise the test leg with the ankle dorsiflexed.",
      "Score the final position of the malleolus against the landmarks of the opposite leg.",
    ],
    scoring: {
      3: "Malleolus reaches between mid-thigh and ASIS.",
      2: "Malleolus reaches between mid-thigh and the patella.",
      1: "Malleolus stays below the patella.",
      0: "Pain is reported during movement.",
    },
  },
  {
    id: "trunk_stability_pushup",
    name: "Trunk Stability Push-Up",
    description: "Assesses reflexive trunk stability during a closed-chain upper-body pattern.",
    bilateral: false,
    instructions: [
      "Lie prone with hands positioned for the standard setup.",
      "Keep the body rigid from shoulders to ankles.",
      "Perform one push-up as a single unit.",
      "Use the modified hand position if the standard setup fails.",
    ],
    scoring: {
      3: "The standard push-up is completed with no trunk lag.",
      2: "The modified hand position is required to complete the push-up.",
      1: "The push-up cannot be completed correctly.",
      0: "Pain is reported during movement.",
    },
    clearingTest: "Spinal Extension Clearing Test",
  },
  {
    id: "rotary_stability",
    name: "Rotary Stability",
    description: "Assesses multiplanar trunk stability during combined upper- and lower-limb movement.",
    instructions: [
      "Start in quadruped with hands and knees on the board.",
      "Reach one arm and the same-side leg out together.",
      "Bring elbow and knee together over the board and return.",
      "If needed, retry using the diagonal pattern.",
    ],
    scoring: {
      3: "The unilateral pattern is completed with control and the spine parallel to the board.",
      2: "Only the diagonal pattern can be completed successfully.",
      1: "The patient cannot complete the diagonal pattern.",
      0: "Pain is reported during movement.",
    },
    clearingTest: "Spinal Flexion Clearing Test",
  },
];

const SCORE_STYLES: Record<ScoreValue, string> = {
  0: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25",
  1: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/25",
  2: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
  3: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
};

function getTotalStatus(total: number) {
  if (total > 14) {
    return {
      label: "Low Risk",
      text: "text-emerald-600 dark:text-emerald-400",
      bar: "bg-emerald-500",
      panel: "border-emerald-500/25 bg-emerald-500/10",
    };
  }
  if (total >= 10) {
    return {
      label: "Moderate Risk",
      text: "text-amber-600 dark:text-amber-400",
      bar: "bg-amber-500",
      panel: "border-amber-500/25 bg-amber-500/10",
    };
  }
  return {
    label: "High Risk",
    text: "text-red-600 dark:text-red-400",
    bar: "bg-red-500",
    panel: "border-red-500/25 bg-red-500/10",
  };
}

function createInitialScores(): Record<TestId, SideScores> {
  return Object.fromEntries(
    FMS_TESTS.map((test) => [test.id, { left: 0 as ScoreValue, right: 0 as ScoreValue }])
  ) as Record<TestId, SideScores>;
}

export function FMSAssessment() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const patientId = params.get("patientId") ?? "";

  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientError, setPatientError] = useState(false);
  const [activeTest, setActiveTest] = useState(0);
  const [scores, setScores] = useState<Record<TestId, SideScores>>(createInitialScores);
  const [clearingTests, setClearingTests] = useState<Partial<Record<TestId, boolean>>>({});
  const [testNotes, setTestNotes] = useState<Partial<Record<TestId, string>>>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    getDoc(doc(firebaseDB, "patients", patientId))
      .then((snapshot) => {
        if (snapshot.exists()) {
          setPatient({ id: snapshot.id, ...snapshot.data() } as Patient);
          setPatientError(false);
          return;
        }
        setPatientError(true);
      })
      .catch(() => setPatientError(true));
  }, [patientId]);

  const currentTest = FMS_TESTS[activeTest];

  const derived = useMemo(() => {
    const tests = FMS_TESTS.map((test) => {
      const sideScores = scores[test.id];
      const leftScore = sideScores?.left ?? 0;
      const rightScore = sideScores?.right ?? 0;
      const isBilateral = test.bilateral !== false;
      const clearingPositive = test.clearingTest ? clearingTests[test.id] === true : undefined;
      // FMS protocol: positive clearing test overrides movement score to 0
      const finalScore = (clearingPositive ? 0 : (isBilateral ? Math.min(leftScore, rightScore) : leftScore)) as ScoreValue;
      const asymmetry = isBilateral && leftScore !== rightScore;

      return {
        id: test.id,
        name: test.name,
        isBilateral,
        leftScore,
        rightScore,
        finalScore,
        asymmetry,
        clearingTestName: test.clearingTest,
        clearingPositive,
        notes: testNotes[test.id]?.trim() ?? "",
      };
    });

    const scoreMap = Object.fromEntries(tests.map((test) => [test.id, test.finalScore])) as Record<TestId, ScoreValue>;
    const total = tests.reduce((sum, test) => sum + test.finalScore, 0);
    const asymmetries = tests.filter((test) => test.asymmetry).map((test) => test.id);
    const positiveClearingTests = tests
      .filter((test) => test.clearingPositive)
      .map((test) => test.id);

    return { tests, scoreMap, total, asymmetries, positiveClearingTests };
  }, [scores, clearingTests, testNotes]);

  const totalStatus = getTotalStatus(derived.total);
  const completedCount = derived.tests.filter(({ leftScore, rightScore }) => leftScore !== 0 || rightScore !== 0).length;

  const setScore = (testId: TestId, side: Side, value: ScoreValue) => {
    const testDef = FMS_TESTS.find((t) => t.id === testId);
    const isBilateral = testDef?.bilateral !== false;
    setScores((current) => ({
      ...current,
      [testId]: isBilateral
        ? { ...current[testId], [side]: value }
        : { left: value, right: value },
    }));
    setSaved(false);
  };

  const handleSave = async (pid: string) => {
    if (!user) return;

    const payload = {
      version: 2,
      total: derived.total,
      riskLevel: totalStatus.label,
      scores: derived.scoreMap,
      bilateralScores: scores,
      asymmetries: derived.asymmetries,
      clearingTests,
      positiveClearingTests: derived.positiveClearingTests,
      tests: derived.tests,
      notes: notes.trim(),
      testNotes,
    };

    setSaving(true);
    try {
      await addDoc(collection(firebaseDB, "assessments"), {
        patientId: pid,
        physioId: user.uid,
        toolType: "fms",
        data: payload,
        createdAt: serverTimestamp(),
      });
      setSaved(true);
      setShowModal(false);
      toast.success("FMS assessment saved");
      setTimeout(() => navigate("/physio/reports"), 900);
    } catch {
      toast.error("Failed to save assessment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-1 w-7 rounded-full bg-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">
              FMS Assessment
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-text leading-tight">
            Functional Movement Screen
          </h1>
          {patient && (
            <p className="text-sm text-text-muted mt-0.5">
              Patient: <span className="text-text font-semibold">{patient.name}</span>
            </p>
          )}
          {patientError && (
            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-0.5 font-bold">
              <AlertCircle className="w-3 h-3" /> Patient not found
            </p>
          )}
        </div>
        <div className={`hidden sm:flex flex-col items-end rounded-2xl border px-4 py-3 ${totalStatus.panel}`}>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">Total</span>
          <div className="flex items-end gap-2">
            <span className={`text-4xl font-black tabular-nums ${totalStatus.text}`}>{derived.total}</span>
            <span className="text-sm font-bold text-text-muted pb-1">/ 21</span>
          </div>
          <span className={`text-xs font-bold ${totalStatus.text}`}>{totalStatus.label}</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className={`rounded-2xl border p-4 shadow-sm ${totalStatus.panel}`}>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted">Risk</p>
          <p className={`mt-2 text-lg font-black ${totalStatus.text}`}>{totalStatus.label}</p>
          <div className="mt-3 h-1.5 rounded-full bg-border overflow-hidden">
            <div className={`h-full ${totalStatus.bar}`} style={{ width: `${(derived.total / 21) * 100}%` }} />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-input p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted">Tests Started</p>
          <p className="mt-2 text-2xl font-black text-text">{completedCount}</p>
          <p className="text-xs text-text-muted">of {FMS_TESTS.length} movement patterns</p>
        </div>
        <div className="rounded-2xl border border-border bg-input p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted">Asymmetries</p>
          <p className="mt-2 text-2xl font-black text-text">{derived.asymmetries.length}</p>
          <p className="text-xs text-text-muted">left-right score mismatches</p>
        </div>
        <div className="rounded-2xl border border-border bg-input p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted">Clearing Positives</p>
          <p className="mt-2 text-2xl font-black text-text">{derived.positiveClearingTests.length}</p>
          <p className="text-xs text-text-muted">pain-provocation findings</p>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 lg:hidden">
        {derived.tests.map((test, index) => (
          <button
            key={test.id}
            onClick={() => setActiveTest(index)}
            className={`flex-shrink-0 min-w-[152px] rounded-2xl border px-3 py-3 text-left transition-all shadow-sm ${
              activeTest === index
                ? "border-primary/40 bg-primary/10"
                : "border-border bg-input hover:bg-surface"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-text">{FMS_TESTS[index].name}</span>
              <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-black ${SCORE_STYLES[test.finalScore]}`}>
                {test.finalScore}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-text-muted">
              {test.isBilateral ? `L ${test.leftScore} / R ${test.rightScore}` : `Score ${test.finalScore}`}
            </p>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-4">
        <div className="hidden lg:flex flex-col gap-2">
          {derived.tests.map((test, index) => (
            <button
              key={test.id}
              onClick={() => setActiveTest(index)}
              className={`rounded-2xl border p-4 text-left transition-all shadow-sm ${
                activeTest === index
                  ? "border-primary/40 bg-primary/10"
                  : "border-border bg-input hover:bg-surface"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-text">{index + 1}. {test.name}</p>
                  <p className="text-xs text-text-muted mt-1">
                    {test.isBilateral ? `L ${test.leftScore} / R ${test.rightScore}` : `Score ${test.finalScore}`}
                  </p>
                </div>
                <span className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-black ${SCORE_STYLES[test.finalScore]}`}>
                  {test.finalScore}
                </span>
              </div>
              {(test.asymmetry || test.clearingPositive) && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {test.asymmetry && (
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Asymmetry
                    </span>
                  )}
                  {test.clearingPositive && (
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                      Clearing Positive
                    </span>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="rounded-3xl border border-border bg-input p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-text">{currentTest.name}</h2>
              <p className="text-sm text-text-muted mt-1">{currentTest.description}</p>
            </div>
            <div className={`rounded-2xl border px-4 py-3 text-right shadow-sm ${derived.tests[activeTest].clearingPositive ? "border-red-500/25 bg-red-500/10" : "border-border bg-surface"}`}>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted">Final Score</p>
              <p className={`text-3xl font-black mt-1 ${SCORE_STYLES[derived.tests[activeTest].finalScore].split(" ")[1]}`}>
                {derived.tests[activeTest].finalScore}
              </p>
              {derived.tests[activeTest].clearingPositive && (
                <p className="text-[10px] font-bold text-red-500 dark:text-red-400 mt-1">Clearing positive — score forced to 0</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-primary" />
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted">Instructions</p>
            </div>
            <ul className="space-y-2">
              {currentTest.instructions.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm text-text-muted">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-black flex-shrink-0">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {currentTest.bilateral !== false ? (
            <div className="grid md:grid-cols-2 gap-3">
              {(["left", "right"] as const).map((side) => {
                const selected = scores[currentTest.id][side];
                return (
                  <div key={side} className="rounded-2xl border border-border bg-surface p-4 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted">
                        {side} Side
                      </p>
                      <span className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-black ${SCORE_STYLES[selected]}`}>
                        {selected}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[0, 1, 2, 3].map((score) => (
                        <button
                          key={score}
                          onClick={() => setScore(currentTest.id, side, score as ScoreValue)}
                          className={`h-11 rounded-xl border text-sm font-black transition-all ${
                            selected === score
                              ? SCORE_STYLES[score as ScoreValue]
                              : "border-border bg-input text-text-muted hover:bg-surface"
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted">Score</p>
                <span className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-black ${SCORE_STYLES[scores[currentTest.id].left]}`}>
                  {scores[currentTest.id].left}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((score) => {
                  const selected = scores[currentTest.id].left;
                  return (
                    <button
                      key={score}
                      onClick={() => setScore(currentTest.id, "left", score as ScoreValue)}
                      className={`h-11 rounded-xl border text-sm font-black transition-all ${
                        selected === score
                          ? SCORE_STYLES[score as ScoreValue]
                          : "border-border bg-input text-text-muted hover:bg-surface"
                      }`}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid gap-2">
            {[3, 2, 1, 0].map((score) => (
              <div
                key={score}
                className={`rounded-2xl border px-4 py-3 text-sm ${SCORE_STYLES[score as ScoreValue]}`}
              >
                <span className="font-black mr-2">{score}</span>
                <span>{currentTest.scoring[score as ScoreValue]}</span>
              </div>
            ))}
          </div>

          {derived.tests[activeTest].asymmetry && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 flex items-start gap-3">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-700 dark:text-amber-300">Asymmetry detected</p>
                <p className="text-xs text-amber-700/80 dark:text-amber-300/80">
                  Final FMS scoring uses the lower side. Document whether the asymmetry is mobility- or stability-driven.
                </p>
              </div>
            </div>
          )}

          {currentTest.clearingTest && (
            <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted">
                {currentTest.clearingTest}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setClearingTests((current) => ({ ...current, [currentTest.id]: false }));
                    setSaved(false);
                  }}
                  className={`rounded-xl border px-4 py-3 text-sm font-bold transition-all ${
                    clearingTests[currentTest.id] === false
                      ? "border-emerald-500/25 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "border-border bg-input text-text-muted hover:bg-surface"
                  }`}
                >
                  Negative
                </button>
                <button
                  onClick={() => {
                    setClearingTests((current) => ({ ...current, [currentTest.id]: true }));
                    setSaved(false);
                  }}
                  className={`rounded-xl border px-4 py-3 text-sm font-bold transition-all ${
                    clearingTests[currentTest.id] === true
                      ? "border-red-500/25 bg-red-500/15 text-red-600 dark:text-red-400"
                      : "border-border bg-input text-text-muted hover:bg-surface"
                  }`}
                >
                  Positive
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted">
              Test Notes
            </p>
            <textarea
              value={testNotes[currentTest.id] ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                setTestNotes((current) => ({ ...current, [currentTest.id]: value }));
                setSaved(false);
              }}
              rows={3}
              placeholder="Movement quality, pain behaviour, compensation pattern, corrective direction."
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text outline-none focus:border-primary/50 placeholder:text-text-muted/60 resize-none"
            />
          </div>

          <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted">
                Assessment Summary
              </p>
              <textarea
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value);
                  setSaved(false);
                }}
                rows={4}
                placeholder="Overall interpretation, main asymmetries, pain findings, and next-step recommendations."
                className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text outline-none focus:border-primary/50 placeholder:text-text-muted/60 resize-none"
              />
            </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="hidden sm:flex items-center gap-2 text-xs text-text-muted">
              <ClipboardCheck className="w-4 h-4" />
              <span>{activeTest + 1} of {FMS_TESTS.length} tests</span>
            </div>
            <div className="flex gap-3 ml-auto">
              {activeTest > 0 && (
                <Button variant="ghost" size="md" onClick={() => setActiveTest((current) => current - 1)}>
                  Previous
                </Button>
              )}
              {activeTest < FMS_TESTS.length - 1 ? (
                <Button variant="primary" size="md" onClick={() => setActiveTest((current) => current + 1)}>
                  Next Test
                </Button>
              ) : (
                <Button variant="primary" size="md" onClick={() => setShowModal(true)} disabled={saved}>
                  {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved</> : "Save Assessment"}
                </Button>
              )}
            </div>
          </div>
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
