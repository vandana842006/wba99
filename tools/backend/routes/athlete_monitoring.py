"""
WBA99 MSK Analysis - Athlete Monitoring Routes
Handles athlete profiles, load monitoring, and daily tracking
"""

from fastapi import APIRouter, HTTPException
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
import uuid

from config import db

router = APIRouter(tags=["Athlete Monitoring"])


# =============================================
# ATHLETE PROFILE MODELS
# =============================================

class AthleteProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    sport: str
    position: Optional[str] = None
    team: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    age: Optional[int] = None
    dominant_side: str = "right"
    injury_history: List[Dict[str, Any]] = []
    goals: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AthleteProfileCreate(BaseModel):
    patient_id: str
    sport: str
    position: Optional[str] = None
    team: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    age: Optional[int] = None
    dominant_side: str = "right"


# =============================================
# LOAD MONITORING MODELS
# =============================================

class LoadEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    athlete_id: str
    patient_id: str
    session_type: str
    duration_minutes: int
    rpe: int = Field(ge=1, le=10)
    session_load: int = 0
    notes: Optional[str] = None
    recorded_by: Optional[str] = None
    date: datetime = Field(default_factory=datetime.utcnow)
    acwr: Optional[float] = None


class LoadEntryCreate(BaseModel):
    athlete_id: str
    patient_id: str
    session_type: str
    duration_minutes: int
    rpe: int = Field(ge=1, le=10)
    notes: Optional[str] = None
    recorded_by: Optional[str] = None


# =============================================
# DAILY TRACKING MODELS
# =============================================

class DailyTrackingEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    date: datetime = Field(default_factory=datetime.utcnow)
    
    # Sleep metrics
    sleep_hours: float = Field(ge=0, le=24, default=7)
    sleep_quality: int = Field(ge=1, le=10, default=7)
    
    # Energy and mood
    energy_level: int = Field(ge=1, le=10, default=7)
    mood: int = Field(ge=1, le=10, default=7)
    stress_level: int = Field(ge=1, le=10, default=5)
    
    # Pain tracking
    pain_level: int = Field(ge=0, le=10, default=0)
    pain_location: Optional[str] = None
    
    # Physical metrics
    soreness_level: int = Field(ge=0, le=10, default=0)
    fatigue_level: int = Field(ge=0, le=10, default=0)
    
    # Nutrition
    hydration_liters: float = Field(ge=0, le=10, default=2)
    meals_eaten: int = Field(ge=0, le=10, default=3)
    
    # Wellness score (calculated)
    wellness_score: float = 0
    notes: str = ""
    recorded_by: Optional[str] = None


class DailyTrackingCreate(BaseModel):
    patient_id: str
    date: Optional[datetime] = None
    sleep_hours: float = 7
    sleep_quality: int = 7
    energy_level: int = 7
    mood: int = 7
    stress_level: int = 5
    pain_level: int = 0
    pain_location: Optional[str] = None
    soreness_level: int = 0
    fatigue_level: int = 0
    hydration_liters: float = 2
    meals_eaten: int = 3
    notes: str = ""
    recorded_by: Optional[str] = None


# =============================================
# HELPER FUNCTIONS
# =============================================

def calculate_wellness_score(data: dict) -> float:
    """Calculate wellness score from daily tracking data"""
    # Higher is better for: sleep_quality, energy, mood
    # Lower is better for: stress, pain, soreness, fatigue
    positive = (
        data.get("sleep_quality", 7) +
        data.get("energy_level", 7) +
        data.get("mood", 7)
    ) / 3 * 10
    
    negative = (
        data.get("stress_level", 5) +
        data.get("pain_level", 0) +
        data.get("soreness_level", 0) +
        data.get("fatigue_level", 0)
    ) / 4
    
    # Sleep hours bonus (7-9 optimal)
    sleep = data.get("sleep_hours", 7)
    sleep_bonus = 10 if 7 <= sleep <= 9 else max(0, 10 - abs(sleep - 8) * 2)
    
    wellness = (positive + sleep_bonus - negative * 2) / 2
    return round(max(0, min(100, wellness)), 1)


async def calculate_acwr(athlete_id: str, new_load: int) -> float:
    """Calculate Acute:Chronic Workload Ratio"""
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=28)
    
    # Get loads from last 7 days (acute)
    acute_loads = await db.load_entries.find({
        "athlete_id": athlete_id,
        "date": {"$gte": week_ago}
    }).to_list(1000)
    
    # Get loads from last 28 days (chronic)
    chronic_loads = await db.load_entries.find({
        "athlete_id": athlete_id,
        "date": {"$gte": month_ago}
    }).to_list(1000)
    
    acute_total = sum(l.get("session_load", 0) for l in acute_loads) + new_load
    chronic_avg = sum(l.get("session_load", 0) for l in chronic_loads) / 4 if chronic_loads else new_load
    
    acwr = acute_total / chronic_avg if chronic_avg > 0 else 1.0
    return round(acwr, 2)


# =============================================
# ATHLETE PROFILE ROUTES
# =============================================

@router.post("/athlete-profile", response_model=AthleteProfile)
async def create_athlete_profile(data: AthleteProfileCreate):
    """Create athlete profile"""
    profile = AthleteProfile(**data.dict())
    await db.athlete_profiles.insert_one(profile.dict())
    return profile


@router.get("/athlete-profile/{patient_id}", response_model=AthleteProfile)
async def get_athlete_profile(patient_id: str):
    """Get athlete profile"""
    profile = await db.athlete_profiles.find_one({"patient_id": patient_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Athlete profile not found")
    return AthleteProfile(**profile)


@router.put("/athlete-profile/{patient_id}")
async def update_athlete_profile(patient_id: str, data: Dict[str, Any]):
    """Update athlete profile"""
    result = await db.athlete_profiles.update_one(
        {"patient_id": patient_id},
        {"$set": data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Athlete profile not found")
    return {"message": "Profile updated successfully"}


# =============================================
# LOAD MONITORING ROUTES
# =============================================

@router.post("/load-monitoring", response_model=LoadEntry)
async def create_load_entry(data: LoadEntryCreate):
    """Create load monitoring entry and calculate ACWR"""
    session_load = data.duration_minutes * data.rpe
    acwr = await calculate_acwr(data.athlete_id, session_load)
    
    entry = LoadEntry(
        athlete_id=data.athlete_id,
        patient_id=data.patient_id,
        session_type=data.session_type,
        duration_minutes=data.duration_minutes,
        rpe=data.rpe,
        session_load=session_load,
        notes=data.notes,
        recorded_by=data.recorded_by,
        acwr=acwr
    )
    
    await db.load_entries.insert_one(entry.dict())
    return entry


@router.get("/load-monitoring/{athlete_id}", response_model=List[LoadEntry])
async def get_load_entries(athlete_id: str, days: int = 28):
    """Get load monitoring entries for athlete"""
    start_date = datetime.utcnow() - timedelta(days=days)
    entries = await db.load_entries.find({
        "athlete_id": athlete_id,
        "date": {"$gte": start_date}
    }).sort("date", -1).to_list(1000)
    return [LoadEntry(**e) for e in entries]


@router.get("/athlete-dashboard/{patient_id}")
async def get_athlete_dashboard(patient_id: str):
    """Get comprehensive athlete dashboard data"""
    # Get profile
    profile = await db.athlete_profiles.find_one({"patient_id": patient_id})
    
    # Get recent loads
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_loads = await db.load_entries.find({
        "patient_id": patient_id,
        "date": {"$gte": week_ago}
    }).sort("date", -1).to_list(100)
    
    # Get recent daily tracking
    recent_tracking = await db.daily_tracking.find({
        "patient_id": patient_id,
        "date": {"$gte": week_ago}
    }).sort("date", -1).to_list(7)
    
    # Calculate averages
    avg_acwr = sum(l.get("acwr", 1) for l in recent_loads) / len(recent_loads) if recent_loads else 1.0
    avg_wellness = sum(t.get("wellness_score", 70) for t in recent_tracking) / len(recent_tracking) if recent_tracking else 70
    
    return {
        "profile": profile,
        "recent_loads": recent_loads[:7],
        "recent_tracking": recent_tracking,
        "averages": {
            "acwr": round(avg_acwr, 2),
            "wellness": round(avg_wellness, 1)
        },
        "acwr_status": "optimal" if 0.8 <= avg_acwr <= 1.3 else ("high_risk" if avg_acwr > 1.5 else "low")
    }


# =============================================
# DAILY TRACKING ROUTES
# =============================================

@router.post("/daily-tracking", response_model=DailyTrackingEntry)
async def create_daily_tracking(data: DailyTrackingCreate):
    """Create daily tracking entry"""
    wellness_score = calculate_wellness_score(data.dict())
    
    entry = DailyTrackingEntry(
        patient_id=data.patient_id,
        date=data.date or datetime.utcnow(),
        wellness_score=wellness_score,
        **{k: v for k, v in data.dict().items() if k not in ['patient_id', 'date']}
    )
    
    await db.daily_tracking.insert_one(entry.dict())
    return entry


@router.get("/daily-tracking", response_model=List[DailyTrackingEntry])
async def get_daily_tracking(
    patient_id: Optional[str] = None,
    days: int = 30,
    skip: int = 0,
    limit: int = 100
):
    """Get daily tracking entries"""
    query = {}
    if patient_id:
        query["patient_id"] = patient_id
    
    start_date = datetime.utcnow() - timedelta(days=days)
    query["date"] = {"$gte": start_date}
    
    entries = await db.daily_tracking.find(query).sort("date", -1).skip(skip).limit(limit).to_list(limit)
    return [DailyTrackingEntry(**e) for e in entries]


@router.get("/daily-tracking/summary/{patient_id}")
async def get_daily_tracking_summary(patient_id: str, days: int = 7):
    """Get daily tracking summary with trends"""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    entries = await db.daily_tracking.find({
        "patient_id": patient_id,
        "date": {"$gte": start_date}
    }).sort("date", 1).to_list(100)
    
    if not entries:
        return {"summary": None, "trend": "no_data"}
    
    # Calculate averages
    avg_wellness = sum(e.get("wellness_score", 0) for e in entries) / len(entries)
    avg_sleep = sum(e.get("sleep_hours", 0) for e in entries) / len(entries)
    avg_energy = sum(e.get("energy_level", 0) for e in entries) / len(entries)
    avg_pain = sum(e.get("pain_level", 0) for e in entries) / len(entries)
    
    # Determine trend (compare first half to second half)
    mid = len(entries) // 2
    if mid > 0:
        first_half = sum(e.get("wellness_score", 0) for e in entries[:mid]) / mid
        second_half = sum(e.get("wellness_score", 0) for e in entries[mid:]) / (len(entries) - mid)
        trend = "improving" if second_half > first_half + 5 else ("declining" if second_half < first_half - 5 else "stable")
    else:
        trend = "insufficient_data"
    
    return {
        "summary": {
            "wellness": round(avg_wellness, 1),
            "sleep": round(avg_sleep, 1),
            "energy": round(avg_energy, 1),
            "pain": round(avg_pain, 1)
        },
        "trend": trend,
        "entries_count": len(entries),
        "period_days": days
    }


@router.delete("/daily-tracking/{entry_id}")
async def delete_daily_tracking(entry_id: str):
    """Delete daily tracking entry"""
    result = await db.daily_tracking.delete_one({"id": entry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"message": "Entry deleted successfully"}
