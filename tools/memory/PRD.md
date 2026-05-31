# WBA99 MSK Analysis - Product Requirements Document

## Overview
Professional, medical-grade "Research & Analytics Engine" and "WBA99 MSK Analysis" mobile application for physiotherapy and sports medicine professionals.

## Core Features

### 1. AI Posture Analysis Suite
- Real-time angle markers and measurements
- Digital Shadow Video with skeleton overlay (Ochy-style pose detection)
- SD Curve Analyzers for statistical analysis
- Universal Angle Tool for goniometry

### 2. Assessment Tools
- **Posture Assessment:** Full body alignment analysis
- **Gait Analysis:** Walking pattern evaluation
- **Running Analysis:** Biomechanics for runners
- **FMS (Functional Movement Screen):** 7-test movement quality
- **MSK Screening:** Musculoskeletal health evaluation
- **ROM Assessment:** Range of motion measurement

### 3. Research & Analytics Engine
- Comprehensive data entry forms
- Bulk upload capabilities
- AI-powered report generation
- Statistical analysis tools
- Research dashboard with insights

### 4. Admin Hub
- User management (Admin, Physio, Patient, Organization)
- Payment verification system
- Credit-based access control
- Offline-first data sync capabilities
- Organization management

### 5. PDF Report Generation
- Branded A4 PDF reports
- AI-powered clinical analysis
- Payment section with QR codes
- Professional formatting

### 6. Claude Suite - Advanced Clinical Tools (NEW)
Custom Claude AI-generated clinical tools running in WebView:
1. **Digital Shadow V1:** Clinical video analysis with pose detection, gait, ROM & AI psychology
2. **Digital Shadow V2:** Alternative clinical suite with different visual effects
3. **Exercise Template Maker:** AI-powered rehabilitation exercise prescription generator
4. **PhysioScan:** Bony landmark analyzer with draggable landmarks & angle measurements
5. **Face Landmark Analyzer:** Real-time face mesh detection with symmetry analysis

## Technical Stack
- **Frontend:** Expo (SDK 54), React Native, Expo Router
- **Backend:** FastAPI, Motor (Async MongoDB)
- **Database:** MongoDB
- **AI:** Emergent LLM (GPT-4.1) via emergentintegrations

## User Roles
1. **Admin:** Full system access, user/payment management
2. **Physio:** Patient assessments, reports, clinic management
3. **Patient:** View own reports and progress
4. **Org Head:** Organization management, physio oversight

## Design Guidelines
- Professional dark-themed UI with neon accents
- Primary color: #00D4FF (Cyan)
- Gold accents: #FFD700
- Mobile-first, thumb-friendly navigation
- Minimum touch targets: 44px (iOS) / 48px (Android)

## Backend Architecture (Refactored)
```
/app/backend/
├── config.py           # Database & environment config
├── models/             # Pydantic data models
├── routes/             # Modular API routes (68 endpoints)
├── services/           # Business logic (AI, PDF generation)
└── server.py           # Original monolith (parallel operation)
```

## API Endpoints (68 Total)
- Health: 2 routes
- Users: 13 routes
- Assessments: 8 routes
- Payments/Credits: 14 routes
- Organizations: 16 routes
- AI Analysis: 8 routes
- Reports: 15 routes

---
*Version: 2.0*
*Last Updated: March 31, 2026*
