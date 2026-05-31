#!/usr/bin/env python3
"""
Backend API Testing for WBA99 MSK Analysis App
Testing specific endpoints after duplicate route removal
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend environment
BACKEND_URL = "https://posture-engine-1.preview.emergentagent.com/api"

def test_endpoint(method, endpoint, description, expected_status=200, data=None, params=None):
    """Test a single API endpoint"""
    url = f"{BACKEND_URL}{endpoint}"
    
    try:
        print(f"\n🧪 Testing: {description}")
        print(f"   {method} {url}")
        
        if method.upper() == "GET":
            response = requests.get(url, params=params, timeout=30)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, params=params, timeout=30)
        else:
            print(f"   ❌ Unsupported method: {method}")
            return False
            
        print(f"   Status: {response.status_code}")
        
        if response.status_code == expected_status:
            try:
                response_data = response.json()
                print(f"   ✅ SUCCESS - Valid JSON response ({len(str(response_data))} chars)")
                if isinstance(response_data, dict) and len(response_data) > 0:
                    print(f"   📊 Response keys: {list(response_data.keys())}")
                elif isinstance(response_data, list):
                    print(f"   📊 Response: List with {len(response_data)} items")
                return True
            except json.JSONDecodeError:
                print(f"   ❌ FAILED - Invalid JSON response")
                print(f"   Response: {response.text[:200]}...")
                return False
        else:
            print(f"   ❌ FAILED - Expected {expected_status}, got {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data}")
            except:
                print(f"   Error: {response.text[:200]}...")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ FAILED - Request error: {e}")
        return False

def main():
    """Test the 8 specific endpoints from the review request"""
    print("=" * 80)
    print("🔬 WBA99 MSK Analysis Backend API Testing")
    print("📋 Review Request: Comprehensive verification after removing more duplicate routes")
    print(f"🌐 Backend URL: {BACKEND_URL}")
    print("=" * 80)
    
    # Track test results
    tests = []
    
    # Test 1: Research Statistics
    tests.append(test_endpoint(
        "GET", 
        "/research/statistics",
        "Research analytics (from routes/research.py)"
    ))
    
    # Test 2: Research Condition Dashboard
    tests.append(test_endpoint(
        "GET",
        "/research/condition-dashboard",
        "Condition dashboard (from routes/research.py)"
    ))
    
    # Test 3: Appointments
    tests.append(test_endpoint(
        "GET",
        "/appointments", 
        "Appointments (from routes/scheduling.py)"
    ))
    
    # Test 4: Equipment Devices
    tests.append(test_endpoint(
        "GET",
        "/equipment/devices",
        "Equipment (from routes/scheduling.py)"
    ))
    
    # Test 5: Admin Reports
    tests.append(test_endpoint(
        "GET",
        "/admin/reports",
        "Report logs (from routes/report_logging.py)"
    ))
    
    # Test 6: Admin Device Analyses
    tests.append(test_endpoint(
        "GET",
        "/admin/device-analyses",
        "Device analyses (from routes/clinical_analysis.py)"
    ))
    
    # Test 7: Admin Data Hub Summary
    tests.append(test_endpoint(
        "GET",
        "/admin/data-hub/summary",
        "Data hub summary (from routes/data_hub.py)"
    ))
    
    # Test 8: Ready Publications
    tests.append(test_endpoint(
        "GET",
        "/research/publications/ready",
        "Ready publications (from routes/research.py)"
    ))
    
    # Summary
    passed = sum(tests)
    total = len(tests)
    success_rate = (passed / total) * 100
    
    print("\n" + "=" * 80)
    print("📊 TEST SUMMARY")
    print("=" * 80)
    print(f"✅ Passed: {passed}/{total} tests ({success_rate:.1f}%)")
    print(f"❌ Failed: {total - passed}/{total} tests")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! All endpoints return 200 with valid JSON responses.")
        print("✅ Modular routes are working correctly after duplicate removal.")
    else:
        print(f"\n⚠️  {total - passed} endpoint(s) need attention.")
        print("❌ Some modular routes may have issues after duplicate removal.")
    
    print(f"\n🕒 Test completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)