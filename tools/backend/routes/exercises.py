"""
WBA99 MSK Analysis - Exercise and Prescription Routes
Handles exercise library and prescription management
"""

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime

from config import db
from models import (
    Exercise, ExerciseCreate,
    ExercisePrescription, ExercisePrescriptionCreate,
    AssignedExercise, AssignedExerciseCreate
)

router = APIRouter(tags=["Exercises & Prescriptions"])


# =============================================
# EXERCISE ROUTES
# =============================================

@router.post("/exercises", response_model=Exercise)
async def create_exercise(exercise_data: ExerciseCreate):
    """Create a new exercise in the library"""
    exercise = Exercise(**exercise_data.dict())
    await db.exercises.insert_one(exercise.dict())
    return exercise


@router.get("/exercises", response_model=List[Exercise])
async def get_exercises(category: Optional[str] = None, skip: int = 0, limit: int = 100):
    """Get all exercises, optionally filtered by category"""
    query = {} if category is None else {"category": category}
    exercises = await db.exercises.find(query).skip(skip).limit(limit).to_list(limit)
    return [Exercise(**e) for e in exercises]


@router.get("/exercises/{exercise_id}", response_model=Exercise)
async def get_exercise(exercise_id: str):
    """Get a specific exercise by ID"""
    exercise = await db.exercises.find_one({"id": exercise_id})
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return Exercise(**exercise)


@router.delete("/exercises/{exercise_id}")
async def delete_exercise(exercise_id: str):
    """Delete an exercise from the library"""
    result = await db.exercises.delete_one({"id": exercise_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return {"message": "Exercise deleted successfully"}


# =============================================
# PRESCRIPTION ROUTES
# =============================================

@router.post("/prescriptions", response_model=ExercisePrescription)
async def create_prescription(prescription_data: ExercisePrescriptionCreate):
    """Create a new exercise prescription for a patient"""
    # Get patient name
    patient = await db.users.find_one({"id": prescription_data.patient_id})
    patient_name = patient["name"] if patient else "Unknown"
    
    # Get physio name
    physio = await db.users.find_one({"id": prescription_data.physio_id})
    physio_name = physio["name"] if physio else "Unknown"
    
    # Build exercises list with full details
    exercises_with_details = []
    for ex_item in prescription_data.exercises:
        exercise = await db.exercises.find_one({"id": ex_item.exercise_id})
        if exercise:
            exercises_with_details.append({
                "exercise_id": ex_item.exercise_id,
                "exercise_name": exercise.get("name", "Unknown"),
                "sets": ex_item.sets,
                "reps": ex_item.reps,
                "hold_seconds": ex_item.hold_seconds,
                "rest_seconds": ex_item.rest_seconds,
                "notes": ex_item.notes or ""
            })
    
    prescription = ExercisePrescription(
        patient_id=prescription_data.patient_id,
        patient_name=patient_name,
        physio_id=prescription_data.physio_id,
        physio_name=physio_name,
        diagnosis=prescription_data.diagnosis,
        goals=prescription_data.goals,
        exercises=exercises_with_details,
        frequency=prescription_data.frequency,
        duration_weeks=prescription_data.duration_weeks,
        precautions=prescription_data.precautions,
        notes=prescription_data.notes
    )
    
    await db.prescriptions.insert_one(prescription.dict())
    return prescription


@router.get("/prescriptions", response_model=List[ExercisePrescription])
async def get_prescriptions(
    patient_id: Optional[str] = None,
    physio_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    """Get prescriptions with optional filters"""
    query = {}
    if patient_id:
        query["patient_id"] = patient_id
    if physio_id:
        query["physio_id"] = physio_id
    if status:
        query["status"] = status
    
    prescriptions = await db.prescriptions.find(query).skip(skip).limit(limit).to_list(limit)
    return [ExercisePrescription(**p) for p in prescriptions]


@router.get("/prescriptions/{prescription_id}", response_model=ExercisePrescription)
async def get_prescription(prescription_id: str):
    """Get a specific prescription by ID"""
    prescription = await db.prescriptions.find_one({"id": prescription_id})
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return ExercisePrescription(**prescription)


@router.put("/prescriptions/{prescription_id}/status")
async def update_prescription_status(prescription_id: str, status: str):
    """Update prescription status (active, completed, cancelled)"""
    result = await db.prescriptions.update_one(
        {"id": prescription_id},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return {"message": f"Prescription status updated to {status}"}


@router.delete("/prescriptions/{prescription_id}")
async def delete_prescription(prescription_id: str):
    """Delete a prescription"""
    result = await db.prescriptions.delete_one({"id": prescription_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return {"message": "Prescription deleted successfully"}


# =============================================
# ASSIGNED EXERCISE ROUTES
# =============================================

@router.post("/assigned-exercises", response_model=AssignedExercise)
async def create_assigned_exercise(assignment_data: AssignedExerciseCreate):
    """Assign an exercise to a patient"""
    # Get exercise details
    exercise = await db.exercises.find_one({"id": assignment_data.exercise_id})
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    
    # Get patient name
    patient = await db.users.find_one({"id": assignment_data.patient_id})
    patient_name = patient["name"] if patient else "Unknown"
    
    assigned = AssignedExercise(
        exercise_id=assignment_data.exercise_id,
        exercise_name=exercise.get("name", "Unknown"),
        patient_id=assignment_data.patient_id,
        patient_name=patient_name,
        physio_id=assignment_data.physio_id,
        sets=assignment_data.sets,
        reps=assignment_data.reps,
        hold_seconds=assignment_data.hold_seconds,
        frequency=assignment_data.frequency,
        notes=assignment_data.notes
    )
    
    await db.assigned_exercises.insert_one(assigned.dict())
    return assigned


@router.get("/assigned-exercises", response_model=List[AssignedExercise])
async def get_assigned_exercises(
    patient_id: Optional[str] = None,
    physio_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    """Get assigned exercises with optional filters"""
    query = {}
    if patient_id:
        query["patient_id"] = patient_id
    if physio_id:
        query["physio_id"] = physio_id
    if status:
        query["status"] = status
    
    assignments = await db.assigned_exercises.find(query).skip(skip).limit(limit).to_list(limit)
    return [AssignedExercise(**a) for a in assignments]


@router.put("/assigned-exercises/{assignment_id}/status")
async def update_assigned_exercise_status(assignment_id: str, status: str):
    """Update assigned exercise status"""
    result = await db.assigned_exercises.update_one(
        {"id": assignment_id},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return {"message": f"Assignment status updated to {status}"}


@router.delete("/assigned-exercises/{assignment_id}")
async def delete_assigned_exercise(assignment_id: str):
    """Delete an assigned exercise"""
    result = await db.assigned_exercises.delete_one({"id": assignment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return {"message": "Assignment deleted successfully"}
