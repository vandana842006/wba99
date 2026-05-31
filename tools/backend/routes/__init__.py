"""
WBA99 MSK Analysis - Routes Package
Modular API route organization

This package contains all API routes organized by feature.
Routes are registered with the main FastAPI app via include_router.

Usage in server.py:
    from routes import register_routes
    register_routes(app)
"""

from fastapi import FastAPI, APIRouter


def create_api_router() -> APIRouter:
    """
    Create the main API router with /api prefix.
    
    Note: This is prepared for future migration.
    Currently server.py uses its own api_router.
    """
    api_router = APIRouter(prefix="/api")
    
    # Import and include route modules
    from .health import router as health_router
    api_router.include_router(health_router)
    
    from .users import router as users_router
    api_router.include_router(users_router)
    
    from .assessments import router as assessments_router
    api_router.include_router(assessments_router)
    
    from .payments import router as payments_router
    api_router.include_router(payments_router)
    
    from .organizations import router as organizations_router
    api_router.include_router(organizations_router)
    
    from .ai_analysis import router as ai_analysis_router
    api_router.include_router(ai_analysis_router)
    
    from .reports import router as reports_router
    api_router.include_router(reports_router)
    
    from .exercises import router as exercises_router
    api_router.include_router(exercises_router)
    
    from .analytics import router as analytics_router
    api_router.include_router(analytics_router)
    
    from .admin import router as admin_router
    api_router.include_router(admin_router)
    
    from .video_analysis import router as video_analysis_router
    api_router.include_router(video_analysis_router)
    
    from .health_metrics import router as health_metrics_router
    api_router.include_router(health_metrics_router)
    
    from .movement_analysis import router as movement_analysis_router
    api_router.include_router(movement_analysis_router)
    
    from .athlete_monitoring import router as athlete_monitoring_router
    api_router.include_router(athlete_monitoring_router)
    
    from .learning import router as learning_router
    api_router.include_router(learning_router)
    
    from .research import router as research_router
    api_router.include_router(research_router)
    
    from .scheduling import router as scheduling_router
    api_router.include_router(scheduling_router)
    
    from .clinical_analysis import router as clinical_analysis_router
    api_router.include_router(clinical_analysis_router)
    
    from .report_logging import router as report_logging_router
    api_router.include_router(report_logging_router)
    
    from .data_hub import router as data_hub_router
    api_router.include_router(data_hub_router)
    
    from .research_publications import router as research_publications_router
    api_router.include_router(research_publications_router)
    
    return api_router


def register_routes(app: FastAPI) -> None:
    """
    Register all API routes with the FastAPI application.
    
    This function will be called from server.py once route
    migration is complete.
    """
    api_router = create_api_router()
    app.include_router(api_router)


# Export for use in server.py
__all__ = ['create_api_router', 'register_routes']
