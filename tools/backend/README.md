# Backend Package Structure
# This module organizes the WBA99 MSK Analysis API into a clean, maintainable structure

"""
/app/backend/
├── server.py           # Main FastAPI app entry point (simplified)
├── config/
│   ├── __init__.py
│   ├── database.py     # MongoDB connection
│   ├── settings.py     # App settings and constants
│   └── auth.py         # Authentication helpers
├── models/
│   ├── __init__.py
│   ├── user.py         # User models
│   ├── assessment.py   # Assessment models
│   ├── exercise.py     # Exercise models
│   ├── payment.py      # Payment models
│   └── research.py     # Research models
├── routes/
│   ├── __init__.py
│   ├── users.py        # User endpoints
│   ├── assessments.py  # Assessment endpoints
│   ├── exercises.py    # Exercise endpoints
│   ├── ai.py           # AI analysis endpoints
│   ├── research.py     # Research endpoints
│   └── admin.py        # Admin endpoints
└── services/
    ├── __init__.py
    ├── ai_service.py   # AI/LLM integration
    └── pdf_service.py  # PDF generation
"""
