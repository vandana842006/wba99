#!/usr/bin/env python3
"""
WBA99 MSK/FMS Analysis Backend API Testing - Focused Test
Tests specific issues found in initial testing
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://posture-engine-1.preview.emergentagent.com/api"

def test_specific_issues():
    """Test specific issues found"""
    print("🔍 Testing Specific Issues Found...")
    
    # Test 1: Check if orgdemo user exists with different role
    print("\n1. Testing orgdemo account with different roles...")
    for role in ["admin", "physio", "patient"]:
        response = requests.post(f"{BACKEND_URL}/users/login", json={
            "email": "orgdemo@wba99.com",
            "role": role
        })
        if response.status_code == 200:
            user_data = response.json()
            print(f"✅ orgdemo@wba99.com found with role: {role}")
            print(f"   User ID: {user_data.get('id', 'N/A')}")
            break
        else:
            print(f"❌ orgdemo@wba99.com not found with role: {role}")
    
    # Test 2: Check users endpoint with specific role filter
    print("\n2. Testing users endpoint with role filters...")
    for role in ["admin", "physio", "patient"]:
        response = requests.get(f"{BACKEND_URL}/users", params={"role": role})
        if response.status_code == 200:
            users = response.json()
            print(f"✅ Users with role {role}: {len(users)} found")
        else:
            print(f"❌ Failed to get users with role {role}: HTTP {response.status_code}")
    
    # Test 3: Check assessments endpoint with error handling
    print("\n3. Testing assessments endpoint...")
    response = requests.get(f"{BACKEND_URL}/assessments")
    print(f"Assessments endpoint status: {response.status_code}")
    if response.status_code == 200:
        try:
            assessments = response.json()
            print(f"✅ Assessments retrieved: {len(assessments)}")
        except json.JSONDecodeError:
            print(f"❌ Invalid JSON response: {response.text[:200]}")
    else:
        print(f"❌ Error response: {response.text[:200]}")
    
    # Test 4: Test working endpoints
    print("\n4. Testing working endpoints...")
    working_endpoints = [
        "/",
        "/health", 
        "/analytics/overview",
        "/exercises",
        "/payment/packages"
    ]
    
    for endpoint in working_endpoints:
        response = requests.get(f"{BACKEND_URL}{endpoint}")
        if response.status_code == 200:
            print(f"✅ {endpoint}: Working")
        else:
            print(f"❌ {endpoint}: HTTP {response.status_code}")

if __name__ == "__main__":
    test_specific_issues()