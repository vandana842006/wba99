"""
WBA99 MSK Analysis - User Models
All user-related Pydantic models
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
import uuid

from .enums import UserRole, ApprovalStatus, SubscriptionTier


class UserApproval(BaseModel):
    """Admin approval status for physio accounts"""
    status: ApprovalStatus = ApprovalStatus.PENDING
    access_code: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None


class UserPermissions(BaseModel):
    """Admin-controlled permissions for each physio"""
    posture_analysis: bool = True
    walking_analysis: bool = False  # Locked for new physios - requires admin approval
    running_analysis: bool = False  # Locked for new physios - requires admin approval
    msk_assessment: bool = True
    fms_assessment: bool = True
    ai_analysis: bool = False  # Locked for new physios - requires admin approval (AI Analysis Hub)
    ai_posture_ml: bool = False  # Locked for new physios - requires admin approval
    ai_expert_diagnosis: bool = True
    psychology_assessment: bool = True
    education_access: bool = True
    certifications: bool = True
    patient_management: bool = True
    pdf_reports: bool = True


class UserSubscription(BaseModel):
    """User subscription details"""
    tier: SubscriptionTier = SubscriptionTier.FREE
    start_date: datetime = Field(default_factory=datetime.utcnow)
    end_date: Optional[datetime] = None
    is_active: bool = True
    auto_renew: bool = False
    custom_features: Dict[str, Any] = {}  # Admin can override specific features


class User(BaseModel):
    """Main user model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    role: UserRole
    phone: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    physio_id: Optional[str] = None  # For patients assigned to a physio
    organization_id: Optional[str] = None  # For physios/org_head under an organization
    subscription: UserSubscription = Field(default_factory=UserSubscription)
    is_blocked: bool = False
    blocked_reason: Optional[str] = None
    # Admin approval fields
    approval: UserApproval = Field(default_factory=UserApproval)
    # Admin-controlled permissions (for physios)
    permissions: UserPermissions = Field(default_factory=UserPermissions)
    # Credit balance
    credits: int = 0
    # Account activation (for physios - activated after first payment)
    account_activated: bool = True  # Default true for patients/admin


class UserCreate(BaseModel):
    """Model for creating a new user"""
    name: str
    email: str
    role: UserRole
    phone: Optional[str] = None
    physio_id: Optional[str] = None
    access_code: Optional[str] = None  # Required for physio/patient registration
    account_activated: Optional[bool] = None  # For physios - defaults based on role
    organization_id: Optional[str] = None  # For physios under an organization


class UserLogin(BaseModel):
    """Model for user login"""
    email: str
    role: UserRole


class UserLogoUpdate(BaseModel):
    """Model for updating user logo"""
    logo_base64: str  # Base64 encoded image


class UserProfileSettings(BaseModel):
    """Model for user profile settings"""
    clinic_name: Optional[str] = None
    clinic_address: Optional[str] = None
    clinic_phone: Optional[str] = None
    clinic_email: Optional[str] = None
    logo_url: Optional[str] = None
    signature_url: Optional[str] = None
