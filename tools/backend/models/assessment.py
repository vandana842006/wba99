"""
WBA99 MSK Analysis - Assessment Models
All assessment-related Pydantic models
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid

from .enums import AssessmentType


class PostureData(BaseModel):
    """Posture assessment data"""
    head_alignment: int = Field(ge=0, le=10, description="Head alignment score 0-10")
    shoulder_level: int = Field(ge=0, le=10)
    spine_curvature: int = Field(ge=0, le=10)
    hip_level: int = Field(ge=0, le=10)
    knee_alignment: int = Field(ge=0, le=10)
    overall_balance: int = Field(ge=0, le=10)
    notes: Optional[str] = None


class WalkingData(BaseModel):
    """Walking/gait assessment data"""
    gait_symmetry: int = Field(ge=0, le=10)
    stride_length: int = Field(ge=0, le=10)
    arm_swing: int = Field(ge=0, le=10)
    heel_strike: int = Field(ge=0, le=10)
    toe_off: int = Field(ge=0, le=10)
    balance: int = Field(ge=0, le=10)
    notes: Optional[str] = None


class RunningData(BaseModel):
    """Running assessment data"""
    cadence: int = Field(ge=0, le=10)
    foot_strike: int = Field(ge=0, le=10)
    knee_drive: int = Field(ge=0, le=10)
    arm_mechanics: int = Field(ge=0, le=10)
    trunk_stability: int = Field(ge=0, le=10)
    overall_form: int = Field(ge=0, le=10)
    notes: Optional[str] = None


class MSKData(BaseModel):
    """MSK/FMS assessment data"""
    deep_squat: int = Field(ge=0, le=3, description="FMS score 0-3")
    hurdle_step: int = Field(ge=0, le=3)
    inline_lunge: int = Field(ge=0, le=3)
    shoulder_mobility: int = Field(ge=0, le=3)
    active_straight_leg: int = Field(ge=0, le=3)
    trunk_stability_pushup: int = Field(ge=0, le=3)
    rotary_stability: int = Field(ge=0, le=3)
    notes: Optional[str] = None


class Assessment(BaseModel):
    """Main assessment model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    patient_name: Optional[str] = None
    physio_id: Optional[str] = None
    physio_name: Optional[str] = None
    assessment_type: AssessmentType
    data: Optional[Dict[str, Any]] = None
    total_score: Optional[float] = 0
    max_score: Optional[float] = 0
    percentage: Optional[float] = 0
    status: str = "completed"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AssessmentCreate(BaseModel):
    """Model for creating an assessment"""
    patient_id: str
    physio_id: Optional[str] = None
    assessment_type: AssessmentType
    data: Dict[str, Any]


class AssessmentReport(BaseModel):
    """Assessment report with AI analysis"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    assessment_id: Optional[str] = None
    patient_id: str
    patient_name: str
    physio_id: str
    physio_name: Optional[str] = None
    assessment_type: AssessmentType
    data: Dict[str, Any]
    ai_analysis: Optional[Dict[str, Any]] = None
    recommendations: Optional[List[str]] = None
    pdf_url: Optional[str] = None
    pdf_base64: Optional[str] = None
    total_score: Optional[float] = None
    percentage: Optional[float] = None
    risk_level: Optional[str] = None
    status: str = "completed"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AssessmentReportCreate(BaseModel):
    """Model for creating an assessment report"""
    patient_id: str
    patient_name: str
    physio_id: str
    physio_name: Optional[str] = None
    assessment_type: str
    data: Dict[str, Any]
    ai_analysis: Optional[Dict[str, Any]] = None
    recommendations: Optional[List[str]] = None
    total_score: Optional[float] = None
    percentage: Optional[float] = None
    risk_level: Optional[str] = None
