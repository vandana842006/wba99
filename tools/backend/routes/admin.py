"""
WBA99 MSK Analysis - Admin Routes
Admin control panel endpoints for user management, subscriptions, and access codes
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

from config import db
from models import User, SubscriptionTier

router = APIRouter(tags=["Admin"])

# Tier feature configuration
TIER_FEATURES = {
    "free": {
        "max_assessments_per_month": 5,
        "max_patients": 3,
        "ai_analysis": False,
        "advanced_reports": False,
        "video_analysis": False,
        "export_pdf": False,
        "team_collaboration": False,
        "priority_support": False,
        "custom_branding": False,
    },
    "basic": {
        "max_assessments_per_month": 50,
        "max_patients": 25,
        "ai_analysis": True,
        "advanced_reports": False,
        "video_analysis": False,
        "export_pdf": True,
        "team_collaboration": False,
        "priority_support": False,
        "custom_branding": False,
    },
    "professional": {
        "max_assessments_per_month": 200,
        "max_patients": 100,
        "ai_analysis": True,
        "advanced_reports": True,
        "video_analysis": True,
        "export_pdf": True,
        "team_collaboration": True,
        "priority_support": True,
        "custom_branding": False,
    },
    "enterprise": {
        "max_assessments_per_month": -1,  # Unlimited
        "max_patients": -1,
        "ai_analysis": True,
        "advanced_reports": True,
        "video_analysis": True,
        "export_pdf": True,
        "team_collaboration": True,
        "priority_support": True,
        "custom_branding": True,
    }
}


# =============================================
# SUBSCRIPTION MANAGEMENT
# =============================================

@router.get("/admin/subscription-tiers")
async def get_subscription_tiers():
    """Get all subscription tier configurations"""
    return TIER_FEATURES


@router.put("/admin/users/{user_id}/subscription")
async def update_user_subscription(
    user_id: str, 
    tier: SubscriptionTier,
    duration_months: int = 1
):
    """Admin: Update user's subscription tier"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    start_date = datetime.utcnow()
    end_date = start_date + timedelta(days=30 * duration_months) if tier != SubscriptionTier.FREE else None
    
    subscription = {
        "tier": tier,
        "start_date": start_date,
        "end_date": end_date,
        "is_active": True,
        "auto_renew": False,
        "custom_features": {}
    }
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"subscription": subscription}}
    )
    
    return {"message": f"Subscription updated to {tier} for {duration_months} months"}


@router.put("/admin/users/{user_id}/custom-features")
async def update_user_custom_features(user_id: str, custom_features: Dict[str, Any]):
    """Admin: Override specific features for a user"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"subscription.custom_features": custom_features}}
    )
    
    return {"message": "Custom features updated successfully"}


# =============================================
# USER MANAGEMENT
# =============================================

@router.put("/admin/users/{user_id}/block")
async def block_user(user_id: str, reason: str = ""):
    """Admin: Block a user"""
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_blocked": True, "blocked_reason": reason}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User blocked successfully"}


@router.put("/admin/users/{user_id}/unblock")
async def unblock_user(user_id: str):
    """Admin: Unblock a user"""
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_blocked": False, "blocked_reason": None}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User unblocked successfully"}


@router.get("/admin/users/subscriptions")
async def get_users_by_subscription(
    tier: Optional[SubscriptionTier] = None, 
    skip: int = 0, 
    limit: int = 100
):
    """Admin: Get users filtered by subscription tier"""
    query = {}
    if tier:
        query["subscription.tier"] = tier
    
    users = await db.users.find(query).skip(skip).limit(limit).to_list(limit)
    return [User(**u) for u in users]


@router.get("/users/{user_id}/features")
async def get_user_features(user_id: str):
    """Get user's available features based on subscription"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_obj = User(**user)
    tier = user_obj.subscription.tier if user_obj.subscription else "free"
    base_features = TIER_FEATURES.get(tier, TIER_FEATURES["free"]).copy()
    
    # Apply custom overrides
    if user_obj.subscription and user_obj.subscription.custom_features:
        base_features.update(user_obj.subscription.custom_features)
    
    # Check if subscription is active
    if user_obj.subscription and user_obj.subscription.end_date:
        if user_obj.subscription.end_date < datetime.utcnow():
            base_features = TIER_FEATURES["free"].copy()
    
    # Check if user is blocked
    if user_obj.is_blocked:
        return {
            "features": {},
            "is_blocked": True,
            "blocked_reason": user_obj.blocked_reason
        }
    
    return {
        "features": base_features,
        "tier": tier,
        "is_active": user_obj.subscription.is_active if user_obj.subscription else True,
        "end_date": user_obj.subscription.end_date if user_obj.subscription else None
    }


# =============================================
# USER APPROVALS
# =============================================

@router.get("/admin/pending-approvals", response_model=List[User])
async def get_pending_approvals():
    """Admin: Get all users pending approval"""
    users = await db.users.find({"approval.status": "pending"}).to_list(1000)
    return [User(**u) for u in users]


@router.post("/admin/approve-user/{user_id}")
async def approve_user(user_id: str, notes: str = ""):
    """Admin: Approve a pending user"""
    result = await db.users.update_one(
        {"id": user_id, "approval.status": "pending"},
        {"$set": {
            "approval.status": "approved",
            "approval.reviewed_at": datetime.utcnow(),
            "approval.notes": notes,
            "is_active": True
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found or not pending approval")
    return {"message": "User approved successfully"}


@router.post("/admin/reject-user/{user_id}")
async def reject_user(user_id: str, reason: str = ""):
    """Admin: Reject a pending user"""
    result = await db.users.update_one(
        {"id": user_id, "approval.status": "pending"},
        {"$set": {
            "approval.status": "rejected",
            "approval.reviewed_at": datetime.utcnow(),
            "approval.rejection_reason": reason,
            "is_active": False
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found or not pending approval")
    return {"message": "User rejected"}


@router.put("/admin/user/{user_id}/permissions")
async def update_user_permissions(user_id: str, permissions: Dict[str, bool]):
    """Admin: Update user permissions"""
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"permissions": permissions}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Permissions updated successfully"}


@router.get("/users/{user_id}/permissions")
async def get_user_permissions(user_id: str):
    """Get user permissions"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.get("permissions", {})


# =============================================
# ACCESS CODE MANAGEMENT
# =============================================

from pydantic import BaseModel, Field
import uuid
import random
import string

class AccessCodeCreate(BaseModel):
    role: str
    expires_days: int = 7
    max_uses: int = 1
    notes: Optional[str] = None

class AccessCode(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    role: str
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    max_uses: int = 1
    current_uses: int = 0
    is_active: bool = True
    notes: Optional[str] = None

def generate_access_code(length: int = 8) -> str:
    """Generate a random access code"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


@router.post("/admin/access-codes", response_model=AccessCode)
async def create_access_code(data: AccessCodeCreate, admin_id: str):
    """Admin creates access codes for physios/patients to register"""
    admin = await db.users.find_one({"id": admin_id, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    code = AccessCode(
        code=generate_access_code(8),
        role=data.role,
        created_by=admin_id,
        expires_at=datetime.utcnow() + timedelta(days=data.expires_days),
        max_uses=data.max_uses,
        notes=data.notes
    )
    
    await db.access_codes.insert_one(code.dict())
    return code


@router.get("/admin/access-codes", response_model=List[AccessCode])
async def get_access_codes(admin_id: str, include_expired: bool = False):
    """Get all access codes"""
    admin = await db.users.find_one({"id": admin_id, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {}
    if not include_expired:
        query["expires_at"] = {"$gte": datetime.utcnow()}
        query["is_active"] = True
    
    codes = await db.access_codes.find(query).sort("created_at", -1).to_list(100)
    return [AccessCode(**c) for c in codes]


@router.post("/admin/access-codes/{code}/deactivate")
async def deactivate_access_code(code: str, admin_id: str):
    """Deactivate an access code"""
    admin = await db.users.find_one({"id": admin_id, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.access_codes.update_one(
        {"code": code},
        {"$set": {"is_active": False}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Access code not found")
    return {"message": "Access code deactivated"}


@router.post("/validate-access-code")
async def validate_access_code(code: str, role: str):
    """Validate an access code before registration"""
    access_code = await db.access_codes.find_one({
        "code": code,
        "role": role,
        "is_active": True,
        "expires_at": {"$gte": datetime.utcnow()}
    })
    
    if not access_code:
        raise HTTPException(status_code=400, detail="Invalid or expired access code")
    
    if access_code["current_uses"] >= access_code["max_uses"]:
        raise HTTPException(status_code=400, detail="Access code has reached maximum uses")
    
    return {"valid": True, "role": role}
