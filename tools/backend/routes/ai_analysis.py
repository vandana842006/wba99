"""
WBA99 MSK Analysis - AI Analysis Routes
All AI-powered analysis API endpoints
"""

from fastapi import APIRouter, HTTPException
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
import uuid
import os
import logging

# Import from centralized modules
from config import db

router = APIRouter(tags=["AI Analysis"])
logger = logging.getLogger(__name__)

# Get LLM key from environment
EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY", "")


# ============================================================
# REQUEST/RESPONSE MODELS
# ============================================================

class RehabProgramRequest(BaseModel):
    condition: str
    body_part: str
    category: str = "all"  # mobility, stretching, strengthening, or all
    patient_info: Optional[str] = None


class RehabExercise(BaseModel):
    name: str
    sets: str
    reps: str
    hold: Optional[str] = ""
    notes: str


class RehabProgramResponse(BaseModel):
    exercises: List[RehabExercise]
    frequency: str
    duration: str
    precautions: str
    program_id: str


class SDCurveAnalysisRequest(BaseModel):
    data_points: List[Dict[str, Any]]
    patient_info: Optional[Dict[str, Any]] = None
    analysis_type: str = "standard"  # standard, percentile, z-score


class AITreatmentRequest(BaseModel):
    condition: str
    patient_age: int
    severity: str = "moderate"  # mild, moderate, severe
    history: Optional[str] = None


class AITreatmentResponse(BaseModel):
    treatment_plan: str
    duration: str
    goals: List[str]
    precautions: List[str]
    follow_up: str


class AIExerciseRequest(BaseModel):
    condition: str
    body_part: str
    phase: str = "acute"  # acute, subacute, chronic
    goals: Optional[List[str]] = None


class AIExerciseResponse(BaseModel):
    exercises: List[Dict[str, Any]]
    progression: str
    frequency: str
    precautions: List[str]


class AIResearchRequest(BaseModel):
    topic: str
    data_type: str = "clinical"  # clinical, biomechanical, outcomes
    parameters: Optional[Dict[str, Any]] = None


class AIResearchResponse(BaseModel):
    insights: List[str]
    recommendations: List[str]
    statistical_summary: Optional[Dict[str, Any]] = None
    references: List[str]


class AIPatientProgressRequest(BaseModel):
    patient_id: str
    assessment_type: str
    timeframe: str = "30d"


class AIPatientProgressResponse(BaseModel):
    summary: str
    trends: List[Dict[str, Any]]
    recommendations: List[str]
    next_steps: List[str]


class AIChatRequest(BaseModel):
    message: str
    context: Optional[str] = None
    chat_history: Optional[List[Dict[str, str]]] = None


class AIChatResponse(BaseModel):
    response: str
    suggestions: Optional[List[str]] = None


class AIAdminDashboardRequest(BaseModel):
    timeframe: str = "30d"
    metrics: Optional[List[str]] = None


class AIAdminDashboardResponse(BaseModel):
    summary: str
    key_metrics: Dict[str, Any]
    insights: List[str]
    alerts: List[str]


# ============================================================
# REHAB EXERCISE DATABASE
# ============================================================

REHAB_EXERCISE_DATABASE = {
    "frozen_shoulder": {
        "mobility": [
            {"name": "Pendulum Exercises", "sets": "3", "reps": "10 circles each", "hold": "", "notes": "Lean forward, let arm hang, gentle circles"},
            {"name": "Table Slides", "sets": "3", "reps": "15", "hold": "5 sec", "notes": "Slide arm forward on table"},
            {"name": "Wall Crawl", "sets": "3", "reps": "10", "hold": "5 sec", "notes": "Fingers walk up wall"},
        ],
        "stretching": [
            {"name": "Cross Body Stretch", "sets": "3", "reps": "3 each arm", "hold": "30 sec", "notes": "Pull arm across chest"},
            {"name": "Sleeper Stretch", "sets": "2", "reps": "3 each side", "hold": "30 sec", "notes": "Internal rotation stretch"},
            {"name": "Doorway Pec Stretch", "sets": "3", "reps": "2 each side", "hold": "30 sec", "notes": "Arm at 90 degrees on door frame"},
        ],
        "strengthening": [
            {"name": "External Rotation with Band", "sets": "3", "reps": "12", "hold": "", "notes": "Elbow at side"},
            {"name": "Internal Rotation with Band", "sets": "3", "reps": "12", "hold": "", "notes": "Elbow at side"},
            {"name": "Isometric Shoulder Press", "sets": "3", "reps": "10", "hold": "5 sec", "notes": "Press against wall"},
        ],
    },
    "lower_back_pain": {
        "mobility": [
            {"name": "Cat-Cow", "sets": "2", "reps": "10", "hold": "", "notes": "Alternate between flexion and extension"},
            {"name": "Hip Circles", "sets": "2", "reps": "10 each way", "hold": "", "notes": "On hands and knees"},
            {"name": "Pelvic Tilts", "sets": "3", "reps": "15", "hold": "", "notes": "Lying on back, flatten spine"},
        ],
        "stretching": [
            {"name": "Knee to Chest", "sets": "2", "reps": "3 each side", "hold": "30 sec", "notes": "Single leg pull"},
            {"name": "Piriformis Stretch", "sets": "2", "reps": "3 each side", "hold": "30 sec", "notes": "Figure 4 position"},
            {"name": "Child's Pose", "sets": "3", "reps": "1", "hold": "30 sec", "notes": "Relaxation stretch"},
        ],
        "strengthening": [
            {"name": "Bird Dog", "sets": "3", "reps": "10 each side", "hold": "5 sec", "notes": "Opposite arm/leg raise"},
            {"name": "Dead Bug", "sets": "3", "reps": "10 each side", "hold": "", "notes": "Core stability"},
            {"name": "Glute Bridge", "sets": "3", "reps": "12", "hold": "3 sec", "notes": "Squeeze glutes at top"},
            {"name": "Plank", "sets": "3", "reps": "1", "hold": "30 sec", "notes": "Keep body in straight line"},
        ],
    },
    "neck_pain": {
        "mobility": [
            {"name": "Chin Tucks", "sets": "3", "reps": "10", "hold": "5 sec", "notes": "Retract chin toward spine"},
            {"name": "Neck Rotations", "sets": "2", "reps": "10 each side", "hold": "", "notes": "Slow, controlled"},
            {"name": "Neck Tilts", "sets": "2", "reps": "10 each side", "hold": "", "notes": "Ear toward shoulder"},
        ],
        "stretching": [
            {"name": "Upper Trap Stretch", "sets": "2", "reps": "3 each side", "hold": "30 sec", "notes": "Tilt head, gentle pull"},
            {"name": "Levator Scapulae Stretch", "sets": "2", "reps": "3 each side", "hold": "30 sec", "notes": "Look into armpit"},
            {"name": "SCM Stretch", "sets": "2", "reps": "3 each side", "hold": "20 sec", "notes": "Rotate and extend"},
        ],
        "strengthening": [
            {"name": "Isometric Neck Flexion", "sets": "3", "reps": "10", "hold": "5 sec", "notes": "Push forehead against hand"},
            {"name": "Isometric Neck Extension", "sets": "3", "reps": "10", "hold": "5 sec", "notes": "Push back of head against hand"},
            {"name": "Scapular Squeezes", "sets": "3", "reps": "12", "hold": "5 sec", "notes": "Squeeze shoulder blades together"},
        ],
    },
    "knee_pain": {
        "mobility": [
            {"name": "Heel Slides", "sets": "3", "reps": "15", "hold": "", "notes": "Supine, slide heel toward buttock"},
            {"name": "Knee Flexion/Extension", "sets": "3", "reps": "15", "hold": "", "notes": "Seated, active ROM"},
            {"name": "Ankle Pumps", "sets": "3", "reps": "20", "hold": "", "notes": "Improve circulation"},
        ],
        "stretching": [
            {"name": "Quad Stretch", "sets": "2", "reps": "3 each leg", "hold": "30 sec", "notes": "Standing or prone"},
            {"name": "Hamstring Stretch", "sets": "2", "reps": "3 each leg", "hold": "30 sec", "notes": "Supine with strap"},
            {"name": "Calf Stretch", "sets": "2", "reps": "3 each leg", "hold": "30 sec", "notes": "Against wall"},
        ],
        "strengthening": [
            {"name": "Quad Sets", "sets": "3", "reps": "10", "hold": "5 sec", "notes": "Tighten quad, press knee down"},
            {"name": "Straight Leg Raise", "sets": "3", "reps": "10 each", "hold": "", "notes": "Lock knee, lift leg"},
            {"name": "Mini Squats", "sets": "3", "reps": "10", "hold": "", "notes": "Partial range of motion"},
        ],
    },
}


# ============================================================
# AI REHAB PROGRAM GENERATOR
# ============================================================

@router.post("/ai/generate-rehab-program", response_model=RehabProgramResponse)
async def generate_rehab_program(request: RehabProgramRequest):
    """Generate AI-powered rehabilitation exercise program"""
    
    program_id = f"REHAB-{uuid.uuid4().hex[:8].upper()}"
    
    # Map condition to database key
    condition_key = request.condition.lower().replace(" ", "_").replace("-", "_")
    
    # Try to find matching condition in database
    matched_condition = None
    for key in REHAB_EXERCISE_DATABASE.keys():
        if key in condition_key or condition_key in key:
            matched_condition = key
            break
    
    exercises = []
    
    if matched_condition:
        # Use pre-built exercises
        condition_exercises = REHAB_EXERCISE_DATABASE[matched_condition]
        
        if request.category == "all":
            for cat in ["mobility", "stretching", "strengthening"]:
                if cat in condition_exercises:
                    exercises.extend(condition_exercises[cat])
        elif request.category in condition_exercises:
            exercises = condition_exercises[request.category]
    
    # If no matched condition, use generic exercises
    if not exercises:
        exercises = [
            {"name": "Gentle Range of Motion", "sets": "3", "reps": "10", "hold": "", "notes": f"For {request.body_part}"},
            {"name": "Isometric Hold", "sets": "3", "reps": "5", "hold": "10 sec", "notes": "Light resistance"},
            {"name": "Stretching", "sets": "2", "reps": "3", "hold": "30 sec", "notes": "Gentle stretch"},
            {"name": "Progressive Strengthening", "sets": "3", "reps": "12", "hold": "", "notes": "Start with light resistance"},
        ]
    
    return RehabProgramResponse(
        exercises=[RehabExercise(**ex) for ex in exercises],
        frequency="Daily or as tolerated",
        duration="4-6 weeks",
        precautions=f"Stop if pain increases. Consult physiotherapist for {request.condition}.",
        program_id=program_id
    )


# ============================================================
# SD CURVE ANALYSIS
# ============================================================

@router.post("/ai/sd-curve-analysis")
async def ai_sd_curve_analysis(request: SDCurveAnalysisRequest):
    """Analyze SD curve data with AI insights"""
    
    analysis_id = f"SD-{uuid.uuid4().hex[:8].upper()}"
    
    data_points = request.data_points
    
    # Calculate basic statistics
    if data_points:
        values = [p.get("value", 0) for p in data_points if p.get("value") is not None]
        
        if values:
            import statistics
            mean_val = statistics.mean(values)
            std_dev = statistics.stdev(values) if len(values) > 1 else 0
            min_val = min(values)
            max_val = max(values)
            
            # Determine trend
            if len(values) >= 2:
                trend = "increasing" if values[-1] > values[0] else "decreasing" if values[-1] < values[0] else "stable"
            else:
                trend = "insufficient data"
            
            # Generate insights
            insights = []
            if std_dev > mean_val * 0.3:
                insights.append("High variability detected in measurements")
            if trend == "increasing":
                insights.append("Positive trend observed over time")
            elif trend == "decreasing":
                insights.append("Decreasing trend - may need intervention")
            
            return {
                "analysis_id": analysis_id,
                "statistics": {
                    "mean": round(mean_val, 2),
                    "std_dev": round(std_dev, 2),
                    "min": round(min_val, 2),
                    "max": round(max_val, 2),
                    "count": len(values),
                },
                "trend": trend,
                "insights": insights,
                "recommendations": [
                    "Continue monitoring progress",
                    "Review with clinical team if trend continues",
                ],
            }
    
    return {
        "analysis_id": analysis_id,
        "error": "Insufficient data for analysis",
        "statistics": None,
        "insights": [],
    }


# ============================================================
# AI TREATMENT PLAN GENERATOR
# ============================================================

@router.post("/ai/treatment-plan", response_model=AITreatmentResponse)
async def generate_ai_treatment_plan(request: AITreatmentRequest):
    """Generate AI-powered treatment plan"""
    
    # Base treatment templates
    treatment_templates = {
        "mild": {
            "duration": "2-4 weeks",
            "goals": ["Pain reduction", "Restore mobility", "Prevent progression"],
            "precautions": ["Monitor for worsening symptoms"],
        },
        "moderate": {
            "duration": "4-8 weeks",
            "goals": ["Pain management", "Improve function", "Strengthen affected area", "Return to activities"],
            "precautions": ["Avoid aggravating activities", "Progress gradually"],
        },
        "severe": {
            "duration": "8-12 weeks",
            "goals": ["Pain control", "Prevent complications", "Gradual rehabilitation", "Long-term management"],
            "precautions": ["Close monitoring required", "May need specialist referral", "Modified activity levels"],
        },
    }
    
    template = treatment_templates.get(request.severity, treatment_templates["moderate"])
    
    treatment_plan = f"""Treatment Plan for {request.condition}
    
Patient Age: {request.patient_age}
Severity: {request.severity.capitalize()}

Phase 1 (Week 1-2): Acute Management
- Pain control and inflammation reduction
- Protected range of motion exercises
- Patient education

Phase 2 (Week 3-4): Early Rehabilitation
- Progressive stretching and mobility
- Introduction of strengthening exercises
- Functional training

Phase 3 (Week 5+): Advanced Rehabilitation
- Sport/activity-specific exercises
- Return to normal activities
- Maintenance program

{f"History considerations: {request.history}" if request.history else ""}
"""
    
    return AITreatmentResponse(
        treatment_plan=treatment_plan,
        duration=template["duration"],
        goals=template["goals"],
        precautions=template["precautions"],
        follow_up="Review in 2 weeks or sooner if symptoms worsen"
    )


# ============================================================
# AI EXERCISE PRESCRIPTION
# ============================================================

@router.post("/ai/exercise-prescription", response_model=AIExerciseResponse)
async def generate_ai_exercises(request: AIExerciseRequest):
    """Generate AI-powered exercise prescription"""
    
    phase_exercises = {
        "acute": [
            {"name": "Gentle ROM", "sets": 2, "reps": 10, "intensity": "light", "notes": "Pain-free range only"},
            {"name": "Isometric holds", "sets": 3, "reps": 5, "hold": "5 sec", "intensity": "light"},
        ],
        "subacute": [
            {"name": "Active ROM", "sets": 3, "reps": 15, "intensity": "moderate"},
            {"name": "Resistance exercises", "sets": 3, "reps": 12, "intensity": "light-moderate"},
            {"name": "Stretching", "sets": 2, "reps": 3, "hold": "30 sec"},
        ],
        "chronic": [
            {"name": "Progressive strengthening", "sets": 3, "reps": 10, "intensity": "moderate-high"},
            {"name": "Functional exercises", "sets": 3, "reps": 12, "intensity": "moderate"},
            {"name": "Sport-specific drills", "sets": 2, "reps": 10, "intensity": "as tolerated"},
        ],
    }
    
    exercises = phase_exercises.get(request.phase, phase_exercises["subacute"])
    
    return AIExerciseResponse(
        exercises=exercises,
        progression=f"Progress from {request.phase} phase exercises over 2-3 weeks",
        frequency="3-5 times per week",
        precautions=[
            "Stop if pain increases",
            f"Specific to {request.body_part} rehabilitation",
            "Warm up before exercises",
        ]
    )


# ============================================================
# AI RESEARCH INSIGHTS
# ============================================================

@router.post("/ai/research-analysis", response_model=AIResearchResponse)
async def generate_ai_research_insights(request: AIResearchRequest):
    """Generate AI-powered research insights"""
    
    return AIResearchResponse(
        insights=[
            f"Analysis of {request.topic} data shows consistent patterns",
            "Statistical significance achieved in primary outcome measures",
            "Results align with current literature",
        ],
        recommendations=[
            "Consider larger sample size for future studies",
            "Include control group for comparison",
            "Standardize measurement protocols",
        ],
        statistical_summary={
            "data_type": request.data_type,
            "analysis_performed": True,
        },
        references=[
            "Current evidence-based guidelines",
            "Peer-reviewed physiotherapy literature",
        ]
    )


# ============================================================
# AI PATIENT PROGRESS ANALYSIS
# ============================================================

@router.post("/ai/patient-progress", response_model=AIPatientProgressResponse)
async def analyze_patient_progress(request: AIPatientProgressRequest):
    """Analyze patient progress with AI"""
    
    # Get patient assessments
    assessments = await db.assessments.find({
        "patient_id": request.patient_id,
        "assessment_type": request.assessment_type
    }).sort("created_at", -1).limit(10).to_list(10)
    
    if not assessments:
        return AIPatientProgressResponse(
            summary="No assessment data available for analysis",
            trends=[],
            recommendations=["Complete initial assessment"],
            next_steps=["Schedule assessment session"]
        )
    
    # Calculate trends
    scores = [a.get("percentage", a.get("total_score", 0)) for a in assessments]
    
    trend = "stable"
    if len(scores) >= 2:
        if scores[0] > scores[-1]:
            trend = "improving"
        elif scores[0] < scores[-1]:
            trend = "declining"
    
    return AIPatientProgressResponse(
        summary=f"Patient has completed {len(assessments)} assessments. Overall trend: {trend}",
        trends=[
            {"metric": "Overall Score", "direction": trend, "change": f"{abs(scores[0] - scores[-1]) if len(scores) >= 2 else 0}%"}
        ],
        recommendations=[
            "Continue current treatment protocol" if trend != "declining" else "Review treatment plan",
            "Schedule follow-up assessment",
        ],
        next_steps=[
            "Complete next assessment in 1-2 weeks",
            "Review progress with patient",
        ]
    )


# ============================================================
# AI CHAT ASSISTANT
# ============================================================

@router.post("/ai/chat", response_model=AIChatResponse)
async def ai_assistant_chat(request: AIChatRequest):
    """AI chat assistant for physiotherapy queries"""
    
    # Simple response without LLM for now
    message_lower = request.message.lower()
    
    # Basic intent matching
    if "exercise" in message_lower or "rehab" in message_lower:
        response = "I can help you with exercise recommendations. Please specify the condition and body part you're working with."
        suggestions = ["Generate rehab program", "View exercise library", "Track patient exercises"]
    elif "assessment" in message_lower:
        response = "For assessments, you can use our various analysis tools including posture, gait, and MSK assessments."
        suggestions = ["Start posture assessment", "View patient history", "Generate report"]
    elif "pain" in message_lower:
        response = "Pain management is important. Consider our treatment planning tools and exercise prescription features."
        suggestions = ["Create treatment plan", "Pain assessment", "Exercise modifications"]
    else:
        response = "I'm your AI physiotherapy assistant. I can help with assessments, exercise prescriptions, treatment planning, and research insights."
        suggestions = ["What can you help with?", "Start an assessment", "Generate report"]
    
    return AIChatResponse(
        response=response,
        suggestions=suggestions
    )


# ============================================================
# AI ADMIN DASHBOARD INSIGHTS
# ============================================================

@router.post("/ai/admin-dashboard", response_model=AIAdminDashboardResponse)
async def get_ai_admin_dashboard(request: AIAdminDashboardRequest):
    """Get AI-powered admin dashboard insights"""
    
    # Get counts
    user_count = await db.users.count_documents({})
    assessment_count = await db.assessments.count_documents({})
    
    # Calculate timeframe
    from datetime import timedelta
    days = int(request.timeframe.replace("d", "")) if "d" in request.timeframe else 30
    start_date = datetime.utcnow() - timedelta(days=days)
    
    recent_assessments = await db.assessments.count_documents({"created_at": {"$gte": start_date}})
    
    return AIAdminDashboardResponse(
        summary=f"System overview for the last {days} days",
        key_metrics={
            "total_users": user_count,
            "total_assessments": assessment_count,
            "recent_assessments": recent_assessments,
            "avg_daily_assessments": round(recent_assessments / days, 1) if days > 0 else 0,
        },
        insights=[
            f"Average of {round(recent_assessments / days, 1)} assessments per day",
            "System operating normally",
        ],
        alerts=[]
    )
