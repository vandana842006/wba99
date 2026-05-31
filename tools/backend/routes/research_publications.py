"""
WBA99 Research Publications Routes
Publication requests, download requests, and admin approval workflows
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
import logging

# Database import
from config import db

router = APIRouter(tags=["research-publications"])

logger = logging.getLogger(__name__)

# Pricing constants
PUBLICATION_PRICING = {
    "physio": 499,
    "organization": 999,
    "data_download": 199,
    "collective_download": 999
}


# =============================================================================
# Pydantic Models
# =============================================================================

class CreatePublicationRequest(BaseModel):
    requester_id: str
    requester_name: Optional[str] = None
    requester_role: str
    organization_id: Optional[str] = None
    organization_name: Optional[str] = None
    condition_focus: str
    title: str
    description: Optional[str] = None


class CreateDownloadRequest(BaseModel):
    requester_id: str
    requester_name: Optional[str] = None
    requester_role: str
    organization_id: Optional[str] = None
    download_type: str  # csv, excel
    condition_filter: Optional[str] = None
    data_scope: str = "own"


# =============================================================================
# RESEARCH PUBLICATION REQUESTS
# =============================================================================

@router.post("/research/publication/request")
async def create_publication_request(request: CreatePublicationRequest):
    """Create a new research publication request"""
    try:
        # Calculate amount based on role
        amount = PUBLICATION_PRICING["organization"] if request.requester_role == "org_head" else PUBLICATION_PRICING["physio"]
        
        # Get sample size for this condition
        assessments = await db.assessments.find({
            "$or": [{"assessment_type": request.condition_focus}, {"condition": request.condition_focus}]
        }).to_list(5000)
        
        patient_ids = list(set([a.get("patient_id") for a in assessments if a.get("patient_id")]))
        
        pub_request = {
            "id": str(uuid.uuid4()),
            "requester_id": request.requester_id,
            "requester_name": request.requester_name,
            "requester_role": request.requester_role,
            "organization_id": request.organization_id,
            "organization_name": request.organization_name,
            "publication_type": "research",
            "condition_focus": request.condition_focus,
            "title": request.title,
            "description": request.description,
            "sample_size": len(patient_ids),
            "amount": amount,
            "payment_status": "pending",
            "admin_status": "pending",
            "created_at": datetime.utcnow()
        }
        
        await db.publication_requests.insert_one(pub_request)
        
        # Get payment settings
        payment_settings = await db.payment_settings.find_one({"id": "payment_settings"})
        
        return {
            "success": True,
            "request_id": pub_request["id"],
            "amount": amount,
            "sample_size": len(patient_ids),
            "payment_info": {
                "qr_code": payment_settings.get("qr_code_image") if payment_settings else None,
                "upi_id": payment_settings.get("upi_id") if payment_settings else None,
                "account_holder": payment_settings.get("account_holder_name") if payment_settings else None,
                "bank_name": payment_settings.get("bank_name") if payment_settings else None,
                "account_number": payment_settings.get("account_number") if payment_settings else None,
                "ifsc_code": payment_settings.get("ifsc_code") if payment_settings else None
            },
            "message": f"Publication request created. Please pay ₹{amount} and upload screenshot."
        }
    except Exception as e:
        logging.error(f"Create publication request error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/research/publication/{request_id}/upload-payment")
async def upload_publication_payment(request_id: str, screenshot: str):
    """Upload payment screenshot for publication request"""
    try:
        result = await db.publication_requests.update_one(
            {"id": request_id},
            {"$set": {
                "payment_screenshot": screenshot,
                "payment_status": "uploaded",
                "updated_at": datetime.utcnow()
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Request not found")
        
        return {
            "success": True,
            "message": "Payment screenshot uploaded. Waiting for admin approval."
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Upload payment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/research/publication/requests")
async def get_publication_requests(
    requester_id: Optional[str] = None,
    organization_id: Optional[str] = None,
    status: Optional[str] = None
):
    """Get publication requests"""
    try:
        query = {}
        if requester_id:
            query["requester_id"] = requester_id
        if organization_id:
            query["organization_id"] = organization_id
        if status:
            query["admin_status"] = status
        
        requests = await db.publication_requests.find(query).sort("created_at", -1).limit(100).to_list(100)
        
        return [{
            "id": r["id"],
            "title": r.get("title"),
            "condition_focus": r.get("condition_focus"),
            "requester_name": r.get("requester_name"),
            "requester_role": r.get("requester_role"),
            "organization_name": r.get("organization_name"),
            "sample_size": r.get("sample_size", 0),
            "amount": r.get("amount", 0),
            "payment_status": r.get("payment_status"),
            "payment_screenshot": r.get("payment_screenshot"),
            "admin_status": r.get("admin_status"),
            "admin_notes": r.get("admin_notes"),
            "created_at": r.get("created_at", datetime.utcnow()).isoformat()
        } for r in requests]
    except Exception as e:
        logging.error(f"Get publication requests error: {e}")
        return []


# =============================================================================
# DATA DOWNLOAD REQUESTS WITH PAYMENT
# =============================================================================

@router.post("/research/download/request")
async def create_download_request(request: CreateDownloadRequest):
    """Create a data download request with payment"""
    try:
        # Calculate amount
        if request.data_scope == "all" or request.condition_filter == "all":
            amount = PUBLICATION_PRICING["collective_download"]
        else:
            amount = PUBLICATION_PRICING["data_download"]
        
        # Calculate row count
        query = {}
        if request.condition_filter and request.condition_filter != "all":
            query["$or"] = [
                {"assessment_type": request.condition_filter},
                {"condition": request.condition_filter}
            ]
        
        assessments = await db.assessments.find(query).to_list(10000)
        row_count = len(assessments)
        
        download_req = {
            "id": str(uuid.uuid4()),
            "requester_id": request.requester_id,
            "requester_name": request.requester_name,
            "requester_role": request.requester_role,
            "organization_id": request.organization_id,
            "download_type": request.download_type,
            "condition_filter": request.condition_filter,
            "data_scope": request.data_scope,
            "amount": amount,
            "row_count": row_count,
            "payment_status": "pending",
            "admin_status": "pending",
            "created_at": datetime.utcnow()
        }
        
        await db.download_requests.insert_one(download_req)
        
        # Get payment settings
        payment_settings = await db.payment_settings.find_one({"id": "payment_settings"})
        
        return {
            "success": True,
            "request_id": download_req["id"],
            "amount": amount,
            "row_count": row_count,
            "payment_info": {
                "qr_code": payment_settings.get("qr_code_image") if payment_settings else None,
                "upi_id": payment_settings.get("upi_id") if payment_settings else None,
                "account_holder": payment_settings.get("account_holder_name") if payment_settings else None
            },
            "message": f"Download request created. Please pay ₹{amount} for {row_count} records."
        }
    except Exception as e:
        logging.error(f"Create download request error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/research/download/{request_id}/upload-payment")
async def upload_download_payment(request_id: str, screenshot: str):
    """Upload payment screenshot for download request"""
    try:
        result = await db.download_requests.update_one(
            {"id": request_id},
            {"$set": {
                "payment_screenshot": screenshot,
                "payment_status": "uploaded",
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Request not found")
        
        return {
            "success": True,
            "message": "Payment screenshot uploaded. Waiting for admin approval."
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Upload download payment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/research/download/requests")
async def get_download_requests(
    requester_id: Optional[str] = None,
    status: Optional[str] = None
):
    """Get download requests"""
    try:
        query = {}
        if requester_id:
            query["requester_id"] = requester_id
        if status:
            query["admin_status"] = status
        
        requests = await db.download_requests.find(query).sort("created_at", -1).limit(100).to_list(100)
        
        return [{
            "id": r["id"],
            "download_type": r.get("download_type"),
            "condition_filter": r.get("condition_filter"),
            "data_scope": r.get("data_scope"),
            "requester_name": r.get("requester_name"),
            "amount": r.get("amount", 0),
            "row_count": r.get("row_count", 0),
            "payment_status": r.get("payment_status"),
            "payment_screenshot": r.get("payment_screenshot"),
            "admin_status": r.get("admin_status"),
            "download_url": r.get("download_url"),
            "created_at": r.get("created_at", datetime.utcnow()).isoformat()
        } for r in requests]
    except Exception as e:
        logging.error(f"Get download requests error: {e}")
        return []


# =============================================================================
# ADMIN APPROVAL WORKFLOWS
# =============================================================================

@router.get("/admin/research/pending-requests")
async def get_pending_research_requests():
    """Get all pending research requests for admin review"""
    try:
        # Get pending publication requests
        pub_requests = await db.publication_requests.find({
            "admin_status": "pending",
            "payment_status": "uploaded"
        }).sort("created_at", -1).to_list(100)
        
        # Get pending download requests
        download_requests = await db.download_requests.find({
            "admin_status": "pending",
            "payment_status": "uploaded"
        }).sort("created_at", -1).to_list(100)
        
        return {
            "publication_requests": [{
                "id": r["id"],
                "type": "publication",
                "title": r.get("title"),
                "condition_focus": r.get("condition_focus"),
                "requester_name": r.get("requester_name"),
                "requester_role": r.get("requester_role"),
                "organization_name": r.get("organization_name"),
                "amount": r.get("amount", 0),
                "sample_size": r.get("sample_size", 0),
                "payment_screenshot": r.get("payment_screenshot"),
                "created_at": r.get("created_at", datetime.utcnow()).isoformat()
            } for r in pub_requests],
            "download_requests": [{
                "id": r["id"],
                "type": "download",
                "download_type": r.get("download_type"),
                "condition_filter": r.get("condition_filter"),
                "data_scope": r.get("data_scope"),
                "requester_name": r.get("requester_name"),
                "amount": r.get("amount", 0),
                "row_count": r.get("row_count", 0),
                "payment_screenshot": r.get("payment_screenshot"),
                "created_at": r.get("created_at", datetime.utcnow()).isoformat()
            } for r in download_requests],
            "total_pending": len(pub_requests) + len(download_requests)
        }
    except Exception as e:
        logging.error(f"Get pending requests error: {e}")
        return {"publication_requests": [], "download_requests": [], "total_pending": 0}


@router.post("/admin/research/publication/{request_id}/approve")
async def approve_publication_request(
    request_id: str,
    approved: bool,
    admin_notes: Optional[str] = None,
    admin_id: Optional[str] = None
):
    """Approve or reject a publication request"""
    try:
        pub_request = await db.publication_requests.find_one({"id": request_id})
        if not pub_request:
            raise HTTPException(status_code=404, detail="Request not found")
        
        status = "approved" if approved else "rejected"
        
        update_data = {
            "admin_status": status,
            "admin_notes": admin_notes,
            "admin_id": admin_id,
            "reviewed_at": datetime.utcnow()
        }
        
        # If approved, generate publication data
        if approved:
            # Aggregate data for publication
            condition = pub_request.get("condition_focus")
            assessments = await db.assessments.find({
                "$or": [{"assessment_type": condition}, {"condition": condition}]
            }).to_list(5000)
            
            patient_ids = list(set([a.get("patient_id") for a in assessments if a.get("patient_id")]))
            
            publication_data = {
                "id": str(uuid.uuid4()),
                "request_id": request_id,
                "title": pub_request.get("title"),
                "condition_type": condition,
                "total_patients": len(patient_ids),
                "total_assessments": len(assessments),
                "requester_id": pub_request.get("requester_id"),
                "requester_name": pub_request.get("requester_name"),
                "organization_id": pub_request.get("organization_id"),
                "organization_name": pub_request.get("organization_name"),
                "status": "approved",
                "published_at": datetime.utcnow(),
                "data_summary": {
                    "sample_size": len(patient_ids),
                    "assessments_count": len(assessments)
                }
            }
            
            await db.research_publications.insert_one(publication_data)
            update_data["publication_id"] = publication_data["id"]
        
        await db.publication_requests.update_one(
            {"id": request_id},
            {"$set": update_data}
        )
        
        return {
            "success": True,
            "status": status,
            "message": f"Publication request {status}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Approve publication error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/research/download/{request_id}/approve")
async def approve_download_request(
    request_id: str,
    approved: bool,
    admin_notes: Optional[str] = None,
    admin_id: Optional[str] = None
):
    """Approve or reject a download request"""
    try:
        download_req = await db.download_requests.find_one({"id": request_id})
        if not download_req:
            raise HTTPException(status_code=404, detail="Request not found")
        
        status = "approved" if approved else "rejected"
        
        update_data = {
            "admin_status": status,
            "admin_notes": admin_notes,
            "admin_id": admin_id,
            "reviewed_at": datetime.utcnow()
        }
        
        if approved:
            # Mark as downloadable
            update_data["download_ready"] = True
            update_data["download_url"] = f"/api/research/download/{request_id}/data"
        
        await db.download_requests.update_one(
            {"id": request_id},
            {"$set": update_data}
        )
        
        return {
            "success": True,
            "status": status,
            "message": f"Download request {status}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Approve download error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/research/download/{request_id}/data")
async def get_download_data(request_id: str):
    """Get the actual data for an approved download request"""
    try:
        download_req = await db.download_requests.find_one({"id": request_id})
        if not download_req:
            raise HTTPException(status_code=404, detail="Request not found")
        
        if download_req.get("admin_status") != "approved":
            raise HTTPException(status_code=403, detail="Request not approved")
        
        # Get the data
        query = {}
        condition = download_req.get("condition_filter")
        if condition and condition != "all":
            query["$or"] = [
                {"assessment_type": condition},
                {"condition": condition}
            ]
        
        assessments = await db.assessments.find(query).to_list(10000)
        
        # Convert ObjectIds and dates
        for a in assessments:
            if "_id" in a:
                a["_id"] = str(a["_id"])
            if "created_at" in a and isinstance(a["created_at"], datetime):
                a["created_at"] = a["created_at"].isoformat()
        
        return {
            "request_id": request_id,
            "download_type": download_req.get("download_type"),
            "condition_filter": condition,
            "row_count": len(assessments),
            "data": assessments,
            "downloaded_at": datetime.utcnow().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get download data error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/research/all-requests")
async def get_all_research_requests(
    request_type: Optional[str] = None,
    status: Optional[str] = None
):
    """Get all research requests (publications + downloads) for admin"""
    try:
        all_requests = []
        
        if not request_type or request_type == "publication":
            query = {}
            if status:
                query["admin_status"] = status
            pub_requests = await db.publication_requests.find(query).sort("created_at", -1).limit(100).to_list(100)
            all_requests.extend([{**r, "request_type": "publication", "_id": str(r.get("_id", ""))} for r in pub_requests])
        
        if not request_type or request_type == "download":
            query = {}
            if status:
                query["admin_status"] = status
            download_requests = await db.download_requests.find(query).sort("created_at", -1).limit(100).to_list(100)
            all_requests.extend([{**r, "request_type": "download", "_id": str(r.get("_id", ""))} for r in download_requests])
        
        return {
            "requests": all_requests,
            "total": len(all_requests)
        }
    except Exception as e:
        logging.error(f"Get all requests error: {e}")
        return {"requests": [], "total": 0}
