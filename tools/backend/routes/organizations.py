"""
WBA99 MSK Analysis - Organization Routes
All organization-related API endpoints
"""

from fastapi import APIRouter, HTTPException
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel
import uuid

# Import from centralized modules
from config import db
from models.organization import Organization, OrganizationCreate, OrganizationPayment
from models.enums import OrganizationStatus, ApprovalStatus

router = APIRouter(tags=["Organizations"])


# Request/Response Models
class OrganizationFullSignup(BaseModel):
    organization: Dict[str, Any]
    head: Dict[str, Any]
    plan: str
    payment: Dict[str, Any]


class OrganizationLoginRequest(BaseModel):
    email: str
    password: str


class DemoLoginRequest(BaseModel):
    email: str


# ============================================================
# ORGANIZATION CRUD ENDPOINTS
# ============================================================

@router.post("/organizations")
async def create_organization(org_data: OrganizationCreate):
    """Create a new organization signup request (requires admin approval)"""
    # Check if organization email already exists
    existing = await db.organizations.find_one({"email": org_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Organization with this email already exists")
    
    # Check if head email already exists
    existing_head = await db.organizations.find_one({"head_email": org_data.head_email})
    if existing_head:
        raise HTTPException(status_code=400, detail="Organization head email already registered")
    
    organization = Organization(
        name=org_data.name,
        email=org_data.email,
        phone=org_data.phone,
        address=org_data.address,
        head_name=org_data.head_name,
        head_email=org_data.head_email,
        head_phone=org_data.head_phone,
        website=org_data.website,
        status=OrganizationStatus.PENDING,
        approval_status=ApprovalStatus.PENDING,
    )
    
    await db.organizations.insert_one(organization.dict())
    return {"message": "Organization signup request submitted. Awaiting admin approval.", "organization_id": organization.id}


@router.post("/organizations/signup")
async def organization_full_signup(data: OrganizationFullSignup):
    """Full organization signup with plan selection and payment"""
    org_data = data.organization
    head_data = data.head
    
    # Check if organization email already exists
    existing = await db.organizations.find_one({"email": org_data.get("email")})
    if existing:
        raise HTTPException(status_code=400, detail="Organization with this email already exists")
    
    # Check if head email already exists
    existing_head = await db.users.find_one({"email": head_data.get("email")})
    if existing_head:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    org_id = f"org-{uuid.uuid4().hex[:12]}"
    
    # Create organization
    organization = {
        "id": org_id,
        "name": org_data.get("name"),
        "email": org_data.get("email"),
        "phone": org_data.get("phone"),
        "address": org_data.get("address"),
        "type": org_data.get("type", "clinic"),
        "head_name": head_data.get("name"),
        "head_email": head_data.get("email"),
        "head_phone": head_data.get("phone"),
        "subscription_plan": data.plan,
        "payment_status": "pending_verification",
        "payment_amount": data.payment.get("amount"),
        "payment_method": data.payment.get("method"),
        "status": "pending",
        "approval_status": "pending",
        "credits_balance": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    
    await db.organizations.insert_one(organization)
    
    # Create pending organization head user
    head_user = {
        "id": f"user-{uuid.uuid4().hex[:12]}",
        "email": head_data.get("email"),
        "name": head_data.get("name"),
        "phone": head_data.get("phone"),
        "password": head_data.get("password"),  # In production, hash this
        "role": "org_head",
        "organization_id": org_id,
        "status": "pending",
        "created_at": datetime.utcnow(),
    }
    
    await db.users.insert_one(head_user)
    
    return {
        "success": True,
        "message": "Organization registration submitted. Awaiting payment verification and admin approval.",
        "organization_id": org_id,
    }


@router.post("/organizations/login")
async def organization_login(data: OrganizationLoginRequest):
    """Login for organization heads"""
    # Find user
    user = await db.users.find_one({
        "email": data.email,
        "role": "org_head"
    })
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check password (in production, use proper hashing)
    if user.get("password") != data.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Get organization
    org = await db.organizations.find_one({"id": user.get("organization_id")})
    
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Check organization status
    if org.get("status") == "pending" or org.get("approval_status") == "pending":
        raise HTTPException(status_code=403, detail="Organization pending approval")
    
    return {
        "success": True,
        "user": {
            "id": user.get("id"),
            "email": user.get("email"),
            "name": user.get("name"),
            "role": "org_head",
        },
        "organization": {
            "id": org.get("id"),
            "name": org.get("name"),
            "status": org.get("status"),
        }
    }


@router.post("/organizations/demo-login")
async def organization_demo_login(data: DemoLoginRequest):
    """Login with demo account or check if demo exists"""
    # Check if this email has demo access
    user = await db.users.find_one({
        "email": data.email,
        "role": "org_head"
    })
    
    if not user:
        raise HTTPException(status_code=404, detail="Demo account not found")
    
    # Get organization
    org = await db.organizations.find_one({"id": user.get("organization_id")})
    
    return {
        "success": True,
        "user": {
            "id": user.get("id"),
            "email": user.get("email"),
            "name": user.get("name"),
            "role": "org_head",
        },
        "organization": {
            "id": org.get("id") if org else None,
            "name": org.get("name") if org else "Demo Organization",
            "status": org.get("status") if org else "active",
        }
    }


@router.get("/organizations")
async def get_organizations(status: Optional[str] = None, limit: int = 50):
    """Get all organizations (admin only)"""
    query = {}
    if status:
        query["status"] = status
    
    organizations = await db.organizations.find(query).limit(limit).to_list(limit)
    
    for org in organizations:
        if "_id" in org:
            del org["_id"]
    
    return organizations


@router.get("/organizations/{org_id}")
async def get_organization(org_id: str):
    """Get organization by ID"""
    org = await db.organizations.find_one({"id": org_id})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    if "_id" in org:
        del org["_id"]
    
    return org


@router.post("/organizations/{org_id}/approve")
async def approve_organization(org_id: str, admin_id: str):
    """Admin approves organization"""
    # Verify admin
    admin = await db.users.find_one({"id": admin_id, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    org = await db.organizations.find_one({"id": org_id})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Update organization status
    await db.organizations.update_one(
        {"id": org_id},
        {"$set": {
            "status": "active",
            "approval_status": "approved",
            "approved_by": admin_id,
            "approved_at": datetime.utcnow(),
            "credits_balance": 100,  # Starter credits
            "subscription_start": datetime.utcnow(),
            "subscription_end": datetime.utcnow() + timedelta(days=365),
            "updated_at": datetime.utcnow(),
        }}
    )
    
    # Activate org head user
    await db.users.update_one(
        {"email": org.get("head_email"), "role": "org_head"},
        {"$set": {
            "status": "active",
            "account_activated": True,
            "credits": 50,  # Starter credits for head
            "subscription_start": datetime.utcnow(),
            "subscription_end": datetime.utcnow() + timedelta(days=365),
        }}
    )
    
    return {"message": "Organization approved successfully", "organization_id": org_id}


@router.post("/organizations/{org_id}/reject")
async def reject_organization(org_id: str, admin_id: str, reason: Optional[str] = None):
    """Admin rejects organization"""
    admin = await db.users.find_one({"id": admin_id, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await db.organizations.update_one(
        {"id": org_id},
        {"$set": {
            "status": "rejected",
            "approval_status": "rejected",
            "rejection_reason": reason or "Application rejected",
            "updated_at": datetime.utcnow(),
        }}
    )
    
    return {"message": "Organization rejected", "organization_id": org_id}


@router.get("/organizations/{org_id}/physios")
async def get_organization_physios(org_id: str):
    """Get all physios in an organization"""
    physios = await db.users.find({"organization_id": org_id, "role": {"$in": ["physio", "org_physio"]}}).to_list(100)
    for p in physios:
        if "_id" in p:
            del p["_id"]
    return physios


@router.get("/organizations/{org_id}/patients")
async def get_organization_patients(org_id: str):
    """Get all patients in an organization"""
    patients = await db.users.find({"organization_id": org_id, "role": "patient"}).to_list(500)
    for p in patients:
        if "_id" in p:
            del p["_id"]
    return patients


@router.get("/organizations/{org_id}/assessments")
async def get_organization_assessments(org_id: str, assessment_type: Optional[str] = None, limit: int = 100):
    """Get all assessments for an organization"""
    # Get all users in org
    org_user_ids = await db.users.distinct("id", {"organization_id": org_id})
    
    query = {"$or": [{"patient_id": {"$in": org_user_ids}}, {"physio_id": {"$in": org_user_ids}}]}
    if assessment_type:
        query["assessment_type"] = assessment_type
    
    assessments = await db.assessments.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    for a in assessments:
        if "_id" in a:
            del a["_id"]
    return assessments


@router.get("/organizations/{org_id}/statistics")
async def get_organization_statistics(org_id: str):
    """Get organization dashboard statistics"""
    org = await db.organizations.find_one({"id": org_id})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Count physios
    physio_count = await db.users.count_documents({"organization_id": org_id, "role": {"$in": ["physio", "org_physio"]}})
    
    # Count patients
    patient_count = await db.users.count_documents({"organization_id": org_id, "role": "patient"})
    
    # Count assessments this month
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    org_user_ids = await db.users.distinct("id", {"organization_id": org_id})
    
    assessments_this_month = await db.assessments.count_documents({
        "$or": [{"patient_id": {"$in": org_user_ids}}, {"physio_id": {"$in": org_user_ids}}],
        "created_at": {"$gte": month_start}
    })
    
    total_assessments = await db.assessments.count_documents({
        "$or": [{"patient_id": {"$in": org_user_ids}}, {"physio_id": {"$in": org_user_ids}}]
    })
    
    return {
        "organization_id": org_id,
        "organization_name": org.get("name"),
        "physio_count": physio_count,
        "patient_count": patient_count,
        "assessments_this_month": assessments_this_month,
        "total_assessments": total_assessments,
        "credits_balance": org.get("credits_balance", org.get("credits", 0)),
        "subscription_status": org.get("status"),
        "subscription_end": org.get("subscription_end"),
    }


# ============================================================
# ORGANIZATION PAYMENT ENDPOINTS
# ============================================================

@router.post("/organizations/{org_id}/payment")
async def submit_organization_payment(org_id: str, amount: float, credits: int, screenshot_base64: Optional[str] = None):
    """Organization submits payment for credits"""
    org = await db.organizations.find_one({"id": org_id})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    payment = OrganizationPayment(
        organization_id=org_id,
        amount=amount,
        credits_purchased=credits,
        screenshot_url=screenshot_base64,
    )
    
    await db.organization_payments.insert_one(payment.dict())
    
    return {"message": "Payment submitted for verification", "payment_id": payment.id}


@router.post("/organizations/payments/{payment_id}/verify")
async def verify_organization_payment(payment_id: str, admin_id: str, approved: bool, reason: Optional[str] = None):
    """Admin verifies organization payment"""
    admin = await db.users.find_one({"id": admin_id, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    payment = await db.organization_payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if approved:
        # Add credits to organization
        await db.organizations.update_one(
            {"id": payment["organization_id"]},
            {"$inc": {"credits_balance": payment["credits_purchased"], "total_credits_purchased": payment["credits_purchased"]}}
        )
        
        await db.organization_payments.update_one(
            {"id": payment_id},
            {"$set": {"status": "approved", "verified_by": admin_id, "verified_at": datetime.utcnow()}}
        )
    else:
        await db.organization_payments.update_one(
            {"id": payment_id},
            {"$set": {"status": "rejected", "rejection_reason": reason, "verified_by": admin_id, "verified_at": datetime.utcnow()}}
        )
    
    return {"message": f"Payment {'approved' if approved else 'rejected'}", "payment_id": payment_id}


@router.get("/organizations/payments/pending")
async def get_pending_organization_payments(admin_id: str):
    """Get all pending organization payments (admin only)"""
    admin = await db.users.find_one({"id": admin_id, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    payments = await db.organization_payments.find({"status": "pending"}).to_list(100)
    
    # Enrich with org details
    for payment in payments:
        if "_id" in payment:
            del payment["_id"]
        org = await db.organizations.find_one({"id": payment["organization_id"]})
        payment["organization_name"] = org.get("name") if org else "Unknown"
    
    return payments
