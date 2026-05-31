import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

// Payment Settings Interface - Exported for use in other components
export interface PaymentSettings {
  upi_id?: string;
  account_holder_name?: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  qr_code_image?: string;
}

interface WalkingAnalysisResult {
  overall_score: number;
  step_count: number;
  cadence: number;
  gait_symmetry: number;
  stability_score: number;
  stride_variability?: number;
  recommendations: string[];
  view_type?: string;
  view_label?: string;
}

interface PatientInfo {
  name: string;
  email: string;
  id: string;
}

interface PhysioInfo {
  name: string;
  email: string;
  logo_url?: string;
  clinic_name?: string;
  clinic_phone?: string;
  clinic_address?: string;
}

interface ViewResults {
  [key: string]: WalkingAnalysisResult;
}

// Helper function to generate payment QR section HTML
const generatePaymentQRSection = (paymentSettings: PaymentSettings | null): string => {
  if (!paymentSettings || (!paymentSettings.qr_code_image && !paymentSettings.upi_id)) {
    return '';
  }
  
  return `
    <div style="margin-top: 30px; padding: 20px; background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border-radius: 12px; border: 2px solid #F59E0B;">
      <h3 style="color: #92400E; text-align: center; margin-bottom: 15px; font-size: 18px;">💳 Payment Information</h3>
      <div style="display: flex; justify-content: center; align-items: flex-start; gap: 30px; flex-wrap: wrap;">
        ${paymentSettings.qr_code_image ? `
          <div style="text-align: center;">
            <img src="${paymentSettings.qr_code_image}" alt="Payment QR Code" style="width: 150px; height: 150px; border-radius: 8px; border: 2px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
            <p style="font-size: 11px; color: #78350F; margin-top: 8px;">Scan to Pay</p>
          </div>
        ` : ''}
        <div style="text-align: left; font-size: 13px; color: #78350F;">
          ${paymentSettings.account_holder_name ? `<p><strong>Account:</strong> ${paymentSettings.account_holder_name}</p>` : ''}
          ${paymentSettings.bank_name ? `<p><strong>Bank:</strong> ${paymentSettings.bank_name}</p>` : ''}
          ${paymentSettings.account_number ? `<p><strong>A/C No:</strong> ${paymentSettings.account_number}</p>` : ''}
          ${paymentSettings.ifsc_code ? `<p><strong>IFSC:</strong> ${paymentSettings.ifsc_code}</p>` : ''}
          ${paymentSettings.upi_id ? `<p style="margin-top: 8px;"><strong>UPI ID:</strong> <span style="background: #fff; padding: 2px 8px; border-radius: 4px;">${paymentSettings.upi_id}</span></p>` : ''}
        </div>
      </div>
    </div>
  `;
};

// Helper function to generate logo HTML
const generateLogoHTML = (physio: PhysioInfo | null): string => {
  if (physio?.logo_url && physio.logo_url.startsWith('data:image')) {
    return `<img src="${physio.logo_url}" alt="Logo" style="max-height: 60px; max-width: 200px; object-fit: contain;" />`;
  }
  if (physio?.clinic_name) {
    return `<div class="logo">${physio.clinic_name}</div>`;
  }
  return `<div class="logo">WBA99</div>`;
};

// Helper function to generate clinic info HTML
const generateClinicInfoHTML = (physio: PhysioInfo | null): string => {
  if (!physio?.clinic_name && !physio?.clinic_phone && !physio?.clinic_address) {
    return '';
  }
  return `
    <div style="text-align: center; font-size: 10px; color: rgba(255,255,255,0.7); margin-top: 8px;">
      ${physio.clinic_name ? `<span>${physio.clinic_name}</span>` : ''}
      ${physio.clinic_phone ? ` | ${physio.clinic_phone}` : ''}
      ${physio.clinic_address ? `<br/>${physio.clinic_address}` : ''}
    </div>
  `;
};

export const generateWalkingAnalysisPDF = async (
  patient: PatientInfo,
  physio: PhysioInfo | null,
  viewResults: ViewResults,
  overallScore: number,
  date: Date = new Date(),
  paymentSettings: PaymentSettings | null = null
): Promise<string> => {
  
  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  const viewLabels: Record<string, string> = {
    anterior: 'Anterior (Front)',
    posterior: 'Posterior (Back)',
    lateral_left: 'Lateral Left',
    lateral_right: 'Lateral Right',
  };

  const viewResultsHTML = Object.entries(viewResults).map(([view, result]) => `
    <div class="view-card">
      <div class="view-header">
        <h3>${viewLabels[view] || result.view_label || view}</h3>
        <span class="view-score" style="color: ${getScoreColor(result.overall_score)}">${result.overall_score}%</span>
      </div>
      <div class="metrics-grid">
        <div class="metric">
          <span class="metric-value">${result.step_count}</span>
          <span class="metric-label">Steps</span>
        </div>
        <div class="metric">
          <span class="metric-value">${result.cadence}</span>
          <span class="metric-label">Cadence/min</span>
        </div>
        <div class="metric">
          <span class="metric-value">${result.gait_symmetry}%</span>
          <span class="metric-label">Symmetry</span>
        </div>
        <div class="metric">
          <span class="metric-value">${result.stability_score}%</span>
          <span class="metric-label">Stability</span>
        </div>
      </div>
    </div>
  `).join('');

  const allRecommendations = Object.values(viewResults)
    .flatMap(r => r.recommendations || [])
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 6);

  const recommendationsHTML = allRecommendations.map(rec => `
    <li>${rec}</li>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Walking Analysis Report</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          background: #f8f9fa;
          color: #1a1a2e;
          padding: 40px;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          font-size: 28px;
          margin-bottom: 8px;
        }
        .header .subtitle {
          opacity: 0.8;
          font-size: 14px;
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          color: #00d9ff;
          margin-bottom: 10px;
        }
        .content {
          padding: 30px;
        }
        .info-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee;
        }
        .info-box {
          flex: 1;
        }
        .info-box h4 {
          color: #666;
          font-size: 12px;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        .info-box p {
          font-size: 16px;
          font-weight: 500;
        }
        .overall-score {
          text-align: center;
          padding: 30px;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 12px;
          margin-bottom: 30px;
        }
        .score-circle {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          background: white;
          margin: 0 auto 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          border: 4px solid ${getScoreColor(overallScore)};
        }
        .score-value {
          font-size: 48px;
          font-weight: bold;
          color: ${getScoreColor(overallScore)};
        }
        .score-label {
          font-size: 18px;
          color: #666;
        }
        .score-status {
          display: inline-block;
          padding: 5px 15px;
          border-radius: 20px;
          background: ${getScoreColor(overallScore)}20;
          color: ${getScoreColor(overallScore)};
          font-weight: 600;
          margin-top: 10px;
        }
        .section-title {
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #00d9ff;
        }
        .view-card {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 15px;
        }
        .view-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        .view-header h3 {
          font-size: 16px;
        }
        .view-score {
          font-size: 24px;
          font-weight: bold;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
        }
        .metric {
          text-align: center;
        }
        .metric-value {
          display: block;
          font-size: 20px;
          font-weight: bold;
          color: #1a1a2e;
        }
        .metric-label {
          font-size: 12px;
          color: #666;
        }
        .recommendations {
          background: #e8f5e9;
          border-radius: 8px;
          padding: 20px;
          margin-top: 20px;
        }
        .recommendations h4 {
          color: #2e7d32;
          margin-bottom: 15px;
        }
        .recommendations ul {
          list-style: none;
        }
        .recommendations li {
          padding: 8px 0;
          padding-left: 25px;
          position: relative;
          border-bottom: 1px solid #c8e6c9;
        }
        .recommendations li:last-child {
          border-bottom: none;
        }
        .recommendations li::before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #4caf50;
          font-weight: bold;
        }
        .footer {
          background: #1a1a2e;
          color: white;
          padding: 20px;
          text-align: center;
          font-size: 12px;
        }
        .footer .app-name {
          color: #00d9ff;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${generateLogoHTML(physio)}
          ${generateClinicInfoHTML(physio)}
          <h1>Walking Gait Analysis Report</h1>
          <p class="subtitle">Comprehensive Motion-Based Assessment</p>
        </div>
        
        <div class="content">
          <div class="info-section">
            <div class="info-box">
              <h4>Patient</h4>
              <p>${patient.name}</p>
              <small style="color: #666">${patient.email}</small>
            </div>
            ${physio ? `
            <div class="info-box">
              <h4>Assessed By</h4>
              <p>${physio.name}</p>
              <small style="color: #666">${physio.email}</small>
            </div>
            ` : ''}
            <div class="info-box">
              <h4>Date</h4>
              <p>${formatDate(date)}</p>
            </div>
          </div>

          <div class="overall-score">
            <div class="score-circle">
              <span class="score-value">${overallScore}%</span>
            </div>
            <div class="score-label">Overall Walking Score</div>
            <div class="score-status">${getScoreLabel(overallScore)}</div>
          </div>

          <h2 class="section-title">View-by-View Analysis</h2>
          ${viewResultsHTML}

          ${allRecommendations.length > 0 ? `
          <div class="recommendations">
            <h4>Recommendations</h4>
            <ul>
              ${recommendationsHTML}
            </ul>
          </div>
          ` : ''}
          
          ${generatePaymentQRSection(paymentSettings)}
        </div>

        <div class="footer">
          <p>Generated by <span class="app-name">WBA99</span> - MSK & FMS Analysis Platform</p>
          <p style="margin-top: 5px; opacity: 0.7">This report is for informational purposes only. Consult a healthcare professional for medical advice.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    return uri;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export const sharePDF = async (fileUri: string, filename: string = 'Walking_Analysis_Report.pdf') => {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      // Rename file for sharing
      const newUri = (FileSystem.documentDirectory || FileSystem.cacheDirectory || '') + filename;
      await FileSystem.copyAsync({ from: fileUri, to: newUri });
      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Walking Analysis Report',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error) {
    console.error('Error sharing PDF:', error);
    throw error;
  }
};

export const generatePostureAnalysisPDF = async (
  patient: PatientInfo,
  physio: PhysioInfo | null,
  scores: Record<string, number>,
  totalScore: number,
  percentage: number,
  imagesCount: number,
  notes: string,
  date: Date = new Date(),
  paymentSettings: PaymentSettings | null = null
): Promise<string> => {
  
  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreColor = (score: number, max: number = 10) => {
    const pct = (score / max) * 100;
    if (pct >= 70) return '#10B981';
    if (pct >= 40) return '#F59E0B';
    return '#EF4444';
  };

  const scoreLabels: Record<string, string> = {
    head_alignment: 'Head Alignment',
    shoulder_level: 'Shoulder Level',
    spine_curvature: 'Spine Curvature',
    hip_level: 'Hip Level',
    knee_alignment: 'Knee Alignment',
    overall_balance: 'Overall Balance',
  };

  const scoresHTML = Object.entries(scores)
    .filter(([key]) => scoreLabels[key])
    .map(([key, value]) => `
      <div class="score-item">
        <span class="score-name">${scoreLabels[key]}</span>
        <div class="score-bar-container">
          <div class="score-bar" style="width: ${value * 10}%; background: ${getScoreColor(value)}"></div>
        </div>
        <span class="score-num" style="color: ${getScoreColor(value)}">${value}/10</span>
      </div>
    `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Posture Analysis Report</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f8f9fa;
          color: #1a1a2e;
          padding: 40px;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .logo { font-size: 32px; font-weight: bold; color: #00d9ff; margin-bottom: 10px; }
        .header h1 { font-size: 28px; margin-bottom: 8px; }
        .content { padding: 30px; }
        .info-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee;
        }
        .info-box h4 { color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
        .info-box p { font-size: 16px; font-weight: 500; }
        .overall-score {
          text-align: center;
          padding: 30px;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 12px;
          margin-bottom: 30px;
        }
        .score-circle {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          background: white;
          margin: 0 auto 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          border: 4px solid ${getScoreColor(percentage, 100)};
        }
        .score-value { font-size: 48px; font-weight: bold; color: ${getScoreColor(percentage, 100)}; }
        .section-title {
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #00d9ff;
        }
        .score-item {
          display: flex;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #eee;
        }
        .score-name { flex: 1; font-weight: 500; }
        .score-bar-container {
          flex: 2;
          height: 10px;
          background: #eee;
          border-radius: 5px;
          margin: 0 15px;
          overflow: hidden;
        }
        .score-bar { height: 100%; border-radius: 5px; transition: width 0.3s; }
        .score-num { font-weight: bold; width: 50px; text-align: right; }
        .images-info {
          background: #e3f2fd;
          padding: 15px;
          border-radius: 8px;
          margin-top: 20px;
          text-align: center;
        }
        .notes-section {
          background: #f5f5f5;
          padding: 20px;
          border-radius: 8px;
          margin-top: 20px;
        }
        .notes-section h4 { margin-bottom: 10px; }
        .footer {
          background: #1a1a2e;
          color: white;
          padding: 20px;
          text-align: center;
          font-size: 12px;
        }
        .footer .app-name { color: #00d9ff; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${generateLogoHTML(physio)}
          ${generateClinicInfoHTML(physio)}
          <h1>Posture Analysis Report</h1>
          <p style="opacity: 0.8">Comprehensive Postural Assessment</p>
        </div>
        
        <div class="content">
          <div class="info-section">
            <div class="info-box">
              <h4>Patient</h4>
              <p>${patient.name}</p>
            </div>
            ${physio ? `<div class="info-box"><h4>Assessed By</h4><p>${physio.name}</p></div>` : ''}
            <div class="info-box">
              <h4>Date</h4>
              <p>${formatDate(date)}</p>
            </div>
          </div>

          <div class="overall-score">
            <div class="score-circle">
              <span class="score-value">${percentage.toFixed(0)}%</span>
            </div>
            <div>Total Score: ${totalScore}/60</div>
          </div>

          <h2 class="section-title">Assessment Scores</h2>
          ${scoresHTML}

          <div class="images-info">
            <strong>${imagesCount}/4</strong> posture images captured
          </div>

          ${notes ? `
          <div class="notes-section">
            <h4>Clinical Notes</h4>
            <p>${notes}</p>
          </div>
          ` : ''}
          
          ${generatePaymentQRSection(paymentSettings)}
        </div>

        <div class="footer">
          <p>Generated by <span class="app-name">WBA99</span> - MSK & FMS Analysis Platform</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    return uri;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

// Enhanced Posture Biomechanics PDF Report
interface PostureAngle {
  name: string;
  value: number;
  normal_range: number[];
  deviation: string;
}

interface PlumblineDeviation {
  segment: string;
  deviation_cm: number;
  direction: string;
}

interface MuscleImbalances {
  shortened: string[];
  lengthened: string[];
}

interface CorrectiveExercise {
  type: string;
  target_muscle: string;
  exercise_name: string;
  sets: number;
  reps: string;
  frequency: string;
}

interface AdvancedPostureData {
  view_type: string;
  posture_score: number;
  angles: PostureAngle[];
  plumbline_deviations: PlumblineDeviation[];
  muscle_imbalances: MuscleImbalances;
  corrective_exercises: CorrectiveExercise[];
  ai_analysis: string;
  segmental_findings: any;
}

export const generateAdvancedPosturePDF = async (
  patient: PatientInfo,
  physio: PhysioInfo | null,
  postureData: AdvancedPostureData,
  scores: Record<string, number>,
  date: Date = new Date(),
  paymentSettings: PaymentSettings | null = null
): Promise<string> => {
  
  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDeviationColor = (deviation: string) => {
    switch (deviation) {
      case 'normal': return '#10B981';
      case 'mild': return '#F59E0B';
      case 'moderate': return '#F97316';
      case 'severe': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    if (score >= 40) return '#F97316';
    return '#EF4444';
  };

  const viewLabel = {
    'anterior': 'Anterior (Front View)',
    'posterior': 'Posterior (Back View)',
    'lateral_left': 'Lateral Left (Side View)',
    'lateral_right': 'Lateral Right (Side View)',
  }[postureData.view_type] || postureData.view_type;

  // Generate Angles HTML
  const anglesHTML = postureData.angles.map(angle => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${angle.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; font-weight: bold;">${angle.value}°</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${angle.normal_range[0]}° - ${angle.normal_range[1]}°</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
        <span style="background: ${getDeviationColor(angle.deviation)}20; color: ${getDeviationColor(angle.deviation)}; padding: 4px 12px; border-radius: 12px; font-weight: 600; text-transform: uppercase; font-size: 11px;">
          ${angle.deviation}
        </span>
      </td>
    </tr>
  `).join('');

  // Generate Plumbline Deviations HTML
  const plumblineHTML = postureData.plumbline_deviations.length > 0 
    ? postureData.plumbline_deviations.map(dev => `
        <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 8px; margin-bottom: 8px;">
          <span style="font-weight: 500;">${dev.segment}</span>
          <span style="color: #F97316; font-weight: bold;">${dev.deviation_cm} cm ${dev.direction}</span>
        </div>
      `).join('')
    : '<p style="color: #6B7280; font-style: italic;">No significant plumbline deviations detected</p>';

  // Generate Muscle Imbalances HTML
  const shortenedMusclesHTML = postureData.muscle_imbalances.shortened.length > 0
    ? postureData.muscle_imbalances.shortened.map(m => `<span style="background: #FEE2E2; color: #DC2626; padding: 4px 10px; border-radius: 4px; margin: 2px; display: inline-block; font-size: 12px;">${m}</span>`).join('')
    : '<span style="color: #6B7280;">None identified</span>';

  const lengthenedMusclesHTML = postureData.muscle_imbalances.lengthened.length > 0
    ? postureData.muscle_imbalances.lengthened.map(m => `<span style="background: #DBEAFE; color: #2563EB; padding: 4px 10px; border-radius: 4px; margin: 2px; display: inline-block; font-size: 12px;">${m}</span>`).join('')
    : '<span style="color: #6B7280;">None identified</span>';

  // Generate Corrective Exercises HTML
  const exercisesHTML = postureData.corrective_exercises.map((ex, i) => `
    <tr style="background: ${i % 2 === 0 ? '#f8f9fa' : 'white'};">
      <td style="padding: 10px;">${ex.exercise_name}</td>
      <td style="padding: 10px; text-align: center;">${ex.target_muscle}</td>
      <td style="padding: 10px; text-align: center;">
        <span style="background: ${ex.type === 'Stretch' ? '#DCFCE7' : '#FEF3C7'}; color: ${ex.type === 'Stretch' ? '#166534' : '#92400E'}; padding: 2px 8px; border-radius: 4px; font-size: 11px;">
          ${ex.type}
        </span>
      </td>
      <td style="padding: 10px; text-align: center;">${ex.sets} × ${ex.reps}</td>
      <td style="padding: 10px; text-align: center;">${ex.frequency}</td>
    </tr>
  `).join('');

  // Generate Score Items HTML
  const scoreLabels: Record<string, string> = {
    head_alignment: 'Head Alignment',
    shoulder_level: 'Shoulder Level',
    spine_curvature: 'Spine Curvature',
    hip_level: 'Hip Level',
    knee_alignment: 'Knee Alignment',
    overall_balance: 'Overall Balance',
  };

  const scoresHTML = Object.entries(scores)
    .filter(([key]) => scoreLabels[key])
    .map(([key, value]) => `
      <div style="display: flex; align-items: center; margin-bottom: 10px;">
        <span style="width: 140px; font-size: 13px;">${scoreLabels[key]}</span>
        <div style="flex: 1; height: 8px; background: #eee; border-radius: 4px; margin: 0 10px; overflow: hidden;">
          <div style="width: ${value * 10}%; height: 100%; background: ${getScoreColor(value * 10)}; border-radius: 4px;"></div>
        </div>
        <span style="width: 40px; font-weight: bold; color: ${getScoreColor(value * 10)};">${value}/10</span>
      </div>
    `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Advanced Posture Biomechanics Report</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f8f9fa;
          color: #1a1a2e;
          font-size: 14px;
          line-height: 1.6;
        }
        .container {
          max-width: 900px;
          margin: 0 auto;
          background: white;
        }
        .header {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .logo { font-size: 36px; font-weight: bold; color: #00d9ff; }
        .header h1 { font-size: 24px; margin: 10px 0 5px; }
        .header .view-badge {
          display: inline-block;
          background: #00d9ff;
          color: #1a1a2e;
          padding: 5px 15px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          margin-top: 10px;
        }
        .content { padding: 30px; }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee;
        }
        .info-box h4 { color: #666; font-size: 11px; text-transform: uppercase; margin-bottom: 5px; }
        .info-box p { font-size: 16px; font-weight: 600; }
        .score-card {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 16px;
          padding: 30px;
          text-align: center;
          margin-bottom: 30px;
        }
        .score-circle {
          width: 140px;
          height: 140px;
          border-radius: 50%;
          background: white;
          margin: 0 auto 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          border: 5px solid ${getScoreColor(postureData.posture_score)};
        }
        .score-value { font-size: 42px; font-weight: bold; color: ${getScoreColor(postureData.posture_score)}; }
        .severity-badge {
          display: inline-block;
          background: ${getScoreColor(postureData.posture_score)}20;
          color: ${getScoreColor(postureData.posture_score)};
          padding: 5px 20px;
          border-radius: 20px;
          font-weight: 600;
          margin-top: 10px;
        }
        .section { margin-bottom: 30px; }
        .section-title {
          font-size: 18px;
          font-weight: bold;
          color: #1a1a2e;
          padding-bottom: 10px;
          border-bottom: 3px solid #00d9ff;
          margin-bottom: 20px;
        }
        .angles-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .angles-table th {
          background: #1a1a2e;
          color: white;
          padding: 12px;
          text-align: left;
          font-size: 12px;
          text-transform: uppercase;
        }
        .muscles-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .muscles-box {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 20px;
        }
        .muscles-box h5 {
          font-size: 14px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .exercises-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .exercises-table th {
          background: #16213e;
          color: white;
          padding: 10px;
          text-align: left;
          font-size: 11px;
        }
        .ai-box {
          background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%);
          border-radius: 12px;
          padding: 20px;
          border-left: 4px solid #6366F1;
        }
        .ai-box h4 {
          color: #4338CA;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ai-box p {
          color: #4B5563;
          font-size: 13px;
          line-height: 1.7;
          white-space: pre-wrap;
        }
        .footer {
          background: #1a1a2e;
          color: white;
          padding: 20px;
          text-align: center;
          font-size: 12px;
        }
        .footer .app-name { color: #00d9ff; font-weight: bold; }
        .page-break { page-break-after: always; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${generateLogoHTML(physio)}
          ${generateClinicInfoHTML(physio)}
          <h1>Advanced Posture Biomechanics Report</h1>
          <p style="opacity: 0.8;">Comprehensive Postural Analysis with AI</p>
          <div class="view-badge">${viewLabel}</div>
        </div>
        
        <div class="content">
          <!-- Patient & Physio Info -->
          <div class="info-grid">
            <div class="info-box">
              <h4>Patient</h4>
              <p>${patient.name}</p>
              <small style="color: #666;">${patient.email}</small>
            </div>
            ${physio ? `
            <div class="info-box">
              <h4>Assessed By</h4>
              <p>${physio.name}</p>
              <small style="color: #666;">${physio.email}</small>
            </div>
            ` : ''}
            <div class="info-box">
              <h4>Assessment Date</h4>
              <p>${formatDate(date)}</p>
            </div>
          </div>

          <!-- Overall Score -->
          <div class="score-card">
            <div class="score-circle">
              <span class="score-value">${postureData.posture_score.toFixed(0)}%</span>
            </div>
            <div style="font-size: 16px; color: #666;">Posture Quality Score</div>
            <div class="severity-badge">${postureData.segmental_findings?.severity || 'Assessment Complete'}</div>
          </div>

          <!-- Clinical Scores -->
          <div class="section">
            <h3 class="section-title">Clinical Assessment Scores</h3>
            ${scoresHTML}
          </div>

          <!-- Angular Measurements -->
          <div class="section">
            <h3 class="section-title">Angular Measurements</h3>
            <table class="angles-table">
              <thead>
                <tr>
                  <th>Measurement</th>
                  <th style="text-align: center;">Value</th>
                  <th style="text-align: center;">Normal Range</th>
                  <th style="text-align: center;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${anglesHTML}
              </tbody>
            </table>
          </div>

          <!-- Plumbline Analysis -->
          <div class="section">
            <h3 class="section-title">Plumbline Deviation Analysis</h3>
            ${plumblineHTML}
          </div>

          <!-- Muscle Imbalances -->
          <div class="section">
            <h3 class="section-title">Muscle Imbalance Assessment</h3>
            <div class="muscles-grid">
              <div class="muscles-box">
                <h5>🔴 Shortened/Tight Muscles</h5>
                <div>${shortenedMusclesHTML}</div>
              </div>
              <div class="muscles-box">
                <h5>🔵 Lengthened/Weak Muscles</h5>
                <div>${lengthenedMusclesHTML}</div>
              </div>
            </div>
          </div>

          <!-- AI Analysis -->
          ${postureData.ai_analysis ? `
          <div class="section">
            <h3 class="section-title">AI-Powered Biomechanical Analysis</h3>
            <div class="ai-box">
              <h4>🤖 Clinical Insights</h4>
              <p>${postureData.ai_analysis}</p>
            </div>
          </div>
          ` : ''}

          <!-- Corrective Exercise Prescription -->
          <div class="section">
            <h3 class="section-title">Corrective Exercise Prescription</h3>
            <table class="exercises-table">
              <thead>
                <tr>
                  <th>Exercise</th>
                  <th style="text-align: center;">Target Muscle</th>
                  <th style="text-align: center;">Type</th>
                  <th style="text-align: center;">Dosage</th>
                  <th style="text-align: center;">Frequency</th>
                </tr>
              </thead>
              <tbody>
                ${exercisesHTML}
              </tbody>
            </table>
          </div>

          <!-- Clinical Notes -->
          <div class="section" style="background: #FFFBEB; padding: 20px; border-radius: 12px; border-left: 4px solid #F59E0B;">
            <h4 style="color: #92400E; margin-bottom: 10px;">⚠️ Clinical Notes</h4>
            <ul style="color: #78350F; font-size: 13px; margin-left: 20px;">
              <li>This assessment should be correlated with clinical examination findings</li>
              <li>Progress should be monitored with follow-up assessments</li>
              <li>Exercise prescription may be modified based on patient response</li>
              <li>Consult physician if pain persists or worsens</li>
            </ul>
          </div>
          
          ${generatePaymentQRSection(paymentSettings)}
        </div>

        <div class="footer">
          <p>Generated by <span class="app-name">WBA99</span> - MSK & FMS Analysis Platform</p>
          <p style="margin-top: 5px; opacity: 0.7;">This report is for clinical reference. Diagnosis and treatment should be confirmed by a licensed healthcare professional.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    return uri;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};