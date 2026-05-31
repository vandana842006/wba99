#!/usr/bin/env python3
"""
Detailed Backend API Testing - Investigating validation errors
"""

import requests
import json
from datetime import datetime

BASE_URL = "https://posture-engine-1.preview.emergentagent.com/api"

def test_detailed_endpoint(endpoint, method="GET", data=None):
    """Test endpoint with detailed error reporting"""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method == "GET":
            response = requests.get(url, timeout=30)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=30)
        
        print(f"\n{method} {endpoint}")
        print(f"Status: {response.status_code}")
        
        try:
            response_data = response.json()
            print(f"Response: {json.dumps(response_data, indent=2)}")
        except:
            print(f"Response Text: {response.text}")
            
    except Exception as e:
        print(f"Error: {e}")

# Test the failing endpoints with detailed output
print("🔍 DETAILED INVESTIGATION OF FAILING ENDPOINTS")
print("=" * 60)

# Test research studies POST with detailed validation
print("\n1. Testing POST /research/studies")
study_data = {
    "title": "Test Study",
    "description": "Test research study for API testing",
    "researcher_id": "test-researcher-id",
    "start_date": datetime.now().isoformat(),
    "status": "active"
}
test_detailed_endpoint("/research/studies", "POST", study_data)

# Test appointments POST with detailed validation
print("\n2. Testing POST /appointments")
appointment_data = {
    "patient_id": "test-patient-id",
    "physio_id": "test-physio-id",
    "date": "2024-01-15",
    "time": "10:00",
    "duration": 60,
    "type": "assessment",
    "notes": "Test appointment for API testing"
}
test_detailed_endpoint("/appointments", "POST", appointment_data)

# Test reports/log POST with detailed validation
print("\n3. Testing POST /reports/log")
report_data = {
    "report_type": "posture",
    "report_name": "Test Posture Analysis Report",
    "generated_by_id": "test-user-id",
    "generated_by_name": "Test User",
    "generated_by_role": "physio",
    "patient_id": "test-patient-id",
    "patient_name": "Test Patient",
    "analysis_data": {
        "posture_score": 85,
        "recommendations": ["Improve shoulder alignment", "Strengthen core muscles"]
    },
    "payment_status": "paid",
    "amount_paid": 0,
    "credits_used": 5
}
test_detailed_endpoint("/reports/log", "POST", report_data)

# Test AI SD curve analysis
print("\n4. Testing POST /ai/sd-curve-analysis")
sd_curve_data = {
    "patient_id": "test-patient-id",
    "measurement_data": [1.2, 1.5, 1.8, 2.1, 1.9, 1.6, 1.3],
    "analysis_type": "posture_deviation",
    "measurement_points": ["C7", "T12", "L3", "S1", "Hip", "Knee", "Ankle"]
}
test_detailed_endpoint("/ai/sd-curve-analysis", "POST", sd_curve_data)

# Test admin data hub endpoints
print("\n5. Testing GET /admin/data-hub/summary")
test_detailed_endpoint("/admin/data-hub/summary", "GET")

print("\n6. Testing GET /admin/data-hub/all")
test_detailed_endpoint("/admin/data-hub/all", "GET")

print("\n7. Testing POST /admin/sync/all")
test_detailed_endpoint("/admin/sync/all", "POST", {})