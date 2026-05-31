"""
WBA99 MSK Analysis - Organization Models
All organization-related Pydantic models
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid

from .enums import OrganizationStatus, ApprovalStatus, SubscriptionTier, PaymentStatus


class Organization(BaseModel):
    """Organization model for clinics/institutions"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    head_name: str  # Organization head/owner name
    head_email: str
    head_phone: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    # Status and approval
    status: OrganizationStatus = OrganizationStatus.PENDING
    approval_status: ApprovalStatus = ApprovalStatus.PENDING
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    # Payment and credits
    credits: int = 0
    total_credits_purchased: int = 0
    # Subscription
    subscription_tier: SubscriptionTier = SubscriptionTier.FREE
    subscription_start: Optional[datetime] = None
    subscription_end: Optional[datetime] = None
    # Settings
    max_physios: int = 5  # Default limit
    max_patients: int = 50  # Default limit
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class OrganizationCreate(BaseModel):
    """Model for creating an organization"""
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    head_name: str
    head_email: str
    head_phone: Optional[str] = None
    website: Optional[str] = None


class OrganizationPayment(BaseModel):
    """Organization payment transaction"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    organization_id: str
    amount: float
    credits_purchased: int
    payment_method: str = "upi"
    screenshot_url: Optional[str] = None
    status: PaymentStatus = PaymentStatus.PENDING
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
