"""
WBA99 Report Logging Routes
Track all reports/PDFs generated, admin analytics, and device data sync
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import uuid
import logging

# Database import
from config import db

router = APIRouter(tags=["report-logging"])

logger = logging.getLogger(__name__)


# =============================================================================
# REPORT LOGGING SYSTEM - Track all reports/PDFs generated
# =============================================================================

@router.post("/reports/log")
async def log_report_generation(
    report_type: str,
    report_name: str,
    generated_by_id: str,
    generated_by_name: str,
    generated_by_role: str,
    organization_id: Optional[str] = None,
    organization_name: Optional[str] = None,
    patient_id: Optional[str] = None,
    patient_name: Optional[str] = None,
    analysis_data: Dict[str, Any] = {},
    payment_status: str = "paid",
    amount_paid: float = 0,
    credits_used: int = 0
):
    """Log when a report/PDF is generated"""
    report_log = {
        "id": str(uuid.uuid4()),
        "report_type": report_type,
        "report_name": report_name,
        "generated_by_id": generated_by_id,
        "generated_by_name": generated_by_name,
        "generated_by_role": generated_by_role,
        "organization_id": organization_id,
        "organization_name": organization_name,
        "patient_id": patient_id,
        "patient_name": patient_name,
        "analysis_data": analysis_data,
        "payment_status": payment_status,
        "amount_paid": amount_paid,
        "credits_used": credits_used,
        "pdf_generated": True,
        "created_at": datetime.utcnow(),
        "date_str": datetime.utcnow().strftime("%Y-%m-%d")
    }
    await db.report_logs.insert_one(report_log)
    return {"message": "Report logged", "id": report_log["id"]}


@router.get("/admin/reports")
async def get_all_reports(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    report_type: Optional[str] = None,
    role: Optional[str] = None,
    organization_id: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    """Get all report logs with filters - Admin only"""
    query = {}
    
    if start_date and end_date:
        query["date_str"] = {"$gte": start_date, "$lte": end_date}
    elif start_date:
        query["date_str"] = {"$gte": start_date}
    elif end_date:
        query["date_str"] = {"$lte": end_date}
    
    if report_type:
        query["report_type"] = report_type
    if role:
        query["generated_by_role"] = role
    if organization_id:
        query["organization_id"] = organization_id
    
    reports = await db.report_logs.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    total = await db.report_logs.count_documents(query)
    
    for report in reports:
        if "_id" in report:
            report["_id"] = str(report["_id"])
    
    return {"reports": reports, "total": total}


@router.get("/admin/reports/statistics")
async def get_report_statistics():
    """Get comprehensive report statistics for admin dashboard"""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
    week_ago = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d")
    month_ago = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")
    
    # Total counts
    total_reports = await db.report_logs.count_documents({})
    today_reports = await db.report_logs.count_documents({"date_str": today})
    yesterday_reports = await db.report_logs.count_documents({"date_str": yesterday})
    week_reports = await db.report_logs.count_documents({"date_str": {"$gte": week_ago}})
    month_reports = await db.report_logs.count_documents({"date_str": {"$gte": month_ago}})
    
    # By report type
    report_types = await db.report_logs.aggregate([
        {"$group": {"_id": "$report_type", "count": {"$sum": 1}}}
    ]).to_list(length=20)
    
    # By role
    by_role = await db.report_logs.aggregate([
        {"$group": {"_id": "$generated_by_role", "count": {"$sum": 1}}}
    ]).to_list(length=10)
    
    # By organization
    by_organization = await db.report_logs.aggregate([
        {"$match": {"organization_name": {"$ne": None}}},
        {"$group": {"_id": "$organization_name", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]).to_list(length=10)
    
    # Daily trend (last 7 days)
    daily_trend = await db.report_logs.aggregate([
        {"$match": {"date_str": {"$gte": week_ago}}},
        {"$group": {"_id": "$date_str", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]).to_list(length=10)
    
    # Top generators
    top_generators = await db.report_logs.aggregate([
        {"$group": {"_id": {"id": "$generated_by_id", "name": "$generated_by_name", "role": "$generated_by_role"}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]).to_list(length=10)
    
    # Revenue stats
    total_revenue = await db.report_logs.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$amount_paid"}}}
    ]).to_list(length=1)
    
    today_revenue = await db.report_logs.aggregate([
        {"$match": {"date_str": today}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_paid"}}}
    ]).to_list(length=1)
    
    return {
        "total_reports": total_reports,
        "today_reports": today_reports,
        "yesterday_reports": yesterday_reports,
        "week_reports": week_reports,
        "month_reports": month_reports,
        "by_type": {item["_id"]: item["count"] for item in report_types if item["_id"]},
        "by_role": {item["_id"]: item["count"] for item in by_role if item["_id"]},
        "by_organization": [{"name": item["_id"], "count": item["count"]} for item in by_organization],
        "daily_trend": [{"date": item["_id"], "count": item["count"]} for item in daily_trend],
        "top_generators": [{"id": item["_id"]["id"], "name": item["_id"]["name"], "role": item["_id"]["role"], "count": item["count"]} for item in top_generators],
        "total_revenue": total_revenue[0]["total"] if total_revenue else 0,
        "today_revenue": today_revenue[0]["total"] if today_revenue else 0
    }


@router.get("/admin/reports/by-physio")
async def get_reports_by_physio():
    """Get reports grouped by physio"""
    reports = await db.report_logs.aggregate([
        {"$match": {"generated_by_role": {"$in": ["physio", "org_physio"]}}},
        {"$group": {
            "_id": {"id": "$generated_by_id", "name": "$generated_by_name", "role": "$generated_by_role", "org": "$organization_name"},
            "total_reports": {"$sum": 1},
            "total_revenue": {"$sum": "$amount_paid"},
            "report_types": {"$addToSet": "$report_type"},
            "last_report": {"$max": "$created_at"}
        }},
        {"$sort": {"total_reports": -1}}
    ]).to_list(length=100)
    
    return [
        {
            "physio_id": r["_id"]["id"],
            "physio_name": r["_id"]["name"],
            "role": r["_id"]["role"],
            "organization": r["_id"]["org"],
            "total_reports": r["total_reports"],
            "total_revenue": r["total_revenue"],
            "report_types": r["report_types"],
            "last_report": r["last_report"]
        }
        for r in reports
    ]


@router.get("/admin/reports/by-organization")
async def get_reports_by_organization():
    """Get reports grouped by organization"""
    reports = await db.report_logs.aggregate([
        {"$match": {"organization_id": {"$ne": None}}},
        {"$group": {
            "_id": {"id": "$organization_id", "name": "$organization_name"},
            "total_reports": {"$sum": 1},
            "total_revenue": {"$sum": "$amount_paid"},
            "physios": {"$addToSet": "$generated_by_name"},
            "report_types": {"$addToSet": "$report_type"},
            "last_report": {"$max": "$created_at"}
        }},
        {"$sort": {"total_reports": -1}}
    ]).to_list(length=100)
    
    return [
        {
            "organization_id": r["_id"]["id"],
            "organization_name": r["_id"]["name"],
            "total_reports": r["total_reports"],
            "total_revenue": r["total_revenue"],
            "physio_count": len(r["physios"]),
            "physios": r["physios"],
            "report_types": r["report_types"],
            "last_report": r["last_report"]
        }
        for r in reports
    ]


# =============================================================================
# DEVICE DATA SYNC - Additional endpoints for receiving data from devices
# =============================================================================

@router.post("/admin/receive-assessment")
async def receive_assessment_from_device(
    id: str,
    type: str,
    data: dict,
    user_id: str,
    user_name: str,
    user_role: str,
    organization_id: Optional[str] = None,
    organization_name: Optional[str] = None,
    created_at: Optional[str] = None,
    updated_at: Optional[str] = None,
    source: str = "mobile_device"
):
    """Receive assessment data from mobile device"""
    doc = {
        "analysis_id": id,
        "type": type,
        "data": data,
        "user_id": user_id,
        "user_name": user_name,
        "user_role": user_role,
        "organization_id": organization_id,
        "organization_name": organization_name,
        "device_created_at": created_at,
        "device_updated_at": updated_at,
        "server_received_at": datetime.utcnow(),
        "source": source,
        "status": "received",
        "reviewed_by_admin": False,
        "analysis_type": "assessment"
    }
    
    existing = await db.device_analyses.find_one({"analysis_id": id})
    if existing:
        await db.device_analyses.update_one({"analysis_id": id}, {"$set": doc})
    else:
        await db.device_analyses.insert_one(doc)
    
    return {"message": "Assessment received", "id": id}


@router.post("/admin/receive-patient")
async def receive_patient_from_device(
    id: str,
    type: str,
    data: dict,
    user_id: str,
    user_name: str,
    user_role: str,
    organization_id: Optional[str] = None,
    organization_name: Optional[str] = None,
    created_at: Optional[str] = None,
    updated_at: Optional[str] = None,
    source: str = "mobile_device"
):
    """Receive patient data from mobile device"""
    doc = {
        "analysis_id": id,
        "type": type,
        "data": data,
        "user_id": user_id,
        "user_name": user_name,
        "user_role": user_role,
        "organization_id": organization_id,
        "organization_name": organization_name,
        "device_created_at": created_at,
        "device_updated_at": updated_at,
        "server_received_at": datetime.utcnow(),
        "source": source,
        "status": "received",
        "reviewed_by_admin": False,
        "analysis_type": "patient"
    }
    
    existing = await db.device_analyses.find_one({"analysis_id": id})
    if existing:
        await db.device_analyses.update_one({"analysis_id": id}, {"$set": doc})
    else:
        await db.device_analyses.insert_one(doc)
    
    return {"message": "Patient data received", "id": id}


@router.post("/admin/receive-report")
async def receive_report_from_device(
    id: str,
    type: str,
    data: dict,
    user_id: str,
    user_name: str,
    user_role: str,
    organization_id: Optional[str] = None,
    organization_name: Optional[str] = None,
    created_at: Optional[str] = None,
    updated_at: Optional[str] = None,
    source: str = "mobile_device"
):
    """Receive report data from mobile device"""
    doc = {
        "analysis_id": id,
        "type": type,
        "data": data,
        "user_id": user_id,
        "user_name": user_name,
        "user_role": user_role,
        "organization_id": organization_id,
        "organization_name": organization_name,
        "device_created_at": created_at,
        "device_updated_at": updated_at,
        "server_received_at": datetime.utcnow(),
        "source": source,
        "status": "received",
        "reviewed_by_admin": False,
        "analysis_type": "report"
    }
    
    existing = await db.device_analyses.find_one({"analysis_id": id})
    if existing:
        await db.device_analyses.update_one({"analysis_id": id}, {"$set": doc})
    else:
        await db.device_analyses.insert_one(doc)
    
    return {"message": "Report data received", "id": id}


@router.post("/admin/receive-generic")
async def receive_generic_from_device(
    id: str,
    type: str,
    data: dict,
    user_id: str,
    user_name: str,
    user_role: str,
    organization_id: Optional[str] = None,
    organization_name: Optional[str] = None,
    created_at: Optional[str] = None,
    updated_at: Optional[str] = None,
    source: str = "mobile_device"
):
    """Receive generic data from mobile device - catch-all endpoint"""
    doc = {
        "analysis_id": id,
        "type": type,
        "data": data,
        "user_id": user_id,
        "user_name": user_name,
        "user_role": user_role,
        "organization_id": organization_id,
        "organization_name": organization_name,
        "device_created_at": created_at,
        "device_updated_at": updated_at,
        "server_received_at": datetime.utcnow(),
        "source": source,
        "status": "received",
        "reviewed_by_admin": False,
        "analysis_type": type
    }
    
    existing = await db.device_analyses.find_one({"analysis_id": id})
    if existing:
        await db.device_analyses.update_one({"analysis_id": id}, {"$set": doc})
    else:
        await db.device_analyses.insert_one(doc)
    
    return {"message": f"{type} data received", "id": id}


# =============================================================================
# ADMIN SYNC STATUS
# =============================================================================

@router.get("/admin/sync-status")
async def get_sync_status():
    """Get overall sync status from all devices"""
    total_synced = await db.device_analyses.count_documents({})
    today = datetime.utcnow().strftime("%Y-%m-%d")
    
    today_synced = await db.device_analyses.count_documents({
        "server_received_at": {"$gte": datetime.strptime(today, "%Y-%m-%d")}
    })
    
    pending_review = await db.device_analyses.count_documents({"reviewed_by_admin": False})
    reviewed = await db.device_analyses.count_documents({"reviewed_by_admin": True})
    
    # By type
    by_type = await db.device_analyses.aggregate([
        {"$group": {"_id": "$analysis_type", "count": {"$sum": 1}}}
    ]).to_list(length=20)
    
    # By source
    by_source = await db.device_analyses.aggregate([
        {"$group": {"_id": "$source", "count": {"$sum": 1}}}
    ]).to_list(length=10)
    
    return {
        "total_synced": total_synced,
        "today_synced": today_synced,
        "pending_review": pending_review,
        "reviewed": reviewed,
        "by_type": {item["_id"]: item["count"] for item in by_type if item["_id"]},
        "by_source": {item["_id"]: item["count"] for item in by_source if item["_id"]}
    }
