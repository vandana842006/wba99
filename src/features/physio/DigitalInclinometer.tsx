import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp, getDoc, doc } from "firebase/firestore";
import { firebaseDB } from "../../core/firebase";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { ArrowLeft, RotateCcw, Save, Trash2 } from "lucide-react";
import type { Patient } from "../../types";
import toast from "react-hot-toast";
import { PatientSelectSaveModal } from "./patients/PatientSelectSaveModal";

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

function AngleGauge({ angle, jointName }: { angle: number; jointName: string }) {
  const clampedAngle = Math.max(-90, Math.min(90, angle));
  const needleRotation = clampedAngle;

  const getColor = () => {
    const abs = Math.abs(angle);
    if (abs < 15) return "#22c55e"; // Emerald
    if (abs < 45) return "#06b6d4"; // Cyan
    return "#ef4444"; // Red
  };

  const color = getColor();
  const cx = 200;
  const cy = 220;
  const r = 150;

  const ticks = [-90, -60, -30, 0, 30, 60, 90];

  const needleRad = ((needleRotation - 90) * Math.PI) / 180;
  const needleX = cx + (r - 15) * Math.cos(needleRad);
  const needleY = cy + (r - 15) * Math.sin(needleRad);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm">
      <div className="relative group">
        {/* Glow effect */}
        <div 
          className="absolute inset-0 blur-3xl opacity-20 group-hover:opacity-30 transition-opacity"
          style={{ backgroundColor: color }}
        />
        
        <svg viewBox="0 0 400 260" className="w-full h-auto relative drop-shadow-2xl overflow-visible">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#22c55e" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
            </linearGradient>
            <filter id="needleGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background track */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            className="stroke-text-muted/5 dark:stroke-white/5"
            strokeWidth="30"
            strokeLinecap="round"
          />

          {/* Progress track (gradient or color) */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeOpacity="0.4"
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />

          {/* Tick marks */}
          {ticks.map((t) => {
            const rad = ((t - 90) * Math.PI) / 180;
            const x1 = cx + (r - 8) * Math.cos(rad);
            const y1 = cy + (r - 8) * Math.sin(rad);
            const x2 = cx + (r + 8) * Math.cos(rad);
            const y2 = cy + (r + 8) * Math.sin(rad);
            const lx = cx + (r + 32) * Math.cos(rad);
            const ly = cy + (r + 32) * Math.sin(rad);
            const isActive = Math.abs(angle - t) < 5;

            return (
              <g key={t} className="transition-all duration-300">
                <line 
                  x1={x1} y1={y1} x2={x2} y2={y2} 
                  className={`${isActive ? "stroke-text" : "stroke-text-muted/40"}`} 
                  strokeWidth={isActive ? "3" : "2"} 
                />
                <text 
                  x={lx} y={ly} 
                  textAnchor="middle" 
                  dominantBaseline="middle" 
                  className={`${isActive ? "fill-text" : "fill-text-muted/60"} font-black tracking-tighter`} 
                  fontSize={isActive ? "14" : "11"}
                >
                  {t}°
                </text>
              </g>
            );
          })}

          {/* Needle shadow */}
          <line
            x1={cx}
            y1={cy}
            x2={needleX}
            y2={needleY}
            stroke="black"
            strokeWidth="6"
            strokeOpacity="0.1"
            strokeLinecap="round"
            transform="translate(2, 2)"
          />

          {/* Needle */}
          <line
            x1={cx}
            y1={cy}
            x2={needleX}
            y2={needleY}
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            filter="url(#needleGlow)"
            className="transition-all duration-150 ease-out"
          />

          {/* Center dot */}
          <circle cx={cx} cy={cy} r="12" className="fill-surface stroke-border" strokeWidth="2" />
          <circle cx={cx} cy={cy} r="6" fill={color} filter="url(#needleGlow)" />
        </svg>
      </div>

      {/* Digital readout */}
      <div className="text-center relative -mt-4">
        <div className="flex items-center justify-center gap-1">
          <span className="text-7xl sm:text-8xl font-black tabular-nums tracking-tighter drop-shadow-xl transition-all duration-300" style={{ color }}>
            {angle}
          </span>
          <span className="text-3xl sm:text-4xl font-black self-start mt-2 sm:mt-4 opacity-50" style={{ color }}>°</span>
        </div>
        <div className="mt-2 flex flex-col items-center">
          <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-1 transition-all shadow-sm ${
            Math.abs(angle) < 15 ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : 
            angle > 0 ? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400" : "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400"
          }`}>
            {Math.abs(angle) < 15 ? "Neutral" : angle > 0 ? "Positive Angle" : "Negative Angle"}
          </div>
          <p className="text-text-muted text-xs font-bold uppercase tracking-widest opacity-60">
            {jointName}
          </p>
        </div>
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

  useEffect(() => {
    if (!patientId) return;
    getDoc(doc(firebaseDB, "patients", patientId)).then((snap) => {
      if (snap.exists()) setPatient({ id: snap.id, ...snap.data() } as Patient);
    });
  }, [patientId]);

  useEffect(() => {
    let demoInterval: ReturnType<typeof setInterval> | null = null;
    let demoAngle = 0;
    let direction = 1;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const beta = event.beta ?? 0;
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
    toast.success(`Saved: ${selectedJoint.name} ${currentAngle}°`);
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
            className="w-9 h-9 rounded-xl bg-input border border-border flex items-center justify-center hover:bg-surface transition shadow-sm active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-text-muted" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="h-1 w-5 bg-cyan-500 rounded-full shadow-sm" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">Assessment Tool</span>
            </div>
            <h1 className="text-2xl font-black text-text tracking-tight">Digital Inclinometer</h1>
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
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 flex items-center justify-center flex-shrink-0 shadow-inner">
            <span className="text-xs font-black text-cyan-600 dark:text-cyan-400">
              {patient.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
            </span>
          </div>
          <div>
            <p className="font-bold text-text text-sm">{patient.name}</p>
            <p className="text-xs text-text-muted">{(patient as any).condition}</p>
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
        <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">Select Joint</p>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {JOINT_PRESETS.map((joint) => (
            <button
              key={joint.id}
              onClick={() => setSelectedJoint(joint)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold border transition-all duration-150 shadow-sm active:scale-95 ${
                selectedJoint.id === joint.id
                  ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/20"
                  : "bg-input border-border text-text-muted hover:border-primary/20 hover:text-text"
              }`}
            >
              {joint.name}
            </button>
          ))}
        </div>
      </div>

      {/* Gauge */}
      <div className="bg-gradient-to-b from-input to-surface border border-border rounded-[2.5rem] p-6 sm:p-8 flex flex-col items-center gap-6 sm:gap-8 shadow-xl shadow-black/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
        <AngleGauge angle={currentAngle} jointName={selectedJoint.name} />

        {/* Calibration status */}
        <div className={`flex items-center gap-2 text-xs font-bold ${isCalibrated ? "text-emerald-600 dark:text-emerald-400" : "text-text-muted"}`}>
          <span className={`w-2 h-2 rounded-full ${isCalibrated ? "bg-emerald-500 shadow-sm" : "bg-text-muted/30"}`} />
          {isCalibrated ? "Calibrated" : "Not calibrated — tap Zero to set neutral"}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 w-full justify-center">
          <button
            onClick={calibrate}
            className="flex flex-col items-center gap-1.5 bg-surface border border-border rounded-2xl px-5 py-3 hover:bg-input transition shadow-sm active:scale-95"
          >
            <RotateCcw className="w-5 h-5 text-text-muted" />
            <span className="text-xs font-bold text-text-muted">Zero</span>
          </button>

          <button
            onClick={saveMeasurement}
            className="flex flex-col items-center gap-1.5 bg-cyan-500/20 border border-cyan-500/30 rounded-2xl px-8 py-4 hover:bg-cyan-500/30 transition shadow-md active:scale-95"
          >
            <Save className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">Save</span>
          </button>
        </div>
      </div>

      {/* Joint Reference Info */}
      <div className="bg-input border border-border rounded-2xl p-4 shadow-sm">
        <p className="font-bold text-text text-sm mb-3">{selectedJoint.name}</p>
        <div className="flex gap-6">
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Normal ROM</p>
            <p className="font-bold text-cyan-600 dark:text-cyan-400 mt-1">{selectedJoint.normal}</p>
          </div>
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Range</p>
            <p className="font-bold text-cyan-600 dark:text-cyan-400 mt-1">{selectedJoint.min}° to {selectedJoint.max}°</p>
          </div>
        </div>
      </div>

      {/* Saved Measurements */}
      {measurements.length > 0 && (
        <div className="bg-input border border-border rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="font-bold text-text text-sm">Saved Measurements ({measurements.length})</p>
            <button onClick={clearMeasurements} className="text-red-500 hover:text-red-400 transition-all p-1 hover:bg-red-50 rounded-lg">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {measurements.slice(0, 8).map((m, i) => (
              <div key={m.id} className="flex items-center gap-3 p-3 bg-surface rounded-xl shadow-inner">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center text-[10px] font-black text-cyan-600 dark:text-cyan-400 flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text truncate">{m.jointName}</p>
                  <p className="text-[10px] text-text-muted">{m.timestamp.toLocaleTimeString()}</p>
                </div>
                <span className="text-lg font-black text-cyan-600 dark:text-cyan-400 tabular-nums">{m.angle}°</span>
              </div>
            ))}
            {measurements.length > 8 && (
              <p className="text-xs text-text-muted text-center font-semibold">+{measurements.length - 8} more</p>
            )}
          </div>
        </div>
      )}

      {/* How to use */}
      <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm">
        <p className="font-bold text-text text-sm mb-3">How to Use</p>
        <ol className="space-y-1.5 text-xs text-text-muted font-semibold">
          <li>1. Select the joint you're measuring</li>
          <li>2. Place device along the body segment</li>
          <li>3. Tap <strong className="text-text">Zero</strong> to calibrate the neutral position</li>
          <li>4. Move through the range of motion</li>
          <li>5. Tap <strong className="text-text">Save</strong> to record the angle</li>
        </ol>
      </div>

      {/* Save Assessment */}
      <Button
        onClick={() => setShowModal(true)}
        disabled={measurements.length === 0}
        className="w-full"
      >
        {`Save Assessment${measurements.length > 0 ? ` (${measurements.length} measurements)` : ""}`}
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
