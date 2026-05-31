"""
WBA99 MSK Analysis - Payment Routes
All payment and credit-related API endpoints
"""

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
import uuid

# Import from centralized modules
from config import db, is_free_account
from models.payment import (
    CreditPackage, PaymentSettings, FeaturePricing, 
    PaymentTransaction, PurchaseRequest, CreditUsage
)
from models.enums import PaymentStatus

router = APIRouter(tags=["Payments"])


# Default credit packages
DEFAULT_CREDIT_PACKAGES = [
    {"id": "pkg_starter", "name": "Starter Pack", "credits": 50, "price": 499, "description": "50 credits for basic assessments"},
    {"id": "pkg_standard", "name": "Standard Pack", "credits": 150, "price": 999, "description": "150 credits - Best value"},
    {"id": "pkg_premium", "name": "Premium Pack", "credits": 500, "price": 2499, "description": "500 credits for professionals"},
]

# Default feature pricing (credits required)
DEFAULT_FEATURE_PRICING = [
    {"feature_key": "posture_assessment", "feature_name": "Posture Assessment", "credits_required": 5},
    {"feature_key": "walking_assessment", "feature_name": "Walking Assessment", "credits_required": 5},
    {"feature_key": "running_assessment", "feature_name": "Running Assessment", "credits_required": 5},
    {"feature_key": "msk_assessment", "feature_name": "MSK Assessment", "credits_required": 8},
    {"feature_key": "fms_assessment", "feature_name": "FMS Assessment", "credits_required": 10},
    {"feature_key": "ai_posture_analysis", "feature_name": "AI Posture Analysis", "credits_required": 15},
    {"feature_key": "ai_running_analysis", "feature_name": "AI Running Analysis", "credits_required": 15},
    {"feature_key": "ai_expert_diagnosis", "feature_name": "AI Expert Diagnosis", "credits_required": 20},
    {"feature_key": "goniometry_rom", "feature_name": "Goniometry & ROM Assessment", "credits_required": 8},
    {"feature_key": "pdf_report", "feature_name": "Generate PDF Report", "credits_required": 3},
    {"feature_key": "education_course", "feature_name": "Education Course Access", "credits_required": 25},
    {"feature_key": "research_blog", "feature_name": "Research Blog Access", "credits_required": 5},
    {"feature_key": "certification_exam", "feature_name": "Certification Exam", "credits_required": 50},
    {"feature_key": "generate_certificate", "feature_name": "Generate Certificate", "credits_required": 30},
    {"feature_key": "rehab_program", "feature_name": "AI Rehab Program", "credits_required": 10},
    {"feature_key": "sports_analysis", "feature_name": "Sports Biomechanics Analysis", "credits_required": 12},
    {"feature_key": "yoga_analysis", "feature_name": "Yoga Pose Analysis", "credits_required": 8},
    {"feature_key": "athlete_load", "feature_name": "Athlete Load Monitoring", "credits_required": 5},
    {"feature_key": "anthropometry", "feature_name": "Anthropometry Measurement", "credits_required": 6},
    {"feature_key": "inclinometer", "feature_name": "Digital Inclinometer", "credits_required": 5},
]

# Pricing Configuration (in paise - 100 paise = 1 INR)
SIGNUP_FEES = {
    "organization": 999900,  # ₹9,999 for organization signup
    "physio": 149900,        # ₹1,499 for physio signup (first time)
    "physio_monthly": 49900, # ₹499 for monthly subscription
}


# Payment Submission Model
class PaymentSubmission(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_email: str
    user_name: str
    user_role: str  # physio, patient, org_head
    payment_type: str  # signup, credits, subscription
    amount: float
    credits_requested: int = 0
    receipt_image: str  # Base64 or URL
    transaction_id: Optional[str] = None
    notes: Optional[str] = None
    status: str = "pending"  # pending, approved, rejected
    admin_notes: Optional[str] = None
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    verified_at: Optional[datetime] = None
    verified_by: Optional[str] = None


# ============================================================
# PAYMENT VERIFICATION ENDPOINTS
# ============================================================

@router.post("/payments/submit")
async def submit_payment(
    user_id: str,
    payment_type: str,
    amount: float,
    receipt_image: str,
    credits_requested: int = 0,
    transaction_id: Optional[str] = None,
    notes: Optional[str] = None
):
    """User submits payment receipt for verification"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    submission = PaymentSubmission(
        user_id=user_id,
        user_email=user.get("email", ""),
        user_name=user.get("name", ""),
        user_role=user.get("role", ""),
        payment_type=payment_type,
        amount=amount,
        credits_requested=credits_requested,
        receipt_image=receipt_image,
        transaction_id=transaction_id,
        notes=notes
    )
    
    await db.payment_submissions.insert_one(submission.dict())
    
    return {"message": "Payment submitted for verification", "submission_id": submission.id}


@router.get("/payments/submissions")
async def get_payment_submissions(
    admin_id: str,
    status: Optional[str] = None,
    limit: int = 50
):
    """Admin gets all payment submissions"""
    # Verify admin
    admin = await db.users.find_one({"id": admin_id, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {}
    if status:
        query["status"] = status
    
    submissions = await db.payment_submissions.find(query).sort("submitted_at", -1).limit(limit).to_list(limit)
    
    # Remove MongoDB _id
    for s in submissions:
        if "_id" in s:
            del s["_id"]
    
    return submissions


@router.get("/payments/submissions/{submission_id}")
async def get_payment_submission(submission_id: str, admin_id: str):
    """Admin gets single payment submission details"""
    admin = await db.users.find_one({"id": admin_id, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    submission = await db.payment_submissions.find_one({"id": submission_id})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    if "_id" in submission:
        del submission["_id"]
    
    return submission


@router.post("/payments/verify/{submission_id}")
async def verify_payment(
    submission_id: str,
    admin_id: str,
    action: str,  # approve or reject
    admin_notes: Optional[str] = None,
    credits_to_add: Optional[int] = None
):
    """Admin verifies/approves or rejects payment"""
    admin = await db.users.find_one({"id": admin_id, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    submission = await db.payment_submissions.find_one({"id": submission_id})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    if submission["status"] != "pending":
        raise HTTPException(status_code=400, detail="Payment already processed")
    
    new_status = "approved" if action == "approve" else "rejected"
    
    # Update submission status
    await db.payment_submissions.update_one(
        {"id": submission_id},
        {"$set": {
            "status": new_status,
            "admin_notes": admin_notes,
            "verified_at": datetime.utcnow(),
            "verified_by": admin_id
        }}
    )
    
    # If approved, process the payment action
    if action == "approve":
        user_id = submission["user_id"]
        payment_type = submission["payment_type"]
        
        if payment_type == "credits":
            # Add credits to user
            credits = credits_to_add or submission.get("credits_requested", 0)
            if credits > 0:
                await db.users.update_one(
                    {"id": user_id},
                    {
                        "$inc": {"credits": credits, "total_credits_purchased": credits},
                        "$set": {"last_credit_purchase": datetime.utcnow()}
                    }
                )
                # Log transaction
                await db.credit_transactions.insert_one({
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "type": "purchase",
                    "credits": credits,
                    "amount": submission["amount"],
                    "payment_submission_id": submission_id,
                    "created_at": datetime.utcnow()
                })
        
        elif payment_type == "signup":
            # Activate account
            await db.users.update_one(
                {"id": user_id},
                {"$set": {
                    "account_activated": True,
                    "payment_status": "completed",
                    "subscription_start": datetime.utcnow(),
                    "subscription_end": datetime.utcnow() + timedelta(days=365),
                    "credits": 50  # Starter credits
                }}
            )
        
        elif payment_type == "subscription":
            # Extend subscription
            user = await db.users.find_one({"id": user_id})
            current_end = user.get("subscription_end", datetime.utcnow())
            if current_end < datetime.utcnow():
                current_end = datetime.utcnow()
            
            await db.users.update_one(
                {"id": user_id},
                {"$set": {
                    "subscription_end": current_end + timedelta(days=30),
                    "payment_status": "completed"
                }}
            )
    
    return {
        "message": f"Payment {new_status}",
        "submission_id": submission_id,
        "status": new_status
    }


@router.get("/payments/user/{user_id}")
async def get_user_payments(user_id: str, limit: int = 20):
    """Get user's payment submissions"""
    submissions = await db.payment_submissions.find({"user_id": user_id}).sort("submitted_at", -1).limit(limit).to_list(limit)
    
    for s in submissions:
        if "_id" in s:
            del s["_id"]
    
    return submissions


# ============================================================
# CREDIT ENDPOINTS
# ============================================================

@router.post("/credits/use")
async def use_credits(user_id: str, feature_key: str, amount: Optional[int] = None):
    """Deduct credits for using a feature"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Free accounts (admin/demo) don't need credits
    if is_free_account(user.get("email", "")):
        return {
            "message": f"Free account - no credits deducted",
            "credits_used": 0,
            "remaining_credits": -1  # Unlimited
        }
    
    # Check if account is activated
    if not user.get("account_activated", False):
        raise HTTPException(status_code=403, detail="Account not activated. Please complete payment first.")
    
    # Get credits required
    if amount is None:
        pricing = await db.feature_pricing.find_one({"feature_key": feature_key})
        if pricing:
            amount = pricing.get("credits_required", 5)
        else:
            # Check default pricing
            default = next((p for p in DEFAULT_FEATURE_PRICING if p["feature_key"] == feature_key), None)
            amount = default["credits_required"] if default else 5
    
    current_credits = user.get("credits", 0)
    if current_credits < amount:
        raise HTTPException(
            status_code=402, 
            detail=f"Insufficient credits. Required: {amount}, Available: {current_credits}. Please purchase more credits."
        )
    
    # Deduct credits
    await db.users.update_one(
        {"id": user_id},
        {"$inc": {"credits": -amount}}
    )
    
    # Log usage
    await db.credit_usage.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "feature_key": feature_key,
        "credits_used": amount,
        "timestamp": datetime.utcnow()
    })
    
    return {
        "message": f"Used {amount} credits for {feature_key}",
        "credits_used": amount,
        "remaining_credits": current_credits - amount
    }


@router.get("/credits/balance/{user_id}")
async def get_credit_balance(user_id: str):
    """Get user's credit balance and subscription status"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Free accounts (admin/demo) have unlimited access
    if is_free_account(user.get("email", "")):
        return {
            "user_id": user_id,
            "credits": -1,  # Unlimited
            "total_purchased": 0,
            "account_activated": True,
            "subscription_active": True,
            "subscription_end": None,
            "is_free_account": True
        }
    
    subscription_end = user.get("subscription_end")
    is_subscription_active = subscription_end and subscription_end > datetime.utcnow() if subscription_end else False
    
    return {
        "user_id": user_id,
        "credits": user.get("credits", 0),
        "total_purchased": user.get("total_credits_purchased", 0),
        "account_activated": user.get("account_activated", False),
        "subscription_active": is_subscription_active,
        "subscription_end": subscription_end.isoformat() if subscription_end else None,
        "is_free_account": False
    }


@router.get("/users/{user_id}/credits")
async def get_user_credits(user_id: str):
    """Get user's credit balance"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"user_id": user_id, "credits": user.get("credits", 0)}


@router.post("/payment/purchase")
async def initiate_purchase(user_id: str, package_id: str, body: Optional[PurchaseRequest] = None):
    """User initiates credit purchase"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Find package
    packages = await db.credit_packages.find({"is_active": True}).to_list(100)
    if not packages:
        packages = DEFAULT_CREDIT_PACKAGES
    
    package = next((p for p in packages if p.get("id") == package_id), None)
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Create pending transaction
    transaction = PaymentTransaction(
        user_id=user_id,
        user_email=user.get("email", ""),
        amount=package["price"],
        credits_purchased=package["credits"],
        package_id=package_id,
        screenshot_url=body.screenshot_base64 if body else None,
        status=PaymentStatus.PENDING
    )
    
    await db.payment_transactions.insert_one(transaction.dict())
    
    # Get payment settings
    settings = await db.payment_settings.find_one({"id": "payment_settings"})
    
    return {
        "transaction_id": transaction.id,
        "amount": package["price"],
        "credits": package["credits"],
        "status": "pending",
        "payment_details": {
            "upi_id": settings.get("upi_id") if settings else "",
            "account_holder": settings.get("account_holder_name") if settings else "",
            "qr_code": settings.get("qr_code_image") if settings else None
        }
    }


# ============================================================
# CREDIT PACKAGES & PRICING ADMIN
# ============================================================

@router.get("/credit-packages")
async def get_credit_packages():
    """Get all available credit packages"""
    packages = await db.credit_packages.find({"is_active": True}).to_list(100)
    if not packages:
        return DEFAULT_CREDIT_PACKAGES
    
    for p in packages:
        if "_id" in p:
            del p["_id"]
    return packages


@router.get("/feature-pricing")
async def get_feature_pricing():
    """Get pricing for all features"""
    pricing = await db.feature_pricing.find({"is_active": True}).to_list(100)
    if not pricing:
        return DEFAULT_FEATURE_PRICING
    
    for p in pricing:
        if "_id" in p:
            del p["_id"]
    return pricing


@router.get("/payment-settings")
async def get_payment_settings():
    """Get payment settings for display (UPI ID, QR code, etc.)"""
    settings = await db.payment_settings.find_one({"id": "payment_settings"})
    if not settings:
        return {
            "upi_id": "",
            "account_holder_name": "",
            "qr_code_image": None
        }
    
    if "_id" in settings:
        del settings["_id"]
    
    return settings
