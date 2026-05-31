"""
WBA99 MSK Analysis - PDF Service
Centralized PDF/HTML report generation service
"""

import os
import uuid
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)


# ============================================================
# HTML TEMPLATE COMPONENTS
# ============================================================

def get_report_header(
    title: str,
    patient_name: str,
    assessment_date: str,
    physio_name: Optional[str] = None,
    clinic_name: str = "WBA99 Sports Physiotherapy",
    logo_url: Optional[str] = None,
    category_color: str = "#00BCD4"
) -> str:
    """Generate HTML header for PDF reports"""
    
    logo_html = ""
    if logo_url:
        logo_html = f'<img src="{logo_url}" alt="Logo" style="max-height: 60px; max-width: 150px;" />'
    else:
        logo_html = f'''
        <div style="background: linear-gradient(135deg, {category_color}, {category_color}80); 
                    padding: 10px 20px; border-radius: 8px; color: white; font-weight: bold; font-size: 18px;">
            WBA99
        </div>
        '''
    
    return f'''
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            @page {{
                size: A4;
                margin: 15mm;
            }}
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
                background: #fff;
            }}
            .header {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-bottom: 15px;
                border-bottom: 3px solid {category_color};
                margin-bottom: 20px;
            }}
            .report-title {{
                font-size: 24px;
                font-weight: bold;
                color: {category_color};
                margin: 0;
            }}
            .patient-info {{
                background: linear-gradient(135deg, #f8f9fa, #fff);
                border-radius: 12px;
                padding: 15px;
                margin-bottom: 20px;
                border-left: 4px solid {category_color};
            }}
            .section {{
                margin-bottom: 20px;
                page-break-inside: avoid;
            }}
            .section-title {{
                font-size: 16px;
                font-weight: bold;
                color: {category_color};
                margin-bottom: 10px;
                padding-bottom: 5px;
                border-bottom: 2px solid {category_color}30;
            }}
            .finding-card {{
                background: #f8f9fa;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 10px;
            }}
            .score-badge {{
                display: inline-block;
                padding: 4px 12px;
                border-radius: 20px;
                font-weight: bold;
                font-size: 12px;
            }}
            .score-good {{ background: #d4edda; color: #155724; }}
            .score-moderate {{ background: #fff3cd; color: #856404; }}
            .score-poor {{ background: #f8d7da; color: #721c24; }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin: 10px 0;
            }}
            th, td {{
                padding: 8px 12px;
                text-align: left;
                border-bottom: 1px solid #ddd;
            }}
            th {{
                background: {category_color}15;
                font-weight: 600;
                color: #333;
            }}
            .footer {{
                margin-top: 30px;
                padding-top: 15px;
                border-top: 2px solid #eee;
                font-size: 10px;
                color: #666;
                text-align: center;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <div>
                {logo_html}
                <div style="font-size: 12px; color: #666; margin-top: 5px;">{clinic_name}</div>
            </div>
            <div style="text-align: right;">
                <div class="report-title">{title}</div>
                <div style="font-size: 12px; color: #666; margin-top: 5px;">
                    Generated: {assessment_date}
                </div>
            </div>
        </div>
        
        <div class="patient-info">
            <div style="display: flex; justify-content: space-between;">
                <div>
                    <strong>Patient:</strong> {patient_name}
                </div>
                <div>
                    <strong>Assessed by:</strong> {physio_name or 'WBA99 System'}
                </div>
            </div>
        </div>
    '''


def get_report_footer(
    report_id: str,
    category_color: str = "#00BCD4"
) -> str:
    """Generate HTML footer for PDF reports"""
    return f'''
        <div class="footer">
            <div style="margin-bottom: 10px;">
                <strong>Report ID:</strong> {report_id}
            </div>
            <div>
                This report was generated by WBA99 MSK Analysis System. 
                For questions or follow-up, please contact your healthcare provider.
            </div>
            <div style="margin-top: 10px; color: #999;">
                © {datetime.now().year} WBA99 Sports Physiotherapy | www.wba99.com
            </div>
        </div>
    </body>
    </html>
    '''


def get_payment_section_html(category_color: str = '#00BCD4') -> str:
    """Generate payment QR code and account details section for PDF reports"""
    return f"""
    <!-- Payment Section with QR -->
    <div style="margin-top: 25px; page-break-inside: avoid;">
        <div style="background: linear-gradient(135deg, #fff, #f5f5f5); border-radius: 12px; padding: 20px; border: 2px dashed {category_color};">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1;">
                    <div style="font-size: 16px; font-weight: bold; color: #333; margin-bottom: 12px;">
                        💳 Payment Information
                    </div>
                    <div style="font-size: 11px; color: #666; margin-bottom: 15px;">
                        For online payment, scan the QR code or use the details below.
                    </div>
                    
                    <!-- UPI Section -->
                    <div style="background: linear-gradient(135deg, #e8f5e9, #f1f8e9); border-radius: 8px; padding: 12px; margin-bottom: 10px; border-left: 4px solid #4CAF50;">
                        <div style="font-size: 10px; color: #666; margin-bottom: 4px;">UPI ID (Recommended)</div>
                        <div style="font-size: 14px; font-weight: bold; color: #2e7d32;">wba99clinic@paytm</div>
                    </div>
                    
                    <!-- Bank Details -->
                    <div style="background: #f5f5f5; border-radius: 8px; padding: 12px;">
                        <div style="font-size: 10px; color: #666; margin-bottom: 6px; font-weight: bold;">Bank Transfer Details</div>
                        <table style="font-size: 11px; color: #333; width: 100%;">
                            <tr><td style="padding: 2px 0; color: #666;">Account Holder:</td><td style="font-weight: bold;">WBA99 Physiotherapy Clinic</td></tr>
                            <tr><td style="padding: 2px 0; color: #666;">Account No:</td><td style="font-weight: bold;">XXXX XXXX XXXX 1234</td></tr>
                            <tr><td style="padding: 2px 0; color: #666;">IFSC Code:</td><td style="font-weight: bold;">SBIN0001234</td></tr>
                            <tr><td style="padding: 2px 0; color: #666;">Bank:</td><td style="font-weight: bold;">State Bank of India</td></tr>
                        </table>
                    </div>
                </div>
                
                <!-- QR Code Placeholder -->
                <div style="text-align: center; margin-left: 20px;">
                    <div style="width: 120px; height: 120px; background: #fff; border: 2px solid #333; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                        <div style="text-align: center; color: #666; font-size: 10px;">
                            [QR Code]<br/>Scan to Pay
                        </div>
                    </div>
                    <div style="font-size: 10px; color: #666; font-weight: bold;">UPI / GPay / PhonePe</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Contact Section -->
    <div style="margin-top: 15px; background: linear-gradient(135deg, {category_color}10, {category_color}05); border-radius: 12px; padding: 15px; border: 1px solid {category_color}30;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="font-size: 14px; font-weight: bold; color: {category_color};">📞 Need Help? Contact Us</div>
                <div style="font-size: 11px; color: #666; margin-top: 5px;">Phone: +91 98765 43210 | Email: support@wba99.com</div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 10px; color: #666;">Follow-up Appointment</div>
                <div style="font-size: 12px; font-weight: bold; color: #333;">Book via WBA99 App</div>
            </div>
        </div>
    </div>
    """


# ============================================================
# SCORE FORMATTING UTILITIES
# ============================================================

def get_score_badge_class(percentage: float) -> str:
    """Get CSS class based on score percentage"""
    if percentage >= 80:
        return "score-good"
    elif percentage >= 50:
        return "score-moderate"
    else:
        return "score-poor"


def get_score_color(value: float, max_value: float = 10) -> str:
    """Get color based on score value"""
    percentage = (value / max_value) * 100 if max_value > 0 else 0
    if percentage >= 80:
        return "#4CAF50"  # Green
    elif percentage >= 60:
        return "#8BC34A"  # Light Green
    elif percentage >= 40:
        return "#FFC107"  # Yellow
    elif percentage >= 20:
        return "#FF9800"  # Orange
    else:
        return "#F44336"  # Red


def format_score_display(score: float, max_score: float, percentage: float) -> str:
    """Format score for display in reports"""
    badge_class = get_score_badge_class(percentage)
    return f'''
    <div style="display: flex; align-items: center; gap: 10px;">
        <span class="score-badge {badge_class}">{score:.1f} / {max_score:.1f}</span>
        <span style="font-size: 14px; font-weight: bold;">({percentage:.1f}%)</span>
    </div>
    '''


# ============================================================
# ASSESSMENT-SPECIFIC REPORT GENERATORS
# ============================================================

def generate_posture_report_html(
    patient_name: str,
    physio_name: str,
    assessment_data: Dict[str, Any],
    ai_analysis: Optional[str] = None,
    score: float = 0,
    percentage: float = 0,
    logo_url: Optional[str] = None
) -> str:
    """Generate HTML for posture assessment report"""
    
    report_id = f"POST-{uuid.uuid4().hex[:8].upper()}"
    category_color = "#00BCD4"
    
    # Build findings section
    findings_html = ""
    if assessment_data.get("findings"):
        for finding in assessment_data.get("findings", []):
            findings_html += f'''
            <div class="finding-card">
                <strong>{finding.get("area", "General")}:</strong> {finding.get("description", "N/A")}
            </div>
            '''
    
    # Build measurements table
    measurements_html = ""
    if assessment_data.get("measurements"):
        measurements_html = "<table><tr><th>Parameter</th><th>Value</th><th>Normal Range</th><th>Status</th></tr>"
        for m in assessment_data.get("measurements", []):
            status_color = get_score_color(m.get("score", 5))
            measurements_html += f'''
            <tr>
                <td>{m.get("name", "N/A")}</td>
                <td>{m.get("value", "N/A")}</td>
                <td>{m.get("normal", "N/A")}</td>
                <td style="color: {status_color}; font-weight: bold;">{m.get("status", "N/A")}</td>
            </tr>
            '''
        measurements_html += "</table>"
    
    # AI Analysis section
    ai_section = ""
    if ai_analysis:
        ai_section = f'''
        <div class="section">
            <div class="section-title">🤖 AI Clinical Analysis</div>
            <div style="background: linear-gradient(135deg, #e3f2fd, #fff); border-radius: 8px; padding: 15px; border-left: 4px solid #2196F3;">
                {ai_analysis}
            </div>
        </div>
        '''
    
    html = get_report_header(
        title="Posture Assessment Report",
        patient_name=patient_name,
        assessment_date=datetime.now().strftime("%B %d, %Y"),
        physio_name=physio_name,
        logo_url=logo_url,
        category_color=category_color
    )
    
    html += f'''
        <!-- Score Summary -->
        <div class="section">
            <div class="section-title">📊 Overall Score</div>
            {format_score_display(score, 100, percentage)}
        </div>
        
        <!-- Findings -->
        <div class="section">
            <div class="section-title">🔍 Key Findings</div>
            {findings_html if findings_html else '<p>No specific findings recorded.</p>'}
        </div>
        
        <!-- Measurements -->
        {f'<div class="section"><div class="section-title">📐 Measurements</div>{measurements_html}</div>' if measurements_html else ''}
        
        <!-- AI Analysis -->
        {ai_section}
        
        <!-- Payment Section -->
        {get_payment_section_html(category_color)}
    '''
    
    html += get_report_footer(report_id, category_color)
    
    return html


def generate_fms_report_html(
    patient_name: str,
    physio_name: str,
    tests: List[Dict[str, Any]],
    total_score: int,
    ai_analysis: Optional[str] = None,
    logo_url: Optional[str] = None
) -> str:
    """Generate HTML for FMS assessment report"""
    
    report_id = f"FMS-{uuid.uuid4().hex[:8].upper()}"
    category_color = "#9C27B0"
    max_score = 21
    percentage = (total_score / max_score) * 100
    
    # Build tests table
    tests_html = "<table><tr><th>Test</th><th>Score</th><th>Notes</th></tr>"
    for test in tests:
        score_color = get_score_color(test.get("score", 0), 3)
        tests_html += f'''
        <tr>
            <td>{test.get("name", "N/A")}</td>
            <td style="color: {score_color}; font-weight: bold; text-align: center;">{test.get("score", 0)}/3</td>
            <td>{test.get("notes", "-")}</td>
        </tr>
        '''
    tests_html += "</table>"
    
    # AI Analysis section
    ai_section = ""
    if ai_analysis:
        ai_section = f'''
        <div class="section">
            <div class="section-title">🤖 AI Movement Analysis</div>
            <div style="background: linear-gradient(135deg, #f3e5f5, #fff); border-radius: 8px; padding: 15px; border-left: 4px solid {category_color};">
                {ai_analysis}
            </div>
        </div>
        '''
    
    html = get_report_header(
        title="Functional Movement Screen Report",
        patient_name=patient_name,
        assessment_date=datetime.now().strftime("%B %d, %Y"),
        physio_name=physio_name,
        logo_url=logo_url,
        category_color=category_color
    )
    
    html += f'''
        <!-- Score Summary -->
        <div class="section">
            <div class="section-title">📊 FMS Score</div>
            {format_score_display(total_score, max_score, percentage)}
            <p style="margin-top: 10px; font-size: 12px; color: #666;">
                Score ≥14: Low injury risk | Score 11-13: Moderate risk | Score ≤10: High injury risk
            </p>
        </div>
        
        <!-- Tests Results -->
        <div class="section">
            <div class="section-title">📋 Test Results</div>
            {tests_html}
        </div>
        
        <!-- AI Analysis -->
        {ai_section}
        
        <!-- Payment Section -->
        {get_payment_section_html(category_color)}
    '''
    
    html += get_report_footer(report_id, category_color)
    
    return html


def generate_rom_report_html(
    patient_name: str,
    physio_name: str,
    joint_data: Dict[str, Any],
    ai_analysis: Optional[str] = None,
    logo_url: Optional[str] = None
) -> str:
    """Generate HTML for ROM (Range of Motion) assessment report"""
    
    report_id = f"ROM-{uuid.uuid4().hex[:8].upper()}"
    category_color = "#FF5722"
    
    # Build joints table
    joints_html = "<table><tr><th>Joint</th><th>Movement</th><th>Measured</th><th>Normal</th><th>Deficit</th></tr>"
    
    for joint_name, movements in joint_data.items():
        if isinstance(movements, dict):
            for movement, values in movements.items():
                if isinstance(values, dict):
                    measured = values.get("measured", "-")
                    normal = values.get("normal", "-")
                    deficit = values.get("deficit", 0)
                    deficit_color = "#4CAF50" if deficit <= 10 else "#FF9800" if deficit <= 20 else "#F44336"
                    
                    joints_html += f'''
                    <tr>
                        <td>{joint_name.replace("_", " ").title()}</td>
                        <td>{movement.replace("_", " ").title()}</td>
                        <td>{measured}°</td>
                        <td>{normal}°</td>
                        <td style="color: {deficit_color}; font-weight: bold;">{deficit}°</td>
                    </tr>
                    '''
    
    joints_html += "</table>"
    
    html = get_report_header(
        title="Range of Motion Assessment",
        patient_name=patient_name,
        assessment_date=datetime.now().strftime("%B %d, %Y"),
        physio_name=physio_name,
        logo_url=logo_url,
        category_color=category_color
    )
    
    # AI Analysis section
    ai_section = ""
    if ai_analysis:
        ai_section = f'''
        <div class="section">
            <div class="section-title">🤖 AI Analysis</div>
            <div style="background: linear-gradient(135deg, #fbe9e7, #fff); border-radius: 8px; padding: 15px; border-left: 4px solid {category_color};">
                {ai_analysis}
            </div>
        </div>
        '''
    
    html += f'''
        <!-- ROM Measurements -->
        <div class="section">
            <div class="section-title">📐 Joint Measurements</div>
            {joints_html}
        </div>
        
        <!-- AI Analysis -->
        {ai_section}
        
        <!-- Payment Section -->
        {get_payment_section_html(category_color)}
    '''
    
    html += get_report_footer(report_id, category_color)
    
    return html


# ============================================================
# GENERIC REPORT GENERATOR
# ============================================================

def generate_assessment_report_html(
    assessment_type: str,
    patient_name: str,
    physio_name: str,
    assessment_data: Dict[str, Any],
    score: float = 0,
    max_score: float = 100,
    percentage: float = 0,
    ai_analysis: Optional[str] = None,
    recommendations: Optional[List[str]] = None,
    logo_url: Optional[str] = None
) -> str:
    """Generate HTML for generic assessment report"""
    
    # Map assessment types to colors
    type_colors = {
        "posture": "#00BCD4",
        "walking": "#4CAF50",
        "running": "#FF5722",
        "msk": "#9C27B0",
        "fms": "#673AB7",
        "gait": "#2196F3",
        "rom": "#FF9800",
        "sports": "#E91E63",
    }
    
    category_color = type_colors.get(assessment_type.lower(), "#00BCD4")
    report_id = f"{assessment_type[:3].upper()}-{uuid.uuid4().hex[:8].upper()}"
    
    # Build recommendations list
    recommendations_html = ""
    if recommendations:
        recommendations_html = "<ul style='margin: 0; padding-left: 20px;'>"
        for rec in recommendations:
            recommendations_html += f"<li style='margin-bottom: 8px;'>{rec}</li>"
        recommendations_html += "</ul>"
    
    # AI Analysis section
    ai_section = ""
    if ai_analysis:
        ai_section = f'''
        <div class="section">
            <div class="section-title">🤖 AI Clinical Analysis</div>
            <div style="background: linear-gradient(135deg, #e8f5e9, #fff); border-radius: 8px; padding: 15px; border-left: 4px solid #4CAF50;">
                {ai_analysis}
            </div>
        </div>
        '''
    
    html = get_report_header(
        title=f"{assessment_type.title()} Assessment Report",
        patient_name=patient_name,
        assessment_date=datetime.now().strftime("%B %d, %Y"),
        physio_name=physio_name,
        logo_url=logo_url,
        category_color=category_color
    )
    
    html += f'''
        <!-- Score Summary -->
        <div class="section">
            <div class="section-title">📊 Assessment Score</div>
            {format_score_display(score, max_score, percentage)}
        </div>
        
        <!-- AI Analysis -->
        {ai_section}
        
        <!-- Recommendations -->
        {f'<div class="section"><div class="section-title">💡 Recommendations</div>{recommendations_html}</div>' if recommendations_html else ''}
        
        <!-- Payment Section -->
        {get_payment_section_html(category_color)}
    '''
    
    html += get_report_footer(report_id, category_color)
    
    return html
