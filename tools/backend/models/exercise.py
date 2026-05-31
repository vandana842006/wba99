"""
WBA99 MSK Analysis - Exercise Models
Pydantic models for exercises and prescriptions
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid

from .enums import ExerciseStatus


class Exercise(BaseModel):
    """Exercise model for the exercise library"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    category: str  # posture, walking, running, msk
    instructions: List[str] = []
    duration_minutes: int = 10
    # Detailed prescription fields
    sets: int = 3
    reps: int = 10
    hold_seconds: int = 0
    rest_seconds: int = 30
    frequency_per_day: int = 1
    frequency_per_week: int = 3
    intensity: str = "moderate"  # low, moderate, high
    progression: str = ""
    precautions: List[str] = []
    equipment: List[str] = []
    target_muscles: List[str] = []
    contraindications: List[str] = []
    video_url: Optional[str] = None
    image_base64: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ExerciseCreate(BaseModel):
    """Model for creating a new exercise"""
    name: str
    description: str
    category: str
    instructions: List[str] = []
    duration_minutes: int = 10
    sets: int = 3
    reps: int = 10
    hold_seconds: int = 0
    rest_seconds: int = 30
    frequency_per_day: int = 1
    frequency_per_week: int = 3
    intensity: str = "moderate"
    progression: str = ""
    precautions: List[str] = []
    equipment: List[str] = []
    target_muscles: List[str] = []
    contraindications: List[str] = []
    video_url: Optional[str] = None
    image_base64: Optional[str] = None


class PrescriptionExerciseItem(BaseModel):
    """Individual exercise item within a prescription"""
    exercise_id: str
    sets: Optional[int] = None
    reps: Optional[int] = None
    hold_seconds: Optional[int] = None
    rest_seconds: Optional[int] = None
    notes: Optional[str] = ""


class ExercisePrescription(BaseModel):
    """Exercise prescription for a patient"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    patient_name: Optional[str] = None
    physio_id: str
    physio_name: Optional[str] = None
    diagnosis: str = ""
    goals: List[str] = []
    exercises: List[Dict[str, Any]] = []
    frequency: str = "daily"
    duration_weeks: int = 4
    precautions: List[str] = []
    notes: str = ""
    status: str = "active"  # active, completed, cancelled
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ExercisePrescriptionCreate(BaseModel):
    """Model for creating a new prescription"""
    patient_id: str
    physio_id: str
    diagnosis: str = ""
    goals: List[str] = []
    exercises: List[PrescriptionExerciseItem] = []
    frequency: str = "daily"
    duration_weeks: int = 4
    precautions: List[str] = []
    notes: str = ""


class AssignedExercise(BaseModel):
    """Exercise assigned to a patient"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    exercise_id: str
    exercise_name: Optional[str] = None
    patient_id: str
    patient_name: Optional[str] = None
    physio_id: str
    sets: int = 3
    reps: int = 10
    hold_seconds: int = 0
    frequency: str = "daily"
    notes: str = ""
    status: str = "assigned"  # assigned, in_progress, completed
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AssignedExerciseCreate(BaseModel):
    """Model for assigning an exercise"""
    exercise_id: str
    patient_id: str
    physio_id: str
    sets: int = 3
    reps: int = 10
    hold_seconds: int = 0
    frequency: str = "daily"
    notes: str = ""
