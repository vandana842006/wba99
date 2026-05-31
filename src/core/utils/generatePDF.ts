import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { AppUser, Patient } from "../../types";

// ── Brand colours ──────────────────────────────────────────────────────────────
const BRAND_PRIMARY  = [99, 102, 241] as const;  // indigo-500
const BRAND_DARK     = [17,  24,  39]  as const;  // gray-900
const BRAND_MED      = [55,  65,  81]  as const;  // gray-700
const BRAND_LIGHT    = [107, 114, 128] as const;  // gray-500
const BRAND_HAIRLINE = [229, 231, 235] as [number, number, number];  // gray-200
const WHITE          = [255, 255, 255] as const;

type RGB = readonly [number, number, number];

// ── Helpers ────────────────────────────────────────────────────────────────────

function toDate(ts: unknown): Date | null {
  try {
    return (ts as { toDate?: () => Date })?.toDate?.() ?? new Date(ts as string);
  } catch {
    return null;
  }
}

function str(v: unknown): string {
  return v == null ? "—" : String(v);
}

function setFill(doc: jsPDF, rgb: RGB) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}

function setDraw(doc: jsPDF, rgb: RGB) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}

function setTextColor(doc: jsPDF, rgb: RGB) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

// ── Page dimensions ────────────────────────────────────────────────────────────
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN  = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ── Header ─────────────────────────────────────────────────────────────────────

function drawHeader(doc: jsPDF, _physio: AppUser, dateStr: string) {
  // Top gradient bar
  setFill(doc, BRAND_PRIMARY);
  doc.rect(0, 0, PAGE_W, 36, "F");

  // WBA99 wordmark
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  setTextColor(doc, WHITE);
  doc.text("WBA99", MARGIN, 22);

  // Tagline
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Physiotherapy Assessment Platform", MARGIN, 29);

  // Date — right aligned
  doc.setFontSize(8);
  doc.text(dateStr, PAGE_W - MARGIN, 22, { align: "right" });
  doc.text("Assessment Report", PAGE_W - MARGIN, 29, { align: "right" });

  // Divider shadow strip
  setFill(doc, [236, 237, 249] as const);
  doc.rect(0, 36, PAGE_W, 2, "F");
}

// ── Physiotherapist section ────────────────────────────────────────────────────

function drawPhysioSection(doc: jsPDF, physio: AppUser, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setTextColor(doc, BRAND_LIGHT);
  doc.text("TREATING PHYSIOTHERAPIST", MARGIN, y);
  y += 5;

  setFill(doc, [245, 245, 255] as const);
  setDraw(doc, BRAND_HAIRLINE);
  doc.roundedRect(MARGIN, y, CONTENT_W, 18, 3, 3, "FD");

  // Initials circle
  setFill(doc, BRAND_PRIMARY);
  doc.circle(MARGIN + 9, y + 9, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setTextColor(doc, WHITE);
  const initials = physio.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  doc.text(initials, MARGIN + 9, y + 10.5, { align: "center" });

  // Name + email
  setTextColor(doc, BRAND_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(physio.name, MARGIN + 20, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setTextColor(doc, BRAND_LIGHT);
  doc.text(physio.email, MARGIN + 20, y + 13);

  // "Physiotherapist" label right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setTextColor(doc, BRAND_PRIMARY);
  doc.text("Physiotherapist", PAGE_W - MARGIN - 2, y + 10.5, { align: "right" });

  return y + 24;
}

// ── Patient section ────────────────────────────────────────────────────────────

function drawPatientSection(doc: jsPDF, patient: Patient, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setTextColor(doc, BRAND_LIGHT);
  doc.text("PATIENT INFORMATION", MARGIN, y);
  y += 5;

  setFill(doc, WHITE);
  setDraw(doc, BRAND_HAIRLINE);
  doc.roundedRect(MARGIN, y, CONTENT_W, 22, 3, 3, "FD");

  const col2 = MARGIN + CONTENT_W / 2 + 4;

  const field = (label: string, value: string, x: number, fy: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    setTextColor(doc, BRAND_LIGHT);
    doc.text(label, x, fy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setTextColor(doc, BRAND_DARK);
    doc.text(value, x, fy + 5);
  };

  field("Name", patient.name, MARGIN + 4, y + 7);
  field("Age", `${patient.age} years`, MARGIN + 4, y + 15);
  field("Gender", patient.gender, col2, y + 7);
  field("Condition", patient.condition, col2, y + 15);

  return y + 28;
}

// ── Assessment banner ──────────────────────────────────────────────────────────

const TOOL_COLORS: Record<string, RGB> = {
  fms:           [99, 102, 241],
  rom:           [16, 185, 129],
  msk:           [139, 92, 246],
  posture:       [245, 158, 11],
  gait:          [14, 165, 233],
  gait_clinical: [20, 184, 166],
  prescription:  [239, 68, 68],
  inclinometer:  [6, 182, 212],
  facial_stress: [244, 63, 94],
  spinal:        [13, 148, 136],
};

const TOOL_LABELS: Record<string, string> = {
  fms:           "Functional Movement Screen (FMS)",
  rom:           "Range of Motion (ROM) Assessment",
  msk:           "Musculoskeletal (MSK) Assessment",
  posture:       "Posture Analysis",
  gait:          "Gait Analysis",
  gait_clinical: "Clinical Gait Analysis",
  prescription:  "Exercise Prescription",
  inclinometer:  "Digital Inclinometer",
  facial_stress: "Facial Expression & Stress Analysis",
  spinal:        "Spinal Analysis",
};

function drawAssessmentBanner(doc: jsPDF, toolType: string, dateStr: string, y: number): number {
  const color = TOOL_COLORS[toolType] ?? BRAND_PRIMARY;
  const label = TOOL_LABELS[toolType] ?? toolType.toUpperCase();

  setFill(doc, color);
  doc.roundedRect(MARGIN, y, CONTENT_W, 14, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setTextColor(doc, WHITE);
  doc.text(label, MARGIN + 6, y + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(dateStr, PAGE_W - MARGIN - 4, y + 9, { align: "right" });

  return y + 19;
}

// ── Section heading ────────────────────────────────────────────────────────────

function sectionHead(doc: jsPDF, title: string, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setTextColor(doc, BRAND_LIGHT);
  doc.text(title.toUpperCase(), MARGIN, y);
  setDraw(doc, BRAND_HAIRLINE);
  doc.setLineWidth(0.3);
  doc.line(MARGIN + doc.getTextWidth(title.toUpperCase()) + 3, y - 1, PAGE_W - MARGIN, y - 1);
  return y + 5;
}

// ── Score bar ──────────────────────────────────────────────────────────────────

function drawScoreBar(doc: jsPDF, value: number, max: number, color: RGB, y: number): number {
  const pct = Math.min(1, value / max);
  const barW = CONTENT_W;
  const barH = 5;

  setFill(doc, BRAND_HAIRLINE);
  doc.roundedRect(MARGIN, y, barW, barH, barH / 2, barH / 2, "F");

  setFill(doc, color);
  doc.roundedRect(MARGIN, y, barW * pct, barH, barH / 2, barH / 2, "F");

  return y + barH + 4;
}

// ── Notes box ─────────────────────────────────────────────────────────────────

function drawNotes(doc: jsPDF, text: string, label: string, y: number): number {
  y = sectionHead(doc, label, y);
  setFill(doc, [248, 250, 252] as const);
  setDraw(doc, BRAND_HAIRLINE);
  const lines = doc.splitTextToSize(text, CONTENT_W - 8);
  const boxH  = lines.length * 5 + 8;
  doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 2, 2, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setTextColor(doc, BRAND_MED);
  doc.text(lines, MARGIN + 4, y + 6);
  return y + boxH + 6;
}

type FmsPdfTest = {
  id: string;
  name: string;
  finalScore: number;
  leftScore?: number;
  rightScore?: number;
  asymmetry?: boolean;
  clearingPositive?: boolean;
  notes?: string;
};

function normalizeFMSData(d: Record<string, unknown>) {
  const legacyScores = d.scores as Record<string, number> | undefined;
  const tests: FmsPdfTest[] = Array.isArray(d.tests)
    ? (d.tests as Array<Record<string, unknown>>).map((test) => ({
        id: str(test.id),
        name: str(test.name || test.id),
        finalScore: Number(test.finalScore ?? 0),
        leftScore: test.leftScore == null ? undefined : Number(test.leftScore),
        rightScore: test.rightScore == null ? undefined : Number(test.rightScore),
        asymmetry: Boolean(test.asymmetry),
        clearingPositive: Boolean(test.clearingPositive),
        notes: test.notes ? str(test.notes) : undefined,
      }))
    : legacyScores
    ? Object.entries(legacyScores).map(([id, score]) => ({
        id,
        name: id.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        finalScore: Number(score),
      }))
    : [];

  const total = Number(d.total ?? tests.reduce((sum, test) => sum + test.finalScore, 0));
  return { total, tests };
}

// ── Footer ─────────────────────────────────────────────────────────────────────

function drawFooter(doc: jsPDF, page: number, total: number) {
  const y = PAGE_H - 10;
  setDraw(doc, BRAND_HAIRLINE);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y - 3, PAGE_W - MARGIN, y - 3);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setTextColor(doc, BRAND_LIGHT);
  doc.text("WBA99 Physiotherapy Platform  •  Confidential — for clinical use only", MARGIN, y);
  doc.text(`Page ${page} of ${total}`, PAGE_W - MARGIN, y, { align: "right" });
}

// ── FMS renderer ───────────────────────────────────────────────────────────────

function renderFMS(doc: jsPDF, d: Record<string, unknown>, yStart: number): number {
  let y = yStart;
  const { total, tests } = normalizeFMSData(d);
  const color: RGB = total >= 14 ? [16, 185, 129] : total >= 10 ? [245, 158, 11] : [239, 68, 68];
  const risk  = total >= 14 ? "Low Risk" : total >= 10 ? "Moderate Risk" : "High Risk";
  const asymmetryCount = tests.filter((test) => test.asymmetry).length;
  const clearingCount = tests.filter((test) => test.clearingPositive).length;

  // Score summary box
  setFill(doc, [248, 250, 252] as const);
  setDraw(doc, BRAND_HAIRLINE);
  doc.roundedRect(MARGIN, y, CONTENT_W, 20, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  setTextColor(doc, color);
  doc.text(String(total), MARGIN + 8, y + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setTextColor(doc, BRAND_LIGHT);
  doc.text("/ 21", MARGIN + 20, y + 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setTextColor(doc, color);
  doc.text(risk, MARGIN + 8, y + 19);

  // Interpretation
  const interp = total >= 14
    ? "Score indicates LOW functional risk. The patient demonstrates adequate movement patterns."
    : total >= 10
    ? "Score indicates MODERATE functional risk. Targeted interventions recommended."
    : "Score indicates HIGH functional risk. Comprehensive rehabilitation program advised.";
  const interpLines = doc.splitTextToSize(interp, CONTENT_W - 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setTextColor(doc, BRAND_MED);
  doc.text(interpLines, MARGIN + 50, y + 8);
  if (asymmetryCount || clearingCount) {
    const marker = [
      asymmetryCount ? `Asymmetries: ${asymmetryCount}` : null,
      clearingCount ? `Clearing positives: ${clearingCount}` : null,
    ].filter(Boolean).join("  |  ");
    doc.setFontSize(7.5);
    setTextColor(doc, BRAND_LIGHT);
    doc.text(marker, MARGIN + 50, y + 17);
  }

  y += 25;
  y = drawScoreBar(doc, total, 21, color, y);

  if (tests.length > 0) {
    y = sectionHead(doc, "Movement Scores", y);
    const hasBilateral = tests.some((test) => test.leftScore != null || test.rightScore != null);
    const hasFlags = tests.some((test) => test.asymmetry || test.clearingPositive);
    const hasNotes = tests.some((test) => test.notes);
    const rows = tests.map((test) => [
      test.name,
      hasBilateral ? (test.leftScore ?? "—") : undefined,
      hasBilateral ? (test.rightScore ?? "—") : undefined,
      test.finalScore,
      test.finalScore >= 2 ? "Pass" : test.finalScore === 1 ? "Caution" : "Fail",
      hasFlags
        ? [
            test.asymmetry ? "Asymmetry" : null,
            test.clearingPositive ? "Clearing +" : null,
          ].filter(Boolean).join(", ") || "—"
        : undefined,
      hasNotes ? test.notes ?? "—" : undefined,
    ].filter((value) => value !== undefined));
    const head = [
      "Movement",
      ...(hasBilateral ? ["Left", "Right"] : []),
      "Score",
      "Status",
      ...(hasFlags ? ["Flags"] : []),
      ...(hasNotes ? ["Notes"] : []),
    ];
    autoTable(doc, {
      startY: y,
      head: [head],
      body: rows,
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 8.5, cellPadding: 3, lineColor: BRAND_HAIRLINE, lineWidth: 0.3 },
      headStyles: { fillColor: BRAND_PRIMARY as [number, number, number], textColor: 255, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { textColor: BRAND_DARK as [number, number, number] },
      columnStyles: {
        [hasBilateral ? 3 : 1]: { halign: "center", fontStyle: "bold" },
        [hasBilateral ? 4 : 2]: { halign: "center" },
      },
      didParseCell: (data) => {
        const scoreColumnIndex = hasBilateral ? 3 : 1;
        const statusColumnIndex = hasBilateral ? 4 : 2;
        if (data.section === "body" && data.column.index === statusColumnIndex) {
          const val = data.cell.text[0];
          data.cell.styles.textColor =
            val === "Pass"   ? [16, 185, 129] :
            val === "Caution"? [245, 158, 11] : [239, 68, 68];
        }
        if (data.section === "body" && data.column.index === scoreColumnIndex) {
          const score = Number(data.cell.text[0]);
          data.cell.styles.textColor =
            score >= 2 ? [16, 185, 129] :
            score === 1 ? [245, 158, 11] : [239, 68, 68];
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  if (d.notes) y = drawNotes(doc, str(d.notes), "Clinical Notes", y);
  return y;
}

// ── ROM renderer ───────────────────────────────────────────────────────────────

function renderROM(doc: jsPDF, d: Record<string, unknown>, yStart: number): number {
  let y = yStart;
  const joints = d.joints as Record<string, { active?: number; passive?: number; normal?: string }> | undefined;

  if (!joints || !Object.keys(joints).length) {
    doc.setFontSize(9);
    setTextColor(doc, BRAND_LIGHT);
    doc.text("No joint data recorded.", MARGIN, y);
    return y + 10;
  }

  y = sectionHead(doc, `${Object.keys(joints).length} Joints Measured`, y);

  const rows = Object.entries(joints).map(([joint, vals]) => [
    joint.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    vals.active != null ? `${vals.active}°` : "—",
    vals.passive != null ? `${vals.passive}°` : "—",
    vals.normal ?? "—",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Joint / Movement", "Active ROM", "Passive ROM", "Normal Range"]],
    body: rows,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 8.5, cellPadding: 3.5, lineColor: BRAND_HAIRLINE, lineWidth: 0.3 },
    headStyles: { fillColor: [16, 185, 129] as [number, number, number], textColor: 255, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { textColor: BRAND_DARK as [number, number, number] },
    columnStyles: {
      1: { halign: "center", textColor: [16, 185, 129] as [number, number, number], fontStyle: "bold" },
      2: { halign: "center", textColor: [14, 165, 233] as [number, number, number], fontStyle: "bold" },
      3: { halign: "center", textColor: BRAND_LIGHT as [number, number, number] },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  if (d.notes) y = drawNotes(doc, str(d.notes), "Clinical Notes", y);
  return y;
}

// ── MSK renderer ───────────────────────────────────────────────────────────────

function renderMSK(doc: jsPDF, d: Record<string, unknown>, yStart: number): number {
  let y = yStart;
  const areas = d.selectedAreas as Record<string, string[]> | undefined;
  const filled = areas ? Object.entries(areas).filter(([, arr]) => arr.length > 0) : [];

  // Summary chips
  setFill(doc, [248, 250, 252] as const);
  setDraw(doc, BRAND_HAIRLINE);
  doc.roundedRect(MARGIN, y, 55, 16, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  setTextColor(doc, BRAND_PRIMARY);
  doc.text(String(d.totalAffected ?? filled.reduce((s, [, a]) => s + a.length, 0)), MARGIN + 10, y + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setTextColor(doc, BRAND_LIGHT);
  doc.text("TOTAL FINDINGS", MARGIN + 22, y + 12);

  doc.roundedRect(MARGIN + 62, y, 45, 16, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  setTextColor(doc, [139, 92, 246] as const);
  doc.text(String(filled.length), MARGIN + 72, y + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setTextColor(doc, BRAND_LIGHT);
  doc.text("REGIONS", MARGIN + 84, y + 12);

  y += 22;

  if (filled.length > 0) {
    y = sectionHead(doc, "Affected Regions & Symptoms", y);
    const rows = filled.map(([region, symptoms]) => [
      region.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      symptoms.map((s) => s.replace(/_/g, " ")).join(", "),
    ]);
    autoTable(doc, {
      startY: y,
      head: [["Region", "Reported Symptoms"]],
      body: rows,
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 8.5, cellPadding: 4, lineColor: BRAND_HAIRLINE, lineWidth: 0.3 },
      headStyles: { fillColor: [139, 92, 246] as [number, number, number], textColor: 255, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { textColor: BRAND_DARK as [number, number, number] },
      columnStyles: { 0: { fontStyle: "bold" } },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  return y;
}

// ── Posture renderer ───────────────────────────────────────────────────────────

function renderPosture(doc: jsPDF, d: Record<string, unknown>, yStart: number): number {
  let y = yStart;
  const score = (d.score as number) ?? 0;
  const color: RGB = score >= 80 ? [16, 185, 129] : score >= 50 ? [245, 158, 11] : [239, 68, 68];
  const label  = score >= 80 ? "Good Posture" : score >= 50 ? "Moderate Concern" : "Poor Posture";

  // Score summary
  setFill(doc, [248, 250, 252] as const);
  setDraw(doc, BRAND_HAIRLINE);
  doc.roundedRect(MARGIN, y, CONTENT_W, 18, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  setTextColor(doc, color);
  doc.text(`${score}`, MARGIN + 8, y + 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setTextColor(doc, BRAND_LIGHT);
  doc.text(d.analysisType === "landmark" ? "/ 100" : "%", MARGIN + 24, y + 13);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setTextColor(doc, color);
  doc.text(label, MARGIN + 8, y + 17);
  y += 23;
  y = drawScoreBar(doc, score, 100, color, y);

  if (d.analysisType === "landmark") {
    type LmFinding = { region: string; status: string; alignment: string; normal: string; causes?: string[]; rehab?: string[] };
    const findings = (d.findings as LmFinding[]) ?? [];
    const modeName = str(d.modeName || d.mode);

    if (findings.length > 0) {
      y = sectionHead(doc, `Landmark Analysis — ${modeName}`, y);
      const rows = findings.map((f) => [
        f.region,
        f.alignment,
        f.normal,
        f.status?.toUpperCase() ?? "—",
      ]);
      autoTable(doc, {
        startY: y,
        head: [["Region", "Alignment Finding", "Normal", "Status"]],
        body: rows,
        margin: { left: MARGIN, right: MARGIN },
        styles: { fontSize: 8.5, cellPadding: 3.5, lineColor: BRAND_HAIRLINE, lineWidth: 0.3 },
        headStyles: { fillColor: [245, 158, 11] as [number, number, number], textColor: 255, fontStyle: "bold", fontSize: 8 },
        bodyStyles: { textColor: BRAND_DARK as [number, number, number] },
        columnStyles: { 3: { halign: "center", fontStyle: "bold" } },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 3) {
            const v = data.cell.text[0];
            data.cell.styles.textColor =
              v === "GOOD" ? [16, 185, 129] : v === "WARN" ? [245, 158, 11] : [239, 68, 68];
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 6;

      // Rehab recommendations
      const rehabFindings = findings.filter((f) => f.status !== "good" && f.rehab?.length);
      if (rehabFindings.length > 0) {
        y = sectionHead(doc, "Rehabilitation Recommendations", y);
        for (const f of rehabFindings) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          setTextColor(doc, BRAND_DARK);
          doc.text(f.region, MARGIN, y);
          y += 4;
          for (const r of f.rehab ?? []) {
            const lines = doc.splitTextToSize(`• ${r}`, CONTENT_W - 6);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            setTextColor(doc, BRAND_MED);
            doc.text(lines, MARGIN + 4, y);
            y += lines.length * 4.5;
          }
          y += 2;
        }
      }
    }
  } else {
    // Manual checklist
    const checkpoints = (d.checkpoints as string[]) ?? [];
    const total = (d.totalCheckpoints as number) ?? 20;

    y = sectionHead(doc, `Manual Checklist — ${checkpoints.length} / ${total} Passed`, y);
    if (checkpoints.length > 0) {
      const cols = 3;
      const colW = CONTENT_W / cols;
      checkpoints.forEach((cp, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = MARGIN + col * colW;
        const cy = y + row * 7;
        setFill(doc, [16, 185, 129] as const);
        doc.circle(cx + 2, cy - 1, 1.5, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        setTextColor(doc, BRAND_MED);
        doc.text(cp.replace(/_/g, " "), cx + 5.5, cy);
      });
      y += Math.ceil(checkpoints.length / cols) * 7 + 4;
    }
    if (d.notes) y = drawNotes(doc, str(d.notes), "Clinical Notes", y);
  }

  return y;
}

// ── Gait renderer ──────────────────────────────────────────────────────────────

function renderGait(doc: jsPDF, d: Record<string, unknown>, yStart: number): number {
  let y = yStart;
  const total = (d.total as number) ?? 0;
  const color: RGB = total >= 12 ? [16, 185, 129] : total >= 8 ? [245, 158, 11] : [239, 68, 68];
  const risk  = total >= 12 ? "Normal Gait" : total >= 8 ? "Mild Deviation" : "Significant Deviation";
  const scores = d.scores as Record<string, number> | undefined;

  // Score box
  setFill(doc, [248, 250, 252] as const);
  setDraw(doc, BRAND_HAIRLINE);
  doc.roundedRect(MARGIN, y, CONTENT_W, 18, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  setTextColor(doc, color);
  doc.text(String(total), MARGIN + 8, y + 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setTextColor(doc, BRAND_LIGHT);
  doc.text("/ 15", MARGIN + 20, y + 13);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setTextColor(doc, color);
  doc.text(risk, MARGIN + 8, y + 17);

  // Metrics right side
  const metrics: Array<[string, unknown]> = [
    ["Cadence", d.cadence !== undefined ? `${d.cadence} spm` : null],
    ["Speed",   d.speed !== undefined   ? `${d.speed} m/s`  : null],
  ].filter(([, v]) => v != null) as Array<[string, unknown]>;

  metrics.forEach(([label, value], i) => {
    const mx = PAGE_W - MARGIN - 6 - i * 35;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setTextColor(doc, BRAND_LIGHT);
    doc.text(label, mx, y + 7, { align: "right" });
    doc.setFontSize(10);
    setTextColor(doc, BRAND_PRIMARY);
    doc.text(String(value), mx, y + 14, { align: "right" });
  });

  y += 23;
  y = drawScoreBar(doc, total, 15, color, y);

  if (scores && Object.keys(scores).length > 0) {
    y = sectionHead(doc, "Component Scores", y);
    const rows = Object.entries(scores).map(([k, v]) => [
      k.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      v,
    ]);
    autoTable(doc, {
      startY: y,
      head: [["Component", "Score"]],
      body: rows,
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 8.5, cellPadding: 3.5, lineColor: BRAND_HAIRLINE, lineWidth: 0.3 },
      headStyles: { fillColor: [14, 165, 233] as [number, number, number], textColor: 255, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { textColor: BRAND_DARK as [number, number, number] },
      columnStyles: { 1: { halign: "center", fontStyle: "bold" } },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  if (d.observations) y = drawNotes(doc, str(d.observations), "Clinical Observations", y);
  return y;
}

// ── Clinical Gait renderer ─────────────────────────────────────────────────────

const CLINICAL_GAIT_PHASES = [
  { id: "ic",  abbr: "IC",  label: "Initial Contact",  phase: "Stance" },
  { id: "lr",  abbr: "LR",  label: "Loading Response", phase: "Stance" },
  { id: "ms",  abbr: "MS",  label: "Mid Stance",       phase: "Stance" },
  { id: "ts",  abbr: "TS",  label: "Terminal Stance",  phase: "Stance" },
  { id: "ps",  abbr: "PS",  label: "Pre-Swing",        phase: "Stance" },
  { id: "is",  abbr: "IS",  label: "Initial Swing",    phase: "Swing"  },
  { id: "msw", abbr: "MSw", label: "Mid Swing",        phase: "Swing"  },
  { id: "tsw", abbr: "TSw", label: "Terminal Swing",   phase: "Swing"  },
];

// ── Kinematic graph helpers ────────────────────────────────────────────────────

const GAIT_CYCLE_PCT: number[] = [0, 10, 30, 50, 60, 73, 87, 100];

type KinRow = Record<string, string>;

function parseAngleVal(s: string | undefined): number | null {
  if (!s) return null;
  const lower = s.toLowerCase().trim();
  if (lower === "neutral" || lower === "stable") return 0;
  const m = s.match(/-?\d+\.?\d*/);
  if (!m) return null;
  const val = parseFloat(m[0]);
  if (lower.includes("ext") || lower.includes(" pf") || lower.includes("plantarflex")) return -Math.abs(val);
  return val;
}

function parseRefBand(s: string | undefined): [number, number] | null {
  if (!s) return null;
  const lower = s.toLowerCase().trim();
  if (lower === "neutral" || lower === "stable") return [-5, 5];
  const isNeg = lower.includes("ext") || lower.includes(" pf") || lower.includes("plantarflex");
  const nums = s.match(/\d+\.?\d*/g)?.map(Number) ?? [];
  if (nums.length === 0) return null;
  if (nums.length === 1) {
    const v = isNeg ? -nums[0] : nums[0];
    return [v - 3, v + 3];
  }
  const lo = Math.min(nums[0], nums[1]);
  const hi = Math.max(nums[0], nums[1]);
  return isNeg ? [-hi, -lo] : [lo, hi];
}

function drawKinematicGraph(
  doc: jsPDF,
  rows: KinRow[],
  joint: "ankle" | "knee" | "hip",
  gx: number, gy: number, gw: number, gh: number,
  highlightPhaseIdx?: number,
): void {
  const cfgs: Record<string, { yMin: number; yMax: number; label: string; valKey: string; refKey: string; color: [number, number, number] }> = {
    ankle: { yMin: -30, yMax: 22,  label: "Ankle  DF(+) / PF(−) (°) -->", valKey: "ankle", refKey: "ankle_ideal", color: [232, 121, 249] },
    knee:  { yMin: -5,  yMax: 70,  label: "Knee Flexion (°) -->",           valKey: "knee",  refKey: "knee_ideal",  color: [74,  222, 128] },
    hip:   { yMin: -32, yMax: 36,  label: "Hip  Flex(+) / Ext(−) (°) -->", valKey: "hip",   refKey: "hip_ideal",   color: [249, 115, 22]  },
  };
  const cfg = cfgs[joint];
  const yRange = cfg.yMax - cfg.yMin;

  const toX = (pct: number) => gx + (pct / 100) * gw;
  const toY = (val: number) => gy + gh - ((val - cfg.yMin) / yRange) * gh;
  const clampY = (cy: number) => Math.max(gy, Math.min(gy + gh, cy));

  // Background
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(220, 225, 230);
  doc.setLineWidth(0.25);
  doc.rect(gx, gy, gw, gh, "FD");

  // Phase highlight band (current phase on per-phase pages)
  if (highlightPhaseIdx !== undefined && highlightPhaseIdx >= 0 && highlightPhaseIdx < GAIT_CYCLE_PCT.length) {
    const h0 = GAIT_CYCLE_PCT[highlightPhaseIdx]!;
    const h1 = highlightPhaseIdx + 1 < GAIT_CYCLE_PCT.length ? GAIT_CYCLE_PCT[highlightPhaseIdx + 1]! : 100;
    if (h1 > h0) {
      doc.setFillColor(255, 245, 180);
      doc.rect(toX(h0), gy, toX(h1) - toX(h0), gh, "F");
    }
  }

  // Reference band — light green fill per phase segment
  for (let i = 0; i < rows.length; i++) {
    const pct0 = GAIT_CYCLE_PCT[i];
    const pct1 = i < GAIT_CYCLE_PCT.length - 1 ? GAIT_CYCLE_PCT[i + 1] : pct0;
    if (pct0 === undefined || pct1 === undefined || pct0 === pct1) continue;
    const band = parseRefBand(rows[i][cfg.refKey]);
    if (!band) continue;
    const rx = toX(pct0);
    const rw = toX(pct1) - rx;
    const ryTop = clampY(toY(band[1]));
    const ryBot = clampY(toY(band[0]));
    const bandH = Math.abs(ryBot - ryTop);
    if (bandH < 0.1) continue;
    doc.setFillColor(208, 242, 218);
    doc.rect(rx, Math.min(ryTop, ryBot), rw, bandH, "F");
  }

  // Horizontal grid lines
  const step = yRange > 55 ? 20 : 10;
  for (let v = Math.ceil(cfg.yMin / step) * step; v <= cfg.yMax; v += step) {
    const vy = toY(v);
    if (vy < gy - 0.1 || vy > gy + gh + 0.1) continue;
    doc.setDrawColor(220, 225, 230);
    doc.setLineWidth(0.12);
    doc.setLineDashPattern([0.8, 0.8], 0);
    doc.line(gx, vy, gx + gw, vy);
    doc.setLineDashPattern([], 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(4.5);
    doc.setTextColor(130, 138, 148);
    doc.text(String(v), gx - 1.5, vy + 1.2, { align: "right" });
  }

  // Zero line for joints that cross neutral=0
  if (cfg.yMin < 0 && cfg.yMax > 0) {
    const zy = toY(0);
    if (zy >= gy && zy <= gy + gh) {
      doc.setDrawColor(130, 138, 148);
      doc.setLineWidth(0.3);
      doc.setLineDashPattern([2, 1.2], 0);
      doc.line(gx, zy, gx + gw, zy);
      doc.setLineDashPattern([], 0);
    }
  }

  // Vertical phase markers + labels
  CLINICAL_GAIT_PHASES.forEach((phase, i) => {
    const pct = GAIT_CYCLE_PCT[i];
    if (pct === undefined) return;
    const vx = toX(pct);
    doc.setDrawColor(200, 210, 220);
    doc.setLineWidth(0.12);
    doc.setLineDashPattern([0.8, 0.8], 0);
    doc.line(vx, gy, vx, gy + gh);
    doc.setLineDashPattern([], 0);
    const isS = phase.phase === "Stance";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(4);
    doc.setTextColor(isS ? 20 : 14, isS ? 184 : 165, isS ? 166 : 233);
    doc.text(`${pct}(${phase.abbr})`, vx, gy + gh + 3.8, { align: "center" });
  });

  // Reference midline — dashed green + dots
  const refPts: Array<{ x: number; y: number }> = [];
  rows.forEach((row, i) => {
    const pct = GAIT_CYCLE_PCT[i];
    if (pct === undefined) return;
    const band = parseRefBand(row[cfg.refKey]);
    if (!band) return;
    refPts.push({ x: toX(pct), y: clampY(toY((band[0] + band[1]) / 2)) });
  });
  if (refPts.length >= 2) {
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.6);
    doc.setLineDashPattern([1.5, 1], 0);
    for (let i = 0; i < refPts.length - 1; i++) {
      doc.line(refPts[i].x, refPts[i].y, refPts[i + 1].x, refPts[i + 1].y);
    }
    doc.setLineDashPattern([], 0);
    refPts.forEach((pt) => { doc.setFillColor(16, 185, 129); doc.circle(pt.x, pt.y, 0.85, "F"); });
  }

  // Measured values — line + dots
  const measPts: Array<{ x: number; y: number }> = [];
  rows.forEach((row, i) => {
    const pct = GAIT_CYCLE_PCT[i];
    if (pct === undefined) return;
    const v = parseAngleVal(row[cfg.valKey]);
    if (v === null) return;
    measPts.push({ x: toX(pct), y: clampY(toY(v)) });
  });
  if (measPts.length >= 2) {
    doc.setDrawColor(cfg.color[0], cfg.color[1], cfg.color[2]);
    doc.setLineWidth(0.9);
    for (let i = 0; i < measPts.length - 1; i++) {
      doc.line(measPts[i].x, measPts[i].y, measPts[i + 1].x, measPts[i + 1].y);
    }
  }
  measPts.forEach((pt) => {
    doc.setFillColor(cfg.color[0], cfg.color[1], cfg.color[2]);
    doc.circle(pt.x, pt.y, 1.2, "F");
    doc.setFillColor(255, 255, 255);
    doc.circle(pt.x, pt.y, 0.5, "F");
  });

  // Redraw border on top
  doc.setDrawColor(200, 210, 220);
  doc.setLineWidth(0.25);
  doc.rect(gx, gy, gw, gh, "D");

  // Y-axis label (top-left)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(cfg.color[0], cfg.color[1], cfg.color[2]);
  doc.text(cfg.label, gx, gy - 2.5);

  // Legend
  const lx = gx + gw - 44, ly = gy + 3.5;
  doc.setFillColor(16, 185, 129);
  doc.circle(lx, ly, 0.9, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.5);
  doc.setTextColor(130, 138, 148);
  doc.text("Reference Values", lx + 2.5, ly + 1.2);
  doc.setFillColor(cfg.color[0], cfg.color[1], cfg.color[2]);
  doc.circle(lx + 26, ly, 0.9, "F");
  doc.text("Assessed Values", lx + 28.5, ly + 1.2);
}

function renderClinicalGait(doc: jsPDF, d: Record<string, unknown>, yStart: number): number {
  let y = yStart;
  const total = (d.total_score as number) ?? 0;
  const color: RGB = total >= 20 ? [20, 184, 166] : total >= 13 ? [245, 158, 11] : [239, 68, 68];
  const risk  = total >= 20 ? "Low Risk" : total >= 13 ? "Moderate Risk" : "High Risk";

  // Score box
  setFill(doc, [248, 250, 252] as const);
  setDraw(doc, BRAND_HAIRLINE);
  doc.roundedRect(MARGIN, y, CONTENT_W, 18, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  setTextColor(doc, color);
  doc.text(String(total), MARGIN + 8, y + 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setTextColor(doc, BRAND_LIGHT);
  doc.text("/ 24", MARGIN + 22, y + 13);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setTextColor(doc, color);
  doc.text(risk, MARGIN + 8, y + 17);
  if (d.view_mode) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    setTextColor(doc, BRAND_PRIMARY);
    doc.text(`View: ${String(d.view_mode).toUpperCase()}`, MARGIN + 36, y + 7);
  }

  // Spatiotemporal metrics on right
  const metrics: Array<[string, unknown]> = [
    ["Cadence", (d.spatiotemporal as Record<string, unknown> | undefined)?.cadence ?? (d.cadence !== undefined ? `${d.cadence} spm` : null)],
    ["Speed",   (d.spatiotemporal as Record<string, unknown> | undefined)?.speed ?? (d.speed !== undefined ? `${d.speed} m/s` : null)],
    ["Stride",  (d.spatiotemporal as Record<string, unknown> | undefined)?.stride_length ?? (d.stride_length !== undefined ? `${d.stride_length} cm` : null)],
  ].filter(([, v]) => v != null) as Array<[string, unknown]>;

  metrics.slice(0, 2).forEach(([label, value], i) => {
    const mx = PAGE_W - MARGIN - 6 - i * 38;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setTextColor(doc, BRAND_LIGHT);
    doc.text(label, mx, y + 7, { align: "right" });
    doc.setFontSize(10);
    setTextColor(doc, BRAND_PRIMARY);
    doc.text(String(value), mx, y + 14, { align: "right" });
  });

  y += 23;
  y = drawScoreBar(doc, total, 24, color, y);

  // Metrics bar
  const spatioData = d.spatiotemporal as Record<string, unknown> | undefined;
  const cycleData  = d.gait_cycle_breakdown as Record<string, unknown> | undefined;
  const metricsBar: Array<[string, string]> = [
    ["STEP LEN",   String(spatioData?.step_length   ?? "—")],
    ["STRIDE LEN", String(spatioData?.stride_length ?? "—")],
    ["CADENCE",    String(spatioData?.cadence       ?? "—")],
    ["WALK SPEED", String(spatioData?.speed         ?? "—")],
    ["STANCE %",   `${cycleData?.stance_phase_percent ?? 60}%`],
    ["SWING %",    `${cycleData?.swing_phase_percent  ?? 40}%`],
    ["GAIT SCORE", `${Math.round((total / 24) * 100)}/100`],
    ["RISK",       risk],
  ];
  if (y + 14 > PAGE_H - 20) { doc.addPage(); y = 44; }
  const mBarH = 14;
  const mCellW = CONTENT_W / metricsBar.length;
  setFill(doc, [248, 250, 252] as const);
  setDraw(doc, BRAND_HAIRLINE);
  doc.roundedRect(MARGIN, y, CONTENT_W, mBarH, 2, 2, "FD");
  metricsBar.forEach(([label, value], i) => {
    const cx = MARGIN + i * mCellW + mCellW / 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5);
    setTextColor(doc, BRAND_LIGHT);
    doc.text(label, cx, y + 4, { align: "center" });
    doc.setFontSize(7.5);
    setTextColor(doc, i === 6 ? color : [20, 184, 166] as RGB);
    doc.text(value, cx, y + 11, { align: "center" });
  });
  y += mBarH + 6;

  // ── Kinematic Data — Ankle / Knee / Hip reference tables ────────────────────
  type JATrow = { phase: string; abbr: string; hip: string; knee: string; ankle: string; hip_ideal: string; knee_ideal: string; ankle_ideal: string; status: string };
  const jatAll: JATrow[] = Array.isArray(d.joint_angle_table) ? d.joint_angle_table as JATrow[] : [];

  if (jatAll.length > 0) {
    if (y + 80 > PAGE_H - 20) { doc.addPage(); y = 44; }
    y = sectionHead(doc, "Kinematic Data — Joint Angles vs Reference Values", y);

    const jointDefs = [
      {
        title: "Ankle Angle",
        note: ">90° = Plantarflexion  |  <90° = Dorsiflexion",
        col: (r: JATrow) => r.ankle,
        ref: (r: JATrow) => r.ankle_ideal,
        color: [232, 121, 249] as [number, number, number],
      },
      {
        title: "Knee Angle",
        note: ">180° = Hyperextension  |  <180° = Flexion",
        col: (r: JATrow) => r.knee,
        ref: (r: JATrow) => r.knee_ideal,
        color: [74, 222, 128] as [number, number, number],
      },
      {
        title: "Hip Angle",
        note: "(+) = Flexion  |  (–) = Extension",
        col: (r: JATrow) => r.hip,
        ref: (r: JATrow) => r.hip_ideal,
        color: [249, 115, 22] as [number, number, number],
      },
    ];

    for (const jd of jointDefs) {
      if (y + 40 > PAGE_H - 20) { doc.addPage(); y = 44; }

      // Joint sub-heading
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      setTextColor(doc, BRAND_DARK);
      doc.text(jd.title, MARGIN, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      setTextColor(doc, BRAND_LIGHT);
      doc.text(jd.note, MARGIN + doc.getTextWidth(jd.title) + 4, y);
      y += 4;

      const tableRows = jatAll.map((r) => [
        `${r.abbr}  ${r.phase}`,
        jd.col(r) || "—",
        jd.ref(r) || "—",
      ]);

      autoTable(doc, {
        startY: y,
        head: [["Phase", "Measured", "Reference Value"]],
        body: tableRows,
        margin: { left: MARGIN, right: MARGIN },
        styles: { fontSize: 7.5, cellPadding: 2.5, lineColor: BRAND_HAIRLINE, lineWidth: 0.3 },
        headStyles: { fillColor: jd.color, textColor: 255, fontStyle: "bold", fontSize: 7.5 },
        bodyStyles: { textColor: BRAND_DARK as [number, number, number] },
        columnStyles: {
          1: { halign: "center", fontStyle: "bold", textColor: jd.color },
          2: { halign: "center", textColor: BRAND_LIGHT as [number, number, number] },
        },
      });
      y = (doc as any).lastAutoTable.finalY + 5;
    }
    y += 2;

    // ── Kinematic Graphs (line plots) ──────────────────────────────────────
    if (y + 130 > PAGE_H - 20) { doc.addPage(); y = 44; }
    y = sectionHead(doc, "Kinematic Graphs — Lateral View", y);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    setTextColor(doc, BRAND_MED);
    doc.text("Graphs for the lateral views of the gait cycle  (Gait Cycle % ➡)", MARGIN, y);
    y += 6;

    const graphX = MARGIN + 9;
    const graphW = CONTENT_W - 9;
    const graphH = 32;
    const graphGap = 9;

    for (const joint of ["ankle", "knee", "hip"] as const) {
      if (y + graphH + graphGap > PAGE_H - 20) { doc.addPage(); y = 44; }
      drawKinematicGraph(doc, jatAll as KinRow[], joint, graphX, y, graphW, graphH);
      y += graphH + graphGap;
    }

    // Footnotes
    y += 2;
    const graphFns = [
      "a. Ankle angle > 90° = plantarflexion  |  < 90° = dorsiflexion.",
      "b. Knee angle > 180° = hyperextension  |  < 180° = flexion.",
      "c. Hip angle > 0° = flexion  |  < 0° = extension.",
    ];
    graphFns.forEach((fn) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      setTextColor(doc, BRAND_LIGHT);
      doc.text(fn, MARGIN, y);
      y += 3.8;
    });
    y += 4;
  }

  // 8 Gait Frames (clean thumbnails)
  const thumbs = Array.isArray(d.thumbnails) ? d.thumbnails as string[] : [];
  if (thumbs.length > 0) {
    if (y + 50 > PAGE_H - 20) { doc.addPage(); y = 44; }
    y = sectionHead(doc, "8 Analysed Gait Frames", y);
    const cols = 4;
    const rows = 2;
    const fGap = 3;
    const fW = (CONTENT_W - fGap * (cols - 1)) / cols;
    const fH = fW * (9 / 16); // 16:9 aspect ratio
    for (let row = 0; row < rows; row++) {
      if (y + fH > PAGE_H - 20) { doc.addPage(); y = 44; }
      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        if (idx >= thumbs.length) continue;
        const fx = MARGIN + col * (fW + fGap);
        const fy = y;
        const thumb = thumbs[idx];
        const phaseInfo = CLINICAL_GAIT_PHASES[idx];
        // Image
        try {
          const fmt = thumb.startsWith("data:image/png") ? "PNG" : "JPEG";
          doc.addImage(thumb, fmt, fx, fy, fW, fH);
        } catch {
          setFill(doc, [30, 41, 59] as const);
          doc.rect(fx, fy, fW, fH, "F");
        }
        // Phase label overlay
        setFill(doc, [0, 0, 0] as const);
        doc.rect(fx, fy + fH - 5, fW, 5, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5);
        setTextColor(doc, phaseInfo?.phase === "Stance" ? [16, 185, 129] : [14, 165, 233] as RGB);
        doc.text(phaseInfo?.abbr ?? "", fx + 1.5, fy + fH - 1.5);
        doc.setFont("helvetica", "normal");
        setTextColor(doc, [156, 163, 175] as const);
        doc.text(phaseInfo?.label ?? "", fx + fW - 1.5, fy + fH - 1.5, { align: "right" });
      }
      y += fH + fGap;
    }
    y += 4;
  }

  // Deviations with severity
  const phasesForDev = d.phases as Record<string, { quality: number; deviations: string[]; notes?: string }> | undefined;
  const allDevs: string[] = [];
  if (phasesForDev) {
    CLINICAL_GAIT_PHASES.forEach((p) => {
      (phasesForDev[p.id]?.deviations ?? []).forEach((dev) => {
        if (!allDevs.includes(dev)) allDevs.push(dev);
      });
    });
  }
  if (allDevs.length > 0) {
    if (y + 50 > PAGE_H - 20) { doc.addPage(); y = 44; }
    y = sectionHead(doc, "Deviations Detected", y);
    const devRows = allDevs.map((dev) => {
      const sev = DEVIATION_SEV_PDF[dev] ?? "moderate";
      const desc = DEVIATION_DESC_PDF[dev] ?? "—";
      return [dev, sev.charAt(0).toUpperCase() + sev.slice(1), desc];
    });
    autoTable(doc, {
      startY: y,
      head: [["Deviation", "Severity", "Description"]],
      body: devRows,
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 7.5, cellPadding: 3, lineColor: BRAND_HAIRLINE, lineWidth: 0.3 },
      headStyles: { fillColor: [239, 68, 68] as [number, number, number], textColor: 255, fontStyle: "bold", fontSize: 7.5 },
      bodyStyles: { textColor: BRAND_DARK as [number, number, number] },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 56 },
        1: { halign: "center", cellWidth: 22, fontStyle: "bold" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 1) {
          const v = data.cell.text[0].toLowerCase();
          data.cell.styles.textColor =
            v === "critical" ? [239, 68, 68] : [245, 158, 11] as [number, number, number];
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  if (d.gait_cycle_breakdown || d.biomechanical_lines) {
    y = sectionHead(doc, "WBA99 Gait Cycle", y);
    const cycle = d.gait_cycle_breakdown as Record<string, unknown> | undefined;
    const cycleText = [
      `Stance: ${cycle?.stance_phase_percent ?? 60}%`,
      `Swing: ${cycle?.swing_phase_percent ?? 40}%`,
      `Stance phases: ${Array.isArray(cycle?.stance_subphases) ? (cycle?.stance_subphases as string[]).join(", ") : "IC, LR, MS, TS, PS"}`,
      `Swing phases: ${Array.isArray(cycle?.swing_subphases) ? (cycle?.swing_subphases as string[]).join(", ") : "IS, MSw, TSw"}`,
      `Biomechanical lines: ${Array.isArray(d.biomechanical_lines) ? (d.biomechanical_lines as string[]).join(", ") : "Hip Line, Femur Line, Tibia Line, Foot Line"}`,
    ].join(" | ");
    y = drawNotes(doc, cycleText, "Cycle Breakdown", y);
  }

  // Shared data for phase cards + angle table
  type JointAngleRow = { phase: string; abbr: string; hip: string; knee: string; ankle: string; hip_ideal: string; knee_ideal: string; ankle_ideal: string; status: string };
  const jointAngleTable: JointAngleRow[] = Array.isArray(d.joint_angle_table) ? d.joint_angle_table as JointAngleRow[] : [];
  const phases = d.phases as Record<string, { quality: number; deviations: string[]; notes?: string }> | undefined;

  // Phase Details Cards
  if (phases) {
    if (y + 70 > PAGE_H - 20) { doc.addPage(); y = 44; }
    y = sectionHead(doc, "Phase Details", y);

    const cols = 4;
    const cardGap = 3;
    const cardW = (CONTENT_W - cardGap * (cols - 1)) / cols;
    const cardH = 28;

    for (let row = 0; row < 2; row++) {
      if (y + cardH > PAGE_H - 20) { doc.addPage(); y = 44; }
      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const p = CLINICAL_GAIT_PHASES[idx];
        const pd = phases[p.id];
        const cx = MARGIN + col * (cardW + cardGap);
        const cy = y;
        const isStance = p.phase === "Stance";

        const cardBg: RGB = isStance ? [240, 253, 250] : [240, 249, 255];
        const cardBorder: RGB = isStance ? [20, 184, 166] : [14, 165, 233];
        setFill(doc, cardBg);
        setDraw(doc, cardBorder);
        doc.setLineWidth(0.4);
        doc.roundedRect(cx, cy, cardW, cardH, 2, 2, "FD");

        // Phase name
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        setTextColor(doc, BRAND_DARK);
        doc.text(p.label, cx + 2.5, cy + 5.5);

        // Phase type badge (top right)
        const badgeW = 14;
        setFill(doc, cardBorder);
        doc.roundedRect(cx + cardW - badgeW - 2, cy + 1.5, badgeW, 5, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5);
        setTextColor(doc, WHITE);
        doc.text(p.phase.toUpperCase(), cx + cardW - badgeW / 2 - 2, cy + 5.2, { align: "center" });

        // Angle badges
        const angleRow = jointAngleTable.find((r) => r.abbr === p.abbr);
        const aBadgeW = (cardW - 5) / 3;
        if (angleRow) {
          [{ label: "HIP", val: angleRow.hip }, { label: "KNEE", val: angleRow.knee }, { label: "ANK", val: angleRow.ankle }]
            .forEach((a, ai) => {
              const ax = cx + 2.5 + ai * aBadgeW;
              const ay = cy + 9.5;
              setFill(doc, [226, 232, 240] as const);
              doc.roundedRect(ax, ay, aBadgeW - 1, 8, 1, 1, "F");
              doc.setFont("helvetica", "bold");
              doc.setFontSize(4.5);
              setTextColor(doc, BRAND_LIGHT);
              doc.text(a.label, ax + (aBadgeW - 1) / 2, ay + 3, { align: "center" });
              doc.setFontSize(5.5);
              setTextColor(doc, BRAND_MED);
              doc.text(a.val || "—", ax + (aBadgeW - 1) / 2, ay + 6.5, { align: "center" });
            });
        } else if (pd?.notes) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(5.5);
          setTextColor(doc, BRAND_LIGHT);
          doc.text(doc.splitTextToSize(pd.notes, cardW - 5)[0], cx + 2.5, cy + 15);
        }

        // Deviation warning
        const devs = pd?.deviations ?? [];
        if (devs.length > 0) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(5);
          setTextColor(doc, [234, 88, 12] as const);
          const devText = devs[0].length > 26 ? devs[0].slice(0, 26) + "..." : devs[0];
          doc.text("! " + devText, cx + 2.5, cy + 24.5);
          if (devs.length > 1) {
            doc.setFont("helvetica", "normal");
            doc.text(`+${devs.length - 1} more`, cx + cardW - 2.5, cy + 24.5, { align: "right" });
          }
        }
      }
      y += cardH + cardGap;
    }
    y += 4;
  }

  // Phase table
  if (phases) {
    y = sectionHead(doc, "Phase-by-Phase Analysis", y);
    const rows = CLINICAL_GAIT_PHASES.map((p) => {
      const pd = phases[p.id];
      const quality = pd?.quality ?? -1;
      const qualLabel = quality === 3 ? "Normal" : quality === 2 ? "Mild" : quality === 1 ? "Moderate" : quality === 0 ? "Severe" : "—";
      return [
        p.abbr,
        p.label,
        p.phase,
        quality >= 0 ? `${quality}/3` : "—",
        qualLabel,
        (pd?.deviations ?? []).join(", ") || "None",
      ];
    });
    autoTable(doc, {
      startY: y,
      head: [["Phase", "Name", "Type", "Score", "Quality", "Deviations Noted"]],
      body: rows,
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 7.5, cellPadding: 3, lineColor: BRAND_HAIRLINE, lineWidth: 0.3 },
      headStyles: { fillColor: [20, 184, 166] as [number, number, number], textColor: 255, fontStyle: "bold", fontSize: 7.5 },
      bodyStyles: { textColor: BRAND_DARK as [number, number, number] },
      columnStyles: {
        0: { fontStyle: "bold", halign: "center", cellWidth: 14 },
        2: { halign: "center", cellWidth: 16 },
        3: { halign: "center", fontStyle: "bold", cellWidth: 14 },
        4: { halign: "center", cellWidth: 22 },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 4) {
          const v = data.cell.text[0];
          data.cell.styles.textColor =
            v === "Normal"   ? [16, 185, 129] :
            v === "Mild"     ? [14, 165, 233] :
            v === "Moderate" ? [245, 158, 11] :
            v === "Severe"   ? [239, 68, 68]  : [107, 114, 128] as [number, number, number];
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // Joint angle table
  if (jointAngleTable.length > 0) {
    if (y + 50 > PAGE_H - 20) { doc.addPage(); y = 44; }
    y = sectionHead(doc, "Joint Angle Summary — Hip / Knee / Ankle", y);

    const statusColor = (s: string): [number, number, number] =>
      s === "normal"   ? [16, 185, 129] :
      s === "mild"     ? [14, 165, 233] :
      s === "moderate" ? [245, 158, 11] : [239, 68, 68];

    const jRows = jointAngleTable.map((row) => [
      row.abbr,
      row.phase,
      row.hip,
      row.hip_ideal,
      row.knee,
      row.knee_ideal,
      row.ankle,
      row.ankle_ideal,
      row.status.charAt(0).toUpperCase() + row.status.slice(1),
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Ph.", "Phase", "Hip", "Ideal", "Knee", "Ideal", "Ankle", "Ideal", "Status"]],
      body: jRows,
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 7, cellPadding: 2.5, lineColor: BRAND_HAIRLINE, lineWidth: 0.3 },
      headStyles: { fillColor: [20, 184, 166] as [number, number, number], textColor: 255, fontStyle: "bold", fontSize: 7 },
      bodyStyles: { textColor: BRAND_DARK as [number, number, number] },
      columnStyles: {
        0: { fontStyle: "bold", halign: "center", cellWidth: 10 },
        2: { halign: "center", fontStyle: "bold", textColor: [249, 115, 22] as [number, number, number] },
        3: { halign: "center", textColor: BRAND_LIGHT as [number, number, number], fontSize: 6.5 },
        4: { halign: "center", fontStyle: "bold", textColor: [74, 222, 128] as [number, number, number] },
        5: { halign: "center", textColor: BRAND_LIGHT as [number, number, number], fontSize: 6.5 },
        6: { halign: "center", fontStyle: "bold", textColor: [232, 121, 249] as [number, number, number] },
        7: { halign: "center", textColor: BRAND_LIGHT as [number, number, number], fontSize: 6.5 },
        8: { halign: "center", fontStyle: "bold", cellWidth: 18 },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 8) {
          data.cell.styles.textColor = statusColor(data.cell.text[0].toLowerCase());
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // Rehabilitation protocol — collect all deviations
  const allDeviations: string[] = [];
  if (phases) {
    CLINICAL_GAIT_PHASES.forEach((p) => {
      const devs = phases[p.id]?.deviations ?? [];
      devs.forEach((dev) => { if (!allDeviations.includes(dev)) allDeviations.push(dev); });
    });
  }

  if (allDeviations.length > 0) {
    y = sectionHead(doc, "Rehabilitation Protocol", y);
    const rehabRows = allDeviations.map((dev) => [dev, REHAB_MAP_PDF[dev] ?? "—"]);
    autoTable(doc, {
      startY: y,
      head: [["Deviation", "Recommended Intervention"]],
      body: rehabRows,
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 8, cellPadding: 3.5, lineColor: BRAND_HAIRLINE, lineWidth: 0.3 },
      headStyles: { fillColor: [239, 68, 68] as [number, number, number], textColor: 255, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { textColor: BRAND_DARK as [number, number, number] },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 64 } },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  const rehabProtocol = Array.isArray(d.rehab_protocol)
    ? d.rehab_protocol as Array<Record<string, unknown>>
    : [];
  if (rehabProtocol.length > 0) {
    y = sectionHead(doc, "WBA99 Rehab Mapping", y);
    autoTable(doc, {
      startY: y,
      head: [["Problem", "Cause", "Solution"]],
      body: rehabProtocol.map((item) => [str(item.problem), str(item.cause), str(item.solution)]),
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 8, cellPadding: 3.5, lineColor: BRAND_HAIRLINE, lineWidth: 0.3 },
      headStyles: { fillColor: [20, 184, 166] as [number, number, number], textColor: 255, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { textColor: BRAND_DARK as [number, number, number] },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 46 }, 1: { cellWidth: 52 } },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  if (d.observations) y = drawNotes(doc, str(d.observations), "Clinical Observations", y);
  const clinicalReport = d.clinical_report as Record<string, unknown> | undefined;
  if (clinicalReport) {
    const reportNotes = [
      clinicalReport.gait_phase_analysis && `Gait phase analysis: ${str(clinicalReport.gait_phase_analysis)}`,
      clinicalReport.joint_angle_summary && `Joint angle summary: ${str(clinicalReport.joint_angle_summary)}`,
      clinicalReport.deviations && `Deviations: ${str(clinicalReport.deviations)}`,
      clinicalReport.risk_assessment && `Risk assessment: ${str(clinicalReport.risk_assessment)}`,
      clinicalReport.rehab_protocol && `Rehab protocol: ${str(clinicalReport.rehab_protocol)}`,
    ].filter(Boolean).join("\n\n");
    if (reportNotes) y = drawNotes(doc, reportNotes, "Clinical Report Summary", y);
  }
  return y;
}

const DEVIATION_SEV_PDF: Record<string, "critical" | "moderate"> = {
  "Hip drop (Trendelenburg)":          "critical",
  "Knee valgus collapse":              "critical",
  "Drop foot (foot clearance failure)":"critical",
  "Knee hyperextension":               "moderate",
  "Forefoot strike":                   "moderate",
  "No heel strike":                    "moderate",
  "Excess trunk lean":                 "moderate",
  "No knee flexion (shock transfer↑)": "moderate",
  "Foot slap":                         "moderate",
  "Forward trunk lean":                "moderate",
  "Early heel rise":                   "moderate",
  "Limited hip extension":             "moderate",
  "Weak push-off":                     "moderate",
  "Reduced propulsion":                "moderate",
  "Toe drag":                          "moderate",
  "Poor eccentric control":            "moderate",
  "Unstable landing preparation":      "moderate",
};

const DEVIATION_DESC_PDF: Record<string, string> = {
  "Hip drop (Trendelenburg)":          "Hip drop during mid-stance. Glute med weakness suspected.",
  "Knee valgus collapse":              "Knee collapses inward. Glute med and VMO weakness.",
  "Drop foot (foot clearance failure)":"Insufficient foot clearance. Tibialis anterior weakness.",
  "Knee hyperextension":               "Knee snaps into extension at loading. Eccentric quad deficit.",
  "Forefoot strike":                   "No heel strike at IC. Ankle DF limitation or pain avoidance.",
  "No heel strike":                    "No heel strike. Ankle stiffness or pain avoidance.",
  "Excess trunk lean":                 "Excessive trunk lean. Core weakness or hip flexor tightness.",
  "No knee flexion (shock transfer↑)": "Absent loading response knee flexion. Increased impact forces.",
  "Foot slap":                         "Uncontrolled foot descent. Tibialis anterior weakness.",
  "Forward trunk lean":                "Forward trunk lean during stance. Core and hip extensor weakness.",
  "Early heel rise":                   "Heel lift before terminal stance. Gastroc/soleus tightness.",
  "Limited hip extension":             "Reduced hip extension. Hip flexor tightness.",
  "Weak push-off":                     "Reduced plantarflexion power. Calf weakness.",
  "Reduced propulsion":                "Insufficient propulsive force. Plantarflexor loading deficit.",
  "Toe drag":                          "Insufficient clearance in swing. Hip flexor or drop foot.",
  "Poor eccentric control":            "Hamstring eccentric loading deficit in terminal swing.",
  "Unstable landing preparation":      "Poor pre-activation before IC. Proprioception deficit.",
};

const REHAB_MAP_PDF: Record<string, string> = {
  "Forefoot strike": "Tibialis anterior strengthening; heel strike retraining",
  "No heel strike": "Weak dorsiflexors; tibialis anterior strengthening and heel-strike retraining",
  "Knee hyperextension": "Quad eccentric control; neuromuscular knee stabilisation",
  "Excess trunk lean": "Core stability training; hip flexor lengthening",
  "No knee flexion (shock transfer↑)": "Eccentric quad loading; shock absorption drills",
  "Foot slap": "Tibialis anterior strengthening; AFO if indicated",
  "Knee valgus collapse": "Glute medius/max strengthening; valgus control training",
  "Hip drop (Trendelenburg)": "Hip abductor strengthening; single-leg balance training",
  "Forward trunk lean": "Core activation; hip extensor strengthening",
  "Early heel rise": "Gastrocnemius/soleus stretching; heel contact cueing",
  "Limited hip extension": "Hip flexor release; glute max activation",
  "Weak push-off": "Calf/soleus strengthening; plantarflexion power training",
  "Reduced propulsion": "Plyometric push-off drills; ankle plantarflexor loading",
  "Toe drag": "Hip flexor strengthening; ankle dorsiflexor activation",
  "Drop foot (foot clearance failure)": "Tibialis anterior EMG; AFO assessment; steppage correction",
  "Poor eccentric control": "Hamstring eccentric loading; neuromuscular deceleration drills",
  "Unstable landing preparation": "Proprioception training; pre-activation exercises",
};

// ── Prescription renderer ──────────────────────────────────────────────────────

function renderPrescription(doc: jsPDF, d: Record<string, unknown>, yStart: number): number {
  let y = yStart;
  const exs = d.exercises as Array<{ name: string; sets: number; reps: number; frequency: string; notes?: string }> | undefined;

  if (d.diagnosis) {
    y = sectionHead(doc, "Diagnosis", y);
    setFill(doc, [255, 245, 245] as const);
    setDraw(doc, [254, 202, 202] as const);
    const diagLines = doc.splitTextToSize(str(d.diagnosis), CONTENT_W - 8);
    const diagH = diagLines.length * 5 + 8;
    doc.roundedRect(MARGIN, y, CONTENT_W, diagH, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setTextColor(doc, [185, 28, 28] as const);
    doc.text(diagLines, MARGIN + 4, y + 6);
    y += diagH + 6;
  }

  if (exs && exs.length > 0) {
    y = sectionHead(doc, `${exs.length} Exercise${exs.length > 1 ? "s" : ""} Prescribed`, y);
    const rows = exs.map((e) => [e.name, e.sets, e.reps, e.frequency, e.notes ?? "—"]);
    autoTable(doc, {
      startY: y,
      head: [["Exercise", "Sets", "Reps", "Frequency", "Notes"]],
      body: rows,
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 8.5, cellPadding: 3.5, lineColor: BRAND_HAIRLINE, lineWidth: 0.3 },
      headStyles: { fillColor: [239, 68, 68] as [number, number, number], textColor: 255, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { textColor: BRAND_DARK as [number, number, number] },
      columnStyles: {
        1: { halign: "center", fontStyle: "bold" },
        2: { halign: "center", fontStyle: "bold" },
        3: { halign: "center" },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  if (d.notes) y = drawNotes(doc, str(d.notes), "Clinical Notes", y);
  return y;
}

// ── Inclinometer renderer ──────────────────────────────────────────────────────

const JOINT_NORMAL: Record<string, string> = {
  "Cervical Flexion": "0–45°",
  "Cervical Extension": "0–45°",
  "Cervical Lat. Flex (L)": "0–45°",
  "Cervical Lat. Flex (R)": "0–45°",
  "Cervical Rotation (L)": "0–60°",
  "Cervical Rotation (R)": "0–60°",
  "Thoracic Spine": "30–40°",
  "Lumbar Spine": "50–60°",
  "Shoulder": "150–180°",
  "Hip Joint": "100–120°",
  "Knee Joint": "130–140°",
  "Ankle": "45–50°",
};

function renderInclinometer(doc: jsPDF, d: Record<string, unknown>, yStart: number): number {
  let y = yStart;
  const measurements = d.measurements as Array<{ id: string; jointName: string; angle: number }> | undefined;

  if (!measurements?.length) {
    doc.setFontSize(9);
    setTextColor(doc, BRAND_LIGHT);
    doc.text("No measurements recorded.", MARGIN, y);
    return y + 10;
  }

  y = sectionHead(doc, `${measurements.length} Joint Measurements`, y);
  const rows = measurements.map((m) => {
    const abs = Math.abs(m.angle);
    const status = abs < 15 ? "Normal" : abs < 45 ? "Mild" : "Abnormal";
    return [m.jointName, `${m.angle}°`, JOINT_NORMAL[m.jointName] ?? "—", status];
  });

  autoTable(doc, {
    startY: y,
    head: [["Joint", "Measured Angle", "Normal Range", "Status"]],
    body: rows,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 8.5, cellPadding: 3.5, lineColor: BRAND_HAIRLINE, lineWidth: 0.3 },
    headStyles: { fillColor: [6, 182, 212] as [number, number, number], textColor: 255, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { textColor: BRAND_DARK as [number, number, number] },
    columnStyles: {
      1: { halign: "center", fontStyle: "bold", textColor: [6, 182, 212] as [number, number, number] },
      2: { halign: "center", textColor: BRAND_LIGHT as [number, number, number] },
      3: { halign: "center", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 3) {
        const v = data.cell.text[0];
        data.cell.styles.textColor =
          v === "Normal" ? [16, 185, 129] : v === "Mild" ? [245, 158, 11] : [239, 68, 68];
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 6;
  return y;
}

// ── Facial Stress renderer ─────────────────────────────────────────────────────

const FACIAL_STRESS_COLOR: RGB = [244, 63, 94];

function renderFacialStress(doc: jsPDF, d: Record<string, unknown>, yStart: number): number {
  let y = yStart;

  const stressScore    = (d.stressScore    as number) ?? 0;
  const fatigueScore   = (d.fatigueScore   as number) ?? 0;
  const attentionScore = (d.attentionScore as number) ?? 0;
  const expressionVar  = (d.expressionVariability as number) ?? 0;
  const frameCount     = (d.frameCount     as number) ?? 0;
  const dominantEmotion = str(d.dominantEmotion ?? "neutral");
  const stressLevel    = str(d.stressLevel ?? "Low");
  const aiInterp       = str(d.aiInterpretation ?? "");
  const recommendations = (d.recommendations as string[]) ?? [];
  const emotionAverages = (d.emotionAverages as Record<string, number>) ?? {};

  const stressColor: RGB =
    stressScore >= 65 ? [239, 68, 68] :
    stressScore >= 40 ? [245, 158, 11] :
    [16, 185, 129];

  // ── Score summary ──────────────────────────────────────────────────────────

  setFill(doc, [248, 250, 252] as const);
  setDraw(doc, BRAND_HAIRLINE);
  doc.roundedRect(MARGIN, y, CONTENT_W, 22, 3, 3, "FD");

  // Stress Score
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  setTextColor(doc, stressColor);
  doc.text(String(stressScore), MARGIN + 8, y + 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setTextColor(doc, BRAND_LIGHT);
  doc.text("/ 100  Stress Index", MARGIN + 24, y + 15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  setTextColor(doc, stressColor);
  doc.text(stressLevel, MARGIN + 8, y + 20);

  // Right side: Fatigue + Attention
  const rightX = PAGE_W - MARGIN - 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setTextColor(doc, BRAND_LIGHT);
  doc.text("Fatigue", rightX - 36, y + 7, { align: "right" });
  doc.text("Attention", rightX, y + 7, { align: "right" });

  const fatigueC: RGB = fatigueScore >= 60 ? [245, 158, 11] : [16, 185, 129];
  const attnC: RGB    = attentionScore >= 60 ? [16, 185, 129] : [245, 158, 11];

  doc.setFontSize(14);
  setTextColor(doc, fatigueC);
  doc.text(String(fatigueScore), rightX - 36, y + 16, { align: "right" });
  setTextColor(doc, attnC);
  doc.text(String(attentionScore), rightX, y + 16, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setTextColor(doc, BRAND_LIGHT);
  doc.text("/ 100", rightX - 36, y + 20, { align: "right" });
  doc.text("/ 100", rightX, y + 20, { align: "right" });

  y += 27;
  y = drawScoreBar(doc, stressScore, 100, stressColor, y);

  // Metadata row
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setTextColor(doc, BRAND_LIGHT);
  doc.text(
    `Dominant: ${dominantEmotion}   ·   Frames analysed: ${frameCount}   ·   Expression variability: ${expressionVar}%`,
    MARGIN, y
  );
  y += 8;

  // ── Emotion distribution ───────────────────────────────────────────────────

  const emotions = ["neutral", "happy", "sad", "angry", "fearful", "disgusted", "surprised"];
  const emotionColors: Record<string, RGB> = {
    neutral:   [148, 163, 184],
    happy:     [16, 185, 129],
    sad:       [59, 130, 246],
    angry:     [239, 68, 68],
    fearful:   [249, 115, 22],
    disgusted: [234, 179, 8],
    surprised: [139, 92, 246],
  };

  if (Object.keys(emotionAverages).length > 0) {
    y = sectionHead(doc, "Emotion Distribution", y);

    const sorted = emotions
      .map((k) => ({ key: k, val: emotionAverages[k] ?? 0 }))
      .sort((a, b) => b.val - a.val);

    const barMaxW = CONTENT_W - 60;
    sorted.forEach(({ key, val }) => {
      const pct  = Math.round(val * 100);
      const barW = barMaxW * (pct / 100);
      const ec   = emotionColors[key] ?? BRAND_PRIMARY;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      setTextColor(doc, BRAND_MED);
      doc.text(key.charAt(0).toUpperCase() + key.slice(1), MARGIN, y + 3.5);

      setFill(doc, BRAND_HAIRLINE);
      doc.roundedRect(MARGIN + 26, y, barMaxW, 5, 2, 2, "F");
      if (pct > 0) {
        setFill(doc, ec);
        doc.roundedRect(MARGIN + 26, y, barW, 5, 2, 2, "F");
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      setTextColor(doc, ec);
      doc.text(`${pct}%`, MARGIN + 26 + barMaxW + 3, y + 3.5);

      y += 8;
    });
    y += 2;
  }

  // ── Psychology parameters ──────────────────────────────────────────────────

  y = sectionHead(doc, "Psychology Parameters", y);

  const fearful       = (emotionAverages.fearful ?? 0) * 100;
  const happyScore    = (emotionAverages.happy ?? 0) * 100;
  const anxietyVal    = Math.round(fearful);
  const cogLoadVal    = Math.min(100, Math.round(stressScore * 0.8 + fatigueScore * 0.2));
  const resilienceVal = Math.min(100, Math.round(happyScore + expressionVar * 0.3));

  const params = [
    { label: "Anxiety Tendency",     value: anxietyVal,    status: anxietyVal >= 20    ? "Elevated" : "Normal",   good: anxietyVal < 20    },
    { label: "Cognitive Load",        value: cogLoadVal,    status: cogLoadVal >= 65    ? "High"     : cogLoadVal >= 40 ? "Moderate" : "Low", good: cogLoadVal < 40 },
    { label: "Emotional Resilience",  value: resilienceVal, status: resilienceVal >= 25 ? "Good"     : "Reduced",  good: resilienceVal >= 25 },
    { label: "Expression Variability",value: expressionVar, status: expressionVar >= 25 ? "Normal"   : "Low",      good: expressionVar >= 25 },
  ];

  const rows = params.map((p) => [p.label, `${p.value}%`, p.status]);
  autoTable(doc, {
    startY: y,
    head: [["Parameter", "Value", "Status"]],
    body: rows,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 8.5, cellPadding: 3.5, lineColor: BRAND_HAIRLINE, lineWidth: 0.3 },
    headStyles: { fillColor: FACIAL_STRESS_COLOR as [number, number, number], textColor: 255, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { textColor: BRAND_DARK as [number, number, number] },
    columnStyles: {
      1: { halign: "center", fontStyle: "bold" },
      2: { halign: "center", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 2) {
        const v = data.cell.text[0];
        data.cell.styles.textColor =
          v === "Normal" || v === "Good" || v === "Low" ? [16, 185, 129] :
          v === "Elevated" || v === "Moderate" || v === "Reduced" ? [245, 158, 11] :
          [239, 68, 68];
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ── AI Interpretation ──────────────────────────────────────────────────────

  if (aiInterp) {
    y = sectionHead(doc, "AI Interpretation", y);
    setFill(doc, [255, 241, 242] as const);
    setDraw(doc, [254, 205, 211] as const);
    const lines = doc.splitTextToSize(aiInterp, CONTENT_W - 8);
    const boxH  = lines.length * 5 + 10;
    doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setTextColor(doc, BRAND_MED);
    doc.text(lines, MARGIN + 4, y + 7);
    y += boxH + 2;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    setTextColor(doc, BRAND_LIGHT);
    doc.text(
      "AI-assisted analysis only. Clinical judgement and comprehensive evaluation remain primary.",
      MARGIN, y
    );
    y += 8;
  }

  // ── Recommendations ────────────────────────────────────────────────────────

  if (recommendations.length > 0) {
    y = sectionHead(doc, "Clinical Recommendations", y);
    recommendations.forEach((rec) => {
      const lines = doc.splitTextToSize(`• ${rec}`, CONTENT_W - 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      setTextColor(doc, BRAND_MED);
      doc.text(lines, MARGIN + 4, y);
      y += lines.length * 4.8 + 1;
    });
    y += 2;
  }

  if (d.notes) y = drawNotes(doc, str(d.notes), "Clinical Notes", y);

  return y;
}

// ── Spinal renderer ────────────────────────────────────────────────────────────

const SPINAL_COLOR: RGB = [13, 148, 136]; // teal-600

function renderSpinal(doc: jsPDF, d: Record<string, unknown>, yStart: number): number {
  let y = yStart;

  type SpinalValue = { label: string; value: number; unit: string; grade: string };
  type SpinalTest  = { testId: string; testName: string; values: SpinalValue[] };

  const tests        = (d.tests   as SpinalTest[]) ?? [];
  const summary      = d.summary  as { normalCount?: number; borderlineCount?: number; abnormalCount?: number } | undefined;
  const clinicNotes  = d.notes    ? str(d.notes) : "";

  const normalCount     = summary?.normalCount     ?? tests.flatMap((t) => t.values).filter((v) => v.grade === "normal").length;
  const borderlineCount = summary?.borderlineCount ?? tests.flatMap((t) => t.values).filter((v) => v.grade === "borderline").length;
  const abnormalCount   = summary?.abnormalCount   ?? tests.flatMap((t) => t.values).filter((v) => v.grade === "abnormal").length;

  if (!tests.length) {
    doc.setFontSize(9);
    setTextColor(doc, BRAND_LIGHT);
    doc.text("No spinal test data recorded.", MARGIN, y);
    return y + 10;
  }

  // ── Summary boxes ──────────────────────────────────────────────────────────
  const boxW = (CONTENT_W - 8) / 3;
  const summaryItems: Array<{ label: string; count: number; color: RGB }> = [
    { label: "Normal",     count: normalCount,     color: [16, 185, 129] },
    { label: "Borderline", count: borderlineCount, color: [245, 158, 11] },
    { label: "Abnormal",   count: abnormalCount,   color: [239, 68, 68]  },
  ];

  summaryItems.forEach(({ label, count, color }, i) => {
    const bx = MARGIN + i * (boxW + 4);
    setFill(doc, [248, 250, 252] as const);
    setDraw(doc, BRAND_HAIRLINE);
    doc.roundedRect(bx, y, boxW, 18, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    setTextColor(doc, color as RGB);
    doc.text(String(count), bx + boxW / 2, y + 12, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setTextColor(doc, BRAND_LIGHT);
    doc.text(label.toUpperCase(), bx + boxW / 2, y + 17, { align: "center" });
  });
  y += 24;

  // ── Per-test table ─────────────────────────────────────────────────────────

  const gradeColor = (grade: string): [number, number, number] =>
    grade === "normal" ? [16, 185, 129] : grade === "borderline" ? [245, 158, 11] : [239, 68, 68];

  const rows: Array<[string, string, string, string]> = [];
  tests.forEach((test) => {
    test.values.forEach((v, i) => {
      rows.push([
        i === 0 ? test.testName : "",
        v.label,
        `${v.value}${v.unit}`,
        v.grade.charAt(0).toUpperCase() + v.grade.slice(1),
      ]);
    });
  });

  autoTable(doc, {
    startY: y,
    head: [["Test", "Measurement", "Value", "Status"]],
    body: rows,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 8.5, cellPadding: 3.5, lineColor: BRAND_HAIRLINE, lineWidth: 0.3 },
    headStyles: { fillColor: SPINAL_COLOR as [number, number, number], textColor: 255, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { textColor: BRAND_DARK as [number, number, number] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 46 },
      2: { halign: "center", fontStyle: "bold", textColor: SPINAL_COLOR as [number, number, number] },
      3: { halign: "center", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 3) {
        const v = data.cell.text[0].toLowerCase() as string;
        data.cell.styles.textColor = gradeColor(v);
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  if (clinicNotes) y = drawNotes(doc, clinicNotes, "Clinical Notes", y);

  return y;
}

// ── Per-phase detail pages ─────────────────────────────────────────────────────

const PHASE_DESCRIPTIONS: Record<string, string> = {
  ic:  "Instant at which the foot first makes contact with the ground.",
  lr:  "Weight acceptance phase — from initial contact to opposite toe-off. Controlled knee flexion absorbs impact.",
  ms:  "Single limb support — from opposite toe-off to heel rise. Body advances over a stable stance foot.",
  ts:  "Propulsive phase — from heel rise to opposite initial contact. Momentum generated for push-off.",
  ps:  "Pre-swing — from opposite initial contact to toe-off. Rapid plantarflexion prepares the limb for swing.",
  is:  "Initial swing — from toe-off to maximum knee flexion. Limb is accelerated forward to achieve foot clearance.",
  msw: "Mid swing — from maximum knee flexion to tibia vertical. Limb advances with deceleration of hip flexion.",
  tsw: "Terminal swing — from tibia vertical to next initial contact. Limb decelerates and prepares for landing.",
};

function renderClinicalGaitPhaseDetails(
  doc: jsPDF,
  physio: AppUser,
  dateStr: string,
  d: Record<string, unknown>
): void {
  // Prefer wireframe-overlaid thumbnails; fall back to plain thumbnails
  const wireThumbs = Array.isArray(d.wireframeThumbnails) ? d.wireframeThumbnails as string[] : [];
  const plainThumbs = Array.isArray(d.thumbnails) ? d.thumbnails as string[] : [];
  const thumbs = wireThumbs.length > 0 ? wireThumbs : plainThumbs;
  const phases = d.phases as Record<string, { quality: number; deviations: string[]; notes?: string }> | undefined;
  type JointAngleRow = { phase: string; abbr: string; hip: string; knee: string; ankle: string; hip_ideal: string; knee_ideal: string; ankle_ideal: string; status: string };
  const jointAngleTable: JointAngleRow[] = Array.isArray(d.joint_angle_table) ? d.joint_angle_table as JointAngleRow[] : [];

  const qualityColors: Record<number, RGB> = {
    3: [16, 185, 129],
    2: [14, 165, 233],
    1: [245, 158, 11],
    0: [239, 68, 68],
  };
  const qualityLabels = ["Severe", "Moderate", "Mild", "Normal"] as const;

  CLINICAL_GAIT_PHASES.forEach((phaseInfo, idx) => {
    const phaseId   = phaseInfo.id;
    const phaseData = phases?.[phaseId];
    const angleRow  = jointAngleTable.find((r) => r.abbr === phaseInfo.abbr);
    const thumb     = thumbs[idx] ?? null;
    const isStance  = phaseInfo.phase === "Stance";
    const phaseColor: RGB = isStance ? [20, 184, 166] : [14, 165, 233];

    doc.addPage();
    drawHeader(doc, physio, dateStr);
    let y = 44;

    // ── Phase banner ───────────────────────────────────────────────────────
    setFill(doc, phaseColor);
    doc.rect(MARGIN, y, CONTENT_W, 13, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setTextColor(doc, WHITE);
    doc.text(
      `${phaseInfo.label.toUpperCase()}  |  ${isStance ? "Stance Phase" : "Swing Phase"}`,
      MARGIN + 4, y + 9
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(
      `Phase ${idx + 1} of 8  —  ${phaseInfo.abbr}`,
      PAGE_W - MARGIN - 2, y + 9, { align: "right" }
    );
    y += 16;

    // ── Phase description ──────────────────────────────────────────────────
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    setTextColor(doc, BRAND_MED);
    doc.text(PHASE_DESCRIPTIONS[phaseId] ?? "", MARGIN, y);
    y += 8;

    // ── Phase image ────────────────────────────────────────────────────────
    const imgW = CONTENT_W;
    const imgH = Math.round(imgW * 0.5625); // 16:9

    setDraw(doc, BRAND_HAIRLINE);
    setFill(doc, [20, 30, 48] as const);
    doc.roundedRect(MARGIN, y, imgW, imgH, 2, 2, "FD");

    if (thumb) {
      try {
        const imgFmt = thumb.startsWith("data:image/png") ? "PNG" : "JPEG";
        doc.addImage(thumb, imgFmt, MARGIN, y, imgW, imgH);
      } catch {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        setTextColor(doc, [100, 116, 139] as const);
        doc.text(phaseInfo.label, MARGIN + imgW / 2, y + imgH / 2, { align: "center" });
      }
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      setTextColor(doc, [100, 116, 139] as const);
      doc.text("No image captured for this phase", MARGIN + imgW / 2, y + imgH / 2, { align: "center" });
    }

    // Angle bar overlaid on bottom of image
    if (angleRow) {
      const barH = 7;
      const barY = y + imgH - barH;
      setFill(doc, [0, 0, 0] as const);
      doc.rect(MARGIN, barY, imgW, barH, "F");
      const angles: string[] = [];
      if (angleRow.hip)   angles.push(`Hip: ${angleRow.hip}`);
      if (angleRow.knee)  angles.push(`Knee: ${angleRow.knee}`);
      if (angleRow.ankle) angles.push(`Ankle: ${angleRow.ankle}`);
      const spacing = imgW / Math.max(angles.length, 1);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      setTextColor(doc, WHITE);
      angles.forEach((ang, i) => {
        doc.text(ang, MARGIN + i * spacing + spacing / 2, barY + 5, { align: "center" });
      });
    }
    y += imgH + 6;

    // ── Joint angle cards ──────────────────────────────────────────────────
    if (angleRow) {
      if (y + 22 > PAGE_H - 20) { doc.addPage(); drawHeader(doc, physio, dateStr); y = 44; }
      const jointDefs = [
        { label: "Hip Angle",   val: angleRow.hip,   ideal: angleRow.hip_ideal,   color: [249, 115, 22] as RGB },
        { label: "Knee Angle",  val: angleRow.knee,  ideal: angleRow.knee_ideal,  color: [74, 222, 128]  as RGB },
        { label: "Ankle Angle", val: angleRow.ankle, ideal: angleRow.ankle_ideal, color: [232, 121, 249] as RGB },
      ];
      const cardW = (CONTENT_W - 4) / 3;
      const cardH = 21;
      jointDefs.forEach((jd, i) => {
        const cx = MARGIN + i * (cardW + 2);
        setFill(doc, [248, 250, 252] as const);
        setDraw(doc, BRAND_HAIRLINE);
        doc.roundedRect(cx, y, cardW, cardH, 2, 2, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6);
        setTextColor(doc, BRAND_LIGHT);
        doc.text(jd.label.toUpperCase(), cx + cardW / 2, y + 5.5, { align: "center" });
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        setTextColor(doc, jd.color);
        doc.text(jd.val || "—", cx + cardW / 2, y + 14, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(5.5);
        setTextColor(doc, BRAND_LIGHT);
        doc.text(`Ref: ${jd.ideal || "—"}`, cx + cardW / 2, y + 19.5, { align: "center" });
      });

      // Overall status badge right-aligned
      if (angleRow.status) {
        const statusColors: Record<string, RGB> = {
          normal:   [16, 185, 129],
          mild:     [14, 165, 233],
          moderate: [245, 158, 11],
          severe:   [239, 68, 68],
        };
        const sc = statusColors[angleRow.status] ?? BRAND_LIGHT;
        const sl = angleRow.status.charAt(0).toUpperCase() + angleRow.status.slice(1);
        setFill(doc, sc);
        doc.roundedRect(MARGIN + CONTENT_W - 28, y, 28, 8, 1.5, 1.5, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        setTextColor(doc, WHITE);
        doc.text(sl, MARGIN + CONTENT_W - 14, y + 5.5, { align: "center" });
      }
      y += cardH + 6;
    }

    // ── Quality badge ──────────────────────────────────────────────────────
    if (phaseData) {
      if (y + 10 > PAGE_H - 20) { doc.addPage(); drawHeader(doc, physio, dateStr); y = 44; }
      const q       = phaseData.quality ?? -1;
      const qColor  = q >= 0 ? qualityColors[q] ?? BRAND_LIGHT : BRAND_LIGHT;
      const qLabel  = q >= 0 ? qualityLabels[q as 0 | 1 | 2 | 3] : "—";
      setFill(doc, qColor);
      doc.roundedRect(MARGIN, y, 50, 7.5, 1.5, 1.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      setTextColor(doc, WHITE);
      doc.text(
        `Phase Quality: ${qLabel}${q >= 0 ? `  (${q}/3)` : ""}`,
        MARGIN + 25, y + 5.2, { align: "center" }
      );
      y += 12;
    }

    // ── Clinical findings / notes ──────────────────────────────────────────
    if (phaseData?.notes) {
      if (y + 20 > PAGE_H - 20) { doc.addPage(); drawHeader(doc, physio, dateStr); y = 44; }
      y = sectionHead(doc, "Clinical Findings", y);
      const noteLines = doc.splitTextToSize(phaseData.notes, CONTENT_W - 8);
      const noteH     = noteLines.length * 5 + 8;
      if (y + noteH > PAGE_H - 20) { doc.addPage(); drawHeader(doc, physio, dateStr); y = 44; }
      setFill(doc, [248, 250, 252] as const);
      setDraw(doc, BRAND_HAIRLINE);
      doc.roundedRect(MARGIN, y, CONTENT_W, noteH, 2, 2, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      setTextColor(doc, BRAND_MED);
      doc.text(noteLines, MARGIN + 4, y + 6);
      y += noteH + 4;
    }

    // ── Deviations table ───────────────────────────────────────────────────
    if (phaseData?.deviations && phaseData.deviations.length > 0) {
      if (y + 30 > PAGE_H - 20) { doc.addPage(); drawHeader(doc, physio, dateStr); y = 44; }
      y = sectionHead(doc, "Deviations Detected in this Phase", y);
      const devRows = phaseData.deviations.map((dev) => {
        const sev  = DEVIATION_SEV_PDF[dev] ?? "moderate";
        const desc = DEVIATION_DESC_PDF[dev] ?? "—";
        return [dev, sev.charAt(0).toUpperCase() + sev.slice(1), desc];
      });
      autoTable(doc, {
        startY: y,
        head: [["Deviation", "Severity", "Description"]],
        body: devRows,
        margin: { left: MARGIN, right: MARGIN },
        styles: { fontSize: 7.5, cellPadding: 3, lineColor: BRAND_HAIRLINE, lineWidth: 0.3 },
        headStyles: { fillColor: phaseColor as [number, number, number], textColor: 255, fontStyle: "bold", fontSize: 7.5 },
        bodyStyles: { textColor: BRAND_DARK as [number, number, number] },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 56 },
          1: { halign: "center", cellWidth: 22, fontStyle: "bold" },
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 1) {
            const v = data.cell.text[0].toLowerCase();
            data.cell.styles.textColor =
              v === "critical" ? [239, 68, 68] : [245, 158, 11] as [number, number, number];
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    if (!phaseData?.notes && (!phaseData?.deviations || phaseData.deviations.length === 0)) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      setTextColor(doc, BRAND_LIGHT);
      doc.text("No deviations recorded for this phase.", MARGIN, y);
      y += 8;
    }

    // ── Per-phase kinematic mini-graphs ────────────────────────────────────
    if (jointAngleTable.length > 0) {
      if (y + 14 > PAGE_H - 20) { doc.addPage(); drawHeader(doc, physio, dateStr); y = 44; }
      y = sectionHead(doc, "Kinematic Profile — Gait Cycle Position", y);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(6.5);
      setTextColor(doc, BRAND_LIGHT);
      doc.text(
        `Yellow band = current phase (${phaseInfo.abbr}).  ——  = reference midline.  ● = assessed values.`,
        MARGIN, y
      );
      y += 5;

      const miniGx = MARGIN + 9;
      const miniGw = CONTENT_W - 9;
      const miniGh = 22;
      const miniGap = 8;

      for (const joint of ["ankle", "knee", "hip"] as const) {
        if (y + miniGh + miniGap > PAGE_H - 20) { doc.addPage(); drawHeader(doc, physio, dateStr); y = 44; }
        drawKinematicGraph(doc, jointAngleTable as KinRow[], joint, miniGx, y, miniGw, miniGh, idx);
        y += miniGh + miniGap;
      }
    }
  });
}

// ── Image resolver ─────────────────────────────────────────────────────────────
// Thumbnails are stored as base64 data URLs in Firestore subcollection
// assessments/{id}/thumbnails/{thumb_i, wire_i} to avoid Firebase Storage CORS.

async function resolveImageUrls(data: Record<string, unknown>, assessmentId: string): Promise<Record<string, unknown>> {
  const out = { ...data };
  if (!assessmentId) return out;
  try {
    const { getDocs, collection } = await import("firebase/firestore");
    const { firebaseDB } = await import("../firebase");
    const snap = await getDocs(collection(firebaseDB, "assessments", assessmentId, "thumbnails"));
    const map: Record<string, string> = {};
    snap.forEach(d => { map[d.id] = (d.data() as { data: string }).data; });
    out.thumbnails = Array.from({ length: 8 }, (_, i) => map[`thumb_${i}`] ?? "");
    out.wireframeThumbnails = Array.from({ length: 8 }, (_, i) => map[`wire_${i}`] ?? "");
  } catch {
    // leave thumbnails as-is if fetch fails
  }
  return out;
}

// ── Main export ────────────────────────────────────────────────────────────────

export interface GeneratePDFOptions {
  assessment: {
    id: string;
    toolType: string;
    data: Record<string, unknown>;
    createdAt: unknown;
  };
  patient: Patient;
  physio: AppUser;
}

export async function generateAssessmentPDF(opts: GeneratePDFOptions): Promise<jsPDF> {
  const { assessment, patient, physio } = opts;

  const resolvedData = await resolveImageUrls(assessment.data, assessment.id);
  const resolvedAssessment = { ...assessment, data: resolvedData };

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const createdDate = toDate(resolvedAssessment.createdAt);
  const dateStr = createdDate ? format(createdDate, "dd MMMM yyyy, h:mm a") : "—";
  const fileDate = createdDate ? format(createdDate, "yyyy-MM-dd") : "report";

  // ── Page 1 ──────────────────────────────────────────────────────────────────
  drawHeader(doc, physio, dateStr);
  let y = 44;

  y = drawPhysioSection(doc, physio, y);
  y = drawPatientSection(doc, patient, y);
  y = drawAssessmentBanner(doc, resolvedAssessment.toolType, dateStr, y);

  // ── Detailed report content ─────────────────────────────────────────────────
  const d = resolvedAssessment.data;

  function checkPageBreak(needed: number) {
    if (y + needed > PAGE_H - 20) {
      doc.addPage();
      drawHeader(doc, physio, dateStr);
      y = 44;
    }
  }

  checkPageBreak(40);

  switch (resolvedAssessment.toolType) {
    case "fms":
      y = renderFMS(doc, d, y);
      break;
    case "rom":
      y = renderROM(doc, d, y);
      break;
    case "msk":
      y = renderMSK(doc, d, y);
      break;
    case "posture":
      y = renderPosture(doc, d, y);
      break;
    case "gait":
      y = renderGait(doc, d, y);
      break;
    case "gait_clinical":
      y = renderClinicalGait(doc, d, y);
      renderClinicalGaitPhaseDetails(doc, physio, dateStr, d);
      break;
    case "prescription":
      y = renderPrescription(doc, d, y);
      break;
    case "inclinometer":
      y = renderInclinometer(doc, d, y);
      break;
    case "facial_stress":
      y = renderFacialStress(doc, d, y);
      break;
    case "spinal":
      y = renderSpinal(doc, d, y);
      break;
    default:
      doc.setFontSize(9);
      setTextColor(doc, BRAND_LIGHT);
      doc.text("Report content not available for this assessment type.", MARGIN, y);
  }

  // ── Footers on all pages ────────────────────────────────────────────────────
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    drawFooter(doc, p, total);
  }

  // Attach suggested filename as a property for callers
  (doc as any)._suggestedFileName =
    `WBA99_${patient.name.replace(/\s+/g, "_")}_${TOOL_LABELS[resolvedAssessment.toolType]?.split(" ")[0] ?? resolvedAssessment.toolType}_${fileDate}.pdf`;

  return doc;
}

export async function downloadAssessmentPDF(opts: GeneratePDFOptions): Promise<void> {
  const doc = await generateAssessmentPDF(opts);
  const filename = (doc as any)._suggestedFileName ?? "report.pdf";
  doc.save(filename);
}

export async function shareAssessmentPDF(opts: GeneratePDFOptions): Promise<void> {
  const doc = await generateAssessmentPDF(opts);
  const filename = (doc as any)._suggestedFileName ?? "report.pdf";
  const blob = doc.output("blob");
  const file = new File([blob], filename, { type: "application/pdf" });

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: filename });
  } else {
    // Fallback: open in new tab
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}
