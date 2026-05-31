import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp, getDoc, doc } from "firebase/firestore";
import { firebaseDB } from "../../core/firebase";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { ArrowLeft } from "lucide-react";
import type { Patient } from "../../types";
import toast from "react-hot-toast";
import { PatientSelectSaveModal } from "./patients/PatientSelectSaveModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InjuryEntry { date: string; diagnosis: string; notes: string; }

interface MSKData {
  assessmentDate: string;
  assessorName: string;
  injuryHistory: {
    currentInjuries: InjuryEntry[];
    currentIllnesses: InjuryEntry[];
    history: InjuryEntry[];
  };
  cc: string;
  diagnostic: string;
  pastMedical: {
    medicalConditions: string; currentMedications: string;
    pastSurgery: string; allergies: string; orthotics: string;
  };
  vas: string;
  cricketHistory: {
    injuryYes: string; injurySpeciality: string; injuryOvers: string; injuryComments: string;
    pastInjuryYes: string; pastInjurySpeciality: string; pastInjuryOvers: string; pastInjuryComments: string;
    matchesPlayed: string; missedMatches: string; totalMatches: string; medicines: string;
  };
  shoulder: {
    irAt90Left: string; irAt90Right: string;
    erAt90Left: string; erAt90Right: string;
    girdErg: string;
    hkLeft: string; hkRight: string;
    emptyCanLeft: string; emptyCanRight: string;
    infraspinatusLeft: string; infraspinatusRight: string;
    scapulaNeutralLeft: string; scapulaNeutralRight: string;
    scapula45Left: string; scapula45Right: string;
    scapula90Left: string; scapula90Right: string;
    scapula135Left: string; scapula135Right: string;
    hawkinsLeft: string; hawkinsRight: string;
    obrienLeft: string; obrienRight: string;
    abductionLeft: string; abductionRight: string;
  };
  spine: {
    combinedElevationPain: string; combinedElevationCm: string; combinedElevationLeft: string; combinedElevationRight: string;
    singleLegLumbarPain: string; singleLegLumbarCm: string; singleLegLumbarLeft: string; singleLegLumbarRight: string;
    quadrantPain: string; quadrantCm: string; quadrantLeft: string; quadrantRight: string;
    trunkSidePain: string; trunkSideCm: string; trunkSideLeft: string; trunkSideRight: string;
    lumbarFlexLeft: string; lumbarExtRight: string;
    thoracicRotLeft: string; thoracicRotRight: string;
    slumpLeft: string; slumpRight: string;
    lumbarQuadrantLeft: string; lumbarQuadrantRight: string;
  };
  lowerLimb: {
    kneeToWallLeft: string; kneeToWallRight: string;
    footPostureLeft: string; footPostureRight: string;
    singleLegStandLeft: string; singleLegStandRight: string;
    trendelenbergLeft: string; trendelenbergRight: string;
    hamstringLeft: string; hamstringRight: string;
    iliopsoasLeft: string; iliopsoasRight: string;
    rectusFemorisLeft: string; rectusFemorisRight: string;
    hipIRLeft: string; hipIRRight: string;
    hipERLeft: string; hipERRight: string;
    hipQuadrantLeft: string; hipQuadrantRight: string;
    piriformisLeft: string; piriformisRight: string;
    dfLungeLeft: string; dfLungeRight: string;
    calfEnduranceLeft: string; calfEnduranceRight: string;
    thomasKneeLeft: string; thomasKneeRight: string;
    thomasHipLeft: string; thomasHipRight: string;
    legLengthLeft: string; legLengthRight: string;
    activeKneeExtLeft: string; activeKneeExtRight: string;
    hipQuadrantSupineLeft: string; hipQuadrantSupineRight: string;
    mtpExtLeft: string; mtpExtRight: string;
    proneKneeLeft: string; proneKneeRight: string;
    anklePFLeft: string; anklePFRight: string;
    posteriorImpLeft: string; posteriorImpRight: string;
    trueLegLengthLeft: string; trueLegLengthRight: string;
    singleHopLeft: string; singleHopRight: string;
  };
  core: {
    taControlLevel: string; plank: string;
    sidePlankLeft: string; sidePlankRight: string;
    singleLegBridgeLeft: string; singleLegBridgeRight: string;
    slhbLeft: string; slhbRight: string;
    rcStrengthLeft: string; rcStrengthRight: string;
    gluteControlLeft: string; gluteControlRight: string;
  };
  posture: {
    head: string;
    shoulderLeft: string; shoulderRight: string;
    thoracicSpine: string; lumbarSpine: string; pelvis: string;
    kneeLeft: string; kneeRight: string;
    footLeftArch: string; footRightArch: string;
  };
  palpation: Record<string, { left: string; right: string; notes: string }>;
  keyFindings: Array<{ initialDate: string; finding: string; action: string; retestDate: string; retest: string }>;
  ybt: {
    lowerRytAnterior: string; lowerRpm: string; lowerRpl: string;
    lowerLa: string; lowerLpm: string; lowerPl: string; lowerComments: string;
    upperRm: string; upperRsl: string; upperRil: string;
    upperLm: string; upperLsl: string; upperLil: string; upperComments: string;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PALPATION_STRUCTURES = [
  "Supraspinatus Tendon",
  "Rotator Cuff Muscle complex",
  "SIJ Ligaments",
  "Medial Tibial Border",
  "Lower Ribs",
  "Achilles Tendon",
  "Erector Spinae Muscle",
  "Lumbar Spine Facet Joints",
];

const TABS = [
  { id: "history",        label: "History" },
  { id: "shoulder_spine", label: "Shoulder & Spine" },
  { id: "lower_limb",     label: "Lower Limb" },
  { id: "core",           label: "Core & Stability" },
  { id: "posture",        label: "Posture & Palpation" },
  { id: "findings",       label: "Findings & YBT" },
] as const;

type TabId = typeof TABS[number]["id"];

const emptyInjury = (): InjuryEntry => ({ date: "", diagnosis: "", notes: "" });

function initData(): MSKData {
  return {
    assessmentDate: "",
    assessorName: "",
    injuryHistory: {
      currentInjuries:  [emptyInjury(), emptyInjury(), emptyInjury()],
      currentIllnesses: [emptyInjury(), emptyInjury()],
      history:          [emptyInjury(), emptyInjury(), emptyInjury()],
    },
    cc: "",
    diagnostic: "",
    pastMedical: { medicalConditions: "", currentMedications: "", pastSurgery: "", allergies: "", orthotics: "" },
    vas: "",
    cricketHistory: {
      injuryYes: "", injurySpeciality: "", injuryOvers: "", injuryComments: "",
      pastInjuryYes: "", pastInjurySpeciality: "", pastInjuryOvers: "", pastInjuryComments: "",
      matchesPlayed: "", missedMatches: "", totalMatches: "", medicines: "",
    },
    shoulder: {
      irAt90Left: "", irAt90Right: "", erAt90Left: "", erAt90Right: "", girdErg: "",
      hkLeft: "", hkRight: "", emptyCanLeft: "", emptyCanRight: "",
      infraspinatusLeft: "", infraspinatusRight: "",
      scapulaNeutralLeft: "", scapulaNeutralRight: "",
      scapula45Left: "", scapula45Right: "",
      scapula90Left: "", scapula90Right: "",
      scapula135Left: "", scapula135Right: "",
      hawkinsLeft: "", hawkinsRight: "", obrienLeft: "", obrienRight: "",
      abductionLeft: "", abductionRight: "",
    },
    spine: {
      combinedElevationPain: "", combinedElevationCm: "", combinedElevationLeft: "", combinedElevationRight: "",
      singleLegLumbarPain: "",   singleLegLumbarCm: "",   singleLegLumbarLeft: "",   singleLegLumbarRight: "",
      quadrantPain: "",          quadrantCm: "",           quadrantLeft: "",           quadrantRight: "",
      trunkSidePain: "",         trunkSideCm: "",          trunkSideLeft: "",          trunkSideRight: "",
      lumbarFlexLeft: "", lumbarExtRight: "",
      thoracicRotLeft: "", thoracicRotRight: "",
      slumpLeft: "", slumpRight: "",
      lumbarQuadrantLeft: "", lumbarQuadrantRight: "",
    },
    lowerLimb: {
      kneeToWallLeft: "", kneeToWallRight: "",
      footPostureLeft: "", footPostureRight: "",
      singleLegStandLeft: "", singleLegStandRight: "",
      trendelenbergLeft: "", trendelenbergRight: "",
      hamstringLeft: "", hamstringRight: "",
      iliopsoasLeft: "", iliopsoasRight: "",
      rectusFemorisLeft: "", rectusFemorisRight: "",
      hipIRLeft: "", hipIRRight: "",
      hipERLeft: "", hipERRight: "",
      hipQuadrantLeft: "", hipQuadrantRight: "",
      piriformisLeft: "", piriformisRight: "",
      dfLungeLeft: "", dfLungeRight: "",
      calfEnduranceLeft: "", calfEnduranceRight: "",
      thomasKneeLeft: "", thomasKneeRight: "",
      thomasHipLeft: "", thomasHipRight: "",
      legLengthLeft: "", legLengthRight: "",
      activeKneeExtLeft: "", activeKneeExtRight: "",
      hipQuadrantSupineLeft: "", hipQuadrantSupineRight: "",
      mtpExtLeft: "", mtpExtRight: "",
      proneKneeLeft: "", proneKneeRight: "",
      anklePFLeft: "", anklePFRight: "",
      posteriorImpLeft: "", posteriorImpRight: "",
      trueLegLengthLeft: "", trueLegLengthRight: "",
      singleHopLeft: "", singleHopRight: "",
    },
    core: {
      taControlLevel: "", plank: "",
      sidePlankLeft: "", sidePlankRight: "",
      singleLegBridgeLeft: "", singleLegBridgeRight: "",
      slhbLeft: "", slhbRight: "",
      rcStrengthLeft: "", rcStrengthRight: "",
      gluteControlLeft: "", gluteControlRight: "",
    },
    posture: {
      head: "", shoulderLeft: "", shoulderRight: "",
      thoracicSpine: "", lumbarSpine: "", pelvis: "",
      kneeLeft: "", kneeRight: "", footLeftArch: "", footRightArch: "",
    },
    palpation: Object.fromEntries(
      PALPATION_STRUCTURES.map(s => [s, { left: "", right: "", notes: "" }])
    ),
    keyFindings: Array.from({ length: 7 }, () => ({ initialDate: "", finding: "", action: "", retestDate: "", retest: "" })),
    ybt: {
      lowerRytAnterior: "", lowerRpm: "", lowerRpl: "",
      lowerLa: "", lowerLpm: "", lowerPl: "", lowerComments: "",
      upperRm: "", upperRsl: "", upperRil: "",
      upperLm: "", upperLsl: "", upperLil: "", upperComments: "",
    },
  };
}

// ─── Small UI helpers ──────────────────────────────────────────────────────────

const CELL = "w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-text text-center outline-none focus:border-violet-500/50 transition placeholder:text-text-muted/40";
const INP  = "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-violet-500/50 transition placeholder:text-text-muted/50";
const INP_SM = "w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-text outline-none focus:border-violet-500/50 transition placeholder:text-text-muted/40";

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mt-5 mb-2 first:mt-0">
      <div className="h-3.5 w-1 rounded-full bg-violet-500" />
      <span className="text-xs font-black uppercase tracking-widest text-text-muted">{children}</span>
    </div>
  );
}

function TableHead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="border-b border-border">
        {cols.map((c, i) => (
          <th key={i} className={`pb-2 text-[10px] font-black uppercase tracking-widest text-text-muted ${i === 0 ? "text-left pr-3" : "text-center px-1.5 w-24"}`}>
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

// Bilateral row: label | Left | Right | [Goal]
function BRow({ label, lv, rv, goal, onL, onR }: {
  label: string; lv: string; rv: string; goal?: string;
  onL: (v: string) => void; onR: (v: string) => void;
}) {
  return (
    <tr className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
      <td className="py-2 pr-3 text-sm text-text">{label}</td>
      <td className="py-1.5 px-1.5 w-24"><input value={lv} onChange={e => onL(e.target.value)} className={CELL} placeholder="—" /></td>
      <td className="py-1.5 px-1.5 w-24"><input value={rv} onChange={e => onR(e.target.value)} className={CELL} placeholder="—" /></td>
      {goal !== undefined && <td className="py-2 pl-3 text-xs text-text-muted text-right whitespace-nowrap w-32">{goal}</td>}
    </tr>
  );
}

// Spine row: label | Pain | cm | Left/Flex | Right/Extn
function SpRow({ label, pain, cm, left, right, onPain, onCm, onLeft, onRight }: {
  label: string; pain: string; cm: string; left: string; right: string;
  onPain: (v: string) => void; onCm: (v: string) => void;
  onLeft: (v: string) => void; onRight: (v: string) => void;
}) {
  return (
    <tr className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
      <td className="py-2 pr-3 text-sm text-text">{label}</td>
      <td className="py-1.5 px-1 w-20"><input value={pain} onChange={e => onPain(e.target.value)} className={CELL} placeholder="—" /></td>
      <td className="py-1.5 px-1 w-20"><input value={cm} onChange={e => onCm(e.target.value)} className={CELL} placeholder="—" /></td>
      <td className="py-1.5 px-1 w-24"><input value={left} onChange={e => onLeft(e.target.value)} className={CELL} placeholder="—" /></td>
      <td className="py-1.5 px-1 w-24"><input value={right} onChange={e => onRight(e.target.value)} className={CELL} placeholder="—" /></td>
    </tr>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function MSKAssessment() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const patientId = params.get("patientId") ?? "";
  const [patient, setPatient] = useState<Patient | null>(null);
  const [data, setData] = useState<MSKData>(initData);
  const [activeTab, setActiveTab] = useState<TabId>("history");
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    getDoc(doc(firebaseDB, "patients", patientId)).then(d => {
      if (d.exists()) setPatient({ id: d.id, ...d.data() } as Patient);
    });
  }, [patientId]);

  // Section updaters
  const updShoulder = (field: keyof MSKData["shoulder"]) => (val: string) =>
    setData(p => ({ ...p, shoulder: { ...p.shoulder, [field]: val } }));

  const updSpine = (field: keyof MSKData["spine"]) => (val: string) =>
    setData(p => ({ ...p, spine: { ...p.spine, [field]: val } }));

  const updLL = (field: keyof MSKData["lowerLimb"]) => (val: string) =>
    setData(p => ({ ...p, lowerLimb: { ...p.lowerLimb, [field]: val } }));

  const updCore = (field: keyof MSKData["core"]) => (val: string) =>
    setData(p => ({ ...p, core: { ...p.core, [field]: val } }));

  const updPosture = (field: keyof MSKData["posture"]) => (val: string) =>
    setData(p => ({ ...p, posture: { ...p.posture, [field]: val } }));

  const updYbt = (field: keyof MSKData["ybt"]) => (val: string) =>
    setData(p => ({ ...p, ybt: { ...p.ybt, [field]: val } }));

  const updPalp = (structure: string, field: "left" | "right" | "notes") => (val: string) =>
    setData(p => ({
      ...p,
      palpation: { ...p.palpation, [structure]: { ...p.palpation[structure], [field]: val } },
    }));

  const updFinding = (idx: number, field: keyof MSKData["keyFindings"][0]) => (val: string) =>
    setData(p => {
      const arr = [...p.keyFindings];
      arr[idx] = { ...arr[idx], [field]: val };
      return { ...p, keyFindings: arr };
    });

  const updInjury = (
    group: "currentInjuries" | "currentIllnesses" | "history",
    idx: number,
    field: keyof InjuryEntry
  ) => (val: string) =>
    setData(p => {
      const arr = [...p.injuryHistory[group]];
      arr[idx] = { ...arr[idx], [field]: val };
      return { ...p, injuryHistory: { ...p.injuryHistory, [group]: arr } };
    });

  const handleSave = async (pid: string) => {
    if (!user) return;
    setSaving(true);
    try {
      await addDoc(collection(firebaseDB, "assessments"), {
        patientId: pid,
        physioId: user.uid,
        toolType: "msk",
        data,
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

  // ── Tab renderers ────────────────────────────────────────────────────────────

  function renderHistory() {
    return (
      <div className="space-y-5">
        {/* Assessment info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Assessment Date</label>
            <input type="date" value={data.assessmentDate}
              onChange={e => setData(p => ({ ...p, assessmentDate: e.target.value }))}
              className={INP} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Physiotherapist Assessor</label>
            <input value={data.assessorName} placeholder="Name"
              onChange={e => setData(p => ({ ...p, assessorName: e.target.value }))}
              className={INP} />
          </div>
        </div>

        {/* VAS */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">VAS Pain Score (0–10)</label>
          <div className="flex items-center gap-3">
            <input type="range" min={0} max={10} step={1}
              value={data.vas || "0"}
              onChange={e => setData(p => ({ ...p, vas: e.target.value }))}
              className="flex-1 accent-violet-500 cursor-pointer" />
            <span className="text-lg font-black text-text w-6 text-center">{data.vas || "0"}</span>
          </div>
          <div className="flex justify-between text-[10px] text-text-muted px-0.5">
            <span>No Pain</span><span>Worst Pain</span>
          </div>
        </div>

        {/* Injury / Illness History */}
        <SectionHead>Injury / Illness History</SectionHead>
        {(
          [
            { key: "currentInjuries",  label: "Current Injuries" },
            { key: "currentIllnesses", label: "Current Illnesses" },
            { key: "history",          label: "History" },
          ] as const
        ).map(({ key, label }) => (
          <div key={key}>
            <p className="text-xs font-bold text-text mb-2">{label}</p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-input border-b border-border">
                    {["Date", "Diagnosis", "Notes"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-text-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.injuryHistory[key].map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-2 py-1.5 w-28">
                        <input type="date" value={row.date}
                          onChange={e => updInjury(key, i, "date")(e.target.value)}
                          className={INP_SM} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={row.diagnosis} placeholder="Diagnosis"
                          onChange={e => updInjury(key, i, "diagnosis")(e.target.value)}
                          className={INP_SM} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={row.notes} placeholder="Notes"
                          onChange={e => updInjury(key, i, "notes")(e.target.value)}
                          className={INP_SM} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Chief Complaint & Diagnostic */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Chief Complaint (c/c)</label>
            <textarea rows={3} value={data.cc} placeholder="Chief complaint…"
              onChange={e => setData(p => ({ ...p, cc: e.target.value }))}
              className={`${INP} resize-none`} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Diagnostic</label>
            <textarea rows={3} value={data.diagnostic} placeholder="Diagnostic impression…"
              onChange={e => setData(p => ({ ...p, diagnostic: e.target.value }))}
              className={`${INP} resize-none`} />
          </div>
        </div>

        {/* Past Medical History */}
        <SectionHead>Past Medical History</SectionHead>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <tbody>
              {(
                [
                  { field: "medicalConditions", label: "Medical Conditions" },
                  { field: "currentMedications", label: "Current Medications" },
                  { field: "pastSurgery",        label: "Past Surgery" },
                  { field: "allergies",           label: "Allergies" },
                  { field: "orthotics",           label: "Orthotics" },
                ] as const
              ).map(({ field, label }) => (
                <tr key={field} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 text-sm font-semibold text-text w-48 bg-input">{label}</td>
                  <td className="px-3 py-1.5">
                    <input value={data.pastMedical[field]} placeholder="—"
                      onChange={e => setData(p => ({ ...p, pastMedical: { ...p.pastMedical, [field]: e.target.value } }))}
                      className={INP_SM} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cricket / Match History */}
        <SectionHead>Match / Cricket History</SectionHead>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-input border-b border-border">
                {["", "Yes / No", "Speciality", "Overs Bowled/Played", "Comments"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  { rowLabel: "Injury",      yesF: "injuryYes",     specF: "injurySpeciality",     oversF: "injuryOvers",     cmtF: "injuryComments" },
                  { rowLabel: "Past Injury", yesF: "pastInjuryYes", specF: "pastInjurySpeciality", oversF: "pastInjuryOvers", cmtF: "pastInjuryComments" },
                ] as const
              ).map(({ rowLabel, yesF, specF, oversF, cmtF }) => (
                <tr key={rowLabel} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-semibold text-text bg-input w-28">{rowLabel}</td>
                  <td className="px-2 py-1.5 w-20">
                    <input value={data.cricketHistory[yesF]} placeholder="Yes/No"
                      onChange={e => setData(p => ({ ...p, cricketHistory: { ...p.cricketHistory, [yesF]: e.target.value } }))}
                      className={CELL} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={data.cricketHistory[specF]} placeholder="—"
                      onChange={e => setData(p => ({ ...p, cricketHistory: { ...p.cricketHistory, [specF]: e.target.value } }))}
                      className={INP_SM} />
                  </td>
                  <td className="px-2 py-1.5 w-36">
                    <input value={data.cricketHistory[oversF]} placeholder="—"
                      onChange={e => setData(p => ({ ...p, cricketHistory: { ...p.cricketHistory, [oversF]: e.target.value } }))}
                      className={INP_SM} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={data.cricketHistory[cmtF]} placeholder="—"
                      onChange={e => setData(p => ({ ...p, cricketHistory: { ...p.cricketHistory, [cmtF]: e.target.value } }))}
                      className={INP_SM} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(
            [
              { f: "matchesPlayed", label: "Matches Played" },
              { f: "missedMatches", label: "Missed Matches" },
              { f: "totalMatches",  label: "Total Matches" },
              { f: "medicines",     label: "Medicines / Supplements" },
            ] as const
          ).map(({ f, label }) => (
            <div key={f} className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">{label}</label>
              <input value={data.cricketHistory[f]} placeholder="—"
                onChange={e => setData(p => ({ ...p, cricketHistory: { ...p.cricketHistory, [f]: e.target.value } }))}
                className={INP} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderShoulderSpine() {
    const { shoulder: sh, spine: sp } = data;
    return (
      <div className="space-y-5">
        {/* Shoulder */}
        <SectionHead>Shoulder Tests</SectionHead>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full">
            <TableHead cols={["Test", "Left", "Right", "Goal"]} />
            <tbody>
              <BRow label="Internal Rotation at 90° Abduction (supine)" lv={sh.irAt90Left} rv={sh.irAt90Right} goal=">90°" onL={updShoulder("irAt90Left")} onR={updShoulder("irAt90Right")} />
              <BRow label="External Rotation at 90° Abduction (supine)" lv={sh.erAt90Left} rv={sh.erAt90Right} goal=">90°" onL={updShoulder("erAt90Left")} onR={updShoulder("erAt90Right")} />
              <tr className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                <td className="py-2 pr-3 text-sm text-text">GIRD / ERG Ratio (dominant arm)</td>
                <td colSpan={2} className="py-1.5 px-1.5">
                  <input value={sh.girdErg} onChange={e => updShoulder("girdErg")(e.target.value)}
                    className={CELL} placeholder="—" />
                </td>
                <td className="py-2 pl-3 text-xs text-text-muted text-right whitespace-nowrap w-32">+'ve: GIRD &gt; ERG</td>
              </tr>
              <BRow label="Hawkins-Kennedy Impingement Test" lv={sh.hkLeft} rv={sh.hkRight} goal="Pain/No pain" onL={updShoulder("hkLeft")} onR={updShoulder("hkRight")} />
              <BRow label="Empty Can Test" lv={sh.emptyCanLeft} rv={sh.emptyCanRight} goal="Pain, Weakness" onL={updShoulder("emptyCanLeft")} onR={updShoulder("emptyCanRight")} />
              <BRow label="O'Brien's Test" lv={sh.obrienLeft} rv={sh.obrienRight} goal="Pain, Weakness" onL={updShoulder("obrienLeft")} onR={updShoulder("obrienRight")} />
              <BRow label="Infraspinatus Strength @ 90° Flexion" lv={sh.infraspinatusLeft} rv={sh.infraspinatusRight} goal="MMT 5/5" onL={updShoulder("infraspinatusLeft")} onR={updShoulder("infraspinatusRight")} />
              <BRow label="Shoulder Abduction" lv={sh.abductionLeft} rv={sh.abductionRight} goal="Full / Restricted" onL={updShoulder("abductionLeft")} onR={updShoulder("abductionRight")} />
              <BRow label="Scapula Slide Test – neutral" lv={sh.scapulaNeutralLeft} rv={sh.scapulaNeutralRight} goal="<2.0 cms +/-" onL={updShoulder("scapulaNeutralLeft")} onR={updShoulder("scapulaNeutralRight")} />
              <BRow label="Scapula Slide Test – 45°" lv={sh.scapula45Left} rv={sh.scapula45Right} goal="<2.0 cms +/-" onL={updShoulder("scapula45Left")} onR={updShoulder("scapula45Right")} />
              <BRow label="Scapula Slide Test – 90°" lv={sh.scapula90Left} rv={sh.scapula90Right} goal="<2.0 cms +/-" onL={updShoulder("scapula90Left")} onR={updShoulder("scapula90Right")} />
              <BRow label="Scapula Slide Test – 135°" lv={sh.scapula135Left} rv={sh.scapula135Right} goal="<2.0 cms +/-" onL={updShoulder("scapula135Left")} onR={updShoulder("scapula135Right")} />
            </tbody>
          </table>
        </div>

        {/* Spine */}
        <SectionHead>Spine Tests</SectionHead>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Test", "Pain", "cm", "Left / Flex", "Right / Extn"].map((c, i) => (
                  <th key={i} className={`pb-2 text-[10px] font-black uppercase tracking-widest text-text-muted ${i === 0 ? "text-left pr-3" : "text-center px-1 w-24"}`}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <SpRow label="Combined Elevation Test"
                pain={sp.combinedElevationPain} cm={sp.combinedElevationCm}
                left={sp.combinedElevationLeft} right={sp.combinedElevationRight}
                onPain={updSpine("combinedElevationPain")} onCm={updSpine("combinedElevationCm")}
                onLeft={updSpine("combinedElevationLeft")} onRight={updSpine("combinedElevationRight")} />
              <SpRow label="Single Leg Lumbar Extension"
                pain={sp.singleLegLumbarPain} cm={sp.singleLegLumbarCm}
                left={sp.singleLegLumbarLeft} right={sp.singleLegLumbarRight}
                onPain={updSpine("singleLegLumbarPain")} onCm={updSpine("singleLegLumbarCm")}
                onLeft={updSpine("singleLegLumbarLeft")} onRight={updSpine("singleLegLumbarRight")} />
              <SpRow label="Quadrant Test"
                pain={sp.quadrantPain} cm={sp.quadrantCm}
                left={sp.quadrantLeft} right={sp.quadrantRight}
                onPain={updSpine("quadrantPain")} onCm={updSpine("quadrantCm")}
                onLeft={updSpine("quadrantLeft")} onRight={updSpine("quadrantRight")} />
              <SpRow label="Trunk Side Flexion ROM (+/- 3.0 cms)"
                pain={sp.trunkSidePain} cm={sp.trunkSideCm}
                left={sp.trunkSideLeft} right={sp.trunkSideRight}
                onPain={updSpine("trunkSidePain")} onCm={updSpine("trunkSideCm")}
                onLeft={updSpine("trunkSideLeft")} onRight={updSpine("trunkSideRight")} />
            </tbody>
          </table>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <TableHead cols={["Lumbar ROM", "Flex (L)", "Extn (R)"]} />
              <tbody>
                <tr className="hover:bg-surface/50 transition-colors">
                  <td className="py-2 pr-3 text-sm text-text">Lumbar Spine ROM</td>
                  <td className="py-1.5 px-1.5 w-24">
                    <input value={sp.lumbarFlexLeft} onChange={e => updSpine("lumbarFlexLeft")(e.target.value)}
                      className={CELL} placeholder=">+5 cm" />
                  </td>
                  <td className="py-1.5 px-1.5 w-24">
                    <input value={sp.lumbarExtRight} onChange={e => updSpine("lumbarExtRight")(e.target.value)}
                      className={CELL} placeholder=">-2 cm" />
                  </td>
                </tr>
                <tr className="hover:bg-surface/50 transition-colors">
                  <td className="py-2 pr-3 text-sm text-text">Lumbar Quadrant</td>
                  <td className="py-1.5 px-1.5"><input value={sp.lumbarQuadrantLeft} onChange={e => updSpine("lumbarQuadrantLeft")(e.target.value)} className={CELL} placeholder="+/-ve" /></td>
                  <td className="py-1.5 px-1.5"><input value={sp.lumbarQuadrantRight} onChange={e => updSpine("lumbarQuadrantRight")(e.target.value)} className={CELL} placeholder="+/-ve" /></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <TableHead cols={["Seated / Neural", "Left", "Right"]} />
              <tbody>
                <tr className="border-b border-border hover:bg-surface/50 transition-colors">
                  <td className="py-2 pr-3 text-sm text-text">Thoracic Rotation</td>
                  <td className="py-1.5 px-1.5 w-24"><input value={sp.thoracicRotLeft} onChange={e => updSpine("thoracicRotLeft")(e.target.value)} className={CELL} placeholder="—" /></td>
                  <td className="py-1.5 px-1.5 w-24"><input value={sp.thoracicRotRight} onChange={e => updSpine("thoracicRotRight")(e.target.value)} className={CELL} placeholder="—" /></td>
                </tr>
                <tr className="hover:bg-surface/50 transition-colors">
                  <td className="py-2 pr-3 text-sm text-text">Slump Test</td>
                  <td className="py-1.5 px-1.5"><input value={sp.slumpLeft} onChange={e => updSpine("slumpLeft")(e.target.value)} className={CELL} placeholder="—" /></td>
                  <td className="py-1.5 px-1.5"><input value={sp.slumpRight} onChange={e => updSpine("slumpRight")(e.target.value)} className={CELL} placeholder="—" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function renderLowerLimb() {
    const ll = data.lowerLimb;
    return (
      <div className="space-y-5">
        {/* Standing */}
        <SectionHead>Standing Measures</SectionHead>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full">
            <TableHead cols={["Test", "Left", "Right", "Goal"]} />
            <tbody>
              <BRow label="Knee to Wall (DF Lunge)" lv={ll.kneeToWallLeft} rv={ll.kneeToWallRight} goal=">10 cms" onL={updLL("kneeToWallLeft")} onR={updLL("kneeToWallRight")} />
              <BRow label="Foot Posture" lv={ll.footPostureLeft} rv={ll.footPostureRight} goal="Flat/Normal/High" onL={updLL("footPostureLeft")} onR={updLL("footPostureRight")} />
              <BRow label="Single Leg Standing (eyes closed)" lv={ll.singleLegStandLeft} rv={ll.singleLegStandRight} goal=">30 sec" onL={updLL("singleLegStandLeft")} onR={updLL("singleLegStandRight")} />
              <BRow label="Trendelenberg Sign" lv={ll.trendelenbergLeft} rv={ll.trendelenbergRight} onL={updLL("trendelenbergLeft")} onR={updLL("trendelenbergRight")} />
            </tbody>
          </table>
        </div>

        {/* Supine */}
        <SectionHead>Supine</SectionHead>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full">
            <TableHead cols={["Test", "Left", "Right", "Goal"]} />
            <tbody>
              <BRow label="Leg Length (ASIS → Med. Condyl / Med. Condyl → Med. Malleoli)" lv={ll.legLengthLeft} rv={ll.legLengthRight} goal=">2 cm diff" onL={updLL("legLengthLeft")} onR={updLL("legLengthRight")} />
              <BRow label="True Leg Length" lv={ll.trueLegLengthLeft} rv={ll.trueLegLengthRight} goal="+/- 2.0 cms" onL={updLL("trueLegLengthLeft")} onR={updLL("trueLegLengthRight")} />
              <BRow label="Active Knee Extension (90/90)" lv={ll.activeKneeExtLeft} rv={ll.activeKneeExtRight} goal="≥160°" onL={updLL("activeKneeExtLeft")} onR={updLL("activeKneeExtRight")} />
              <BRow label="Hip Quadrant (Sx reproduction)" lv={ll.hipQuadrantSupineLeft} rv={ll.hipQuadrantSupineRight} onL={updLL("hipQuadrantSupineLeft")} onR={updLL("hipQuadrantSupineRight")} />
              <BRow label="Hamstring Length at 90/90" lv={ll.hamstringLeft} rv={ll.hamstringRight} goal=">170°" onL={updLL("hamstringLeft")} onR={updLL("hamstringRight")} />
            </tbody>
          </table>
        </div>

        {/* Thomas Test */}
        <SectionHead>Thomas Test (Seated → Supine)</SectionHead>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full">
            <TableHead cols={["Test", "Left", "Right", "Goal"]} />
            <tbody>
              <BRow label="A. Knee Flexion" lv={ll.thomasKneeLeft} rv={ll.thomasKneeRight} goal=">80°" onL={updLL("thomasKneeLeft")} onR={updLL("thomasKneeRight")} />
              <BRow label="B. Hip Flexion (Iliopsoas)" lv={ll.thomasHipLeft} rv={ll.thomasHipRight} goal="≤5°" onL={updLL("thomasHipLeft")} onR={updLL("thomasHipRight")} />
            </tbody>
          </table>
        </div>

        {/* Side lying */}
        <SectionHead>Side Lying</SectionHead>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full">
            <TableHead cols={["Test", "Left", "Right", "Goal"]} />
            <tbody>
              <BRow label="1st MTP Extension (ankle neutral)" lv={ll.mtpExtLeft} rv={ll.mtpExtRight} goal="Degrees" onL={updLL("mtpExtLeft")} onR={updLL("mtpExtRight")} />
            </tbody>
          </table>
        </div>

        {/* Prone */}
        <SectionHead>Prone</SectionHead>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full">
            <TableHead cols={["Test", "Left", "Right", "Goal"]} />
            <tbody>
              <BRow label="Hip Internal Rotation 0°" lv={ll.hipIRLeft} rv={ll.hipIRRight} goal="≥30°" onL={updLL("hipIRLeft")} onR={updLL("hipIRRight")} />
              <BRow label="Hip External Rotation 0°" lv={ll.hipERLeft} rv={ll.hipERRight} goal="≥45°" onL={updLL("hipERLeft")} onR={updLL("hipERRight")} />
              <BRow label="Prone Knee Flexion Test" lv={ll.proneKneeLeft} rv={ll.proneKneeRight} goal="Judgement" onL={updLL("proneKneeLeft")} onR={updLL("proneKneeRight")} />
              <BRow label="Forced Ankle PF (Ankle Impingement)" lv={ll.anklePFLeft} rv={ll.anklePFRight} goal="Sx reproduction" onL={updLL("anklePFLeft")} onR={updLL("anklePFRight")} />
              <BRow label="Posterior Impingement Test" lv={ll.posteriorImpLeft} rv={ll.posteriorImpRight} goal="-VE" onL={updLL("posteriorImpLeft")} onR={updLL("posteriorImpRight")} />
            </tbody>
          </table>
        </div>

        {/* Muscle lengths */}
        <SectionHead>Muscle Length Tests</SectionHead>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full">
            <TableHead cols={["Test", "Left", "Right", "Goal"]} />
            <tbody>
              <BRow label="Iliopsoas Muscle Length" lv={ll.iliopsoasLeft} rv={ll.iliopsoasRight} goal="<5°" onL={updLL("iliopsoasLeft")} onR={updLL("iliopsoasRight")} />
              <BRow label="Rectus Femoris Muscle Length" lv={ll.rectusFemorisLeft} rv={ll.rectusFemorisRight} goal=">80°" onL={updLL("rectusFemorisLeft")} onR={updLL("rectusFemorisRight")} />
              <BRow label="Hip Quadrant Test" lv={ll.hipQuadrantLeft} rv={ll.hipQuadrantRight} onL={updLL("hipQuadrantLeft")} onR={updLL("hipQuadrantRight")} />
              <BRow label="Piriformis Muscle Length" lv={ll.piriformisLeft} rv={ll.piriformisRight} goal="<10°" onL={updLL("piriformisLeft")} onR={updLL("piriformisRight")} />
              <BRow label="DF Lunge Test" lv={ll.dfLungeLeft} rv={ll.dfLungeRight} goal=">10 cms" onL={updLL("dfLungeLeft")} onR={updLL("dfLungeRight")} />
              <BRow label="Calf Endurance Test" lv={ll.calfEnduranceLeft} rv={ll.calfEnduranceRight} goal=">30 reps" onL={updLL("calfEnduranceLeft")} onR={updLL("calfEnduranceRight")} />
              <BRow label="Single Leg Hop Test" lv={ll.singleHopLeft} rv={ll.singleHopRight} onL={updLL("singleHopLeft")} onR={updLL("singleHopRight")} />
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderCore() {
    const c = data.core;
    return (
      <div className="space-y-5">
        {/* Core Stability */}
        <SectionHead>Core Stability – TA Control in Supine (PBU)</SectionHead>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {(
                [
                  { level: "Level 1", desc: "Crook lying" },
                  { level: "Level 2", desc: "Single leg heel slide" },
                  { level: "Level 3", desc: "Single leg knee extension" },
                  { level: "Level 4", desc: "Double leg heel slide" },
                  { level: "Level 5", desc: "Double leg knee extension" },
                ] as const
              ).map(({ level, desc }) => (
                <tr key={level} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                  <td className="px-4 py-2.5 bg-input font-semibold text-text w-24 border-r border-border">{level}</td>
                  <td className="px-4 py-2.5 text-text-muted">{desc}</td>
                  <td className="px-3 py-1.5 w-32">
                    <input value={c.taControlLevel === level ? "✓" : ""}
                      onClick={() => updCore("taControlLevel")(c.taControlLevel === level ? "" : level)}
                      readOnly
                      className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-text text-center cursor-pointer outline-none hover:border-violet-500/50 transition select-none"
                      placeholder="Mark level" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Plank & Side Plank */}
        <SectionHead>Endurance & Strength</SectionHead>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full">
            <TableHead cols={["Test", "Left", "Right", "Goal"]} />
            <tbody>
              <tr className="border-b border-border hover:bg-surface/50 transition-colors">
                <td className="py-2 pr-3 text-sm text-text">Plank</td>
                <td colSpan={2} className="py-1.5 px-1.5">
                  <input value={c.plank} onChange={e => updCore("plank")(e.target.value)} className={CELL} placeholder="secs" />
                </td>
                <td className="py-2 pl-3 text-xs text-text-muted text-right w-32">180 sec</td>
              </tr>
              <BRow label="Side Plank" lv={c.sidePlankLeft} rv={c.sidePlankRight} goal="80 sec" onL={updCore("sidePlankLeft")} onR={updCore("sidePlankRight")} />
              <BRow label="Single Leg Bridge (90/90)" lv={c.singleLegBridgeLeft} rv={c.singleLegBridgeRight} goal="Lv1<60s / Lv2 60–90s / Lv3>90s" onL={updCore("singleLegBridgeLeft")} onR={updCore("singleLegBridgeRight")} />
              <BRow label="SLHB Test (Box 60cm, Knee 20°)" lv={c.slhbLeft} rv={c.slhbRight} goal=">30 Rep" onL={updCore("slhbLeft")} onR={updCore("slhbRight")} />
              <BRow label="RC Strength Test (IR & ER 45/45°)" lv={c.rcStrengthLeft} rv={c.rcStrengthRight} goal="MMT" onL={updCore("rcStrengthLeft")} onR={updCore("rcStrengthRight")} />
            </tbody>
          </table>
        </div>

        {/* Glute Control */}
        <SectionHead>Glute Control Testing</SectionHead>
        <div className="grid sm:grid-cols-2 gap-4">
          {(["Left", "Right"] as const).map(side => {
            const field = side === "Left" ? "gluteControlLeft" : "gluteControlRight";
            const val = c[field];
            return (
              <div key={side} className="rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2.5 bg-input border-b border-border">
                  <span className="text-xs font-black uppercase tracking-widest text-text-muted">{side}</span>
                </div>
                <div className="p-3 space-y-2">
                  {[
                    { level: "Level 1", desc: "< 60 secs" },
                    { level: "Level 2", desc: "60–90 secs" },
                    { level: "Level 3", desc: "> 90 secs" },
                  ].map(({ level, desc }) => (
                    <button key={level}
                      onClick={() => updCore(field)(val === level ? "" : level)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all ${
                        val === level
                          ? "bg-violet-500/15 border-violet-500/40 text-violet-600 dark:text-violet-400 font-bold"
                          : "border-border bg-surface text-text-muted hover:border-violet-500/20 hover:text-text"
                      }`}>
                      <span>{level}</span>
                      <span className="text-xs">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderPosture() {
    const po = data.posture;
    return (
      <div className="space-y-5">
        {/* Postural Assessment */}
        <SectionHead>Postural Assessment</SectionHead>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-input">
                <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-text-muted">Structure</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-text-muted w-40">Side</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-text-muted">Finding</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="px-4 py-2.5 font-semibold text-text" rowSpan={1}>Head</td>
                <td className="px-4 py-2 text-text-muted text-xs">Position</td>
                <td className="px-3 py-1.5">
                  <select value={po.head} onChange={e => updPosture("head")(e.target.value)} className={INP_SM}>
                    <option value="">Select…</option>
                    <option value="Neutral">Neutral</option>
                    <option value="Slightly Forward">Slightly Forward</option>
                    <option value="Forward">Forward</option>
                  </select>
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-2.5 font-semibold text-text" rowSpan={2}>Shoulders</td>
                <td className="px-4 py-2 text-text-muted text-xs">Left</td>
                <td className="px-3 py-1.5"><input value={po.shoulderLeft} onChange={e => updPosture("shoulderLeft")(e.target.value)} className={INP_SM} placeholder="—" /></td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-2 text-text-muted text-xs">Right</td>
                <td className="px-3 py-1.5"><input value={po.shoulderRight} onChange={e => updPosture("shoulderRight")(e.target.value)} className={INP_SM} placeholder="—" /></td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-2.5 font-semibold text-text">Thoracic Spine</td>
                <td className="px-4 py-2 text-text-muted text-xs">—</td>
                <td className="px-3 py-1.5"><input value={po.thoracicSpine} onChange={e => updPosture("thoracicSpine")(e.target.value)} className={INP_SM} placeholder="—" /></td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-2.5 font-semibold text-text">Lumbar Spine</td>
                <td className="px-4 py-2 text-text-muted text-xs">—</td>
                <td className="px-3 py-1.5"><input value={po.lumbarSpine} onChange={e => updPosture("lumbarSpine")(e.target.value)} className={INP_SM} placeholder="—" /></td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-2.5 font-semibold text-text">Pelvis</td>
                <td className="px-4 py-2 text-text-muted text-xs">—</td>
                <td className="px-3 py-1.5">
                  <select value={po.pelvis} onChange={e => updPosture("pelvis")(e.target.value)} className={INP_SM}>
                    <option value="">Select…</option>
                    <option value="Neutral">Neutral</option>
                    <option value="Left">Tilted Left</option>
                    <option value="Right">Tilted Right</option>
                    <option value="Raised Left">Raised Left</option>
                    <option value="Raised Right">Raised Right</option>
                    <option value="Lowered Left">Lowered Left</option>
                    <option value="Lowered Right">Lowered Right</option>
                  </select>
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-2.5 font-semibold text-text" rowSpan={2}>Knees</td>
                <td className="px-4 py-2 text-text-muted text-xs">Left</td>
                <td className="px-3 py-1.5"><input value={po.kneeLeft} onChange={e => updPosture("kneeLeft")(e.target.value)} className={INP_SM} placeholder="e.g. valgus, L>R" /></td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-2 text-text-muted text-xs">Right</td>
                <td className="px-3 py-1.5"><input value={po.kneeRight} onChange={e => updPosture("kneeRight")(e.target.value)} className={INP_SM} placeholder="—" /></td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-2.5 font-semibold text-text" rowSpan={2}>Foot</td>
                <td className="px-4 py-2 text-text-muted text-xs">Left – Medial Arch</td>
                <td className="px-3 py-1.5"><input value={po.footLeftArch} onChange={e => updPosture("footLeftArch")(e.target.value)} className={INP_SM} placeholder="—" /></td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-text-muted text-xs">Right – Medial Arch</td>
                <td className="px-3 py-1.5"><input value={po.footRightArch} onChange={e => updPosture("footRightArch")(e.target.value)} className={INP_SM} placeholder="—" /></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Palpation */}
        <SectionHead>Palpation — Pain / Muscle Spasm / Joint Hypomobility</SectionHead>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-input">
                {["Structure", "Left", "Right", "Notes"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PALPATION_STRUCTURES.map(structure => (
                <tr key={structure} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                  <td className="px-4 py-2.5 text-sm text-text bg-input/50 border-r border-border">{structure}</td>
                  <td className="px-2 py-1.5 w-28">
                    <input value={data.palpation[structure]?.left ?? ""} onChange={e => updPalp(structure, "left")(e.target.value)} className={CELL} placeholder="+/-" />
                  </td>
                  <td className="px-2 py-1.5 w-28">
                    <input value={data.palpation[structure]?.right ?? ""} onChange={e => updPalp(structure, "right")(e.target.value)} className={CELL} placeholder="+/-" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={data.palpation[structure]?.notes ?? ""} onChange={e => updPalp(structure, "notes")(e.target.value)} className={INP_SM} placeholder="—" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderFindings() {
    const { keyFindings, ybt } = data;
    return (
      <div className="space-y-5">
        {/* Key Findings */}
        <SectionHead>Key Findings for Follow Up</SectionHead>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-input">
                {["#", "Initial Date", "Key Finding", "Action", "Re-test Date", "Re-test Result"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-text-muted whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keyFindings.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                  <td className="px-3 py-2 text-text-muted font-bold w-8">{i + 1}</td>
                  <td className="px-2 py-1.5 w-32"><input type="date" value={row.initialDate} onChange={e => updFinding(i, "initialDate")(e.target.value)} className={INP_SM} /></td>
                  <td className="px-2 py-1.5"><input value={row.finding} onChange={e => updFinding(i, "finding")(e.target.value)} className={INP_SM} placeholder="Finding…" /></td>
                  <td className="px-2 py-1.5"><input value={row.action} onChange={e => updFinding(i, "action")(e.target.value)} className={INP_SM} placeholder="Action…" /></td>
                  <td className="px-2 py-1.5 w-32"><input type="date" value={row.retestDate} onChange={e => updFinding(i, "retestDate")(e.target.value)} className={INP_SM} /></td>
                  <td className="px-2 py-1.5"><input value={row.retest} onChange={e => updFinding(i, "retest")(e.target.value)} className={INP_SM} placeholder="Result…" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* YBT */}
        <SectionHead>Y Balance Test (YBT)</SectionHead>

        {/* Lower limb YBT */}
        <div>
          <p className="text-xs font-bold text-text mb-2">Lower Limb</p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-input">
                  {["Ryt Anterior", "R Post-Med", "R Post-Lat", "L Anterior", "L Post-Med", "L Post-Lat", "Comments"].map(h => (
                    <th key={h} className="px-2 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-text-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-surface/50 transition-colors">
                  {(
                    [
                      { f: "lowerRytAnterior" }, { f: "lowerRpm" }, { f: "lowerRpl" },
                      { f: "lowerLa" }, { f: "lowerLpm" }, { f: "lowerPl" },
                    ] as const
                  ).map(({ f }) => (
                    <td key={f} className="px-2 py-1.5">
                      <input value={ybt[f]} onChange={e => updYbt(f)(e.target.value)} className={CELL} placeholder="cm" />
                    </td>
                  ))}
                  <td className="px-2 py-1.5 min-w-[120px]">
                    <input value={ybt.lowerComments} onChange={e => updYbt("lowerComments")(e.target.value)} className={INP_SM} placeholder="—" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Upper limb YBT */}
        <div>
          <p className="text-xs font-bold text-text mb-2">Upper Limb</p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-input">
                  {["R Medial", "R Sup-Lat", "R Inf-Lat", "L Medial", "L Sup-Lat", "L Inf-Lat", "Comments"].map(h => (
                    <th key={h} className="px-2 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-text-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-surface/50 transition-colors">
                  {(
                    [
                      { f: "upperRm" }, { f: "upperRsl" }, { f: "upperRil" },
                      { f: "upperLm" }, { f: "upperLsl" }, { f: "upperLil" },
                    ] as const
                  ).map(({ f }) => (
                    <td key={f} className="px-2 py-1.5">
                      <input value={ybt[f]} onChange={e => updYbt(f)(e.target.value)} className={CELL} placeholder="cm" />
                    </td>
                  ))}
                  <td className="px-2 py-1.5 min-w-[120px]">
                    <input value={ybt.upperComments} onChange={e => updYbt("upperComments")(e.target.value)} className={INP_SM} placeholder="—" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  const tabContent: Record<TabId, () => React.ReactElement> = {
    history:        renderHistory,
    shoulder_spine: renderShoulderSpine,
    lower_limb:     renderLowerLimb,
    core:           renderCore,
    posture:        renderPosture,
    findings:       renderFindings,
  };

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-1.5 w-8 bg-violet-500 rounded-full shadow-sm" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">MSK Assessment</span>
          </div>
          <h1 className="text-2xl font-black text-text">Musculoskeletal Screening</h1>
          {patient && (
            <p className="text-text-muted text-sm">
              Patient: <span className="text-text font-semibold">{patient.name}</span>
            </p>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.id
                ? "bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30 shadow-sm"
                : "text-text-muted bg-input border border-border hover:bg-surface hover:text-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-input border border-border rounded-2xl p-5 shadow-sm">
        {tabContent[activeTab]()}
      </div>

      {/* Save */}
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={() => {
          const nextIdx = TABS.findIndex(t => t.id === activeTab) + 1;
          if (nextIdx < TABS.length) setActiveTab(TABS[nextIdx].id);
        }} className="text-text-muted">
          Next Section →
        </Button>
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
