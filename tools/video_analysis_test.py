#!/usr/bin/env python3
"""
Additional Video Analysis API Testing
Testing POST endpoints for video analysis submission
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend .env
BACKEND_URL = "https://posture-engine-1.preview.emergentagent.com/api"

# Test physio user ID (from previous tests)
PHYSIO_USER_ID = "3d1259bd-7a02-4f5e-8d99-ae9f439586a3"  # sarah@wba99.com physio

def test_video_analysis_submit():
    """Test video analysis submission endpoint"""
    
    print("🎥 Testing Video Analysis Submission")
    print("=" * 50)
    
    # Test data for video analysis submission
    test_data = {
        "patient_name": "John Doe",
        "patient_age": 35,
        "patient_height_cm": 175.0,
        "patient_weight_kg": 70.0,
        "patient_gender": "male",
        "patient_phone": "+1234567890",
        "patient_email": "john.doe@example.com",
        "medical_history": "No significant medical history",
        "chief_complaint": "Lower back pain during walking",
        "analysis_type": "gait",
        "video_data": "base64_encoded_video_data_placeholder",
        "video_filename": "gait_analysis_john_doe.mp4",
        "views": ["lateral", "posterior"]
    }
    
    url = f"{BACKEND_URL}/video-analysis/submit"
    params = {"physio_id": PHYSIO_USER_ID}
    
    print(f"URL: {url}")
    print(f"Physio ID: {PHYSIO_USER_ID}")
    print(f"Patient: {test_data['patient_name']}")
    print(f"Analysis Type: {test_data['analysis_type']}")
    
    try:
        response = requests.post(url, json=test_data, params=params, timeout=30)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            response_data = response.json()
            print("✅ SUCCESS: Video analysis submission working")
            print(f"Request ID: {response_data.get('id', 'N/A')}")
            print(f"Status: {response_data.get('status', 'N/A')}")
            print(f"Submitted By: {response_data.get('submitted_by_name', 'N/A')}")
            return True
        else:
            print("❌ FAILED: Video analysis submission")
            print(f"Response: {response.text[:500]}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ ERROR: {str(e)}")
        return False

def main():
    """Run video analysis specific tests"""
    print("🚀 WBA99 Video Analysis API Testing")
    print("=" * 50)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)
    
    # Test video analysis submission
    success = test_video_analysis_submit()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 Video Analysis API Test PASSED!")
    else:
        print("❌ Video Analysis API Test FAILED!")
    print("=" * 50)
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)