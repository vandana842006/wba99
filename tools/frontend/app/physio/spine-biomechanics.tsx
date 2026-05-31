import React from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Text, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// The complete Spine Biomechanics HTML embedded
const SPINE_BIOMECHANICS_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>WBA99 Spine Biomechanics</title>
  <style>
    :root {
      --bg: #0a0e1a;
      --card: #111827;
      --border: #1f2937;
      --accent: #00bcd4;
      --accent2: #9c27b0;
      --accent3: #ff5722;
      --gold: #ffd700;
      --green: #22c55e;
      --red: #ef4444;
      --text: #f8fafc;
      --muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding-bottom: 100px;
    }
    .header {
      background: linear-gradient(135deg, #0d1b2a, #1a3a5c);
      padding: 16px;
      text-align: center;
      border-bottom: 2px solid var(--accent);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .logo { font-size: 22px; font-weight: bold; color: var(--gold); }
    .subtitle { font-size: 10px; color: var(--accent); margin-top: 2px; letter-spacing: 2px; }
    
    .tabs {
      display: flex;
      overflow-x: auto;
      background: var(--card);
      border-bottom: 1px solid var(--border);
      -webkit-overflow-scrolling: touch;
    }
    .tab {
      flex: 0 0 auto;
      padding: 10px 14px;
      font-size: 10px;
      color: var(--muted);
      border-bottom: 2px solid transparent;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.3s;
      text-align: center;
    }
    .tab.active { color: var(--accent); border-bottom-color: var(--accent); background: rgba(0,188,212,0.1); }
    .tab-icon { font-size: 14px; display: block; margin-bottom: 2px; }
    
    .content { padding: 12px; }
    .section { display: none; }
    .section.active { display: block; }
    
    .card {
      background: var(--card);
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 12px;
      border: 1px solid var(--border);
    }
    .card-title {
      font-size: 13px;
      font-weight: bold;
      color: var(--accent);
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .card-title span { font-size: 16px; }
    
    .input-group { margin-bottom: 10px; }
    .input-label { font-size: 10px; color: var(--muted); margin-bottom: 3px; display: block; }
    .input-field {
      width: 100%;
      padding: 10px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      font-size: 14px;
    }
    .input-field:focus { outline: none; border-color: var(--accent); }
    
    .btn {
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 10px;
      font-size: 13px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s;
      margin-top: 10px;
    }
    .btn-primary { background: linear-gradient(135deg, var(--accent), #0097a7); color: #000; }
    .btn-secondary { background: var(--border); color: var(--text); }
    .btn-success { background: linear-gradient(135deg, var(--green), #16a34a); color: #fff; }
    .btn-danger { background: linear-gradient(135deg, var(--red), #dc2626); color: #fff; }
    
    .result-box {
      background: linear-gradient(135deg, rgba(0,188,212,0.1), rgba(156,39,176,0.1));
      border: 1px solid var(--accent);
      border-radius: 12px;
      padding: 14px;
      margin-top: 12px;
    }
    .result-value { font-size: 28px; font-weight: bold; color: var(--gold); text-align: center; }
    .result-label { font-size: 11px; color: var(--muted); text-align: center; margin-top: 3px; }
    .result-status { 
      display: inline-block;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: bold;
      margin-top: 6px;
    }
    .status-normal { background: rgba(34,197,94,0.2); color: var(--green); }
    .status-abnormal { background: rgba(239,68,68,0.2); color: var(--red); }
    .status-warning { background: rgba(245,158,11,0.2); color: #f59e0b; }
    
    .test-item {
      background: var(--bg);
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      border: 1px solid var(--border);
      transition: all 0.3s;
    }
    .test-item:active { border-color: var(--accent); transform: scale(0.98); }
    .test-item.completed { border-color: var(--green); background: rgba(34,197,94,0.05); }
    .test-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }
    .test-info { flex: 1; }
    .test-name { font-size: 12px; font-weight: 600; color: var(--text); }
    .test-desc { font-size: 9px; color: var(--muted); margin-top: 1px; }
    .test-status { font-size: 16px; }
    
    .measurement-display {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-top: 12px;
    }
    .measure-box {
      background: var(--bg);
      border-radius: 10px;
      padding: 12px;
      text-align: center;
      border: 1px solid var(--border);
    }
    .measure-value { font-size: 22px; font-weight: bold; color: var(--accent); }
    .measure-unit { font-size: 11px; color: var(--muted); }
    .measure-label { font-size: 9px; color: var(--muted); margin-top: 3px; }
    
    .imu-display {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      margin: 12px 0;
    }
    .imu-box {
      background: var(--bg);
      border-radius: 8px;
      padding: 8px;
      text-align: center;
      border: 1px solid var(--border);
    }
    .imu-value { font-size: 18px; font-weight: bold; color: var(--gold); }
    .imu-label { font-size: 8px; color: var(--muted); }
    
    .sensor-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      background: var(--card);
      border-radius: 20px;
      margin-bottom: 12px;
    }
    .sensor-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--green);
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .sensor-dot.inactive { background: var(--red); animation: none; }
    
    .range-indicator {
      height: 6px;
      background: var(--border);
      border-radius: 3px;
      margin-top: 6px;
      position: relative;
      overflow: hidden;
    }
    .range-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.5s;
    }
    .range-normal { background: linear-gradient(90deg, var(--green), #4ade80); }
    .range-warning { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
    .range-danger { background: linear-gradient(90deg, var(--red), #f87171); }
    
    .instructions {
      background: rgba(0,188,212,0.1);
      border-left: 3px solid var(--accent);
      padding: 10px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 12px;
    }
    .instructions-title { font-size: 11px; font-weight: bold; color: var(--accent); margin-bottom: 4px; }
    .instructions-text { font-size: 10px; color: var(--muted); line-height: 1.4; }
    
    .patient-info {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    
    .summary-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 11px;
    }
    .summary-table th {
      background: var(--accent);
      color: #000;
      padding: 8px 6px;
      text-align: left;
    }
    .summary-table td {
      padding: 8px 6px;
      border-bottom: 1px solid var(--border);
    }
    .summary-table tr:nth-child(even) { background: rgba(255,255,255,0.02); }
    
    .bottom-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--card);
      border-top: 1px solid var(--border);
      padding: 10px 12px;
      display: flex;
      gap: 8px;
    }
    .bottom-bar .btn { flex: 1; margin: 0; padding: 10px; }
    
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .modal.active { display: flex; }
    .modal-content {
      background: var(--card);
      border-radius: 16px;
      width: 100%;
      max-width: 400px;
      max-height: 80vh;
      overflow-y: auto;
      padding: 16px;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .modal-title { font-size: 14px; font-weight: bold; color: var(--accent); }
    .modal-close {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--border);
      border: none;
      color: var(--text);
      font-size: 16px;
      cursor: pointer;
    }
    
    .recording-indicator {
      display: none;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(239,68,68,0.2);
      border-radius: 20px;
      margin-bottom: 12px;
    }
    .recording-indicator.active { display: flex; }
    .rec-dot {
      width: 10px;
      height: 10px;
      background: var(--red);
      border-radius: 50%;
      animation: recPulse 1s infinite;
    }
    @keyframes recPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2); }
    }
    .rec-text { font-size: 11px; font-weight: bold; color: var(--red); }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">WBA99 SPINE BIOMECHANICS</div>
    <div class="subtitle">COMPLETE CLINICAL ASSESSMENT</div>
  </div>
  
  <div class="tabs">
    <div class="tab active" onclick="showSection('patient')">
      <span class="tab-icon">👤</span>Patient
    </div>
    <div class="tab" onclick="showSection('length')">
      <span class="tab-icon">📏</span>Length
    </div>
    <div class="tab" onclick="showSection('lumbar')">
      <span class="tab-icon">🔸</span>Lumbar
    </div>
    <div class="tab" onclick="showSection('thoracic')">
      <span class="tab-icon">🔹</span>Thoracic
    </div>
    <div class="tab" onclick="showSection('cervical')">
      <span class="tab-icon">🔷</span>Cervical
    </div>
    <div class="tab" onclick="showSection('special')">
      <span class="tab-icon">⚡</span>Special
    </div>
    <div class="tab" onclick="showSection('imu')">
      <span class="tab-icon">📱</span>IMU
    </div>
    <div class="tab" onclick="showSection('report')">
      <span class="tab-icon">📄</span>Report
    </div>
  </div>
  
  <div class="content">
    <!-- PATIENT SECTION -->
    <div id="patient" class="section active">
      <div class="card">
        <div class="card-title"><span>👤</span> Patient Information</div>
        <div class="patient-info">
          <div class="input-group">
            <label class="input-label">Patient Name</label>
            <input type="text" class="input-field" id="patientName" placeholder="Full Name">
          </div>
          <div class="input-group">
            <label class="input-label">Age</label>
            <input type="number" class="input-field" id="patientAge" placeholder="Years">
          </div>
          <div class="input-group">
            <label class="input-label">Gender</label>
            <select class="input-field" id="patientGender">
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div class="input-group">
            <label class="input-label">Height (cm)</label>
            <input type="number" class="input-field" id="patientHeight" placeholder="cm">
          </div>
        </div>
        <div class="input-group">
          <label class="input-label">Chief Complaint</label>
          <input type="text" class="input-field" id="complaint" placeholder="e.g., Lower back pain">
        </div>
        <div class="input-group">
          <label class="input-label">Diagnosis</label>
          <input type="text" class="input-field" id="diagnosis" placeholder="e.g., Lumbar spondylosis">
        </div>
      </div>
    </div>
    
    <!-- SPINE LENGTH SECTION -->
    <div id="length" class="section">
      <div class="card">
        <div class="card-title"><span>📏</span> True Spine Length (C7 → S2)</div>
        <div class="instructions">
          <div class="instructions-title">📋 Procedure</div>
          <div class="instructions-text">
            1. Patient standing erect<br>
            2. Mark C7 spinous process<br>
            3. Mark S2 (sacral dimples)<br>
            4. Measure with tape
          </div>
        </div>
        <div class="input-group">
          <label class="input-label">C7 to S2 Distance (cm)</label>
          <input type="number" class="input-field" id="spineLength" placeholder="e.g., 55" step="0.1">
        </div>
        <button class="btn btn-primary" onclick="calculateSpineLength()">Calculate</button>
        <div class="result-box" id="spineLengthResult" style="display:none;">
          <div class="result-value" id="spineLengthValue">--</div>
          <div class="result-label">True Spine Length</div>
          <div id="spineLengthStatus"></div>
        </div>
      </div>
      
      <div class="card">
        <div class="card-title"><span>📐</span> Sitting vs Standing Height</div>
        <div class="patient-info">
          <div class="input-group">
            <label class="input-label">Standing (cm)</label>
            <input type="number" class="input-field" id="standingHeight" placeholder="cm">
          </div>
          <div class="input-group">
            <label class="input-label">Sitting (cm)</label>
            <input type="number" class="input-field" id="sittingHeight" placeholder="cm">
          </div>
        </div>
        <button class="btn btn-primary" onclick="calculateHeightDiff()">Calculate</button>
        <div class="result-box" id="heightDiffResult" style="display:none;">
          <div class="measurement-display">
            <div class="measure-box">
              <div class="measure-value" id="trunkLength">--</div>
              <div class="measure-label">Trunk Length (cm)</div>
            </div>
            <div class="measure-box">
              <div class="measure-value" id="sitStandRatio">--</div>
              <div class="measure-label">Sit/Stand Ratio (%)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- LUMBAR SECTION -->
    <div id="lumbar" class="section">
      <div class="card">
        <div class="card-title"><span>🔸</span> Schober's Test</div>
        <div class="instructions">
          <div class="instructions-title">📋 Lumbar Flexion</div>
          <div class="instructions-text">
            Mark 10cm above & 5cm below L5<br>
            Patient bends forward<br>
            <b>Normal: ≥5cm increase</b>
          </div>
        </div>
        <div class="patient-info">
          <div class="input-group">
            <label class="input-label">Initial (cm)</label>
            <input type="number" class="input-field" id="schoberInit" value="15">
          </div>
          <div class="input-group">
            <label class="input-label">After Flexion (cm)</label>
            <input type="number" class="input-field" id="schoberFlex" placeholder="e.g., 20">
          </div>
        </div>
        <button class="btn btn-primary" onclick="calculateSchober()">Calculate</button>
        <div class="result-box" id="schoberResult" style="display:none;">
          <div class="result-value" id="schoberValue">--</div>
          <div class="result-label">Schober's Increase</div>
          <div class="range-indicator"><div class="range-fill" id="schoberBar"></div></div>
          <div id="schoberStatus" style="text-align:center;margin-top:6px;"></div>
        </div>
      </div>
      
      <div class="card">
        <div class="card-title"><span>🔸</span> Modified Schober's Test</div>
        <div class="instructions">
          <div class="instructions-text">
            Mark 15cm above + 5cm below PSIS<br>
            <b>Normal: ≥6cm increase</b>
          </div>
        </div>
        <div class="patient-info">
          <div class="input-group">
            <label class="input-label">Initial (cm)</label>
            <input type="number" class="input-field" id="modSchoberInit" value="20">
          </div>
          <div class="input-group">
            <label class="input-label">After Flexion (cm)</label>
            <input type="number" class="input-field" id="modSchoberFlex" placeholder="e.g., 26">
          </div>
        </div>
        <button class="btn btn-primary" onclick="calculateModSchober()">Calculate</button>
        <div class="result-box" id="modSchoberResult" style="display:none;">
          <div class="result-value" id="modSchoberValue">--</div>
          <div id="modSchoberStatus" style="text-align:center;margin-top:6px;"></div>
        </div>
      </div>
      
      <div class="card">
        <div class="card-title"><span>🔸</span> Fingertip-to-Floor Test</div>
        <div class="input-group">
          <label class="input-label">Distance (cm) - 0 = touches floor</label>
          <input type="number" class="input-field" id="ftfDistance" placeholder="e.g., 0">
        </div>
        <button class="btn btn-primary" onclick="calculateFTF()">Evaluate</button>
        <div class="result-box" id="ftfResult" style="display:none;">
          <div class="result-value" id="ftfValue">--</div>
          <div id="ftfStatus" style="text-align:center;margin-top:6px;"></div>
        </div>
      </div>
    </div>
    
    <!-- THORACIC SECTION -->
    <div id="thoracic" class="section">
      <div class="card">
        <div class="card-title"><span>🔹</span> Chest Expansion Test</div>
        <div class="instructions">
          <div class="instructions-text">
            Measure at nipple line<br>
            <b>Normal: ≥5cm expansion</b><br>
            Reduced in: Ankylosing spondylitis
          </div>
        </div>
        <div class="patient-info">
          <div class="input-group">
            <label class="input-label">Expiration (cm)</label>
            <input type="number" class="input-field" id="chestExp" placeholder="e.g., 85">
          </div>
          <div class="input-group">
            <label class="input-label">Inspiration (cm)</label>
            <input type="number" class="input-field" id="chestInsp" placeholder="e.g., 92">
          </div>
        </div>
        <button class="btn btn-primary" onclick="calculateChestExp()">Calculate</button>
        <div class="result-box" id="chestExpResult" style="display:none;">
          <div class="result-value" id="chestExpValue">--</div>
          <div id="chestExpStatus" style="text-align:center;margin-top:6px;"></div>
        </div>
      </div>
      
      <div class="card">
        <div class="card-title"><span>🔹</span> Ott's Sign (Thoracic Flexion)</div>
        <div class="instructions">
          <div class="instructions-text">
            Mark C7 → 30cm below<br>
            <b>Normal: +2 to +4cm increase</b>
          </div>
        </div>
        <div class="patient-info">
          <div class="input-group">
            <label class="input-label">Initial (cm)</label>
            <input type="number" class="input-field" id="ottInit" value="30">
          </div>
          <div class="input-group">
            <label class="input-label">After Flexion (cm)</label>
            <input type="number" class="input-field" id="ottFlex" placeholder="e.g., 33">
          </div>
        </div>
        <button class="btn btn-primary" onclick="calculateOtt()">Calculate</button>
        <div class="result-box" id="ottResult" style="display:none;">
          <div class="result-value" id="ottValue">--</div>
          <div id="ottStatus" style="text-align:center;margin-top:6px;"></div>
        </div>
      </div>
    </div>
    
    <!-- CERVICAL SECTION -->
    <div id="cervical" class="section">
      <div class="card">
        <div class="card-title"><span>🔷</span> Cervical ROM (IMU)</div>
        <div class="measurement-display">
          <div class="measure-box">
            <div class="measure-value" id="cervFlexion">--</div>
            <div class="measure-label">Flexion (N:45-50°)</div>
          </div>
          <div class="measure-box">
            <div class="measure-value" id="cervExtension">--</div>
            <div class="measure-label">Extension (N:45-50°)</div>
          </div>
          <div class="measure-box">
            <div class="measure-value" id="cervRotL">--</div>
            <div class="measure-label">Rotation L (N:80°)</div>
          </div>
          <div class="measure-box">
            <div class="measure-value" id="cervRotR">--</div>
            <div class="measure-label">Rotation R (N:80°)</div>
          </div>
        </div>
        <button class="btn btn-primary" onclick="startCervicalIMU()">📱 Start IMU Measurement</button>
      </div>
      
      <div class="card">
        <div class="card-title"><span>🔷</span> Chin-to-Chest Distance</div>
        <div class="input-group">
          <label class="input-label">Distance (cm) - 0 = touches</label>
          <input type="number" class="input-field" id="chinChest" placeholder="e.g., 0">
        </div>
        <button class="btn btn-primary" onclick="calculateChinChest()">Evaluate</button>
        <div class="result-box" id="chinChestResult" style="display:none;">
          <div class="result-value" id="chinChestValue">--</div>
          <div id="chinChestStatus" style="text-align:center;margin-top:6px;"></div>
        </div>
      </div>
    </div>
    
    <!-- SPECIAL TESTS SECTION -->
    <div id="special" class="section">
      <div class="card">
        <div class="card-title"><span>⚡</span> Special Clinical Tests</div>
        
        <div class="test-item" onclick="openTestModal('adams')">
          <div class="test-icon" style="background:rgba(0,188,212,0.2);">🔄</div>
          <div class="test-info">
            <div class="test-name">Adam's Forward Bend Test</div>
            <div class="test-desc">Scoliosis screening - rib hump</div>
          </div>
          <div class="test-status" id="adamsStatus">○</div>
        </div>
        
        <div class="test-item" onclick="openTestModal('slr')">
          <div class="test-icon" style="background:rgba(255,87,34,0.2);">🦵</div>
          <div class="test-info">
            <div class="test-name">Straight Leg Raise (SLR)</div>
            <div class="test-desc">Sciatic nerve tension</div>
          </div>
          <div class="test-status" id="slrStatus">○</div>
        </div>
        
        <div class="test-item" onclick="openTestModal('slump')">
          <div class="test-icon" style="background:rgba(156,39,176,0.2);">🪑</div>
          <div class="test-info">
            <div class="test-name">Slump Test</div>
            <div class="test-desc">Neural mobility</div>
          </div>
          <div class="test-status" id="slumpStatus">○</div>
        </div>
        
        <div class="test-item" onclick="openTestModal('spurling')">
          <div class="test-icon" style="background:rgba(233,30,99,0.2);">💫</div>
          <div class="test-info">
            <div class="test-name">Spurling's Test</div>
            <div class="test-desc">Cervical nerve compression</div>
          </div>
          <div class="test-status" id="spurlingStatus">○</div>
        </div>
        
        <div class="test-item" onclick="openTestModal('kemp')">
          <div class="test-icon" style="background:rgba(255,193,7,0.2);">⬇️</div>
          <div class="test-info">
            <div class="test-name">Kemp's Test</div>
            <div class="test-desc">Lumbar facet issues</div>
          </div>
          <div class="test-status" id="kempStatus">○</div>
        </div>
        
        <div class="test-item" onclick="openTestModal('faber')">
          <div class="test-icon" style="background:rgba(76,175,80,0.2);">🦴</div>
          <div class="test-info">
            <div class="test-name">FABER / Patrick's Test</div>
            <div class="test-desc">Hip & SI joint</div>
          </div>
          <div class="test-status" id="faberStatus">○</div>
        </div>
      </div>
    </div>
    
    <!-- IMU SECTION -->
    <div id="imu" class="section">
      <div class="sensor-status">
        <div class="sensor-dot" id="sensorDot"></div>
        <span id="sensorStatusText">Tap to activate sensor</span>
      </div>
      
      <div class="recording-indicator" id="recIndicator">
        <div class="rec-dot"></div>
        <span class="rec-text">RECORDING</span>
      </div>
      
      <div class="card">
        <div class="card-title"><span>📱</span> 9-Axis IMU Data</div>
        <div class="imu-display">
          <div class="imu-box">
            <div class="imu-value" id="imuPitch">0°</div>
            <div class="imu-label">PITCH</div>
          </div>
          <div class="imu-box">
            <div class="imu-value" id="imuRoll">0°</div>
            <div class="imu-label">ROLL</div>
          </div>
          <div class="imu-box">
            <div class="imu-value" id="imuYaw">0°</div>
            <div class="imu-label">YAW</div>
          </div>
        </div>
        <button class="btn btn-primary" onclick="calibrateIMU()">🎯 Zero / Calibrate</button>
      </div>
      
      <div class="card">
        <div class="card-title"><span>📊</span> Digital Schober (IMU)</div>
        <div class="instructions">
          <div class="instructions-text">
            1. Place phone on lumbar spine<br>
            2. Press Zero to calibrate<br>
            3. Start → Patient bends forward<br>
            4. Stop when fully flexed
          </div>
        </div>
        <div class="measurement-display">
          <div class="measure-box">
            <div class="measure-value" id="digitalSchoberAngle">0°</div>
            <div class="measure-label">Current Angle</div>
          </div>
          <div class="measure-box">
            <div class="measure-value" id="digitalSchoberMax">0°</div>
            <div class="measure-label">Max Recorded</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-success" onclick="startDigitalSchober()" style="flex:1;">▶ Start</button>
          <button class="btn btn-danger" onclick="stopDigitalSchober()" style="flex:1;">⬛ Stop</button>
        </div>
      </div>
    </div>
    
    <!-- REPORT SECTION -->
    <div id="report" class="section">
      <div class="card">
        <div class="card-title"><span>📄</span> Assessment Summary</div>
        <table class="summary-table" id="summaryTable">
          <thead>
            <tr>
              <th>Test</th>
              <th>Value</th>
              <th>Normal</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="summaryBody">
            <tr><td colspan="4" style="text-align:center;color:var(--muted);">Complete tests to generate summary</td></tr>
          </tbody>
        </table>
      </div>
      
      <button class="btn btn-primary" onclick="generatePDF()">📄 Generate PDF Report</button>
      <button class="btn btn-secondary" onclick="shareReport()">📤 Share Report</button>
    </div>
  </div>
  
  <!-- Test Modal -->
  <div class="modal" id="testModal">
    <div class="modal-content">
      <div class="modal-header">
        <div class="modal-title" id="modalTitle">Test</div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div id="modalContent"></div>
    </div>
  </div>
  
  <div class="bottom-bar">
    <button class="btn btn-secondary" onclick="resetAll()">🔄 Reset</button>
    <button class="btn btn-primary" onclick="generatePDF()">📄 PDF</button>
  </div>

  <script>
    let testResults = {};
    let imuData = { pitch: 0, roll: 0, yaw: 0 };
    let imuOffset = { pitch: 0, roll: 0, yaw: 0 };
    let isRecording = false;
    let maxPitch = 0;
    let sensorActive = false;
    
    // Init
    document.body.addEventListener('click', initIMU, { once: true });
    
    function showSection(id) {
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.getElementById(id).classList.add('active');
      event.target.closest('.tab').classList.add('active');
    }
    
    // Calculations
    function calculateSpineLength() {
      const length = parseFloat(document.getElementById('spineLength').value);
      if (!length) return alert('Enter spine length');
      document.getElementById('spineLengthValue').textContent = length + ' cm';
      document.getElementById('spineLengthResult').style.display = 'block';
      const status = length >= 45 && length <= 65 ? '✓ Normal range' : '⚠ Outside typical range';
      document.getElementById('spineLengthStatus').innerHTML = '<span class="result-status ' + (status.includes('✓') ? 'status-normal' : 'status-warning') + '">' + status + '</span>';
      testResults['spineLength'] = { value: length, unit: 'cm', normal: '45-65cm', status: status };
      updateSummary();
    }
    
    function calculateHeightDiff() {
      const standing = parseFloat(document.getElementById('standingHeight').value);
      const sitting = parseFloat(document.getElementById('sittingHeight').value);
      if (!standing || !sitting) return alert('Enter both heights');
      document.getElementById('trunkLength').textContent = (standing - sitting).toFixed(1);
      document.getElementById('sitStandRatio').textContent = ((sitting / standing) * 100).toFixed(1);
      document.getElementById('heightDiffResult').style.display = 'block';
      testResults['sitStandRatio'] = { value: ((sitting / standing) * 100).toFixed(1), unit: '%', normal: '>50%', status: '✓ Measured' };
      updateSummary();
    }
    
    function calculateSchober() {
      const init = parseFloat(document.getElementById('schoberInit').value);
      const flex = parseFloat(document.getElementById('schoberFlex').value);
      if (!flex) return alert('Enter measurement');
      const increase = (flex - init).toFixed(1);
      document.getElementById('schoberValue').textContent = '+' + increase + ' cm';
      document.getElementById('schoberResult').style.display = 'block';
      const bar = document.getElementById('schoberBar');
      bar.style.width = Math.min((increase / 5) * 100, 100) + '%';
      let status = increase >= 5 ? '✓ Normal' : increase >= 3 ? '⚠ Mild restriction' : '✗ Significant restriction';
      bar.className = 'range-fill ' + (increase >= 5 ? 'range-normal' : increase >= 3 ? 'range-warning' : 'range-danger');
      document.getElementById('schoberStatus').innerHTML = '<span class="result-status ' + (increase >= 5 ? 'status-normal' : increase >= 3 ? 'status-warning' : 'status-abnormal') + '">' + status + '</span>';
      testResults['schober'] = { value: '+' + increase, unit: 'cm', normal: '≥5cm', status: status };
      updateSummary();
    }
    
    function calculateModSchober() {
      const init = parseFloat(document.getElementById('modSchoberInit').value);
      const flex = parseFloat(document.getElementById('modSchoberFlex').value);
      if (!flex) return alert('Enter measurement');
      const increase = (flex - init).toFixed(1);
      document.getElementById('modSchoberValue').textContent = '+' + increase + ' cm';
      document.getElementById('modSchoberResult').style.display = 'block';
      let status = increase >= 6 ? '✓ Normal' : '✗ Restricted';
      document.getElementById('modSchoberStatus').innerHTML = '<span class="result-status ' + (increase >= 6 ? 'status-normal' : 'status-abnormal') + '">' + status + '</span>';
      testResults['modSchober'] = { value: '+' + increase, unit: 'cm', normal: '≥6cm', status: status };
      updateSummary();
    }
    
    function calculateFTF() {
      const dist = parseFloat(document.getElementById('ftfDistance').value);
      document.getElementById('ftfValue').textContent = dist + ' cm';
      document.getElementById('ftfResult').style.display = 'block';
      let status = dist <= 0 ? '✓ Excellent' : dist <= 10 ? '✓ Normal' : dist <= 20 ? '⚠ Mild tightness' : '✗ Significant tightness';
      document.getElementById('ftfStatus').innerHTML = '<span class="result-status ' + (dist <= 10 ? 'status-normal' : dist <= 20 ? 'status-warning' : 'status-abnormal') + '">' + status + '</span>';
      testResults['ftf'] = { value: dist, unit: 'cm', normal: '0-10cm', status: status };
      updateSummary();
    }
    
    function calculateChestExp() {
      const exp = parseFloat(document.getElementById('chestExp').value);
      const insp = parseFloat(document.getElementById('chestInsp').value);
      if (!exp || !insp) return alert('Enter measurements');
      const expansion = (insp - exp).toFixed(1);
      document.getElementById('chestExpValue').textContent = expansion + ' cm';
      document.getElementById('chestExpResult').style.display = 'block';
      let status = expansion >= 5 ? '✓ Normal' : expansion >= 2.5 ? '⚠ Reduced - possible AS' : '✗ Significantly reduced';
      document.getElementById('chestExpStatus').innerHTML = '<span class="result-status ' + (expansion >= 5 ? 'status-normal' : expansion >= 2.5 ? 'status-warning' : 'status-abnormal') + '">' + status + '</span>';
      testResults['chestExp'] = { value: expansion, unit: 'cm', normal: '≥5cm', status: status };
      updateSummary();
    }
    
    function calculateOtt() {
      const init = parseFloat(document.getElementById('ottInit').value);
      const flex = parseFloat(document.getElementById('ottFlex').value);
      if (!flex) return alert('Enter measurement');
      const increase = (flex - init).toFixed(1);
      document.getElementById('ottValue').textContent = '+' + increase + ' cm';
      document.getElementById('ottResult').style.display = 'block';
      let status = increase >= 2 && increase <= 4 ? '✓ Normal' : '⚠ Outside normal range';
      document.getElementById('ottStatus').innerHTML = '<span class="result-status ' + (increase >= 2 && increase <= 4 ? 'status-normal' : 'status-warning') + '">' + status + '</span>';
      testResults['ott'] = { value: '+' + increase, unit: 'cm', normal: '+2-4cm', status: status };
      updateSummary();
    }
    
    function calculateChinChest() {
      const dist = parseFloat(document.getElementById('chinChest').value);
      document.getElementById('chinChestValue').textContent = dist + ' cm';
      document.getElementById('chinChestResult').style.display = 'block';
      let status = dist <= 0 ? '✓ Normal' : dist <= 3 ? '⚠ Mild restriction' : '✗ Significant restriction';
      document.getElementById('chinChestStatus').innerHTML = '<span class="result-status ' + (dist <= 0 ? 'status-normal' : dist <= 3 ? 'status-warning' : 'status-abnormal') + '">' + status + '</span>';
      testResults['chinChest'] = { value: dist, unit: 'cm', normal: '0cm', status: status };
      updateSummary();
    }
    
    // IMU
    function initIMU() {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(r => { if (r === 'granted') bindSensors(); }).catch(e => {});
      } else if ('DeviceOrientationEvent' in window) {
        bindSensors();
      }
    }
    
    function bindSensors() {
      window.addEventListener('deviceorientation', handleOrientation);
      sensorActive = true;
      document.getElementById('sensorDot').classList.remove('inactive');
      document.getElementById('sensorStatusText').textContent = 'Sensor Active';
    }
    
    function handleOrientation(e) {
      if (!sensorActive) return;
      const pitch = (e.beta || 0) - imuOffset.pitch;
      const roll = (e.gamma || 0) - imuOffset.roll;
      const yaw = (e.alpha || 0) - imuOffset.yaw;
      imuData = { pitch, roll, yaw };
      document.getElementById('imuPitch').textContent = pitch.toFixed(1) + '°';
      document.getElementById('imuRoll').textContent = roll.toFixed(1) + '°';
      document.getElementById('imuYaw').textContent = yaw.toFixed(1) + '°';
      if (isRecording) {
        document.getElementById('digitalSchoberAngle').textContent = Math.abs(pitch).toFixed(1) + '°';
        if (Math.abs(pitch) > maxPitch) {
          maxPitch = Math.abs(pitch);
          document.getElementById('digitalSchoberMax').textContent = maxPitch.toFixed(1) + '°';
        }
      }
    }
    
    function calibrateIMU() {
      imuOffset.pitch = imuData.pitch + imuOffset.pitch;
      imuOffset.roll = imuData.roll + imuOffset.roll;
      imuOffset.yaw = imuData.yaw + imuOffset.yaw;
      alert('Calibrated!');
    }
    
    function startDigitalSchober() {
      isRecording = true;
      maxPitch = 0;
      document.getElementById('recIndicator').classList.add('active');
    }
    
    function stopDigitalSchober() {
      isRecording = false;
      document.getElementById('recIndicator').classList.remove('active');
      testResults['digitalSchober'] = { value: maxPitch.toFixed(1), unit: '°', normal: '≥40°', status: maxPitch >= 40 ? '✓ Normal' : '⚠ Restricted' };
      updateSummary();
    }
    
    function startCervicalIMU() { alert('Place phone on forehead, move through each ROM direction. Max angles will be recorded.'); }
    
    // Special Tests
    const testInfo = {
      adams: { title: "Adam's Forward Bend", procedure: "Patient bends forward from waist. Observe for rib hump.", positive: "Rib hump asymmetry", indicates: "Structural scoliosis" },
      slr: { title: "Straight Leg Raise", procedure: "Patient supine, raise leg with knee straight.", positive: "Pain radiating below knee at <70°", indicates: "Sciatic nerve tension" },
      slump: { title: "Slump Test", procedure: "Sitting, slump trunk, flex neck, extend knee, dorsiflex ankle.", positive: "Radicular symptoms", indicates: "Neural tension" },
      spurling: { title: "Spurling's Test", procedure: "Extend, laterally flex, rotate cervical spine, apply compression.", positive: "Radicular arm pain", indicates: "Cervical nerve compression" },
      kemp: { title: "Kemp's Test", procedure: "Standing, extension + rotation + side flexion.", positive: "Local lumbar pain", indicates: "Facet joint dysfunction" },
      faber: { title: "FABER / Patrick's", procedure: "Supine, heel on opposite knee, push knee down.", positive: "Groin or SI pain", indicates: "Hip or SI pathology" }
    };
    
    function openTestModal(testId) {
      const test = testInfo[testId];
      document.getElementById('modalTitle').textContent = test.title;
      document.getElementById('modalContent').innerHTML = '<div class="instructions"><div class="instructions-text">' + test.procedure + '</div></div><div class="card" style="margin:10px 0;"><b style="color:var(--red);">Positive:</b> ' + test.positive + '</div><div class="card"><b style="color:var(--accent);">Indicates:</b> ' + test.indicates + '</div><div class="input-group" style="margin-top:12px;"><label class="input-label">Result</label><select class="input-field" id="testResult"><option value="">Select</option><option value="negative">Negative (-)</option><option value="positive">Positive (+)</option></select></div><button class="btn btn-primary" onclick="saveTestResult(\\'' + testId + '\\')">Save</button>';
      document.getElementById('testModal').classList.add('active');
    }
    
    function closeModal() { document.getElementById('testModal').classList.remove('active'); }
    
    function saveTestResult(testId) {
      const result = document.getElementById('testResult').value;
      if (!result) return alert('Select result');
      testResults[testId] = { value: result === 'positive' ? '+' : '-', unit: '', normal: '-', status: result === 'positive' ? 'Positive' : 'Negative' };
      document.getElementById(testId + 'Status').textContent = result === 'positive' ? '✓' : '○';
      document.getElementById(testId + 'Status').style.color = result === 'positive' ? 'var(--red)' : 'var(--green)';
      closeModal();
      updateSummary();
    }
    
    // Summary
    function updateSummary() {
      const tbody = document.getElementById('summaryBody');
      if (Object.keys(testResults).length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);">Complete tests</td></tr>'; return; }
      const names = { spineLength: 'Spine Length', sitStandRatio: 'Sit/Stand Ratio', schober: "Schober's", modSchober: 'Mod. Schober', ftf: 'FTF Test', chestExp: 'Chest Expansion', ott: "Ott's Sign", chinChest: 'Chin-Chest', digitalSchober: 'Digital Schober', adams: "Adam's", slr: 'SLR', slump: 'Slump', spurling: "Spurling's", kemp: "Kemp's", faber: 'FABER' };
      let html = '';
      for (const [key, data] of Object.entries(testResults)) {
        const color = data.status.includes('✓') || data.status === 'Negative' ? 'var(--green)' : data.status.includes('⚠') ? '#f59e0b' : 'var(--red)';
        html += '<tr><td>' + (names[key] || key) + '</td><td>' + data.value + ' ' + data.unit + '</td><td>' + (data.normal || '-') + '</td><td style="color:' + color + '">' + data.status.replace(/[✓✗⚠]/g, '') + '</td></tr>';
      }
      tbody.innerHTML = html;
    }
    
    function generatePDF() {
      const name = document.getElementById('patientName').value || 'Patient';
      const age = document.getElementById('patientAge').value || 'N/A';
      const diagnosis = document.getElementById('diagnosis').value || 'N/A';
      const date = new Date().toLocaleDateString();
      const names = { spineLength: 'Spine Length', sitStandRatio: 'Sit/Stand Ratio', schober: "Schober's Test", modSchober: 'Modified Schober', ftf: 'Fingertip-to-Floor', chestExp: 'Chest Expansion', ott: "Ott's Sign", chinChest: 'Chin-to-Chest', digitalSchober: 'Digital Schober', adams: "Adam's Test", slr: 'SLR Test', slump: 'Slump Test', spurling: "Spurling's Test", kemp: "Kemp's Test", faber: 'FABER Test' };
      
      let tableRows = '';
      for (const [key, data] of Object.entries(testResults)) {
        const statusColor = data.status.includes('Normal') || data.status === 'Negative' ? '#22c55e' : data.status.includes('Mild') ? '#f59e0b' : '#ef4444';
        tableRows += '<tr><td>' + (names[key] || key) + '</td><td>' + data.value + ' ' + data.unit + '</td><td>' + (data.normal || '-') + '</td><td style="color:' + statusColor + ';font-weight:bold;">' + data.status.replace(/[✓✗⚠]/g, '') + '</td></tr>';
      }
      
      if (!tableRows) {
        alert('Please complete at least one test before generating PDF');
        return;
      }
      
      const printHTML = '<!DOCTYPE html><html><head><title>WBA99 Spine Report</title><style>body{font-family:Arial;padding:20px;color:#333;}h1{color:#0d1b2a;text-align:center;border-bottom:3px solid #00bcd4;padding-bottom:10px;}h2{color:#00bcd4;margin-top:20px;}.info{display:flex;justify-content:space-between;margin:15px 0;padding:10px;background:#f5f5f5;border-radius:8px;}table{width:100%;border-collapse:collapse;margin-top:20px;}th{background:#0d1b2a;color:#fff;padding:12px 10px;text-align:left;}td{padding:10px;border-bottom:1px solid #ddd;}.footer{margin-top:30px;text-align:center;color:#666;font-size:12px;}</style></head><body><h1>WBA99 SPINE BIOMECHANICS REPORT</h1><div class="info"><span><b>Patient:</b> ' + name + '</span><span><b>Age:</b> ' + age + '</span><span><b>Date:</b> ' + date + '</span></div><div class="info"><b>Diagnosis:</b> ' + diagnosis + '</div><h2>Assessment Results</h2><table><tr><th>Test</th><th>Value</th><th>Normal Range</th><th>Status</th></tr>' + tableRows + '</table><div class="footer"><p>Generated by WBA99 Spine Biomechanics Analysis</p><p>This report is for clinical reference only.</p></div></body></html>';
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printHTML);
        printWindow.document.close();
        printWindow.print();
      } else {
        alert('Please allow pop-ups to generate PDF');
      }
    }
    
    function shareReport() { alert('Share functionality - would open native share sheet'); }
    
    function resetAll() {
      if (confirm('Reset all data?')) {
        testResults = {};
        document.querySelectorAll('.input-field').forEach(el => { if (el.type !== 'number' || !el.value) el.value = ''; });
        document.querySelectorAll('.result-box').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.test-status').forEach(el => { el.textContent = '○'; el.style.color = ''; });
        updateSummary();
      }
    }
  </script>
</body>
</html>
`;

export default function SpineBiomechanicsScreen() {
  const router = useRouter();

  const renderWebView = () => {
    if (Platform.OS === 'web') {
      return (
        <iframe
          srcDoc={SPINE_BIOMECHANICS_HTML}
          style={{ flex: 1, width: '100%', height: '100%', border: 'none' }}
        />
      );
    }
    return (
      <WebView
        source={{ html: SPINE_BIOMECHANICS_HTML }}
        style={{ flex: 1 }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        originWhitelist={['*']}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Spine Biomechanics</Text>
          <Text style={styles.headerSubtitle}>Complete Clinical Assessment</Text>
        </View>
      </View>
      {renderWebView()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1b2a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#00bcd4',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a3a5c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffd700',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#00bcd4',
    marginTop: 2,
  },
});
