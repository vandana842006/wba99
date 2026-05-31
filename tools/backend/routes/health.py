"""
WBA99 MSK Analysis - Health & Status Routes
Basic health check and status endpoints
"""

from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/")
async def api_root():
    """API root endpoint"""
    return {"message": "WBA99 MSK Analysis API", "version": "2.0"}


@router.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    from config import db
    try:
        # Check MongoDB connection
        await db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}


@router.get("/status")
async def app_status():
    """Detailed application status"""
    from config import db, EMERGENT_LLM_KEY
    
    status = {
        "app": "WBA99 MSK Analysis",
        "version": "2.0",
        "api_prefix": "/api",
        "features": {
            "ai_analysis": bool(EMERGENT_LLM_KEY),
            "pdf_reports": True,
            "video_analysis": True,
            "research_engine": True,
        }
    }
    
    try:
        await db.command("ping")
        status["database"] = "connected"
    except:
        status["database"] = "disconnected"
    
    return status
