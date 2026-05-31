"""
WBA99 MSK Analysis - User Routes
All user-related API endpoints
"""

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime

# Import from centralized modules
from config import db, ALLOWED_ADMIN_EMAILS, is_free_account
from models.user import (
    User, UserCreate, UserLogin, UserLogoUpdate, UserProfileSettings,
    UserApproval, UserPermissions
)
from models.enums import UserRole, ApprovalStatus

router = APIRouter(tags=["Users"])

# Maximum admin limit
MAX_ADMINS = 5


@router.post("/users", response_model=User)
async def create_user(user_data: UserCreate):
    """Create a new user"""
    # Check if email already exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check admin email whitelist
    if user_data.role == UserRole.ADMIN:
        if user_data.email.lower().strip() not in [e.lower() for e in ALLOWED_ADMIN_EMAILS]:
            raise HTTPException(
                status_code=403, 
                detail="Admin registration is restricted to authorized email addresses only."
            )
    
    # Check admin limit
    if user_data.role == UserRole.ADMIN:
        admin_count = await db.users.count_documents({"role": "admin"})
        if admin_count >= MAX_ADMINS:
            raise HTTPException(status_code=400, detail=f"Maximum {MAX_ADMINS} admins allowed. Cannot create more admin accounts.")
    
    # For physio/patient, require access code validation
    if user_data.role in [UserRole.PHYSIO, UserRole.PATIENT]:
        if user_data.access_code:
            # Validate access code
            access_code = await db.access_codes.find_one({
                "code": user_data.access_code,
                "role": user_data.role,
                "is_active": True,
                "expires_at": {"$gte": datetime.utcnow()}
            })
            if not access_code:
                raise HTTPException(status_code=400, detail="Invalid or expired access code")
            if access_code["current_uses"] >= access_code["max_uses"]:
                raise HTTPException(status_code=400, detail="Access code has reached maximum uses")
            
            # Increment usage
            await db.access_codes.update_one(
                {"code": user_data.access_code},
                {"$inc": {"current_uses": 1}}
            )
            
            # Set approval status based on code
            approval = UserApproval(
                status=ApprovalStatus.APPROVED,
                access_code=user_data.access_code,
                approved_at=datetime.utcnow()
            )
        else:
            # Auto-approve all users (approval system removed)
            approval = UserApproval(status=ApprovalStatus.APPROVED, approved_at=datetime.utcnow())
    else:
        # Admins are auto-approved
        approval = UserApproval(status=ApprovalStatus.APPROVED, approved_at=datetime.utcnow())
    
    user = User(**user_data.dict(exclude={'access_code', 'account_activated'}), approval=approval)
    
    # Set account_activated - physios need payment to activate, others are auto-activated
    if user_data.account_activated is not None:
        user.account_activated = user_data.account_activated
    elif user_data.role == UserRole.PHYSIO:
        user.account_activated = False  # Physios need payment
    else:
        user.account_activated = True  # Patients and admins are auto-activated
    
    await db.users.insert_one(user.dict())
    return user


@router.post("/users/login", response_model=User)
async def login_user(login_data: UserLogin):
    """Login user"""
    user = await db.users.find_one({"email": login_data.email, "role": login_data.role})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)


@router.get("/users", response_model=List[User])
async def get_users(role: Optional[UserRole] = None, skip: int = 0, limit: int = 100):
    """Get all users with optional role filter"""
    query = {} if role is None else {"role": role}
    users = await db.users.find(query).skip(skip).limit(limit).to_list(limit)
    return [User(**u) for u in users]


@router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    """Get user by ID"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)


@router.get("/users/physio/{physio_id}/patients", response_model=List[User])
async def get_physio_patients(physio_id: str, skip: int = 0, limit: int = 100):
    """Get patients assigned to a physio"""
    # First try to get patients assigned to this physio
    patients = await db.users.find({"role": "patient", "physio_id": physio_id}).skip(skip).limit(limit).to_list(limit)
    
    # If no patients are assigned, return all patients in the organization
    if not patients:
        # Get the physio's organization
        physio = await db.users.find_one({"id": physio_id})
        if physio and physio.get("organization_id"):
            # Get patients from the same organization
            patients = await db.users.find({
                "role": "patient", 
                "organization_id": physio.get("organization_id")
            }).skip(skip).limit(limit).to_list(limit)
        
        # If still no patients, return all patients (for demo purposes)
        if not patients:
            patients = await db.users.find({"role": "patient"}).skip(skip).limit(limit).to_list(limit)
    
    return [User(**p) for p in patients]


@router.put("/users/{user_id}/assign-physio/{physio_id}")
async def assign_patient_to_physio(user_id: str, physio_id: str):
    """Assign a patient to a physio"""
    result = await db.users.update_one(
        {"id": user_id, "role": "patient"},
        {"$set": {"physio_id": physio_id}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found or update failed")
    return {"message": "Patient assigned to physio successfully"}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str):
    """Delete user by ID"""
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}


# =============================================
# USER LOGO & PROFILE SETTINGS
# =============================================

@router.post("/users/{user_id}/upload-logo")
async def upload_user_logo(user_id: str, logo_data: UserLogoUpdate):
    """Upload logo for physio/admin - will be used in PDFs and certificates"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("role") not in ["physio", "admin"]:
        raise HTTPException(status_code=403, detail="Only physio and admin can upload logos")
    
    # Store logo in user document
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"logo_url": logo_data.logo_base64, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Logo uploaded successfully", "logo_url": logo_data.logo_base64}


@router.get("/users/{user_id}/logo")
async def get_user_logo(user_id: str):
    """Get user's logo"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "logo_url": user.get("logo_url"),
        "clinic_name": user.get("clinic_name"),
        "has_logo": bool(user.get("logo_url"))
    }


@router.put("/users/{user_id}/profile-settings")
async def update_profile_settings(user_id: str, settings: UserProfileSettings):
    """Update user profile settings (clinic info, logo, etc.)"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {
        "updated_at": datetime.utcnow()
    }
    
    if settings.clinic_name is not None:
        update_data["clinic_name"] = settings.clinic_name
    if settings.clinic_address is not None:
        update_data["clinic_address"] = settings.clinic_address
    if settings.clinic_phone is not None:
        update_data["clinic_phone"] = settings.clinic_phone
    if settings.clinic_email is not None:
        update_data["clinic_email"] = settings.clinic_email
    if settings.logo_url is not None:
        update_data["logo_url"] = settings.logo_url
    if settings.signature_url is not None:
        update_data["signature_url"] = settings.signature_url
    
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    return {"message": "Profile settings updated", "updated_fields": list(update_data.keys())}


@router.get("/users/{user_id}/profile-settings")
async def get_profile_settings(user_id: str):
    """Get user profile settings"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "clinic_name": user.get("clinic_name", ""),
        "clinic_address": user.get("clinic_address", ""),
        "clinic_phone": user.get("clinic_phone", ""),
        "clinic_email": user.get("clinic_email", ""),
        "logo_url": user.get("logo_url", ""),
        "signature_url": user.get("signature_url", ""),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
    }
