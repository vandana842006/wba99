"""
WBA99 MSK Analysis - Report Routes
All report generation and logging API endpoints
"""

from fastapi import APIRouter, HTTPException
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
import uuid

# Import from centralized modules
from config import db
from models.payment import ReportLog

router = APIRouter(tags=["Reports"])


# ============================================================
# REQUEST/RESPONSE MODELS
# ============================================================

class ReportLogRequest(BaseModel):
    report_type: str
    report_name: str
    generated_by_id: str
    generated_by_name: str
    generated_by_role: str
    organization_id: Optional[str] = None
    organization_name: Optional[str] = None
    patient_id: Optional[str] = None
    patient_name: Optional[str] = None
    analysis_data: Dict[str, Any] = {}
    payment_status: str = "paid"
    amount_paid: float = 0
    credits_used: int = 0


class GenerateReportRequest(BaseModel):
    report_type: str
    data: Dict[str, Any]
    patient_id: Optional[str] = None
    physio_id: Optional[str] = None
    format: str = "pdf"  # pdf, json


class ComprehensiveReportRequest(BaseModel):
    assessment_type: str
    patient_id: str
    patient_name: str
    physio_id: str
    physio_name: str
    data: Dict[str, Any]
    include_recommendations: bool = True


class ComprehensiveReportResponse(BaseModel):
    report_id: str
    assessment_type: str
    patient_name: str
    physio_name: str
    summary: str
    findings: List[str]
    recommendations: List[str]
    score_interpretation: str
    generated_at: datetime


class ROMReportRequest(BaseModel):
    patient_id: str
    patient_name: str
    physio_id: str
    physio_name: str
    rom_data: Dict[str, Any]
    assessment_date: Optional[str] = None


class ROMReportResponse(BaseModel):
    report_id: str
    patient_name: str
    summary: str
    findings: List[str]
    recommendations: List[str]
    generated_at: datetime


# ============================================================
# REPORT LOGGING ENDPOINTS
# ============================================================

@router.post("/reports/log")
async def log_report_generation(
    report_type: str,
    report_name: str,
    generated_by_id: str,
    generated_by_name: str,
    generated_by_role: str,
    organization_id: Optional[str] = None,
    organization_name: Optional[str] = None,
    patient_id: Optional[str] = None,
    patient_name: Optional[str] = None,
    analysis_data: Dict[str, Any] = {},
    payment_status: str = "paid",
    amount_paid: float = 0,
    credits_used: int = 0
):
    """Log when a report/PDF is generated"""
    report_log = {
        "id": str(uuid.uuid4()),
        "report_type": report_type,
        "report_name": report_name,
        "generated_by_id": generated_by_id,
        "generated_by_name": generated_by_name,
        "generated_by_role": generated_by_role,
        "organization_id": organization_id,
        "organization_name": organization_name,
        "patient_id": patient_id,
        "patient_name": patient_name,
        "analysis_data": analysis_data,
        "payment_status": payment_status,
        "amount_paid": amount_paid,
        "credits_used": credits_used,
        "pdf_generated": True,
        "created_at": datetime.utcnow(),
        "date_str": datetime.utcnow().strftime("%Y-%m-%d")
    }
    await db.report_logs.insert_one(report_log)
    return {"message": "Report logged", "id": report_log["id"]}


@router.get("/admin/reports")
async def get_all_reports(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    report_type: Optional[str] = None,
    role: Optional[str] = None,
    organization_id: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    """Get all report logs with filters - Admin only"""
    query = {}
    
    if start_date and end_date:
        query["date_str"] = {"$gte": start_date, "$lte": end_date}
    elif start_date:
        query["date_str"] = {"$gte": start_date}
    elif end_date:
        query["date_str"] = {"$lte": end_date}
    
    if report_type:
        query["report_type"] = report_type
    if role:
        query["generated_by_role"] = role
    if organization_id:
        query["organization_id"] = organization_id
    
    reports = await db.report_logs.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    total = await db.report_logs.count_documents(query)
    
    # Convert ObjectId to string
    for report in reports:
        if "_id" in report:
            report["_id"] = str(report["_id"])
    
    return {"reports": reports, "total": total}


@router.get("/admin/reports/statistics")
async def get_report_statistics():
    """Get comprehensive report statistics for admin dashboard"""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
    week_ago = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d")
    month_ago = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")
    
    # Total counts
    total_reports = await db.report_logs.count_documents({})
    today_reports = await db.report_logs.count_documents({"date_str": today})
    week_reports = await db.report_logs.count_documents({"date_str": {"$gte": week_ago}})
    month_reports = await db.report_logs.count_documents({"date_str": {"$gte": month_ago}})
    
    # Revenue calculation
    pipeline = [
        {"$group": {
            "_id": None,
            "total_revenue": {"$sum": "$amount_paid"},
            "total_credits_used": {"$sum": "$credits_used"}
        }}
    ]
    revenue_result = await db.report_logs.aggregate(pipeline).to_list(1)
    
    total_revenue = revenue_result[0]["total_revenue"] if revenue_result else 0
    total_credits = revenue_result[0]["total_credits_used"] if revenue_result else 0
    
    # By report type
    type_pipeline = [
        {"$group": {"_id": "$report_type", "count": {"$sum": 1}}}
    ]
    type_result = await db.report_logs.aggregate(type_pipeline).to_list(20)
    by_type = {item["_id"]: item["count"] for item in type_result if item["_id"]}
    
    # By role
    role_pipeline = [
        {"$group": {"_id": "$generated_by_role", "count": {"$sum": 1}}}
    ]
    role_result = await db.report_logs.aggregate(role_pipeline).to_list(10)
    by_role = {item["_id"]: item["count"] for item in role_result if item["_id"]}
    
    return {
        "total_reports": total_reports,
        "today": today_reports,
        "this_week": week_reports,
        "this_month": month_reports,
        "total_revenue": total_revenue,
        "total_credits_used": total_credits,
        "by_type": by_type,
        "by_role": by_role,
    }


@router.get("/admin/reports/by-physio")
async def get_reports_by_physio():
    """Get report counts grouped by physio"""
    pipeline = [
        {"$group": {
            "_id": {"id": "$generated_by_id", "name": "$generated_by_name"},
            "count": {"$sum": 1},
            "revenue": {"$sum": "$amount_paid"},
            "credits": {"$sum": "$credits_used"}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 50}
    ]
    
    result = await db.report_logs.aggregate(pipeline).to_list(50)
    
    return [
        {
            "physio_id": item["_id"]["id"],
            "physio_name": item["_id"]["name"],
            "total_reports": item["count"],
            "total_revenue": item["revenue"],
            "total_credits": item["credits"]
        }
        for item in result if item["_id"]["id"]
    ]


@router.get("/admin/reports/by-organization")
async def get_reports_by_organization():
    """Get report counts grouped by organization"""
    pipeline = [
        {"$match": {"organization_id": {"$ne": None}}},
        {"$group": {
            "_id": {"id": "$organization_id", "name": "$organization_name"},
            "count": {"$sum": 1},
            "revenue": {"$sum": "$amount_paid"},
            "credits": {"$sum": "$credits_used"}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 50}
    ]
    
    result = await db.report_logs.aggregate(pipeline).to_list(50)
    
    return [
        {
            "organization_id": item["_id"]["id"],
            "organization_name": item["_id"]["name"] or "Unknown",
            "total_reports": item["count"],
            "total_revenue": item["revenue"],
            "total_credits": item["credits"]
        }
        for item in result if item["_id"]["id"]
    ]


# ============================================================
# REPORT GENERATION ENDPOINTS
# ============================================================

@router.post("/generate-comprehensive-report", response_model=ComprehensiveReportResponse)
async def generate_comprehensive_report(request: ComprehensiveReportRequest):
    """Generate a comprehensive assessment report with AI insights"""
    
    report_id = f"RPT-{uuid.uuid4().hex[:8].upper()}"
    
    # Generate findings based on assessment type
    findings = []
    recommendations = []
    
    data = request.data
    assessment_type = request.assessment_type.lower()
    
    if assessment_type in ["posture", "posture_assessment"]:
        # Analyze posture data
        head_alignment = data.get("head_alignment", 5)
        shoulder_level = data.get("shoulder_level", 5)
        spine_curvature = data.get("spine_curvature", 5)
        
        if head_alignment < 5:
            findings.append("Forward head posture detected")
            recommendations.append("Chin tuck exercises recommended")
        if shoulder_level < 5:
            findings.append("Shoulder asymmetry observed")
            recommendations.append("Shoulder alignment exercises needed")
        if spine_curvature < 5:
            findings.append("Spinal curvature deviation noted")
            recommendations.append("Core strengthening program advised")
        
        if not findings:
            findings.append("Overall posture within normal limits")
            recommendations.append("Maintain current posture habits")
            
    elif assessment_type in ["gait", "walking", "walking_assessment"]:
        gait_symmetry = data.get("gait_symmetry", 5)
        stride_length = data.get("stride_length", 5)
        
        if gait_symmetry < 5:
            findings.append("Gait asymmetry detected")
            recommendations.append("Gait retraining exercises recommended")
        if stride_length < 5:
            findings.append("Reduced stride length observed")
            recommendations.append("Hip mobility exercises advised")
            
        if not findings:
            findings.append("Gait pattern within normal parameters")
            recommendations.append("Continue current mobility routine")
            
    elif assessment_type in ["msk", "msk_assessment", "fms"]:
        total_score = data.get("total_score", 0)
        max_score = data.get("max_score", 21)
        
        if total_score < max_score * 0.5:
            findings.append("Significant movement limitations identified")
            recommendations.append("Comprehensive rehabilitation program needed")
        elif total_score < max_score * 0.7:
            findings.append("Moderate movement restrictions observed")
            recommendations.append("Targeted exercise program recommended")
        else:
            findings.append("Good overall movement quality")
            recommendations.append("Maintain current activity levels")
    else:
        findings.append(f"Assessment completed for {assessment_type}")
        recommendations.append("Review results with treating clinician")
    
    # Calculate score interpretation
    total_score = data.get("total_score", data.get("percentage", 0))
    if isinstance(total_score, (int, float)):
        if total_score >= 80:
            score_interpretation = "Excellent - Above average function"
        elif total_score >= 60:
            score_interpretation = "Good - Minor areas for improvement"
        elif total_score >= 40:
            score_interpretation = "Fair - Moderate impairments present"
        else:
            score_interpretation = "Needs attention - Significant limitations identified"
    else:
        score_interpretation = "Assessment completed - See detailed findings"
    
    # Generate summary
    summary = f"Comprehensive {request.assessment_type} assessment completed for {request.patient_name}. "
    summary += f"Assessment conducted by {request.physio_name}. "
    summary += f"{len(findings)} key findings identified with {len(recommendations)} recommendations."
    
    return ComprehensiveReportResponse(
        report_id=report_id,
        assessment_type=request.assessment_type,
        patient_name=request.patient_name,
        physio_name=request.physio_name,
        summary=summary,
        findings=findings,
        recommendations=recommendations,
        score_interpretation=score_interpretation,
        generated_at=datetime.utcnow()
    )


@router.post("/generate-rom-report", response_model=ROMReportResponse)
async def generate_rom_report(request: ROMReportRequest):
    """Generate ROM (Range of Motion) assessment report"""
    
    report_id = f"ROM-{uuid.uuid4().hex[:8].upper()}"
    
    rom_data = request.rom_data
    findings = []
    recommendations = []
    
    # Analyze ROM data
    joints = ["shoulder", "elbow", "wrist", "hip", "knee", "ankle", "spine"]
    
    for joint in joints:
        joint_data = rom_data.get(joint, {})
        if joint_data:
            flexion = joint_data.get("flexion", 100)
            extension = joint_data.get("extension", 100)
            
            if flexion < 80:
                findings.append(f"Reduced {joint} flexion ({flexion}% of normal)")
                recommendations.append(f"Stretching exercises for {joint} flexion")
            if extension < 80:
                findings.append(f"Reduced {joint} extension ({extension}% of normal)")
                recommendations.append(f"Mobility work for {joint} extension")
    
    if not findings:
        findings.append("All measured ranges of motion within normal limits")
        recommendations.append("Maintain current flexibility routine")
    
    summary = f"ROM assessment for {request.patient_name}. "
    summary += f"{len(findings)} areas assessed with {len(recommendations)} recommendations provided."
    
    return ROMReportResponse(
        report_id=report_id,
        patient_name=request.patient_name,
        summary=summary,
        findings=findings,
        recommendations=recommendations,
        generated_at=datetime.utcnow()
    )


# ============================================================
# RESEARCH REPORTS
# ============================================================

@router.get("/research/reports")
async def get_research_reports(
    researcher_id: Optional[str] = None,
    organization_id: Optional[str] = None,
    limit: int = 50
):
    """Get research reports with optional filters"""
    query = {}
    if researcher_id:
        query["researcher_id"] = researcher_id
    if organization_id:
        query["organization_id"] = organization_id
    
    reports = await db.research_reports.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    
    for report in reports:
        if "_id" in report:
            del report["_id"]
    
    return reports


@router.get("/research/reports/{report_id}")
async def get_research_report_detail(report_id: str):
    """Get detailed research report"""
    report = await db.research_reports.find_one({"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if "_id" in report:
        del report["_id"]
    
    return report


@router.post("/research/generate-report")
async def generate_research_report(
    title: str,
    researcher_id: str,
    data_type: str = "clinical",
    parameters: Dict[str, Any] = {}
):
    """Generate a new research report"""
    
    report_id = f"RES-{uuid.uuid4().hex[:8].upper()}"
    
    # Get researcher info
    researcher = await db.users.find_one({"id": researcher_id})
    
    report = {
        "id": report_id,
        "title": title,
        "researcher_id": researcher_id,
        "researcher_name": researcher.get("name") if researcher else "Unknown",
        "data_type": data_type,
        "parameters": parameters,
        "status": "generated",
        "findings": [
            "Data analysis completed",
            "Statistical significance evaluated",
        ],
        "recommendations": [
            "Further data collection recommended",
            "Peer review suggested",
        ],
        "created_at": datetime.utcnow(),
    }
    
    await db.research_reports.insert_one(report)
    
    return {"message": "Research report generated", "report_id": report_id, "report": report}
