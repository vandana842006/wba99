"""
WBA99 MSK Analysis - AI Service
Centralized AI/LLM integration service using Emergent LLM
"""

import os
import uuid
import logging
from typing import Dict, Any, Optional, List

# Import Emergent LLM
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
    HAS_EMERGENT = True
except ImportError:
    HAS_EMERGENT = False
    logging.warning("emergentintegrations not installed - AI features will be limited")

logger = logging.getLogger(__name__)

# Get LLM key from environment
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')


# ============================================================
# SYSTEM PROMPTS FOR DIFFERENT ANALYSIS TYPES
# ============================================================

SYSTEM_PROMPTS = {
    "fms": """You are an expert Functional Movement Screen (FMS) analyst. Analyze the provided FMS test scores and provide:
1. Overall movement quality assessment
2. Specific movement dysfunctions identified
3. Injury risk assessment
4. Corrective exercise recommendations
5. Training modifications needed
Be specific and actionable in your recommendations.""",
    
    "sports": """You are an expert sports biomechanics analyst. Analyze the provided sports performance data and provide:
1. Technical assessment of movement patterns
2. Efficiency analysis
3. Power generation evaluation
4. Injury risk factors
5. Specific drills for improvement
6. Performance optimization recommendations""",
    
    "yoga": """You are an expert yoga instructor and alignment specialist. Analyze the provided yoga pose data and provide:
1. Alignment assessment for each body segment
2. Balance and stability evaluation
3. Areas needing correction
4. Modifications for the practitioner's level
5. Breathing and engagement cues
6. Progression recommendations""",
    
    "athlete": """You are an expert sports scientist specializing in athlete monitoring and load management. Analyze the provided training data and provide:
1. Current training load assessment
2. Recovery status evaluation
3. Injury risk based on ACWR
4. Training recommendations for the next period
5. Recovery protocols if needed
6. Performance readiness score""",

    "posture": """You are an expert biomechanist and physiotherapist specializing in postural analysis. Analyze the provided posture assessment data and provide a comprehensive biomechanical report including:

1. **Plumbline Analysis**:
   - Anterior view: Assess symmetry relative to vertical plumbline through nose, sternum, umbilicus, and between feet
   - Lateral view: Assess alignment of ear, shoulder, hip, knee, and ankle relative to plumbline
   - Posterior view: Assess spinal alignment, scapular position, and pelvic symmetry

2. **Angular Measurements Analysis**:
   - Cervical lordosis angle
   - Thoracic kyphosis angle  
   - Lumbar lordosis angle
   - Pelvic tilt angle
   - Knee flexion/hyperextension angle
   - Ankle dorsiflexion angle

3. **Segmental Assessment**:
   - Head position (forward head posture in cm)
   - Shoulder position (protraction/retraction, elevation/depression)
   - Scapular position (winging, tilting)
   - Spinal curves (hyperlordosis, hyperkyphosis, scoliosis)
   - Pelvic alignment (anterior/posterior tilt, lateral tilt, rotation)
   - Lower extremity alignment (genu valgum/varum, tibial torsion)

4. **Muscle Imbalance Assessment**:
   - Identify shortened muscles
   - Identify lengthened/weakened muscles
   - Upper crossed syndrome indicators
   - Lower crossed syndrome indicators

5. **Functional Implications**:
   - Movement compensations expected
   - Injury risk areas
   - Performance limitations

6. **Corrective Exercise Prescription**:
   - Stretching exercises (specific muscles)
   - Strengthening exercises (specific muscles)
   - Neuromuscular re-education
   - Postural awareness drills

Provide specific measurements, clinical findings, and evidence-based recommendations.""",

    "gait": """You are an expert gait analysis specialist. Analyze the provided gait data and provide:
1. Gait cycle analysis (stance/swing phases)
2. Kinematic assessment (joint angles)
3. Kinetic assessment (ground reaction forces)
4. Spatiotemporal parameters
5. Deviations from normal gait
6. Clinical recommendations""",

    "msk": """You are an expert musculoskeletal screening specialist. Analyze the provided MSK screening data and provide:
1. Movement quality assessment
2. Range of motion analysis
3. Strength assessment
4. Stability evaluation
5. Injury risk identification
6. Corrective recommendations""",

    "rehab": """You are an expert rehabilitation specialist. Based on the provided condition and patient information, create a comprehensive rehabilitation program including:
1. Phase-based exercise progression
2. Specific exercises with sets/reps/hold times
3. Precautions and contraindications
4. Expected recovery timeline
5. Criteria for progression
6. Home exercise program""",

    "comprehensive_report": """You are a clinical physiotherapy report writer. Generate professional sections for a comprehensive assessment report. Include:
1. Executive Summary (2-3 sentences)
2. Key Findings (bullet points)
3. Clinical Interpretation
4. Risk Assessment
5. Treatment Recommendations
6. Prognosis

Use professional medical terminology while being clear and actionable.""",

    "rom_analysis": """You are an expert in range of motion assessment and goniometry. Analyze the provided ROM data and generate:
1. Summary of ROM findings
2. Comparison to normal values
3. Functional limitations
4. Possible causes of restrictions
5. Treatment recommendations
6. Expected outcomes""",
}


# ============================================================
# CORE AI ANALYSIS FUNCTIONS
# ============================================================

async def generate_ai_analysis(analysis_type: str, data: Dict[str, Any]) -> str:
    """
    Generate AI analysis using Emergent LLM
    
    Args:
        analysis_type: Type of analysis (fms, posture, sports, etc.)
        data: Dictionary containing the data to analyze
    
    Returns:
        AI-generated analysis text
    """
    if not EMERGENT_LLM_KEY:
        return "AI analysis unavailable - API key not configured"
    
    if not HAS_EMERGENT:
        return "AI analysis unavailable - emergentintegrations library not installed"
    
    system_prompt = SYSTEM_PROMPTS.get(analysis_type, SYSTEM_PROMPTS["athlete"])
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"analysis-{uuid.uuid4()}",
            system_message=system_prompt
        ).with_model("openai", "gpt-4.1")
        
        user_message = UserMessage(
            text=f"Analyze the following data and provide detailed recommendations:\n\n{str(data)}"
        )
        response = await chat.send_message(user_message)
        return response
    except Exception as e:
        logger.error(f"AI analysis error: {e}")
        return f"AI analysis error: {str(e)}"


async def generate_ai_analysis_with_image(
    analysis_type: str, 
    data: Dict[str, Any], 
    image_base64: Optional[str] = None,
    image_mime_type: str = "image/jpeg"
) -> str:
    """
    Generate AI analysis with optional image input
    
    Args:
        analysis_type: Type of analysis
        data: Dictionary containing the data to analyze
        image_base64: Optional base64-encoded image
        image_mime_type: MIME type of the image
    
    Returns:
        AI-generated analysis text
    """
    if not EMERGENT_LLM_KEY:
        return "AI analysis unavailable - API key not configured"
    
    if not HAS_EMERGENT:
        return "AI analysis unavailable - emergentintegrations library not installed"
    
    system_prompt = SYSTEM_PROMPTS.get(analysis_type, SYSTEM_PROMPTS["posture"])
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"analysis-{uuid.uuid4()}",
            system_message=system_prompt
        ).with_model("openai", "gpt-4.1")
        
        if image_base64:
            # Use vision capabilities
            file_content = FileContentWithMimeType(
                content=image_base64,
                mime_type=image_mime_type
            )
            user_message = UserMessage(
                text=f"Analyze the following image and data:\n\n{str(data)}",
                file_content=file_content
            )
        else:
            user_message = UserMessage(
                text=f"Analyze the following data and provide detailed recommendations:\n\n{str(data)}"
            )
        
        response = await chat.send_message(user_message)
        return response
    except Exception as e:
        logger.error(f"AI analysis with image error: {e}")
        return f"AI analysis error: {str(e)}"


async def generate_comprehensive_ai_report(
    assessment_type: str, 
    data: Dict[str, Any]
) -> Dict[str, str]:
    """
    Generate comprehensive AI-powered report sections
    
    Args:
        assessment_type: Type of assessment
        data: Assessment data
    
    Returns:
        Dictionary with different report sections
    """
    if not EMERGENT_LLM_KEY:
        return {
            "summary": "AI report generation unavailable - API key not configured",
            "findings": "",
            "recommendations": "",
            "clinical_notes": ""
        }
    
    if not HAS_EMERGENT:
        return {
            "summary": "AI report generation unavailable",
            "findings": "",
            "recommendations": "",
            "clinical_notes": ""
        }
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"report-{uuid.uuid4()}",
            system_message=SYSTEM_PROMPTS["comprehensive_report"]
        ).with_model("openai", "gpt-4.1")
        
        prompt = f"""Generate a comprehensive clinical report for a {assessment_type} assessment.

Assessment Data:
{str(data)}

Please provide the following sections in a structured format:
1. EXECUTIVE SUMMARY: (2-3 sentence overview)
2. KEY FINDINGS: (bullet points)
3. CLINICAL INTERPRETATION: (detailed analysis)
4. RISK ASSESSMENT: (injury/health risks identified)
5. TREATMENT RECOMMENDATIONS: (specific actionable items)
6. PROGNOSIS: (expected outcomes with treatment)

Use professional medical terminology while being clear and actionable."""

        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse the response into sections
        sections = parse_report_sections(response)
        return sections
        
    except Exception as e:
        logger.error(f"Comprehensive report error: {e}")
        return {
            "summary": f"Report generation error: {str(e)}",
            "findings": "",
            "recommendations": "",
            "clinical_notes": ""
        }


async def generate_rom_ai_analysis(assessment_data: Dict[str, Any]) -> Dict[str, str]:
    """
    Generate AI analysis for Range of Motion assessment
    
    Args:
        assessment_data: ROM measurement data
    
    Returns:
        Dictionary with analysis sections
    """
    if not EMERGENT_LLM_KEY:
        return {
            "summary": "AI analysis unavailable",
            "comparison": "",
            "recommendations": "",
            "prognosis": ""
        }
    
    if not HAS_EMERGENT:
        return {
            "summary": "AI analysis unavailable",
            "comparison": "",
            "recommendations": "",
            "prognosis": ""
        }
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"rom-{uuid.uuid4()}",
            system_message=SYSTEM_PROMPTS["rom_analysis"]
        ).with_model("openai", "gpt-4.1")
        
        prompt = f"""Analyze this Range of Motion assessment data:

{str(assessment_data)}

Provide:
1. SUMMARY: Overview of ROM findings
2. COMPARISON: Comparison to normal values
3. FUNCTIONAL IMPACT: How limitations affect daily activities
4. RECOMMENDATIONS: Treatment recommendations
5. PROGNOSIS: Expected outcomes"""

        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        sections = parse_report_sections(response)
        return sections
        
    except Exception as e:
        logger.error(f"ROM AI analysis error: {e}")
        return {
            "summary": f"Analysis error: {str(e)}",
            "comparison": "",
            "recommendations": "",
            "prognosis": ""
        }


async def generate_rehab_program_ai(
    condition: str,
    body_part: str,
    patient_info: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Generate AI-powered rehabilitation program
    
    Args:
        condition: Medical condition/diagnosis
        body_part: Affected body part
        patient_info: Optional patient context
    
    Returns:
        Dictionary with rehab program details
    """
    if not EMERGENT_LLM_KEY or not HAS_EMERGENT:
        return {
            "exercises": [],
            "frequency": "As prescribed",
            "duration": "4-6 weeks",
            "precautions": "Consult healthcare provider",
            "error": "AI not available"
        }
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"rehab-{uuid.uuid4()}",
            system_message=SYSTEM_PROMPTS["rehab"]
        ).with_model("openai", "gpt-4.1")
        
        context = f"Patient condition: {condition}\nBody part: {body_part}"
        if patient_info:
            context += f"\nPatient info: {str(patient_info)}"
        
        prompt = f"""{context}

Generate a rehabilitation exercise program with the following structure:
- Exercise name
- Sets and reps (or duration)
- Hold time if applicable
- Specific instructions/notes
- Progression criteria

Also include:
- Recommended frequency
- Program duration
- Precautions and contraindications"""

        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Return as structured data
        return {
            "ai_response": response,
            "condition": condition,
            "body_part": body_part,
            "generated": True
        }
        
    except Exception as e:
        logger.error(f"Rehab program AI error: {e}")
        return {
            "exercises": [],
            "error": str(e)
        }


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def parse_report_sections(response: str) -> Dict[str, str]:
    """
    Parse AI response into structured sections
    
    Args:
        response: Raw AI response text
    
    Returns:
        Dictionary with parsed sections
    """
    sections = {
        "summary": "",
        "findings": "",
        "interpretation": "",
        "risk_assessment": "",
        "recommendations": "",
        "prognosis": "",
        "clinical_notes": "",
        "raw": response
    }
    
    # Try to parse structured sections
    current_section = "summary"
    lines = response.split('\n')
    
    section_markers = {
        "executive summary": "summary",
        "summary": "summary",
        "key findings": "findings",
        "findings": "findings",
        "clinical interpretation": "interpretation",
        "interpretation": "interpretation",
        "risk assessment": "risk_assessment",
        "risk": "risk_assessment",
        "treatment recommendations": "recommendations",
        "recommendations": "recommendations",
        "prognosis": "prognosis",
        "expected outcomes": "prognosis",
    }
    
    current_content = []
    
    for line in lines:
        line_lower = line.lower().strip()
        
        # Check if this line starts a new section
        found_section = False
        for marker, section_key in section_markers.items():
            if line_lower.startswith(marker) or f"**{marker}" in line_lower:
                # Save previous section content
                if current_content:
                    sections[current_section] = '\n'.join(current_content).strip()
                current_section = section_key
                current_content = []
                found_section = True
                break
        
        if not found_section:
            current_content.append(line)
    
    # Save last section
    if current_content:
        sections[current_section] = '\n'.join(current_content).strip()
    
    return sections


def is_ai_available() -> bool:
    """Check if AI services are available"""
    return bool(EMERGENT_LLM_KEY) and HAS_EMERGENT


def get_ai_status() -> Dict[str, Any]:
    """Get AI service status"""
    return {
        "available": is_ai_available(),
        "has_key": bool(EMERGENT_LLM_KEY),
        "has_library": HAS_EMERGENT,
        "models": ["gpt-4.1", "gpt-4o"] if is_ai_available() else []
    }
