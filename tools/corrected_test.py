#!/usr/bin/env python3
"""
Corrected Backend API Testing - Using proper parameter formats
"""

import requests
import json
from datetime import datetime

BASE_URL = "https://posture-engine-1.preview.emergentagent.com/api"

def test_corrected_endpoints():
    """Test endpoints with correct parameter formats"""
    
    print("🔧 CORRECTED ENDPOINT TESTING")
    print("=" * 60)
    
    # 1. Test POST /research/studies with query parameters
    print("\n1. Testing POST /research/studies (corrected)")
    params = {
        "name": "Test Study",
        "objective": "Test research study for API testing",
        "sample_size": 50,
        "created_by": "test-researcher-id",
        "created_by_name": "Test Researcher"
    }
    body = {
        "parameters": ["age", "gender", "condition", "outcome"]
    }
    
    try:
        response = requests.post(f"{BASE_URL}/research/studies", params=params, json=body, timeout=30)
        print(f"Status: {response.status_code}")
        try:
            print(f"Response: {json.dumps(response.json(), indent=2)}")
        except:
            print(f"Response Text: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    
    # 2. Test POST /appointments with correct model
    print("\n2. Testing POST /appointments (corrected)")
    appointment_data = {
        "physio_id": "test-physio-id",
        "patient_id": "test-patient-id",
        "patient_name": "Test Patient",
        "date": "2024-01-15",
        "start_time": "10:00",
        "end_time": "11:00",
        "treatment_type": "assessment",
        "equipment_needed": [],
        "status": "scheduled",
        "notes": "Test appointment for API testing"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/appointments", json=appointment_data, timeout=30)
        print(f"Status: {response.status_code}")
        try:
            print(f"Response: {json.dumps(response.json(), indent=2)}")
        except:
            print(f"Response Text: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    
    # 3. Test POST /reports/log with query parameters
    print("\n3. Testing POST /reports/log (corrected)")
    params = {
        "report_type": "posture",
        "report_name": "Test Posture Analysis Report",
        "generated_by_id": "test-user-id",
        "generated_by_name": "Test User",
        "generated_by_role": "physio",
        "patient_id": "test-patient-id",
        "patient_name": "Test Patient",
        "payment_status": "paid",
        "amount_paid": 0,
        "credits_used": 5
    }
    body = {
        "analysis_data": {
            "posture_score": 85,
            "recommendations": ["Improve shoulder alignment", "Strengthen core muscles"]
        }
    }
    
    try:
        response = requests.post(f"{BASE_URL}/reports/log", params=params, json=body, timeout=30)
        print(f"Status: {response.status_code}")
        try:
            print(f"Response: {json.dumps(response.json(), indent=2)}")
        except:
            print(f"Response Text: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

    # 4. Test working endpoints to confirm they still work
    print("\n4. Testing working endpoints (verification)")
    
    # Health check
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=30)
        print(f"GET /health - Status: {response.status_code} ✅")
    except Exception as e:
        print(f"GET /health - Error: {e} ❌")
    
    # Research statistics
    try:
        response = requests.get(f"{BASE_URL}/research/statistics", timeout=30)
        print(f"GET /research/statistics - Status: {response.status_code} ✅")
    except Exception as e:
        print(f"GET /research/statistics - Error: {e} ❌")
    
    # Payment settings
    try:
        response = requests.get(f"{BASE_URL}/payment/settings", timeout=30)
        print(f"GET /payment/settings - Status: {response.status_code} ✅")
    except Exception as e:
        print(f"GET /payment/settings - Error: {e} ❌")

if __name__ == "__main__":
    test_corrected_endpoints()