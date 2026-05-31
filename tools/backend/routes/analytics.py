"""
WBA99 MSK Analysis - Analytics Routes
Handles analytics and dashboard data endpoints
"""

from fastapi import APIRouter, HTTPException
from typing import Optional

from config import db

router = APIRouter(tags=["Analytics"])


@router.get("/analytics/overview")
async def get_analytics_overview():
    """Get overall system analytics overview"""
    total_users = await db.users.count_documents({})
    total_patients = await db.users.count_documents({"role": "patient"})
    total_physios = await db.users.count_documents({"role": "physio"})
    total_admins = await db.users.count_documents({"role": "admin"})
    total_assessments = await db.assessments.count_documents({})
    total_exercises = await db.exercises.count_documents({})
    total_assigned = await db.assigned_exercises.count_documents({})
    completed_exercises = await db.assigned_exercises.count_documents({"status": "completed"})
    
    # Assessment breakdown
    posture_count = await db.assessments.count_documents({"assessment_type": "posture"})
    walking_count = await db.assessments.count_documents({"assessment_type": "walking"})
    running_count = await db.assessments.count_documents({"assessment_type": "running"})
    msk_count = await db.assessments.count_documents({"assessment_type": "msk"})
    
    return {
        "users": {
            "total": total_users,
            "patients": total_patients,
            "physios": total_physios,
            "admins": total_admins
        },
        "assessments": {
            "total": total_assessments,
            "posture": posture_count,
            "walking": walking_count,
            "running": running_count,
            "msk": msk_count
        },
        "exercises": {
            "total": total_exercises,
            "assigned": total_assigned,
            "completed": completed_exercises
        }
    }


@router.get("/analytics/patient/{patient_id}")
async def get_patient_analytics(patient_id: str):
    """Get analytics for a specific patient"""
    # Get assessments with projection for efficiency
    assessments = await db.assessments.find(
        {"patient_id": patient_id},
        {"_id": 0, "assessment_type": 1, "percentage": 1}
    ).to_list(1000)
    
    # Calculate averages by type
    type_scores = {}
    for a in assessments:
        atype = a.get("assessment_type", "unknown")
        if atype not in type_scores:
            type_scores[atype] = []
        type_scores[atype].append(a.get("percentage", 0))
    
    averages = {k: round(sum(v)/len(v), 1) if v else 0 for k, v in type_scores.items()}
    
    # Get assigned exercises with projection
    assigned = await db.assigned_exercises.find(
        {"patient_id": patient_id},
        {"_id": 0, "status": 1}
    ).to_list(1000)
    completed = len([a for a in assigned if a.get("status") == "completed"])
    
    return {
        "total_assessments": len(assessments),
        "assessment_averages": averages,
        "exercises": {
            "total_assigned": len(assigned),
            "completed": completed,
            "completion_rate": round((completed/len(assigned))*100, 1) if assigned else 0
        }
    }


@router.get("/analytics/physio/{physio_id}")
async def get_physio_analytics(physio_id: str):
    """Get analytics for a specific physiotherapist"""
    # Get assessments created by this physio
    assessments = await db.assessments.find(
        {"physio_id": physio_id},
        {"_id": 0, "assessment_type": 1, "patient_id": 1}
    ).to_list(1000)
    
    # Count unique patients
    unique_patients = set([a.get("patient_id") for a in assessments if a.get("patient_id")])
    
    # Assessment breakdown
    type_counts = {}
    for a in assessments:
        atype = a.get("assessment_type", "unknown")
        type_counts[atype] = type_counts.get(atype, 0) + 1
    
    # Get prescriptions created
    prescriptions = await db.prescriptions.count_documents({"physio_id": physio_id})
    
    return {
        "total_assessments": len(assessments),
        "unique_patients": len(unique_patients),
        "assessment_breakdown": type_counts,
        "prescriptions_created": prescriptions
    }
