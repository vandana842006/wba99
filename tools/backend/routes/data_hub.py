"""
WBA99 Admin Data Hub Routes
Centralized data management, sync, and export functionality
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
import logging

# Database import
from config import db

router = APIRouter(tags=["data-hub"])

logger = logging.getLogger(__name__)


# =============================================================================
# ADMIN DATA HUB - Centralized Data Management
# =============================================================================

@router.get("/admin/data-hub/summary")
async def get_data_hub_summary():
    """Get summary statistics for the admin data hub"""
    try:
        # Count various collections
        total_users = await db.users.count_documents({})
        total_patients = await db.users.count_documents({"role": "patient"})
        total_physios = await db.users.count_documents({"role": "physio"})
        total_assessments = await db.assessments.count_documents({})
        total_appointments = await db.appointments.count_documents({})
        total_reports = await db.report_logs.count_documents({}) if "report_logs" in await db.list_collection_names() else 0
        
        # Get recent sync data
        synced_data = await db.synced_device_data.count_documents({}) if "synced_device_data" in await db.list_collection_names() else 0
        
        return {
            "total_users": total_users,
            "total_patients": total_patients,
            "total_physios": total_physios,
            "total_assessments": total_assessments,
            "total_appointments": total_appointments,
            "total_reports": total_reports,
            "synced_device_data": synced_data,
            "last_updated": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logging.error(f"Error getting data hub summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/data-hub/all")
async def get_all_data_hub_data(
    page: int = 1,
    limit: int = 50,
    data_type: Optional[str] = None
):
    """Get all data from the data hub with pagination"""
    try:
        skip = (page - 1) * limit
        all_data = []
        
        # Get users
        if not data_type or data_type == "users":
            users = await db.users.find({}).skip(skip).limit(limit).to_list(limit)
            for u in users:
                u["_id"] = str(u["_id"])
            all_data.extend([{"type": "user", "data": u} for u in users])
        
        # Get assessments
        if not data_type or data_type == "assessments":
            assessments = await db.assessments.find({}).skip(skip).limit(limit).to_list(limit)
            for a in assessments:
                a["_id"] = str(a["_id"])
            all_data.extend([{"type": "assessment", "data": a} for a in assessments])
        
        # Get synced device data
        if not data_type or data_type == "synced":
            if "synced_device_data" in await db.list_collection_names():
                synced = await db.synced_device_data.find({}).skip(skip).limit(limit).to_list(limit)
                for s in synced:
                    s["_id"] = str(s["_id"])
                all_data.extend([{"type": "synced", "data": s} for s in synced])
        
        return {
            "page": page,
            "limit": limit,
            "total_items": len(all_data),
            "data": all_data
        }
    except Exception as e:
        logging.error(f"Error getting all data hub data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/admin/sync/all")
async def sync_device_data(data: Dict[str, Any]):
    """Receive and store data synced from mobile devices"""
    try:
        sync_record = {
            "id": str(uuid.uuid4()),
            "device_id": data.get("device_id", "unknown"),
            "user_id": data.get("user_id"),
            "data_type": data.get("data_type", "general"),
            "data": data.get("data", {}),
            "synced_at": datetime.utcnow().isoformat(),
            "metadata": {
                "app_version": data.get("app_version"),
                "platform": data.get("platform"),
                "timestamp": data.get("timestamp")
            }
        }
        
        await db.synced_device_data.insert_one(sync_record)
        
        return {
            "success": True,
            "message": "Data synced successfully",
            "sync_id": sync_record["id"]
        }
    except Exception as e:
        logging.error(f"Error syncing device data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/free-slots/{physio_id}/{date}")
async def get_available_slots(physio_id: str, date: str):
    """Get available time slots for a specific date"""
    try:
        # Get physio's schedule
        schedule = await db.schedules.find_one({"physio_id": physio_id})
        
        # Parse the date to get day of week
        from datetime import datetime as dt
        date_obj = dt.strptime(date, "%Y-%m-%d")
        day_name = date_obj.strftime("%A")
        
        # Default schedule if none exists
        default_hours = {"start": "09:00", "end": "18:00", "break_start": "13:00", "break_end": "14:00"}
        if day_name == "Sunday":
            default_hours = {"start": None, "end": None}
        elif day_name == "Saturday":
            default_hours = {"start": "10:00", "end": "14:00"}
        
        day_schedule = schedule.get("weekly_hours", {}).get(day_name, default_hours) if schedule else default_hours
        
        if not day_schedule.get("start"):
            return {"date": date, "day": day_name, "available_slots": [], "message": "Closed on this day"}
        
        # Get existing appointments for this date
        existing = await db.appointments.find({
            "physio_id": physio_id,
            "date": date,
            "status": {"$in": ["booked", "confirmed"]}
        }).to_list(100)
        
        booked_times = [(a["start_time"], a["end_time"]) for a in existing]
        
        # Generate available slots
        slot_duration = schedule.get("slot_duration", 30) if schedule else 30
        available_slots = []
        
        start_hour, start_min = map(int, day_schedule["start"].split(":"))
        end_hour, end_min = map(int, day_schedule["end"].split(":"))
        
        break_start = day_schedule.get("break_start")
        break_end = day_schedule.get("break_end")
        
        current_minutes = start_hour * 60 + start_min
        end_minutes = end_hour * 60 + end_min
        
        while current_minutes + slot_duration <= end_minutes:
            slot_start = f"{current_minutes // 60:02d}:{current_minutes % 60:02d}"
            slot_end = f"{(current_minutes + slot_duration) // 60:02d}:{(current_minutes + slot_duration) % 60:02d}"
            
            # Check if in break time
            is_break = False
            if break_start and break_end:
                break_start_min = int(break_start.split(":")[0]) * 60 + int(break_start.split(":")[1])
                break_end_min = int(break_end.split(":")[0]) * 60 + int(break_end.split(":")[1])
                if break_start_min <= current_minutes < break_end_min:
                    is_break = True
            
            # Check if already booked
            is_booked = any(
                slot_start >= booked[0] and slot_start < booked[1]
                for booked in booked_times
            )
            
            if not is_break and not is_booked:
                available_slots.append({
                    "start_time": slot_start,
                    "end_time": slot_end,
                    "duration": slot_duration
                })
            
            current_minutes += slot_duration
        
        return {
            "date": date,
            "day": day_name,
            "available_slots": available_slots,
            "total_slots": len(available_slots)
        }
    except Exception as e:
        logging.error(f"Error getting available slots: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# MANUAL PRESCRIPTION ENDPOINTS
# =============================================================================

class ManualPrescriptionCreate(BaseModel):
    physio_id: str
    patient_id: Optional[str] = None
    patient_name: Optional[str] = None
    image_data: str
    ai_analysis: Optional[Dict] = None
    notes: Optional[str] = None
    medications: List[Dict[str, Any]] = []
    exercises: List[Dict[str, Any]] = []


@router.post("/api/prescriptions/manual")
async def create_manual_prescription(prescription: ManualPrescriptionCreate):
    """Create a manual prescription from uploaded image"""
    try:
        prescription_doc = {
            "id": str(uuid.uuid4()),
            "physio_id": prescription.physio_id,
            "patient_id": prescription.patient_id,
            "patient_name": prescription.patient_name,
            "prescription_image": prescription.image_data,
            "ai_analysis": prescription.ai_analysis,
            "notes": prescription.notes,
            "medications": prescription.medications,
            "exercises": prescription.exercises,
            "type": "manual",
            "status": "active",
            "created_at": datetime.utcnow()
        }
        
        await db.manual_prescriptions.insert_one(prescription_doc)
        
        return {
            "success": True,
            "prescription_id": prescription_doc["id"],
            "message": "Manual prescription created successfully"
        }
    except Exception as e:
        logging.error(f"Error creating manual prescription: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/prescriptions/manual/{physio_id}")
async def get_manual_prescriptions(physio_id: str, patient_id: Optional[str] = None):
    """Get manual prescriptions for a physio"""
    try:
        query = {"physio_id": physio_id}
        if patient_id:
            query["patient_id"] = patient_id
        
        prescriptions = await db.manual_prescriptions.find(query).sort("created_at", -1).limit(100).to_list(100)
        
        for p in prescriptions:
            if "_id" in p:
                p["_id"] = str(p["_id"])
        
        return prescriptions
    except Exception as e:
        logging.error(f"Error getting manual prescriptions: {e}")
        return []


@router.get("/api/admin/export-all-data")
async def export_all_admin_data():
    """Export all data for admin (comprehensive export)"""
    try:
        # Get all major collections
        users = await db.users.find({}).to_list(10000)
        assessments = await db.assessments.find({}).to_list(10000)
        appointments = await db.appointments.find({}).to_list(10000)
        reports = await db.report_logs.find({}).to_list(10000)
        prescriptions = await db.prescriptions.find({}).to_list(10000)
        
        # Convert ObjectIds
        for collection in [users, assessments, appointments, reports, prescriptions]:
            for item in collection:
                if "_id" in item:
                    item["_id"] = str(item["_id"])
        
        return {
            "export_date": datetime.utcnow().isoformat(),
            "data": {
                "users": {"count": len(users), "records": users},
                "assessments": {"count": len(assessments), "records": assessments},
                "appointments": {"count": len(appointments), "records": appointments},
                "reports": {"count": len(reports), "records": reports},
                "prescriptions": {"count": len(prescriptions), "records": prescriptions}
            },
            "total_records": len(users) + len(assessments) + len(appointments) + len(reports) + len(prescriptions)
        }
    except Exception as e:
        logging.error(f"Error exporting all data: {e}")
        raise HTTPException(status_code=500, detail=str(e))
