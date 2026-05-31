"""
WBA99 Scheduling & Equipment Routes
Appointments, time slots, schedules, and equipment management
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
import logging
from bson import ObjectId

# Database import
from config import db

router = APIRouter(tags=["scheduling"])

logger = logging.getLogger(__name__)


# =============================================================================
# Pydantic Models
# =============================================================================

class AppointmentCreate(BaseModel):
    patient_id: str
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    date: str
    time: str
    duration: int = 30
    treatment_type: str
    location: Dict[str, Any] = {}
    notes: Optional[str] = None
    physio_id: str
    physio_name: Optional[str] = None


class EquipmentDevice(BaseModel):
    id: Optional[str] = None
    name: str
    category: str  # electrotherapy, thermal, mechanical, diagnostic
    brand: Optional[str] = None
    model: Optional[str] = None
    parameters: Dict[str, Any] = {}
    is_available: bool = True
    last_maintenance: Optional[str] = None
    notes: Optional[str] = None


class TimeSlot(BaseModel):
    id: Optional[str] = None
    physio_id: str
    day: str  # Monday, Tuesday, etc.
    start_time: str  # "09:00"
    end_time: str  # "17:00"
    is_available: bool = True
    slot_duration: int = 30  # minutes
    max_patients: int = 1


# Default equipment/devices list
DEFAULT_EQUIPMENT = [
    # Electrical Therapy Devices
    {"name": "TENS Unit", "category": "electrotherapy", "parameters": {"frequency_range": "1-200 Hz", "pulse_width": "50-400 µs", "channels": 2}},
    {"name": "IFT Machine", "category": "electrotherapy", "parameters": {"carrier_frequency": "4000 Hz", "amf_range": "1-200 Hz", "channels": 4}},
    {"name": "Russian Current Generator", "category": "electrotherapy", "parameters": {"frequency": "2500 Hz", "burst_frequency": "10-100 Hz"}},
    {"name": "Faradic Stimulator", "category": "electrotherapy", "parameters": {"pulse_duration": "0.1-1 ms", "frequency": "30-100 Hz"}},
    {"name": "Galvanic Unit", "category": "electrotherapy", "parameters": {"intensity": "0-10 mA", "mode": "continuous DC"}},
    {"name": "SD Curve Machine", "category": "diagnostic", "parameters": {"duration_range": "0.01-1000 ms", "modes": ["rheobase", "chronaxie"]}},
    
    # Ultrasound & Thermal
    {"name": "Therapeutic Ultrasound", "category": "thermal", "parameters": {"frequency": "1-3 MHz", "intensity": "0.5-3 W/cm²", "mode": ["continuous", "pulsed"]}},
    {"name": "Cryotherapy Unit", "category": "thermal", "parameters": {"temperature_range": "-10 to 0°C", "coverage_area": "local/whole body"}},
    {"name": "Hot Pack Unit", "category": "thermal", "parameters": {"temperature": "70-80°C", "pack_sizes": ["small", "medium", "large"]}},
    
    # Advanced Modalities
    {"name": "Shock Wave Therapy", "category": "mechanical", "parameters": {"pressure": "1-5 bar", "frequency": "1-21 Hz", "energy": "0.01-0.5 mJ/mm²"}},
    {"name": "Laser Therapy Device", "category": "light", "parameters": {"wavelength": "600-1000 nm", "power": "5-500 mW", "class": "3B/4"}},
    {"name": "Magnetic Therapy Unit", "category": "magnetic", "parameters": {"intensity": "5-100 Gauss", "frequency": "1-100 Hz"}},
    {"name": "Paraffin Wax Bath", "category": "thermal", "parameters": {"temperature": "52-54°C", "capacity": "5L"}},
    {"name": "Traction Unit", "category": "mechanical", "parameters": {"force": "5-50 kg", "modes": ["cervical", "lumbar"]}},
    
    # Exercise Equipment
    {"name": "Resistance Bands Set", "category": "exercise", "parameters": {"levels": ["light", "medium", "heavy", "extra-heavy"]}},
    {"name": "Balance Board", "category": "exercise", "parameters": {"type": "wobble board", "diameter": "40 cm"}},
    {"name": "Exercise Ball", "category": "exercise", "parameters": {"sizes": ["55cm", "65cm", "75cm"]}},
    {"name": "Foam Roller", "category": "exercise", "parameters": {"density": ["soft", "medium", "firm"], "length": "90 cm"}},
]


# =============================================================================
# APPOINTMENTS SYSTEM
# =============================================================================

@router.get("/appointments")
async def get_appointments(
    physio_id: Optional[str] = None,
    date: Optional[str] = None,
    status: Optional[str] = None
):
    """Get appointments with optional filters"""
    try:
        query = {}
        if physio_id:
            query["physio_id"] = physio_id
        if date:
            query["date"] = date
        if status:
            query["status"] = status
            
        appointments = await db.appointments.find(query).sort("date", 1).sort("time", 1).to_list(100)
        
        for apt in appointments:
            if "_id" in apt:
                apt["id"] = str(apt.pop("_id"))
            
        return {"appointments": appointments}
    except Exception as e:
        logger.error(f"Error fetching appointments: {e}")
        return {"appointments": []}


@router.post("/appointments")
async def create_appointment(appointment: AppointmentCreate):
    """Create a new appointment"""
    try:
        apt_data = appointment.dict()
        apt_data["status"] = "scheduled"
        apt_data["reminder_sent"] = False
        apt_data["created_at"] = datetime.utcnow().isoformat()
        
        result = await db.appointments.insert_one(apt_data)
        
        # Create clean response without MongoDB _id
        response_data = {k: v for k, v in apt_data.items() if k != "_id"}
        response_data["id"] = str(result.inserted_id)
        
        return {"success": True, "appointment": response_data}
    except Exception as e:
        logger.error(f"Error creating appointment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/appointments/{appointment_id}")
async def update_appointment(appointment_id: str, updates: Dict[str, Any]):
    """Update appointment status or details"""
    try:
        updates["updated_at"] = datetime.utcnow().isoformat()
        
        result = await db.appointments.update_one(
            {"_id": ObjectId(appointment_id)},
            {"$set": updates}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Appointment not found")
            
        return {"success": True}
    except Exception as e:
        logger.error(f"Error updating appointment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/appointments/{appointment_id}")
async def delete_appointment(appointment_id: str):
    """Delete an appointment"""
    try:
        result = await db.appointments.delete_one({"_id": ObjectId(appointment_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Appointment not found")
            
        return {"success": True}
    except Exception as e:
        logger.error(f"Error deleting appointment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# EQUIPMENT MANAGEMENT
# =============================================================================

@router.get("/equipment/devices")
async def get_all_equipment(physio_id: Optional[str] = None):
    """Get all available equipment/devices"""
    try:
        # Try to get physio-specific equipment first
        if physio_id:
            equipment = await db.equipment.find({"physio_id": physio_id}).to_list(100)
            if equipment:
                return [
                    {
                        "id": str(e.get("_id", e.get("id"))),
                        **{k: v for k, v in e.items() if k not in ["_id"]}
                    }
                    for e in equipment
                ]
        
        # Return default equipment list
        return [
            {
                "id": f"default-{i}",
                "name": eq["name"],
                "category": eq["category"],
                "parameters": eq.get("parameters", {}),
                "is_available": True,
                "brand": eq.get("brand", "Generic"),
                "model": eq.get("model", "Standard"),
                "notes": ""
            }
            for i, eq in enumerate(DEFAULT_EQUIPMENT)
        ]
    except Exception as e:
        logging.error(f"Error fetching equipment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/equipment/devices")
async def add_equipment(equipment: EquipmentDevice, physio_id: str):
    """Add new equipment to physio's inventory"""
    try:
        new_equipment = {
            "id": str(uuid.uuid4()),
            "physio_id": physio_id,
            "name": equipment.name,
            "category": equipment.category,
            "brand": equipment.brand,
            "model": equipment.model,
            "parameters": equipment.parameters,
            "is_available": equipment.is_available,
            "last_maintenance": equipment.last_maintenance,
            "notes": equipment.notes,
            "created_at": datetime.utcnow().isoformat()
        }
        
        await db.equipment.insert_one(new_equipment)
        return {"message": "Equipment added successfully", "equipment": new_equipment}
    except Exception as e:
        logging.error(f"Error adding equipment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/equipment/categories")
async def get_equipment_categories():
    """Get equipment categories with their modalities"""
    return {
        "categories": [
            {
                "id": "electrotherapy",
                "name": "Electrotherapy",
                "icon": "flash",
                "modalities": ["TENS", "IFT", "Russian Current", "Faradic", "Galvanic", "SD Curve"]
            },
            {
                "id": "thermal",
                "name": "Thermal Therapy",
                "icon": "thermometer",
                "modalities": ["Ultrasound", "Cryotherapy", "Hot Pack", "Paraffin Wax"]
            },
            {
                "id": "mechanical",
                "name": "Mechanical Therapy",
                "icon": "construct",
                "modalities": ["Shock Wave", "Traction", "Vibration Therapy"]
            },
            {
                "id": "light",
                "name": "Light Therapy",
                "icon": "flashlight",
                "modalities": ["Laser Therapy", "Infrared", "UV Therapy"]
            },
            {
                "id": "magnetic",
                "name": "Magnetic Therapy",
                "icon": "magnet",
                "modalities": ["PEMF", "Static Magnets"]
            },
            {
                "id": "exercise",
                "name": "Exercise Equipment",
                "icon": "fitness",
                "modalities": ["Resistance Bands", "Balance Board", "Exercise Ball", "Foam Roller"]
            }
        ]
    }


# =============================================================================
# SCHEDULING & TIME SLOTS
# =============================================================================

@router.get("/schedules/{physio_id}")
async def get_physio_schedule(physio_id: str):
    """Get physiotherapist's weekly schedule"""
    try:
        schedule = await db.schedules.find_one({"physio_id": physio_id})
        
        if not schedule:
            # Return default schedule
            default_schedule = {
                "physio_id": physio_id,
                "weekly_hours": {
                    "Monday": {"start": "09:00", "end": "18:00", "break_start": "13:00", "break_end": "14:00"},
                    "Tuesday": {"start": "09:00", "end": "18:00", "break_start": "13:00", "break_end": "14:00"},
                    "Wednesday": {"start": "09:00", "end": "18:00", "break_start": "13:00", "break_end": "14:00"},
                    "Thursday": {"start": "09:00", "end": "18:00", "break_start": "13:00", "break_end": "14:00"},
                    "Friday": {"start": "09:00", "end": "18:00", "break_start": "13:00", "break_end": "14:00"},
                    "Saturday": {"start": "10:00", "end": "14:00", "break_start": None, "break_end": None},
                    "Sunday": {"start": None, "end": None, "break_start": None, "break_end": None}
                },
                "slot_duration": 30,
                "buffer_time": 5,
                "max_patients_per_slot": 1
            }
            return default_schedule
        
        return {
            "physio_id": schedule.get("physio_id"),
            "weekly_hours": schedule.get("weekly_hours", {}),
            "slot_duration": schedule.get("slot_duration", 30),
            "buffer_time": schedule.get("buffer_time", 5),
            "max_patients_per_slot": schedule.get("max_patients_per_slot", 1)
        }
    except Exception as e:
        logging.error(f"Error fetching schedule: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/schedules/{physio_id}")
async def update_physio_schedule(physio_id: str, schedule: Dict[str, Any]):
    """Update physiotherapist's schedule"""
    try:
        schedule_data = {
            "physio_id": physio_id,
            "weekly_hours": schedule.get("weekly_hours", {}),
            "slot_duration": schedule.get("slot_duration", 30),
            "buffer_time": schedule.get("buffer_time", 5),
            "max_patients_per_slot": schedule.get("max_patients_per_slot", 1),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        await db.schedules.update_one(
            {"physio_id": physio_id},
            {"$set": schedule_data},
            upsert=True
        )
        
        return {"message": "Schedule updated successfully", "schedule": schedule_data}
    except Exception as e:
        logging.error(f"Error updating schedule: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/physio-appointments/{physio_id}")
async def get_physio_appointments(physio_id: str, date: Optional[str] = None):
    """Get appointments for a specific physiotherapist"""
    try:
        query = {"physio_id": physio_id}
        if date:
            query["date"] = date
        
        appointments = await db.appointments.find(query).sort([("date", 1), ("time", 1)]).to_list(100)
        
        for apt in appointments:
            if "_id" in apt:
                apt["id"] = str(apt.pop("_id"))
        
        return {"appointments": appointments}
    except Exception as e:
        logging.error(f"Error fetching physio appointments: {e}")
        return {"appointments": []}


@router.get("/available-slots/{physio_id}")
async def get_available_slots(physio_id: str, date: str):
    """Get available time slots for a specific date"""
    try:
        # Get schedule
        schedule = await db.schedules.find_one({"physio_id": physio_id})
        
        # Get day name from date
        from datetime import datetime as dt
        date_obj = dt.strptime(date, "%Y-%m-%d")
        day_name = date_obj.strftime("%A")
        
        # Get booked appointments for this date
        booked = await db.appointments.find({
            "physio_id": physio_id,
            "date": date,
            "status": {"$ne": "cancelled"}
        }).to_list(50)
        
        booked_times = set()
        for apt in booked:
            booked_times.add(apt.get("time"))
        
        # Generate available slots
        slots = []
        
        if schedule and schedule.get("weekly_hours", {}).get(day_name):
            day_schedule = schedule["weekly_hours"][day_name]
            if day_schedule.get("start") and day_schedule.get("end"):
                slot_duration = schedule.get("slot_duration", 30)
                
                # Generate slots
                start_hour, start_min = map(int, day_schedule["start"].split(":"))
                end_hour, end_min = map(int, day_schedule["end"].split(":"))
                
                current_time = start_hour * 60 + start_min
                end_time = end_hour * 60 + end_min
                
                while current_time + slot_duration <= end_time:
                    time_str = f"{current_time // 60:02d}:{current_time % 60:02d}"
                    
                    # Skip break time
                    if day_schedule.get("break_start") and day_schedule.get("break_end"):
                        break_start_h, break_start_m = map(int, day_schedule["break_start"].split(":"))
                        break_end_h, break_end_m = map(int, day_schedule["break_end"].split(":"))
                        break_start = break_start_h * 60 + break_start_m
                        break_end = break_end_h * 60 + break_end_m
                        
                        if break_start <= current_time < break_end:
                            current_time = break_end
                            continue
                    
                    # Check if slot is available
                    is_available = time_str not in booked_times
                    
                    slots.append({
                        "time": time_str,
                        "end_time": f"{(current_time + slot_duration) // 60:02d}:{(current_time + slot_duration) % 60:02d}",
                        "is_available": is_available,
                        "duration": slot_duration
                    })
                    
                    current_time += slot_duration
        else:
            # Default slots if no schedule defined
            default_start = 9 * 60  # 09:00
            default_end = 18 * 60   # 18:00
            slot_duration = 30
            
            current_time = default_start
            while current_time + slot_duration <= default_end:
                time_str = f"{current_time // 60:02d}:{current_time % 60:02d}"
                
                # Skip lunch break (13:00 - 14:00)
                if 13 * 60 <= current_time < 14 * 60:
                    current_time = 14 * 60
                    continue
                
                is_available = time_str not in booked_times
                
                slots.append({
                    "time": time_str,
                    "end_time": f"{(current_time + slot_duration) // 60:02d}:{(current_time + slot_duration) % 60:02d}",
                    "is_available": is_available,
                    "duration": slot_duration
                })
                
                current_time += slot_duration
        
        return {
            "date": date,
            "day": day_name,
            "physio_id": physio_id,
            "slots": slots,
            "total_slots": len(slots),
            "available_count": len([s for s in slots if s["is_available"]])
        }
    except Exception as e:
        logging.error(f"Error getting available slots: {e}")
        raise HTTPException(status_code=500, detail=str(e))
