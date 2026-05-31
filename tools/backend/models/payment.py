"""
WBA99 MSK Analysis - Payment Models
All payment and credit-related Pydantic models
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
import uuid

from .enums import PaymentStatus


class CreditPackage(BaseModel):
    """Credit package for purchase"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    credits: int
    price: float  # in INR
    description: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PaymentSettings(BaseModel):
    """Admin payment settings (UPI, bank details)"""
    id: str = "payment_settings"
    upi_id: str = ""
    account_holder_name: str = ""
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    swift_code: Optional[str] = None
    branch: Optional[str] = None
    qr_code_image: Optional[str] = None  # Base64 or URL
    is_active: bool = True
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    updated_by: Optional[str] = None


class FeaturePricing(BaseModel):
    """Pricing for individual features"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    feature_key: str  # e.g., "posture_assessment", "education_course", "certification"
    feature_name: str
    credits_required: int
    description: Optional[str] = None
    is_active: bool = True


class PaymentTransaction(BaseModel):
    """Payment transaction record"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_email: str
    amount: float
    credits_purchased: int
    package_id: Optional[str] = None
    payment_method: str = "upi"
    transaction_reference: Optional[str] = None
    screenshot_url: Optional[str] = None
    status: PaymentStatus = PaymentStatus.PENDING
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PurchaseRequest(BaseModel):
    """Purchase request with payment screenshot"""
    screenshot_base64: Optional[str] = None


class CreditUsage(BaseModel):
    """Record of credit usage"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    feature_key: str
    feature_name: str
    credits_used: int
    balance_after: int
    metadata: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ReportLog(BaseModel):
    """Track all PDF reports and analyses generated"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    report_type: str  # posture, gait, fms, rom, certification, assessment, research
    report_name: str  # Human readable name
    generated_by_id: str  # User who generated
    generated_by_name: str
    generated_by_role: str  # physio, admin, org_head, org_physio
    organization_id: Optional[str] = None
    organization_name: Optional[str] = None
    patient_id: Optional[str] = None
    patient_name: Optional[str] = None
    analysis_data: Dict[str, Any] = {}  # Store analysis results
    payment_status: str = "paid"  # paid, free, credit_used
    amount_paid: float = 0
    credits_used: int = 0
    pdf_generated: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    date_str: str = Field(default_factory=lambda: datetime.utcnow().strftime("%Y-%m-%d"))
