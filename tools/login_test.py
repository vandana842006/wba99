#!/usr/bin/env python3
"""
WBA99 Login API Testing Script
Tests specific login endpoints as requested in the review
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from environment configuration
BACKEND_URL = "https://posture-engine-1.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

def print_test_header(test_name):
    """Print formatted test header"""
    print(f"\n{'='*60}")
    print(f"TEST: {test_name}")
    print(f"{'='*60}")

def print_result(success, message, details=None):
    """Print test result with formatting"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")
    if details:
        print(f"Details: {details}")

def test_health_check():
    """Test GET /api/health endpoint"""
    print_test_header("Health Check API")
    
    try:
        url = f"{API_BASE}/health"
        print(f"Testing: GET {url}")
        
        response = requests.get(url, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            expected_response = {"status": "healthy", "database": "connected"}
            if data.get("status") == "healthy" and data.get("database") == "connected":
                print_result(True, "Health check returned expected response")
                return True
            else:
                print_result(True, f"Health check working but different response: {data}")
                return True
        else:
            print_result(False, f"Health check failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"Health check request failed: {str(e)}")
        return False

def test_admin_login():
    """Test admin login endpoint"""
    print_test_header("Admin Login Test")
    
    try:
        url = f"{API_BASE}/users/login"
        payload = {
            "email": "admin@wba99.com",
            "role": "admin"
        }
        
        print(f"Testing: POST {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(
            url, 
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("email") == "admin@wba99.com" and data.get("role") == "admin":
                print_result(True, "Admin login successful - returned correct admin user object")
                return True
            else:
                print_result(False, f"Admin login returned incorrect user data: {data}")
                return False
        elif response.status_code == 404:
            print_result(False, "Admin user not found - admin@wba99.com account does not exist")
            return False
        else:
            print_result(False, f"Admin login failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"Admin login request failed: {str(e)}")
        return False

def test_physio_login():
    """Test physio login endpoint"""
    print_test_header("Physio Login Test")
    
    try:
        url = f"{API_BASE}/users/login"
        payload = {
            "email": "sarah@wba99.com",
            "role": "physio"
        }
        
        print(f"Testing: POST {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(
            url, 
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("email") == "sarah@wba99.com" and data.get("role") == "physio":
                print_result(True, "Physio login successful - returned correct physio user object")
                return True
            else:
                print_result(False, f"Physio login returned incorrect user data: {data}")
                return False
        elif response.status_code == 404:
            print_result(False, "Physio user not found - sarah@wba99.com account does not exist")
            return False
        else:
            print_result(False, f"Physio login failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"Physio login request failed: {str(e)}")
        return False

def test_patient_login():
    """Test patient login endpoint"""
    print_test_header("Patient Login Test")
    
    try:
        url = f"{API_BASE}/users/login"
        payload = {
            "email": "sarahpatient@wba99.com",
            "role": "patient"
        }
        
        print(f"Testing: POST {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(
            url, 
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("email") == "sarahpatient@wba99.com" and data.get("role") == "patient":
                print_result(True, "Patient login successful - returned correct patient user object")
                return True
            else:
                print_result(False, f"Patient login returned incorrect user data: {data}")
                return False
        elif response.status_code == 404:
            print_result(False, "Patient user not found - sarahpatient@wba99.com account does not exist")
            return False
        else:
            print_result(False, f"Patient login failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"Patient login request failed: {str(e)}")
        return False

def test_organization_login():
    """Test organization login endpoint"""
    print_test_header("Organization Login Test")
    
    try:
        url = f"{API_BASE}/organizations/login"
        payload = {
            "email": "orgdemo@wba99.com",
            "password": "demo123"
        }
        
        print(f"Testing: POST {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(
            url, 
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            # Check if response has success=True and user with correct email
            if (data.get("success") == True and 
                data.get("user", {}).get("email") == "orgdemo@wba99.com"):
                print_result(True, "Organization login successful - returned org head user object")
                return True
            else:
                print_result(False, f"Organization login returned unexpected data: {data}")
                return False
        elif response.status_code == 404:
            print_result(False, "Organization not found - orgdemo@wba99.com account does not exist")
            return False
        else:
            print_result(False, f"Organization login failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"Organization login request failed: {str(e)}")
        return False

def run_login_tests():
    """Run all login API tests as requested"""
    print(f"WBA99 Login API Testing")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"API Base: {API_BASE}")
    print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    results = []
    
    # Test 1: Health Check
    results.append(test_health_check())
    
    # Test 2: Admin Login
    results.append(test_admin_login())
    
    # Test 3: Physio Login  
    results.append(test_physio_login())
    
    # Test 4: Patient Login
    results.append(test_patient_login())
    
    # Test 5: Organization Login
    results.append(test_organization_login())
    
    # Summary
    print_test_header("TEST SUMMARY")
    passed = sum(results)
    total = len(results)
    
    print(f"Tests Passed: {passed}/{total}")
    print(f"Success Rate: {(passed/total)*100:.1f}%")
    
    if passed == total:
        print("🎉 ALL LOGIN TESTS PASSED!")
    else:
        print("⚠️  SOME LOGIN TESTS FAILED - Check details above")
        
        # List failed tests
        test_names = ["Health Check", "Admin Login", "Physio Login", "Patient Login", "Organization Login"]
        failed_tests = [test_names[i] for i, result in enumerate(results) if not result]
        print(f"Failed Tests: {', '.join(failed_tests)}")
    
    return passed == total

if __name__ == "__main__":
    success = run_login_tests()
    sys.exit(0 if success else 1)