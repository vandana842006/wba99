import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp, getDoc, doc } from "firebase/firestore";
import { firebaseDB } from "../../../core/firebase";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/ui/Button";
import { ArrowLeft, RotateCcw, Save, Trash2 } from "lucide-react";
import type { Patient } from "../../../types";
import toast from "react-hot-toast";
import { PatientSelectSaveModal } from "../patients/PatientSelectSaveModal";

const JOINT_PRESETS = [
  { id: "cervical_flexion", name: "Cervical Flexion", normal: "0–45°", min: 0, max: 45 },
  { id: "cervical_extension", name: "Cervical Extension", normal: "0–45°", min: 0, max: 45 },
  { id: "cervical_lat_l", name: "Cervical Lat. Flex (L)", normal: "0–45°", min: 0, max: 45 },
  { id: "cervical_lat_r", name: "Cervical Lat. Flex (R)", normal: "0–45°", min: 0, max: 45 },
  { id: "cervical_rot_l", name: "Cervical Rotation (L)", normal: "0–60°", min: 0, max: 60 },
  { id: "cervical_rot_r", name: "Cervical Rotation (R)", normal: "0–60°", min: 0, max: 60 },
  { id: "thoracic", name: "Thoracic Spine", normal: "30–40°", min: 0, max: 40 },
  { id: "lumbar", name: "Lumbar Spine", normal: "50–60°", min: -30, max: 60 },
  { id: "shoulder", name: "Shoulder", normal: "150–180°", min: 0, max: 180 },
  { id: "hip", name: "Hip Joint", normal: "100–120°", min: -30, max: 120 },
  { id: "knee", name: "Knee Joint", normal: "130–140°", min: 0, max: 140 },
  { id: "ankle", name: "Ankle", normal: "45–50°", min: -20, max: 50 },
];

interface Measurement {
  id: string;
  jointName: string;
  angle: number;
  timestamp: Date;
}

function AngleGauge({ angle }: { angle: number }) {
  const clampedAngle = Math.max(-90, Math.min(90, angle));
  const needleRotation = clampedAngle;

  const getColor = () => {
    const abs = Math.abs(angle);
    if (abs < 15) return "#22c55e";
    if (abs < 45) return "#f59e0b";
    return "#ef4444";
  };

  const color = getColor();
  const cx = 120;
  const cy = 120;
  const r = 100;

  // Tick marks
  const ticks = [-90, -60, -30, 0, 30, 60, 90];

  const needleRad = ((needleRotation - 90) * Math.PI) / 180;
  const needleX = cx + (r - 10) * Math.cos(needleRad);
  const needleY = cy + (r - 10) * Math.sin(needleRad);

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width="240" height="140" viewBox="0 0 240 140">
        {/* Background arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="20"
          strokeLinecap="round"
        />
        {/* Colored arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeOpacity="0.3"
          strokeLinecap="round"
        />
        {/* Tick marks */}
        {ticks.map((t) => {
          const rad = ((t - 90) * Math.PI) / 180;
          const x1 = cx + (r - 5) * Math.cos(rad);
          const y1 = cy + (r - 5) * Math.sin(rad);
          const x2 = cx + (r + 5) * Math.cos(rad);
          const y2 = cy + (r + 5) * Math.sin(rad);
          const lx = cx + (r + 18) * Math.cos(rad);
          const ly = cy + (r + 18) * Math.sin(rad);
          return (
            <g key={t}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.4)" fontSize="9">
                {t}°
              </text>
            </g>
          );
        })}
        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          style={{ transition: "x2 0.1s, y2 0.1s" }}
        />
        {/* Center dot */}
        <circle cx={cx} cy={cy} r="7" fill={color} />
      </svg>

      {/* Digital readout */}
      <div className="text-center">
        <p className="text-6xl font-black tabular-nums" style={{ color }}>{angle}°</p>
        <p className="text-slate-400 text-sm mt-1">
          {Math.abs(angle) < 15 ? "Neutral" : angle > 0 ? "Extension / Flexion" : "Flexion / Extension"}
        </p>
      </div>
    </div>
  );
}

export function DigitalInclinometer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("patientId");

  const [patient, setPatient] = useState<Patient | null>(null);
  const [selectedJoint, setSelectedJoint] = useState(JOINT_PRESETS[0]);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [calibrationOffset, setCalibrationOffset] = useState(0);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const calibrationOffsetRef = useRef(calibrationOffset);
  calibrationOffsetRef.current = calibrationOffset;

  // Load patient
  useEffect(() => {
    if (!patientId) return;
    getDoc(doc(firebaseDB, "patients", patientId)).then((snap) => {
      if (snap.exists()) setPatient({ id: snap.id, ...snap.data() } as Patient);
    });
  }, [patientId]);

  // Device orientation sensor
  useEffect(() => {
    let demoInterval: ReturnType<typeof setInterval> | null = null;
    let demoAngle = 0;
    let direction = 1;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const beta = event.beta ?? 0; // -180 to 180, tilt front-back
      const rawAngle = Math.round(beta - calibrationOffsetRef.current);
      setCurrentAngle(rawAngle);
    };

    const startDemo = () => {
      setIsDemoMode(true);
      demoInterval = setInterval(() => {
        demoAngle += direction * 2;
        if (demoAngle > 45) direction = -1;
        if (demoAngle < -45) direction = 1;
        setCurrentAngle(Math.round(demoAngle - calibrationOffsetRef.current));
      }, 100);
    };

    if (typeof DeviceOrientationEvent !== "undefined") {
      // On iOS 13+, need to request permission
      const DevOrEvent = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<"granted" | "denied">;
      };
      if (typeof DevOrEvent.requestPermission === "function") {
        DevOrEvent.requestPermission()
          .then((result) => {
            if (result === "granted") {
              window.addEventListener("deviceorientation", handleOrientation);
            } else {
              startDemo();
            }
          })
          .catch(() => startDemo());
      } else {
        window.addEventListener("deviceorientation", handleOrientation);
        // Check if we're actually getting data after 500ms
        setTimeout(() => {
          setIsDemoMode((prev) => {
            if (!prev && currentAngle === 0) {
              // Likely no sensor data; could be desktop
            }
            return prev;
          });
        }, 500);
      }
    } else {
      startDemo();
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
      if (demoInterval) clearInterval(demoInterval);
    };
  }, []);

  const calibrate = useCallback(() => {
    const newOffset = currentAngle + calibrationOffset;
    setCalibrationOffset(newOffset);
    calibrationOffsetRef.current = newOffset;
    setIsCalibrated(true);
    toast.success("Calibrated — position set as 0°");
  }, [currentAngle, calibrationOffset]);

  const saveMeasurement = useCallback(() => {
    const m: Measurement = {
      id: Date.now().toString(),
      jointName: selectedJoint.name,
      angle: currentAngle,
      timestamp: new Date(),
    };
    setMeasurements((prev) => [m, ...prev]);
    toast.success(`Recorded: ${selectedJoint.name} ${currentAngle}°`);
  }, [selectedJoint, currentAngle]);

  const clearMeasurements = useCallback(() => {
    setMeasurements([]);
    toast("Measurements cleared");
  }, []);

  const handleSave = async (pid: string) => {
    if (!user) return;
    setSaving(true);
    try {
      const avgAngle = measurements.reduce((sum, m) => sum + m.angle, 0) / measurements.length;
      await addDoc(collection(firebaseDB, "assessments"), {
        patientId: pid,
        physioId: user.uid,
        toolType: "inclinometer",
        data: {
          measurements,
          selectedJoint,
          averageAngle: Math.round(avgAngle),
        },
        createdAt: serverTimestamp(),
      });
      setShowModal(false);
      toast.success("Assessment saved!");
      navigate("/physio/reports");
    } catch {
      toast.error("Failed to save assessment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition"
          >
            <ArrowLeft className="w-4 h-4 text-slate-300" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="h-1 w-5 bg-cyan-400 rounded-full" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Assessment Tool</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Digital Inclinometer</h1>
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
        <div className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/10 rounded-2xl">
          <div className="w-9 h-9 rounded-xl bg-cyan-400/15 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-black text-cyan-400">
              {patient.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
            </span>
          </div>
          <div>
            <p className="font-bold text-white text-sm">{patient.name}</p>
            <p className="text-xs text-slate-500">{(patient as any).condition}</p>
          </div>
        </div>
      )}

      {isDemoMode && (
        <div className="flex items-center gap-3 p-3 bg-amber-400/5 border border-amber-400/20 rounded-2xl text-xs text-amber-300">
          <span>⚠</span>
          <span>Accelerometer not detected. Running in demo mode with simulated angles. Use on a physical mobile device for real measurements.</span>
        </div>
      )}

      {/* Joint Selector */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Select Joint</p>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {JOINT_PRESETS.map((joint) => (
            <button
              key={joint.id}
              onClick={() => setSelectedJoint(joint)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold border transition-all duration-150 ${
                selectedJoint.id === joint.id
                  ? "bg-cyan-400/15 border-cyan-400/40 text-cyan-300"
                  : "bg-white/[0.03] border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-300"
              }`}
            >
              {joint.name}
            </button>
          ))}
        </div>
      </div>

      {/* Gauge */}
      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 flex flex-col items-center gap-4">
        <AngleGauge angle={currentAngle} />

        {/* Calibration status */}
        <div className={`flex items-center gap-2 text-xs font-bold ${isCalibrated ? "text-emerald-400" : "text-slate-500"}`}>
          <span className={`w-2 h-2 rounded-full ${isCalibrated ? "bg-emerald-400" : "bg-slate-600"}`} />
          {isCalibrated ? "Calibrated" : "Not calibrated — tap Zero to set neutral"}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 w-full justify-center">
          <button
            onClick={calibrate}
            className="flex flex-col items-center gap-1.5 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 hover:bg-white/10 transition"
          >
            <RotateCcw className="w-5 h-5 text-slate-300" />
            <span className="text-xs font-bold text-slate-400">Zero</span>
          </button>

          <button
            onClick={saveMeasurement}
            className="flex flex-col items-center gap-1.5 bg-cyan-400/20 border border-cyan-400/30 rounded-2xl px-8 py-4 hover:bg-cyan-400/30 transition"
          >
            <Save className="w-6 h-6 text-cyan-300" />
            <span className="text-xs font-bold text-cyan-300">Record</span>
          </button>
        </div>
      </div>

      {/* Joint Reference Info */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
        <p className="font-bold text-white text-sm mb-3">{selectedJoint.name}</p>
        <div className="flex gap-6">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Normal ROM</p>
            <p className="font-bold text-cyan-400 mt-1">{selectedJoint.normal}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Range</p>
            <p className="font-bold text-cyan-400 mt-1">{selectedJoint.min}° to {selectedJoint.max}°</p>
          </div>
        </div>
      </div>

      {/* Saved Measurements */}
      {measurements.length > 0 && (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-bold text-white text-sm">Recorded Measurements ({measurements.length})</p>
            <button onClick={clearMeasurements} className="text-red-400 hover:text-red-300 transition">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {measurements.slice(0, 8).map((m, i) => (
              <div key={m.id} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl">
                <span className="w-6 h-6 rounded-lg bg-cyan-400/20 flex items-center justify-center text-[10px] font-black text-cyan-400 flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{m.jointName}</p>
                  <p className="text-[10px] text-slate-500">{m.timestamp.toLocaleTimeString()}</p>
                </div>
                <span className="text-lg font-black text-cyan-400 tabular-nums">{m.angle}°</span>
              </div>
            ))}
            {measurements.length > 8 && (
              <p className="text-xs text-slate-500 text-center">+{measurements.length - 8} more</p>
            )}
          </div>
        </div>
      )}

      {/* How to use */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
        <p className="font-bold text-white text-sm mb-3">How to Use</p>
        <ol className="space-y-1.5 text-xs text-slate-400">
          <li>1. Select the joint you're measuring</li>
          <li>2. Place device along the body segment</li>
          <li>3. Tap <strong className="text-slate-300">Zero</strong> to calibrate the neutral position</li>
          <li>4. Move through the range of motion</li>
          <li>5. Tap <strong className="text-slate-300">Record</strong> to capture the angle</li>
        </ol>
      </div>

      {/* Save Assessment */}
      <Button
        onClick={() => setShowModal(true)}
        disabled={measurements.length === 0}
        className="w-full"
      >
        {`Save to Patient${measurements.length > 0 ? ` (${measurements.length} readings)` : ""}`}
      </Button>
      <PatientSelectSaveModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        saving={saving}
        preselectedPatientId={patientId ?? undefined}
      />
    </div>
  );
}
