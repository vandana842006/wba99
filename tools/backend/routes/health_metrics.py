"""
WBA99 MSK Analysis - Health Metrics Routes
Handles patient wellness tracking and health metrics
"""

from fastapi import APIRouter, HTTPException
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
import uuid

from config import db

router = APIRouter(tags=["Health Metrics"])


# =============================================
# HEALTH METRICS MODELS
# =============================================

class HealthMetrics(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    patient_name: Optional[str] = None
    recorded_by: Optional[str] = None  # Physio ID who recorded
    recorded_by_name: Optional[str] = None
    date: datetime = Field(default_factory=datetime.utcnow)
    
    # Load Monitoring (0-10 scale, based on RPE)
    load_monitoring: int = Field(ge=0, le=10, default=5)
    training_load_notes: str = ""
    
    # Heart Rate
    resting_heart_rate: int = Field(ge=30, le=200, default=70)
    max_heart_rate: Optional[int] = None
    heart_rate_variability: Optional[float] = None
    
    # Hydration (0-10 scale)
    hydration_level: int = Field(ge=0, le=10, default=7)
    water_intake_liters: float = Field(ge=0, le=10, default=2.0)
    
    # Sleep
    sleep_quality: int = Field(ge=0, le=10, default=7)
    sleep_duration_hours: float = Field(ge=0, le=24, default=7.0)
    sleep_notes: str = ""
    
    # Protein Intake
    protein_intake_grams: float = Field(ge=0, le=500, default=100)
    protein_target_grams: float = Field(ge=0, le=500, default=120)
    
    # Overall Wellness
    wellness_score: float = 0
    notes: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)


class HealthMetricsCreate(BaseModel):
    patient_id: str
    recorded_by: Optional[str] = None
    date: Optional[datetime] = None
    load_monitoring: int = Field(ge=0, le=10, default=5)
    training_load_notes: str = ""
    resting_heart_rate: int = Field(ge=30, le=200, default=70)
    max_heart_rate: Optional[int] = None
    heart_rate_variability: Optional[float] = None
    hydration_level: int = Field(ge=0, le=10, default=7)
    water_intake_liters: float = Field(ge=0, le=10, default=2.0)
    sleep_quality: int = Field(ge=0, le=10, default=7)
    sleep_duration_hours: float = Field(ge=0, le=24, default=7.0)
    sleep_notes: str = ""
    protein_intake_grams: float = Field(ge=0, le=500, default=100)
    protein_target_grams: float = Field(ge=0, le=500, default=120)
    notes: str = ""


# =============================================
# WELLNESS SCORE CALCULATION
# =============================================

def calculate_wellness_score(data: dict) -> float:
    """Calculate overall wellness score from health metrics"""
    weights = {
        'load': 0.15,
        'heart_rate': 0.20,
        'hydration': 0.20,
        'sleep': 0.25,
        'protein': 0.20
    }
    
    # Load score
    load_score = (10 - abs(data.get('load_monitoring', 5) - 5) * 2) / 10 * 100
    
    # Heart rate score (60-80 optimal)
    rhr = data.get('resting_heart_rate', 70)
    if 60 <= rhr <= 80:
        hr_score = 100
    elif rhr < 60:
        hr_score = max(0, 100 - (60 - rhr) * 2)
    else:
        hr_score = max(0, 100 - (rhr - 80) * 2)
    
    # Hydration score
    hydration_score = data.get('hydration_level', 7) * 10
    
    # Sleep score (7-9 hours optimal)
    sleep_hours = data.get('sleep_duration_hours', 7)
    sleep_quality = data.get('sleep_quality', 7)
    if 7 <= sleep_hours <= 9:
        duration_score = 100
    else:
        duration_score = max(0, 100 - abs(sleep_hours - 8) * 15)
    sleep_score = (duration_score + sleep_quality * 10) / 2
    
    # Protein score
    protein = data.get('protein_intake_grams', 100)
    target = data.get('protein_target_grams', 120)
    protein_score = min(100, (protein / target) * 100) if target > 0 else 50
    
    # Weighted average
    wellness = (
        load_score * weights['load'] +
        hr_score * weights['heart_rate'] +
        hydration_score * weights['hydration'] +
        sleep_score * weights['sleep'] +
        protein_score * weights['protein']
    )
    
    return round(wellness, 1)


# =============================================
# HEALTH METRICS ROUTES
# =============================================

@router.post("/health-metrics", response_model=HealthMetrics)
async def create_health_metrics(data: HealthMetricsCreate):
    """Create health metrics entry for a patient"""
    patient = await db.users.find_one({"id": data.patient_id})
    patient_name = patient.get("name") if patient else None
    
    recorded_by_name = None
    if data.recorded_by:
        recorder = await db.users.find_one({"id": data.recorded_by})
        recorded_by_name = recorder.get("name") if recorder else None
    
    metrics_dict = data.dict()
    wellness_score = calculate_wellness_score(metrics_dict)
    
    metrics = HealthMetrics(
        patient_id=data.patient_id,
        patient_name=patient_name,
        recorded_by=data.recorded_by,
        recorded_by_name=recorded_by_name,
        date=data.date or datetime.utcnow(),
        wellness_score=wellness_score,
        **{k: v for k, v in metrics_dict.items() if k not in ['patient_id', 'recorded_by', 'date']}
    )
    
    await db.health_metrics.insert_one(metrics.dict())
    return metrics


@router.get("/health-metrics", response_model=List[HealthMetrics])
async def get_health_metrics(
    patient_id: Optional[str] = None,
    recorded_by: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    """Get health metrics with optional filters"""
    query = {}
    if patient_id:
        query["patient_id"] = patient_id
    if recorded_by:
        query["recorded_by"] = recorded_by
    
    metrics = await db.health_metrics.find(query).sort("date", -1).skip(skip).limit(limit).to_list(limit)
    return [HealthMetrics(**m) for m in metrics]


@router.get("/health-metrics/{metrics_id}", response_model=HealthMetrics)
async def get_health_metrics_by_id(metrics_id: str):
    """Get specific health metrics entry"""
    metrics = await db.health_metrics.find_one({"id": metrics_id})
    if not metrics:
        raise HTTPException(status_code=404, detail="Health metrics not found")
    return HealthMetrics(**metrics)


@router.get("/health-metrics/patient/{patient_id}/latest", response_model=Optional[HealthMetrics])
async def get_latest_health_metrics(patient_id: str):
    """Get latest health metrics for a patient"""
    metrics = await db.health_metrics.find_one(
        {"patient_id": patient_id},
        sort=[("date", -1)]
    )
    return HealthMetrics(**metrics) if metrics else None


@router.get("/health-metrics/patient/{patient_id}/trends")
async def get_health_metrics_trends(patient_id: str, days: int = 30):
    """Get health metrics trends over time"""
    from datetime import timedelta
    start_date = datetime.utcnow() - timedelta(days=days)
    
    metrics = await db.health_metrics.find({
        "patient_id": patient_id,
        "date": {"$gte": start_date}
    }).sort("date", 1).to_list(1000)
    
    if not metrics:
        return {"trends": [], "averages": {}}
    
    # Calculate averages
    avg_wellness = sum(m.get("wellness_score", 0) for m in metrics) / len(metrics)
    avg_sleep = sum(m.get("sleep_quality", 0) for m in metrics) / len(metrics)
    avg_hydration = sum(m.get("hydration_level", 0) for m in metrics) / len(metrics)
    avg_load = sum(m.get("load_monitoring", 0) for m in metrics) / len(metrics)
    
    return {
        "trends": [
            {
                "date": m.get("date"),
                "wellness_score": m.get("wellness_score", 0),
                "sleep_quality": m.get("sleep_quality", 0),
                "hydration_level": m.get("hydration_level", 0),
                "load_monitoring": m.get("load_monitoring", 0)
            }
            for m in metrics
        ],
        "averages": {
            "wellness": round(avg_wellness, 1),
            "sleep": round(avg_sleep, 1),
            "hydration": round(avg_hydration, 1),
            "load": round(avg_load, 1)
        },
        "count": len(metrics)
    }


@router.delete("/health-metrics/{metrics_id}")
async def delete_health_metrics(metrics_id: str):
    """Delete health metrics entry"""
    result = await db.health_metrics.delete_one({"id": metrics_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Health metrics not found")
    return {"message": "Health metrics deleted successfully"}
