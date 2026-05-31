#!/usr/bin/env python3
"""
WBA99 MSK/FMS Analysis App Backend API Testing
Comprehensive testing of all endpoints mentioned in review request
"""

import requests
import json
import sys
from typing import Dict, Any, List, Optional
from datetime import datetime

# Backend URL from environment configuration
BACKEND_URL = "https://posture-engine-1.preview.emergentagent.com/api"

class WBA99ComprehensiveTester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = []
        self.user_tokens = {}
        
    def log_test(self, test_name: str, passed: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "status": status,
            "passed": passed,
            "details": details,
            "response_data": response_data,
            "timestamp": datetime.now().isoformat()
        })
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if not passed and response_data:
            print(f"   Response: {response_data}")
        print()

    # ===== HEALTH CHECK APIs =====
    def test_root_endpoint(self):
        """Test GET /api/ - Root API info"""
        try:
            response = self.session.get(f"{self.base_url}/")
            if response.status_code == 200:
                data = response.json()
                if "status" in data or "app" in data or "version" in data:
                    self.log_test(
                        "Root API Info (GET /api/)",
                        True,
                        f"API info returned: {data.get('app', 'N/A')} v{data.get('version', 'N/A')}"
                    )
                    return True
                else:
                    self.log_test(
                        "Root API Info (GET /api/)",
                        False,
                        "Missing expected fields (status/app/version)",
                        data
                    )
                    return False
            else:
                self.log_test(
                    "Root API Info (GET /api/)",
                    False,
                    f"HTTP {response.status_code}",
                    response.text
                )
                return False
        except Exception as e:
            self.log_test("Root API Info (GET /api/)", False, f"Exception: {str(e)}")
            return False

    def test_health_endpoint(self):
        """Test GET /api/health - Health check with DB status"""
        try:
            response = self.session.get(f"{self.base_url}/health")
            if response.status_code == 200:
                data = response.json()
                if "status" in data:
                    db_status = data.get("database", "unknown")
                    self.log_test(
                        "Health Check API (GET /api/health)",
                        True,
                        f"Health status: {data['status']}, Database: {db_status}"
                    )
                    return True
                else:
                    self.log_test(
                        "Health Check API (GET /api/health)",
                        False,
                        "Missing 'status' field in response",
                        data
                    )
                    return False
            else:
                self.log_test(
                    "Health Check API (GET /api/health)",
                    False,
                    f"HTTP {response.status_code}",
                    response.text
                )
                return False
        except Exception as e:
            self.log_test("Health Check API (GET /api/health)", False, f"Exception: {str(e)}")
            return False

    # ===== USER AUTHENTICATION APIs =====
    def test_admin_login(self):
        """Test admin login - POST /api/users/login"""
        try:
            login_data = {
                "email": "admin@wba99.com",
                "role": "admin"
            }
            response = self.session.post(f"{self.base_url}/users/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and "email" in data and "role" in data:
                    if data["role"] == "admin":
                        self.user_tokens["admin"] = data
                        self.log_test(
                            "Admin Login (admin@wba99.com)",
                            True,
                            f"Login successful. User ID: {data['id']}, Role: {data['role']}"
                        )
                        return data
                    else:
                        self.log_test(
                            "Admin Login (admin@wba99.com)",
                            False,
                            f"Expected role 'admin', got '{data['role']}'",
                            data
                        )
                        return None
                else:
                    self.log_test(
                        "Admin Login (admin@wba99.com)",
                        False,
                        "Response missing required fields (id, email, role)",
                        data
                    )
                    return None
            else:
                self.log_test(
                    "Admin Login (admin@wba99.com)",
                    False,
                    f"HTTP {response.status_code}",
                    response.text
                )
                return None
        except Exception as e:
            self.log_test("Admin Login (admin@wba99.com)", False, f"Exception: {str(e)}")
            return None

    def test_physio_login(self):
        """Test physio login - POST /api/users/login"""
        try:
            login_data = {
                "email": "sarah@wba99.com",
                "role": "physio"
            }
            response = self.session.post(f"{self.base_url}/users/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and "email" in data and "role" in data:
                    if data["role"] == "physio":
                        self.user_tokens["physio"] = data
                        self.log_test(
                            "Physio Login (sarah@wba99.com)",
                            True,
                            f"Login successful. User ID: {data['id']}, Role: {data['role']}"
                        )
                        return data
                    else:
                        self.log_test(
                            "Physio Login (sarah@wba99.com)",
                            False,
                            f"Expected role 'physio', got '{data['role']}'",
                            data
                        )
                        return None
                else:
                    self.log_test(
                        "Physio Login (sarah@wba99.com)",
                        False,
                        "Response missing required fields (id, email, role)",
                        data
                    )
                    return None
            else:
                self.log_test(
                    "Physio Login (sarah@wba99.com)",
                    False,
                    f"HTTP {response.status_code}",
                    response.text
                )
                return None
        except Exception as e:
            self.log_test("Physio Login (sarah@wba99.com)", False, f"Exception: {str(e)}")
            return None

    def test_patient_login(self):
        """Test patient login - POST /api/users/login"""
        try:
            login_data = {
                "email": "sarahpatient@wba99.com",
                "role": "patient"
            }
            response = self.session.post(f"{self.base_url}/users/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and "email" in data and "role" in data:
                    if data["role"] == "patient":
                        self.user_tokens["patient"] = data
                        self.log_test(
                            "Patient Login (sarahpatient@wba99.com)",
                            True,
                            f"Login successful. User ID: {data['id']}, Role: {data['role']}"
                        )
                        return data
                    else:
                        self.log_test(
                            "Patient Login (sarahpatient@wba99.com)",
                            False,
                            f"Expected role 'patient', got '{data['role']}'",
                            data
                        )
                        return None
                else:
                    self.log_test(
                        "Patient Login (sarahpatient@wba99.com)",
                        False,
                        "Response missing required fields (id, email, role)",
                        data
                    )
                    return None
            elif response.status_code == 404:
                self.log_test(
                    "Patient Login (sarahpatient@wba99.com)",
                    False,
                    "Patient account not found - may need to be created first",
                    response.text
                )
                return None
            else:
                self.log_test(
                    "Patient Login (sarahpatient@wba99.com)",
                    False,
                    f"HTTP {response.status_code}",
                    response.text
                )
                return None
        except Exception as e:
            self.log_test("Patient Login (sarahpatient@wba99.com)", False, f"Exception: {str(e)}")
            return None

    # ===== ASSESSMENT APIs =====
    def test_list_assessments(self):
        """Test GET /api/assessments - List assessments"""
        try:
            response = self.session.get(f"{self.base_url}/assessments")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test(
                        "List Assessments API (GET /api/assessments)",
                        True,
                        f"Retrieved {len(data)} assessments successfully"
                    )
                    return data
                else:
                    self.log_test(
                        "List Assessments API (GET /api/assessments)",
                        False,
                        "Response is not a list",
                        data
                    )
                    return None
            else:
                self.log_test(
                    "List Assessments API (GET /api/assessments)",
                    False,
                    f"HTTP {response.status_code}",
                    response.text
                )
                return None
        except Exception as e:
            self.log_test("List Assessments API (GET /api/assessments)", False, f"Exception: {str(e)}")
            return None

    def test_create_assessment(self):
        """Test POST /api/assessments - Create new assessment with validation"""
        try:
            # Test valid posture assessment using correct API structure
            valid_posture_data = {
                "patient_id": "test-patient-123",
                "assessment_type": "posture",
                "data": {
                    "head_alignment": 8,
                    "shoulder_alignment": 7,
                    "spine_curvature": 9,
                    "pelvis_alignment": 6,
                    "knee_alignment": 8,
                    "foot_alignment": 7
                }
            }
            
            response = self.session.post(f"{self.base_url}/assessments", json=valid_posture_data)
            if response.status_code in [200, 201]:
                data = response.json()
                if "id" in data and "total_score" in data:
                    self.log_test(
                        "Create Assessment API (Valid Posture)",
                        True,
                        f"Assessment created successfully. ID: {data['id']}, Total Score: {data['total_score']}"
                    )
                    
                    # Test invalid assessment (scores > 10)
                    invalid_data = {
                        "patient_id": "test-patient-123",
                        "assessment_type": "posture",
                        "data": {
                            "head_alignment": 15,  # Invalid: > 10
                            "shoulder_alignment": 7,
                            "spine_curvature": 9,
                            "pelvis_alignment": 6,
                            "knee_alignment": 8,
                            "foot_alignment": 7
                        }
                    }
                    
                    invalid_response = self.session.post(f"{self.base_url}/assessments", json=invalid_data)
                    if invalid_response.status_code in [400, 422]:  # Accept both HTTP 400 and 422 for validation errors
                        self.log_test(
                            "Create Assessment API (Validation Test)",
                            True,
                            f"Properly rejects invalid scores > 10 with HTTP {invalid_response.status_code}: {invalid_response.json().get('detail', 'Validation error')}"
                        )
                    elif invalid_response.status_code in [200, 201]:
                        self.log_test(
                            "Create Assessment API (Validation Test)",
                            False,
                            "Should reject invalid scores > 10 but accepted them",
                            invalid_response.json()
                        )
                    else:
                        self.log_test(
                            "Create Assessment API (Validation Test)",
                            False,
                            f"Unexpected response HTTP {invalid_response.status_code}",
                            invalid_response.text
                        )
                    
                    return data
                else:
                    self.log_test(
                        "Create Assessment API (Valid Posture)",
                        False,
                        "Response missing required fields (id, total_score)",
                        data
                    )
                    return None
            else:
                self.log_test(
                    "Create Assessment API (Valid Posture)",
                    False,
                    f"HTTP {response.status_code}",
                    response.text
                )
                return None
        except Exception as e:
            self.log_test("Create Assessment API", False, f"Exception: {str(e)}")
            return None

    # ===== EXERCISE APIs =====
    def test_list_exercises(self):
        """Test GET /api/exercises - List exercises"""
        try:
            response = self.session.get(f"{self.base_url}/exercises")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test(
                        "List Exercises API (GET /api/exercises)",
                        True,
                        f"Retrieved {len(data)} exercises successfully"
                    )
                    return data
                else:
                    self.log_test(
                        "List Exercises API (GET /api/exercises)",
                        False,
                        "Response is not a list",
                        data
                    )
                    return None
            else:
                self.log_test(
                    "List Exercises API (GET /api/exercises)",
                    False,
                    f"HTTP {response.status_code}",
                    response.text
                )
                return None
        except Exception as e:
            self.log_test("List Exercises API (GET /api/exercises)", False, f"Exception: {str(e)}")
            return None

    # ===== ANALYTICS APIs =====
    def test_analytics_overview(self):
        """Test GET /api/analytics/overview - System overview stats"""
        try:
            response = self.session.get(f"{self.base_url}/analytics/overview")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, dict):
                    stats = []
                    if "total_users" in data:
                        stats.append(f"Users: {data['total_users']}")
                    if "total_assessments" in data:
                        stats.append(f"Assessments: {data['total_assessments']}")
                    if "total_exercises" in data:
                        stats.append(f"Exercises: {data['total_exercises']}")
                    
                    self.log_test(
                        "Analytics Overview API (GET /api/analytics/overview)",
                        True,
                        f"Overview stats retrieved: {', '.join(stats)}" if stats else "Overview data retrieved successfully"
                    )
                    return data
                else:
                    self.log_test(
                        "Analytics Overview API (GET /api/analytics/overview)",
                        False,
                        "Response is not a dictionary",
                        data
                    )
                    return None
            else:
                self.log_test(
                    "Analytics Overview API (GET /api/analytics/overview)",
                    False,
                    f"HTTP {response.status_code}",
                    response.text
                )
                return None
        except Exception as e:
            self.log_test("Analytics Overview API (GET /api/analytics/overview)", False, f"Exception: {str(e)}")
            return None

    # ===== PAYMENT/CREDITS APIs =====
    def test_payment_packages(self):
        """Test GET /api/payment/packages - Credit packages"""
        try:
            response = self.session.get(f"{self.base_url}/payment/packages")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    package = data[0]
                    required_fields = ["id", "name", "credits", "price"]
                    missing_fields = [field for field in required_fields if field not in package]
                    
                    if not missing_fields:
                        self.log_test(
                            "Payment Packages API (GET /api/payment/packages)",
                            True,
                            f"Found {len(data)} packages. First: {package['name']} - {package['credits']} credits for ₹{package['price']}"
                        )
                        return data
                    else:
                        self.log_test(
                            "Payment Packages API (GET /api/payment/packages)",
                            False,
                            f"Package missing required fields: {missing_fields}",
                            package
                        )
                        return None
                else:
                    self.log_test(
                        "Payment Packages API (GET /api/payment/packages)",
                        False,
                        "No packages found or invalid format",
                        data
                    )
                    return None
            else:
                self.log_test(
                    "Payment Packages API (GET /api/payment/packages)",
                    False,
                    f"HTTP {response.status_code}",
                    response.text
                )
                return None
        except Exception as e:
            self.log_test("Payment Packages API (GET /api/payment/packages)", False, f"Exception: {str(e)}")
            return None

    def test_razorpay_config(self):
        """Test GET /api/razorpay/config - Payment config"""
        try:
            response = self.session.get(f"{self.base_url}/razorpay/config")
            if response.status_code == 200:
                data = response.json()
                required_fields = ["key_id", "signup_fees", "is_configured"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_test(
                        "Razorpay Config API (GET /api/razorpay/config)",
                        True,
                        f"Config returned - Configured: {data.get('is_configured', False)}, Key ID: {data.get('key_id', 'N/A')[:8]}..."
                    )
                    return data
                else:
                    self.log_test(
                        "Razorpay Config API (GET /api/razorpay/config)",
                        False,
                        f"Missing required fields: {missing_fields}",
                        data
                    )
                    return None
            else:
                self.log_test(
                    "Razorpay Config API (GET /api/razorpay/config)",
                    False,
                    f"HTTP {response.status_code}",
                    response.text
                )
                return None
        except Exception as e:
            self.log_test("Razorpay Config API (GET /api/razorpay/config)", False, f"Exception: {str(e)}")
            return None

    def run_comprehensive_test(self):
        """Run all comprehensive backend tests"""
        print("="*70)
        print("WBA99 MSK/FMS ANALYSIS APP - COMPREHENSIVE BACKEND API TESTING")
        print("="*70)
        print(f"Testing backend at: {self.base_url}")
        print()
        
        # 1. Health Check APIs
        print("1. TESTING HEALTH CHECK APIs")
        print("-" * 50)
        self.test_root_endpoint()
        self.test_health_endpoint()
        print()
        
        # 2. User Authentication APIs
        print("2. TESTING USER AUTHENTICATION APIs")
        print("-" * 50)
        admin_user = self.test_admin_login()
        physio_user = self.test_physio_login()
        patient_user = self.test_patient_login()
        print()
        
        # 3. Assessment APIs
        print("3. TESTING ASSESSMENT APIs")
        print("-" * 50)
        self.test_list_assessments()
        self.test_create_assessment()
        print()
        
        # 4. Exercise APIs
        print("4. TESTING EXERCISE APIs")
        print("-" * 50)
        self.test_list_exercises()
        print()
        
        # 5. Analytics APIs
        print("5. TESTING ANALYTICS APIs")
        print("-" * 50)
        self.test_analytics_overview()
        print()
        
        # 6. Payment/Credits APIs
        print("6. TESTING PAYMENT/CREDITS APIs")
        print("-" * 50)
        self.test_payment_packages()
        print()
        
        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test results summary"""
        print("="*70)
        print("COMPREHENSIVE TEST RESULTS SUMMARY")
        print("="*70)
        
        passed_tests = [r for r in self.test_results if r["passed"]]
        failed_tests = [r for r in self.test_results if not r["passed"]]
        
        print(f"Total Tests: {len(self.test_results)}")
        print(f"Passed: {len(passed_tests)} ✅")
        print(f"Failed: {len(failed_tests)} ❌")
        print(f"Success Rate: {(len(passed_tests)/len(self.test_results)*100):.1f}%")
        print()
        
        if failed_tests:
            print("FAILED TESTS:")
            print("-" * 40)
            for test in failed_tests:
                print(f"❌ {test['test']}")
                print(f"   Details: {test['details']}")
            print()
        
        print("PASSED TESTS:")
        print("-" * 40)
        for test in passed_tests:
            print(f"✅ {test['test']}: {test['details']}")
        
        print()
        print("="*70)
        
        # Return overall success
        return len(failed_tests) == 0

def main():
    """Main test execution"""
    tester = WBA99ComprehensiveTester(BACKEND_URL)
    all_passed = tester.run_comprehensive_test()
    
    # Exit with appropriate code
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()