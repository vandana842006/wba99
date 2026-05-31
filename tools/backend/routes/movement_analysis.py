"""
WBA99 MSK Analysis - Movement Analysis Routes
Handles FMS, Posture, Sports, and Yoga analysis endpoints
"""

from fastapi import APIRouter, HTTPException
from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field
import uuid

from config import db

router = APIRouter(tags=["Movement Analysis"])


# =============================================
# FMS ANALYSIS MODELS
# =============================================

class FMSTestResult(BaseModel):
    movement: str
    score: int = Field(ge=0, le=3)
    pain: bool = False
    asymmetry: bool = False
    notes: str = ""


class FMSAssessment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    physio_id: Optional[str] = None
    date: datetime = Field(default_factory=datetime.utcnow)
    tests: List[FMSTestResult] = []
    total_score: int = 0
    video_urls: Dict[str, str] = {}
    ai_analysis: Optional[str] = None
    recommendations: List[str] = []


class FMSAnalysisCreate(BaseModel):
    patient_id: str
    physio_id: Optional[str] = None
    tests: List[Dict[str, Any]]
    video_urls: Dict[str, str] = {}


# =============================================
# POSTURE ANALYSIS MODELS
# =============================================

class PostureLandmark(BaseModel):
    name: str
    x: float
    y: float
    confidence: float = 1.0
    adjusted: bool = False


class PostureAngle(BaseModel):
    name: str
    value: float
    normal_range: List[float]
    deviation: str


class PlumblineDeviation(BaseModel):
    segment: str
    deviation_cm: float
    direction: str


class AdvancedPostureAnalysis(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    physio_id: Optional[str] = None
    assessment_id: Optional[str] = None
    date: datetime = Field(default_factory=datetime.utcnow)
    view_type: str
    landmarks: List[PostureLandmark] = []
    angles: List[PostureAngle] = []
    plumbline_deviations: List[PlumblineDeviation] = []
    segmental_findings: Dict[str, Any] = {}
    ai_analysis: Optional[str] = None
    muscle_imbalances: Dict[str, List[str]] = {}
    corrective_exercises: List[Dict[str, Any]] = []
    posture_score: float = 0
    image_data: Optional[str] = None


class AdvancedPostureAnalysisCreate(BaseModel):
    patient_id: str
    physio_id: Optional[str] = None
    view_type: str
    image_data: Optional[str] = None
    scores: Dict[str, int] = {}
    manual_landmarks: List[Dict[str, Any]] = []


# =============================================
# SPORTS ANALYSIS MODELS
# =============================================

class SportsAnalysis(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    physio_id: Optional[str] = None
    date: datetime = Field(default_factory=datetime.utcnow)
    sport_type: str
    metrics: Dict[str, Any] = {}
    ai_analysis: Optional[str] = None
    recommendations: List[str] = []


class SportsAnalysisCreate(BaseModel):
    patient_id: str
    physio_id: Optional[str] = None
    sport_type: str
    metrics: Dict[str, Any] = {}


# =============================================
# YOGA ANALYSIS MODELS
# =============================================

class YogaAnalysis(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    physio_id: Optional[str] = None
    date: datetime = Field(default_factory=datetime.utcnow)
    pose_name: str
    alignment_scores: Dict[str, float] = {}
    corrections: List[str] = []
    ai_analysis: Optional[str] = None


class YogaAnalysisCreate(BaseModel):
    patient_id: str
    physio_id: Optional[str] = None
    pose_name: str
    alignment_scores: Dict[str, float] = {}


# =============================================
# FMS ANALYSIS ROUTES
# =============================================

@router.post("/fms-analysis")
async def create_fms_analysis(data: FMSAnalysisCreate):
    """Create FMS assessment with AI analysis"""
    total_score = sum(t.get("score", 0) for t in data.tests)
    
    recommendations = []
    for test in data.tests:
        if test.get("score", 0) <= 1:
            recommendations.append(f"Focus on {test.get('movement', 'this movement')} - score indicates dysfunction")
        if test.get("pain", False):
            recommendations.append(f"Pain noted in {test.get('movement', 'movement')} - refer for medical evaluation")
        if test.get("asymmetry", False):
            recommendations.append(f"Address asymmetry in {test.get('movement', 'movement')}")
    
    assessment = FMSAssessment(
        patient_id=data.patient_id,
        physio_id=data.physio_id,
        tests=[FMSTestResult(**t) for t in data.tests],
        total_score=total_score,
        video_urls=data.video_urls,
        recommendations=recommendations[:10]
    )
    
    await db.fms_assessments.insert_one(assessment.dict())
    return assessment


@router.get("/fms-analysis")
async def get_fms_analyses(patient_id: Optional[str] = None, skip: int = 0, limit: int = 20):
    """Get FMS analyses"""
    query = {}
    if patient_id:
        query["patient_id"] = patient_id
    
    analyses = await db.fms_assessments.find(query).sort("date", -1).skip(skip).limit(limit).to_list(limit)
    return analyses


@router.get("/fms-analysis/{analysis_id}")
async def get_fms_analysis(analysis_id: str):
    """Get specific FMS analysis"""
    analysis = await db.fms_assessments.find_one({"id": analysis_id})
    if not analysis:
        raise HTTPException(status_code=404, detail="FMS analysis not found")
    return analysis


# =============================================
# ADVANCED POSTURE ANALYSIS ROUTES
# =============================================

@router.post("/posture-analysis/advanced")
async def create_advanced_posture_analysis(data: AdvancedPostureAnalysisCreate):
    """Create advanced posture analysis with landmarks and angles"""
    # Calculate posture score from scores
    scores = data.scores
    if scores:
        posture_score = sum(scores.values()) / len(scores) * 10 if scores else 0
    else:
        posture_score = 0
    
    analysis = AdvancedPostureAnalysis(
        patient_id=data.patient_id,
        physio_id=data.physio_id,
        view_type=data.view_type,
        image_data=data.image_data,
        posture_score=posture_score,
        landmarks=[PostureLandmark(**l) for l in data.manual_landmarks] if data.manual_landmarks else []
    )
    
    await db.advanced_posture_analyses.insert_one(analysis.dict())
    return analysis


@router.get("/posture-analysis/advanced")
async def get_advanced_posture_analyses(patient_id: Optional[str] = None, skip: int = 0, limit: int = 20):
    """Get advanced posture analyses"""
    query = {}
    if patient_id:
        query["patient_id"] = patient_id
    
    analyses = await db.advanced_posture_analyses.find(query).sort("date", -1).skip(skip).limit(limit).to_list(limit)
    return analyses


@router.put("/posture-analysis/advanced/{analysis_id}/landmarks")
async def update_posture_landmarks(analysis_id: str, landmarks: List[Dict[str, Any]]):
    """Update landmarks for a posture analysis (physio manual adjustment)"""
    result = await db.advanced_posture_analyses.update_one(
        {"id": analysis_id},
        {"$set": {"landmarks": landmarks}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return {"message": "Landmarks updated successfully"}


# =============================================
# SPORTS ANALYSIS ROUTES
# =============================================

@router.post("/sports-analysis")
async def create_sports_analysis(data: SportsAnalysisCreate):
    """Create sports-specific analysis"""
    analysis = SportsAnalysis(
        patient_id=data.patient_id,
        physio_id=data.physio_id,
        sport_type=data.sport_type,
        metrics=data.metrics
    )
    
    await db.sports_analyses.insert_one(analysis.dict())
    return analysis


@router.get("/sports-analysis")
async def get_sports_analyses(patient_id: Optional[str] = None, sport_type: Optional[str] = None, skip: int = 0, limit: int = 20):
    """Get sports analyses"""
    query = {}
    if patient_id:
        query["patient_id"] = patient_id
    if sport_type:
        query["sport_type"] = sport_type
    
    analyses = await db.sports_analyses.find(query).sort("date", -1).skip(skip).limit(limit).to_list(limit)
    
    # Convert ObjectId to string for JSON serialization
    for analysis in analyses:
        if "_id" in analysis:
            analysis["_id"] = str(analysis["_id"])
    
    return analyses


# =============================================
# YOGA ANALYSIS ROUTES
# =============================================

YOGA_POSES = [
    {"name": "Mountain Pose (Tadasana)", "category": "standing", "difficulty": "beginner"},
    {"name": "Warrior I (Virabhadrasana I)", "category": "standing", "difficulty": "beginner"},
    {"name": "Warrior II (Virabhadrasana II)", "category": "standing", "difficulty": "beginner"},
    {"name": "Triangle Pose (Trikonasana)", "category": "standing", "difficulty": "beginner"},
    {"name": "Tree Pose (Vrksasana)", "category": "balance", "difficulty": "beginner"},
    {"name": "Downward Dog (Adho Mukha Svanasana)", "category": "inversion", "difficulty": "beginner"},
    {"name": "Child's Pose (Balasana)", "category": "resting", "difficulty": "beginner"},
    {"name": "Cobra Pose (Bhujangasana)", "category": "backbend", "difficulty": "beginner"},
    {"name": "Bridge Pose (Setu Bandhasana)", "category": "backbend", "difficulty": "intermediate"},
    {"name": "Pigeon Pose (Eka Pada Rajakapotasana)", "category": "hip opener", "difficulty": "intermediate"},
]


@router.get("/yoga-poses")
async def get_yoga_poses():
    """Get list of supported yoga poses"""
    return YOGA_POSES


@router.post("/yoga-analysis")
async def create_yoga_analysis(data: YogaAnalysisCreate):
    """Create yoga pose analysis"""
    # Generate corrections based on alignment scores
    corrections = []
    for joint, score in data.alignment_scores.items():
        if score < 70:
            corrections.append(f"Improve {joint} alignment")
    
    analysis = YogaAnalysis(
        patient_id=data.patient_id,
        physio_id=data.physio_id,
        pose_name=data.pose_name,
        alignment_scores=data.alignment_scores,
        corrections=corrections
    )
    
    await db.yoga_analyses.insert_one(analysis.dict())
    return analysis


@router.get("/yoga-analysis")
async def get_yoga_analyses(patient_id: Optional[str] = None, skip: int = 0, limit: int = 20):
    """Get yoga analyses"""
    query = {}
    if patient_id:
        query["patient_id"] = patient_id
    
    analyses = await db.yoga_analyses.find(query).sort("date", -1).skip(skip).limit(limit).to_list(limit)
    return analyses
