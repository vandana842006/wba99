"""
WBA99 MSK Analysis - Services Package
Business logic and external service integrations

This package contains reusable business logic separated from routes.
Services handle complex operations like AI analysis, PDF generation, etc.
"""

# AI Service imports
from .ai_service import (
    generate_ai_analysis,
    generate_ai_analysis_with_image,
    generate_comprehensive_ai_report,
    generate_rom_ai_analysis,
    generate_rehab_program_ai,
    is_ai_available,
    get_ai_status,
    SYSTEM_PROMPTS,
)

# PDF Service imports
from .pdf_service import (
    get_report_header,
    get_report_footer,
    get_payment_section_html,
    get_score_badge_class,
    get_score_color,
    format_score_display,
    generate_posture_report_html,
    generate_fms_report_html,
    generate_rom_report_html,
    generate_assessment_report_html,
)

__all__ = [
    # AI Service
    'generate_ai_analysis',
    'generate_ai_analysis_with_image',
    'generate_comprehensive_ai_report',
    'generate_rom_ai_analysis',
    'generate_rehab_program_ai',
    'is_ai_available',
    'get_ai_status',
    'SYSTEM_PROMPTS',
    # PDF Service
    'get_report_header',
    'get_report_footer',
    'get_payment_section_html',
    'get_score_badge_class',
    'get_score_color',
    'format_score_display',
    'generate_posture_report_html',
    'generate_fms_report_html',
    'generate_rom_report_html',
    'generate_assessment_report_html',
]
