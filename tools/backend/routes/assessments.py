"""
WBA99 MSK Analysis - Assessment Routes
All assessment-related API endpoints
"""

from fastapi import APIRouter, HTTPException
from typing import List, Optional, Dict, Any

# Import from centralized modules
from config import db
from models.assessment import (
    Assessment, AssessmentCreate, 
    AssessmentReport, AssessmentReportCreate
)
from models.enums import AssessmentType

router = APIRouter(tags=["Assessments"])


# Helper Functions
def calculate_assessment_score(assessment_type: AssessmentType, data: Dict[str, Any]) -> tuple:
    """Calculate total score, max score, and percentage for assessment"""
    if assessment_type == AssessmentType.MSK:
        # FMS scoring: 0-3 per test, 7 tests, max 21
        fields = ['deep_squat', 'hurdle_step', 'inline_lunge', 'shoulder_mobility', 
                  'active_straight_leg', 'trunk_stability_pushup', 'rotary_stability']
        max_score = 21
    else:
        # Other assessments: 0-10 per metric, 6 metrics, max 60
        if assessment_type == AssessmentType.POSTURE:
            fields = ['head_alignment', 'shoulder_level', 'spine_curvature', 
                      'hip_level', 'knee_alignment', 'overall_balance']
        elif assessment_type == AssessmentType.WALKING:
            fields = ['gait_symmetry', 'stride_length', 'arm_swing', 
                      'heel_strike', 'toe_off', 'balance']
        else:  # RUNNING
            fields = ['cadence', 'foot_strike', 'knee_drive', 
                      'arm_mechanics', 'trunk_stability', 'overall_form']
        max_score = 60
    
    total = sum(data.get(f, 0) for f in fields)
    percentage = (total / max_score) * 100 if max_score > 0 else 0
    return total, max_score, round(percentage, 1)


def validate_assessment_data(assessment_type: AssessmentType, data: Dict[str, Any]) -> None:
    """Validate assessment scores based on type"""
    if assessment_type == AssessmentType.MSK:
        fields = ['deep_squat', 'hurdle_step', 'inline_lunge', 'shoulder_mobility', 
                  'active_straight_leg', 'trunk_stability_pushup', 'rotary_stability']
        max_val = 3
    else:
        if assessment_type == AssessmentType.POSTURE:
            fields = ['head_alignment', 'shoulder_level', 'spine_curvature', 
                      'hip_level', 'knee_alignment', 'overall_balance']
        elif assessment_type == AssessmentType.WALKING:
            fields = ['gait_symmetry', 'stride_length', 'arm_swing', 
                      'heel_strike', 'toe_off', 'balance']
        else:  # RUNNING
            fields = ['cadence', 'foot_strike', 'knee_drive', 
                      'arm_mechanics', 'trunk_stability', 'overall_form']
        max_val = 10
    
    for field in fields:
        if field in data:
            val = data[field]
            if not isinstance(val, (int, float)) or val < 0 or val > max_val:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid score for {field}: must be between 0 and {max_val}"
                )


# Assessment CRUD Routes
@router.post("/assessments", response_model=Assessment)
async def create_assessment(assessment_data: AssessmentCreate):
    """Create a new assessment"""
    # Validate assessment data
    validate_assessment_data(assessment_data.assessment_type, assessment_data.data)
    
    # Get patient name
    patient = await db.users.find_one({"id": assessment_data.patient_id})
    patient_name = patient["name"] if patient else "Unknown"
    
    # Get physio name if provided
    physio_name = None
    if assessment_data.physio_id:
        physio = await db.users.find_one({"id": assessment_data.physio_id})
        physio_name = physio["name"] if physio else None
    
    # Calculate scores
    total_score, max_score, percentage = calculate_assessment_score(
        assessment_data.assessment_type, assessment_data.data
    )
    
    assessment = Assessment(
        patient_id=assessment_data.patient_id,
        patient_name=patient_name,
        physio_id=assessment_data.physio_id,
        physio_name=physio_name,
        assessment_type=assessment_data.assessment_type,
        data=assessment_data.data,
        total_score=total_score,
        max_score=max_score,
        percentage=percentage
    )
    
    await db.assessments.insert_one(assessment.dict())
    return assessment


@router.get("/assessments", response_model=List[Assessment])
async def get_assessments(
    patient_id: Optional[str] = None,
    physio_id: Optional[str] = None,
    assessment_type: Optional[AssessmentType] = None,
    skip: int = 0,
    limit: int = 100
):
    """Get assessments with optional filters"""
    query = {}
    if patient_id:
        query["patient_id"] = patient_id
    if physio_id:
        query["physio_id"] = physio_id
    if assessment_type:
        query["assessment_type"] = assessment_type
    
    assessments = await db.assessments.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [Assessment(**a) for a in assessments]


@router.get("/assessments/{assessment_id}", response_model=Assessment)
async def get_assessment(assessment_id: str):
    """Get assessment by ID"""
    assessment = await db.assessments.find_one({"id": assessment_id})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return Assessment(**assessment)


@router.delete("/assessments/{assessment_id}")
async def delete_assessment(assessment_id: str):
    """Delete assessment by ID"""
    result = await db.assessments.delete_one({"id": assessment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return {"message": "Assessment deleted successfully"}


# Assessment Reports Routes
@router.post("/assessment-reports", response_model=AssessmentReport)
async def create_assessment_report(report_data: AssessmentReportCreate):
    """Save an assessment report with AI analysis"""
    # Get patient and physio names
    patient = await db.users.find_one({"id": report_data.patient_id})
    physio = await db.users.find_one({"id": report_data.physio_id})
    
    report = AssessmentReport(
        patient_id=report_data.patient_id,
        patient_name=report_data.patient_name or (patient["name"] if patient else "Unknown"),
        physio_id=report_data.physio_id,
        physio_name=report_data.physio_name or (physio["name"] if physio else "Unknown"),
        assessment_type=report_data.assessment_type,
        data=report_data.data,
        ai_analysis=report_data.ai_analysis,
        recommendations=report_data.recommendations,
        total_score=report_data.total_score,
        percentage=report_data.percentage,
        risk_level=report_data.risk_level,
    )
    
    await db.assessment_reports.insert_one(report.dict())
    
    # Also create a basic assessment record for the main list
    assessment = Assessment(
        patient_id=report_data.patient_id,
        patient_name=report.patient_name,
        physio_id=report_data.physio_id,
        physio_name=report.physio_name,
        assessment_type=report_data.assessment_type,
        data=report_data.data,
        total_score=report_data.total_score or 0,
        max_score=100,
        percentage=report_data.percentage or 0,
    )
    await db.assessments.insert_one(assessment.dict())
    
    return report


@router.get("/assessment-reports", response_model=List[AssessmentReport])
async def get_assessment_reports(
    patient_id: Optional[str] = None,
    physio_id: Optional[str] = None,
    assessment_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    """Get assessment reports with optional filtering"""
    query = {}
    if patient_id:
        query["patient_id"] = patient_id
    if physio_id:
        query["physio_id"] = physio_id
    if assessment_type:
        query["assessment_type"] = assessment_type
    
    reports = await db.assessment_reports.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [AssessmentReport(**r) for r in reports]


@router.get("/assessment-reports/{report_id}", response_model=AssessmentReport)
async def get_assessment_report(report_id: str):
    """Get a specific assessment report"""
    report = await db.assessment_reports.find_one({"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return AssessmentReport(**report)


@router.get("/patient-reports/{patient_id}")
async def get_patient_reports(patient_id: str):
    """Get all reports for a patient - for patient dashboard"""
    reports = await db.assessment_reports.find({"patient_id": patient_id}).sort("created_at", -1).to_list(100)
    assessments = await db.assessments.find({"patient_id": patient_id}).sort("created_at", -1).to_list(100)
    return {
        "reports": [AssessmentReport(**r) for r in reports],
        "assessments": [Assessment(**a) for a in assessments],
        "total_assessments": len(assessments),
        "total_reports": len(reports),
    }


@router.get("/physio-reports/{physio_id}")
async def get_physio_reports(physio_id: str):
    """Get all reports by a physio - for physio dashboard"""
    reports = await db.assessment_reports.find({"physio_id": physio_id}).sort("created_at", -1).to_list(100)
    assessments = await db.assessments.find({"physio_id": physio_id}).sort("created_at", -1).to_list(100)
    
    # Get unique patients
    patient_ids = list(set([r.get("patient_id") for r in reports + assessments if r.get("patient_id")]))
    
    return {
        "reports": [AssessmentReport(**r) for r in reports],
        "assessments": [Assessment(**a) for a in assessments],
        "total_assessments": len(assessments),
        "total_reports": len(reports),
        "unique_patients": len(patient_ids),
    }
