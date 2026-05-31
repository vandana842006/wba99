"""
WBA99 MSK Analysis - Video Analysis Routes
Handles video analysis request workflow (Physio -> Admin -> Report)
"""

from fastapi import APIRouter, HTTPException
from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field
import uuid

from config import db

router = APIRouter(tags=["Video Analysis"])


# =============================================
# VIDEO ANALYSIS MODELS
# =============================================

class PatientDetails(BaseModel):
    name: str
    age: Optional[int] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    medical_history: Optional[str] = None
    chief_complaint: Optional[str] = None


class VideoAnalysisRequestCreate(BaseModel):
    patient_name: str
    patient_age: Optional[int] = None
    patient_height_cm: Optional[float] = None
    patient_weight_kg: Optional[float] = None
    patient_gender: Optional[str] = None
    patient_phone: Optional[str] = None
    patient_email: Optional[str] = None
    medical_history: Optional[str] = None
    chief_complaint: Optional[str] = None
    analysis_type: str  # posture, gait, running, etc.
    video_data: str  # base64 encoded video
    video_filename: str
    views: List[str] = []  # anterior, posterior, lateral, etc.


class VideoAnalysisRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_details: PatientDetails
    analysis_type: str
    video_data: str
    video_filename: str
    views: List[str] = []
    submitted_by: str
    submitted_by_name: Optional[str] = None
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "pending"  # pending, in_review, analyzed, report_sent
    reviewed_by: Optional[str] = None
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    analysis_results: Optional[Dict[str, Any]] = None
    ai_analysis: Optional[str] = None
    recommendations: List[str] = []
    overall_score: Optional[float] = None
    admin_notes: Optional[str] = None
    report_generated: bool = False
    report_sent_at: Optional[datetime] = None


class AdminAnalysisUpdate(BaseModel):
    status: str
    analysis_results: Optional[Dict[str, Any]] = None
    ai_analysis: Optional[str] = None
    recommendations: List[str] = []
    overall_score: Optional[float] = None
    admin_notes: Optional[str] = None


# =============================================
# VIDEO ANALYSIS ROUTES
# =============================================

@router.post("/video-analysis/submit")
async def submit_video_analysis(data: VideoAnalysisRequestCreate, physio_id: str):
    """Physio submits video analysis request for admin review"""
    physio = await db.users.find_one({"id": physio_id})
    if not physio:
        raise HTTPException(status_code=404, detail="Physio not found")
    
    patient_details = PatientDetails(
        name=data.patient_name,
        age=data.patient_age,
        height_cm=data.patient_height_cm,
        weight_kg=data.patient_weight_kg,
        gender=data.patient_gender,
        phone=data.patient_phone,
        email=data.patient_email,
        medical_history=data.medical_history,
        chief_complaint=data.chief_complaint
    )
    
    request = VideoAnalysisRequest(
        patient_details=patient_details,
        analysis_type=data.analysis_type,
        video_data=data.video_data,
        video_filename=data.video_filename,
        submitted_by=physio_id,
        submitted_by_name=physio.get("name"),
        views=data.views,
        status="pending"
    )
    
    await db.video_analysis_requests.insert_one(request.dict())
    return request


@router.get("/video-analysis/requests")
async def get_video_analysis_requests(
    status: Optional[str] = None,
    analysis_type: Optional[str] = None,
    submitted_by: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    """Get video analysis requests (for admin or physio)"""
    query = {}
    if status:
        query["status"] = status
    if analysis_type:
        query["analysis_type"] = analysis_type
    if submitted_by:
        query["submitted_by"] = submitted_by
    
    requests = await db.video_analysis_requests.find(query).sort("submitted_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Convert ObjectId to string for JSON serialization
    for request in requests:
        if "_id" in request:
            request["_id"] = str(request["_id"])
    
    return requests


@router.get("/video-analysis/requests/{request_id}")
async def get_video_analysis_request(request_id: str):
    """Get specific video analysis request"""
    request = await db.video_analysis_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    return request


@router.put("/video-analysis/requests/{request_id}/review")
async def start_review_video_analysis(request_id: str, admin_id: str):
    """Admin starts reviewing a video analysis request"""
    admin = await db.users.find_one({"id": admin_id, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.video_analysis_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "in_review",
            "reviewed_by": admin_id,
            "reviewed_by_name": admin.get("name"),
            "reviewed_at": datetime.utcnow()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    
    return {"message": "Review started", "status": "in_review"}


@router.put("/video-analysis/requests/{request_id}/analyze")
async def analyze_video_request(request_id: str, admin_id: str, data: AdminAnalysisUpdate):
    """Admin completes analysis and updates results"""
    admin = await db.users.find_one({"id": admin_id, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    existing = await db.video_analysis_requests.find_one({"id": request_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Request not found")
    
    result = await db.video_analysis_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": data.status,
            "analysis_results": data.analysis_results,
            "ai_analysis": data.ai_analysis,
            "recommendations": data.recommendations,
            "overall_score": data.overall_score,
            "admin_notes": data.admin_notes,
            "reviewed_by": admin_id,
            "reviewed_by_name": admin.get("name"),
            "reviewed_at": datetime.utcnow()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    
    return {"message": "Analysis completed", "status": data.status}


@router.put("/video-analysis/requests/{request_id}/send-report")
async def send_video_analysis_report(request_id: str, admin_id: str):
    """Admin marks report as sent to physio/patient"""
    admin = await db.users.find_one({"id": admin_id, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.video_analysis_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "report_sent",
            "report_generated": True,
            "report_sent_at": datetime.utcnow()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    
    return {"message": "Report sent successfully", "status": "report_sent"}


@router.delete("/video-analysis/requests/{request_id}")
async def delete_video_analysis_request(request_id: str, admin_id: str):
    """Admin deletes a video analysis request"""
    admin = await db.users.find_one({"id": admin_id, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.video_analysis_requests.delete_one({"id": request_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    
    return {"message": "Request deleted successfully"}


@router.get("/video-analysis/stats")
async def get_video_analysis_stats(admin_id: str):
    """Get video analysis statistics for admin dashboard"""
    admin = await db.users.find_one({"id": admin_id, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total = await db.video_analysis_requests.count_documents({})
    pending = await db.video_analysis_requests.count_documents({"status": "pending"})
    in_review = await db.video_analysis_requests.count_documents({"status": "in_review"})
    analyzed = await db.video_analysis_requests.count_documents({"status": "analyzed"})
    report_sent = await db.video_analysis_requests.count_documents({"status": "report_sent"})
    
    return {
        "total": total,
        "pending": pending,
        "in_review": in_review,
        "analyzed": analyzed,
        "report_sent": report_sent
    }
