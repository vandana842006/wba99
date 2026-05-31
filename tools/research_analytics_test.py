#!/usr/bin/env python3
"""
WBA99 Medical-Grade Research Analytics API Testing
Tests all research analytics endpoints as specified in the review request
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any, List

# Backend URL from environment
BACKEND_URL = "https://posture-engine-1.preview.emergentagent.com/api"

# Test researcher ID as specified in review request
TEST_RESEARCHER_ID = "3d1259bd-7a02-4f5e-8d99-ae9f439586a3"

class ResearchAnalyticsAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_results = []
        self.failed_tests = []
        self.researcher_id = TEST_RESEARCHER_ID
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        
        if success:
            print(f"✅ {test_name}: {details}")
        else:
            print(f"❌ {test_name}: {details}")
            self.failed_tests.append(result)
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None) -> Dict:
        """Make HTTP request and return response"""
        url = f"{self.base_url}{endpoint}"
        try:
            if method.upper() == "GET":
                response = self.session.get(url, params=params)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, params=params)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, params=params)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, params=params)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return {
                "status_code": response.status_code,
                "data": response.json() if response.content else {},
                "headers": dict(response.headers),
                "success": 200 <= response.status_code < 300
            }
        except requests.exceptions.RequestException as e:
            return {
                "status_code": 0,
                "data": {"error": str(e)},
                "headers": {},
                "success": False
            }
        except json.JSONDecodeError:
            return {
                "status_code": response.status_code,
                "data": {"error": "Invalid JSON response", "content": response.text[:500]},
                "headers": dict(response.headers),
                "success": False
            }

    def test_aggregate_data_endpoint(self):
        """Test GET /research/aggregate-data/{researcher_id}"""
        print("\n🔍 Testing Research Aggregate Data Endpoint...")
        
        endpoint = f"/research/aggregate-data/{self.researcher_id}"
        response = self.make_request("GET", endpoint)
        
        if response["success"]:
            data = response["data"]
            # Check for expected fields in aggregated data
            expected_fields = ["summary", "condition_breakdown", "outcomes"]
            
            missing_fields = [field for field in expected_fields if field not in data]
            if not missing_fields:
                self.log_test("Research Aggregate Data API", True, 
                             f"All expected fields present: {', '.join(expected_fields)}")
                
                # Log some key metrics from summary
                summary = data.get("summary", {})
                total_patients = summary.get("total_patients", 0)
                total_assessments = summary.get("total_assessments", 0)
                self.log_test("Aggregate Data Metrics", True, 
                             f"Patients: {total_patients}, Assessments: {total_assessments}")
            else:
                self.log_test("Research Aggregate Data API", False, 
                             f"Missing expected fields: {missing_fields}")
        else:
            self.log_test("Research Aggregate Data API", False, 
                         f"HTTP {response['status_code']}: {response['data']}")

    def test_pre_post_comparison_endpoint(self):
        """Test POST /research/pre-post-comparison"""
        print("\n🔍 Testing Pre-Post Comparison Endpoint...")
        
        endpoint = "/research/pre-post-comparison"
        params = {"researcher_id": self.researcher_id}
        
        response = self.make_request("POST", endpoint, params=params)
        
        if response["success"]:
            data = response["data"]
            # Check for expected fields in pre-post comparison
            expected_fields = ["improvement_distribution", "average_improvement", "patient_comparisons"]
            
            missing_fields = [field for field in expected_fields if field not in data]
            if not missing_fields:
                self.log_test("Pre-Post Comparison API", True, 
                             f"All expected fields present: {', '.join(expected_fields)}")
                
                # Log average improvement if available
                avg_improvement = data.get("average_improvement", 0)
                self.log_test("Pre-Post Analysis Results", True, 
                             f"Average improvement: {avg_improvement}%")
            else:
                self.log_test("Pre-Post Comparison API", False, 
                             f"Missing expected fields: {missing_fields}")
        else:
            self.log_test("Pre-Post Comparison API", False, 
                         f"HTTP {response['status_code']}: {response['data']}")

    def test_statistical_analysis_endpoint(self):
        """Test POST /research/statistical-analysis"""
        print("\n🔍 Testing Statistical Analysis Endpoint...")
        
        endpoint = "/research/statistical-analysis"
        params = {
            "researcher_id": self.researcher_id,
            "analysis_type": "descriptive",
            "data_source": "assessments"
        }
        
        response = self.make_request("POST", endpoint, params=params)
        
        if response["success"]:
            data = response["data"]
            # Check for expected fields in statistical analysis
            expected_fields = ["descriptive_statistics", "confidence_interval_95", "distribution"]
            
            missing_fields = [field for field in expected_fields if field not in data]
            if not missing_fields:
                self.log_test("Statistical Analysis API", True, 
                             f"All expected fields present: {', '.join(expected_fields)}")
                
                # Log descriptive statistics if available
                desc_stats = data.get("descriptive_statistics", {})
                if isinstance(desc_stats, dict):
                    mean = desc_stats.get("mean", "N/A")
                    median = desc_stats.get("median", "N/A")
                    std_dev = desc_stats.get("std_dev", "N/A")
                    self.log_test("Statistical Analysis Results", True, 
                                 f"Mean: {mean}, Median: {median}, Std Dev: {std_dev}")
            else:
                self.log_test("Statistical Analysis API", False, 
                             f"Missing expected fields: {missing_fields}")
        else:
            self.log_test("Statistical Analysis API", False, 
                         f"HTTP {response['status_code']}: {response['data']}")

    def test_graph_data_endpoint(self):
        """Test GET /research/graph-data/{researcher_id}"""
        print("\n🔍 Testing Research Graph Data Endpoint...")
        
        endpoint = f"/research/graph-data/{self.researcher_id}"
        response = self.make_request("GET", endpoint)
        
        if response["success"]:
            data = response["data"]
            # Check for expected fields in graph data
            expected_fields = ["trend_chart", "condition_distribution", "outcomes_pie"]
            
            missing_fields = [field for field in expected_fields if field not in data]
            if not missing_fields:
                self.log_test("Research Graph Data API", True, 
                             f"All expected fields present: {', '.join(expected_fields)}")
                
                # Check if chart data has proper structure
                trend_chart = data.get("trend_chart", {})
                if isinstance(trend_chart, dict) and "datasets" in trend_chart:
                    self.log_test("Graph Data Structure", True, 
                                 "Trend chart data properly formatted")
                else:
                    self.log_test("Graph Data Structure", False, 
                                 "Trend chart data missing or malformed")
            else:
                self.log_test("Research Graph Data API", False, 
                             f"Missing expected fields: {missing_fields}")
        else:
            self.log_test("Research Graph Data API", False, 
                         f"HTTP {response['status_code']}: {response['data']}")

    def test_reports_endpoint(self):
        """Test GET /research/reports"""
        print("\n🔍 Testing Research Reports Endpoint...")
        
        endpoint = "/research/reports"
        params = {"researcher_id": self.researcher_id}
        
        response = self.make_request("GET", endpoint, params=params)
        
        if response["success"]:
            data = response["data"]
            if isinstance(data, list):
                self.log_test("Research Reports API", True, 
                             f"Retrieved {len(data)} reports (may be empty initially)")
                
                # If reports exist, check structure
                if data:
                    first_report = data[0]
                    if isinstance(first_report, dict) and "id" in first_report:
                        self.log_test("Report Structure", True, 
                                     "Report objects have proper structure")
                    else:
                        self.log_test("Report Structure", False, 
                                     "Report objects missing required fields")
            else:
                self.log_test("Research Reports API", False, 
                             f"Expected list response, got: {type(data)}")
        else:
            self.log_test("Research Reports API", False, 
                         f"HTTP {response['status_code']}: {response['data']}")

    def test_upload_data_endpoint(self):
        """Test POST /research/upload-data"""
        print("\n🔍 Testing Research Data Upload Endpoint...")
        
        endpoint = "/research/upload-data"
        test_data = {
            "uploader_id": self.researcher_id,
            "uploader_name": "Test Researcher",
            "uploader_role": "physio",
            "file_name": "test_data.csv",
            "file_type": "csv",
            "parsed_data": [
                {"patient": "John Doe", "score": 75, "condition": "lower_back_pain"},
                {"patient": "Jane Smith", "score": 82, "condition": "knee_pain"}
            ]
        }
        
        response = self.make_request("POST", endpoint, test_data)
        
        if response["success"]:
            data = response["data"]
            # Check for expected fields in upload response
            expected_fields = ["success", "upload_id", "row_count"]
            
            missing_fields = [field for field in expected_fields if field not in data]
            if not missing_fields:
                success = data.get("success", False)
                upload_id = data.get("upload_id", "N/A")
                row_count = data.get("row_count", 0)
                
                if success:
                    self.log_test("Research Data Upload API", True, 
                                 f"Upload successful - ID: {upload_id}, Rows: {row_count}")
                else:
                    self.log_test("Research Data Upload API", False, 
                                 "Upload marked as unsuccessful")
            else:
                self.log_test("Research Data Upload API", False, 
                             f"Missing expected fields: {missing_fields}")
        else:
            self.log_test("Research Data Upload API", False, 
                         f"HTTP {response['status_code']}: {response['data']}")

    def test_export_endpoint(self):
        """Test POST /research/export"""
        print("\n🔍 Testing Research Data Export Endpoint...")
        
        endpoint = "/research/export"
        params = {
            "researcher_id": self.researcher_id,
            "export_format": "json",
            "data_type": "all"
        }
        
        response = self.make_request("POST", endpoint, params=params)
        
        if response["success"]:
            data = response["data"]
            # Check for expected fields in export response
            expected_fields = ["aggregated_data", "pre_post_comparisons", "statistical_analysis", "exported_at"]
            
            missing_fields = [field for field in expected_fields if field not in data]
            if not missing_fields:
                exported_at = data.get("exported_at", "N/A")
                self.log_test("Research Data Export API", True, 
                             f"Export successful - Exported at: {exported_at}")
                
                # Check if exported data has content
                agg_data = data.get("aggregated_data", {})
                if isinstance(agg_data, dict) and agg_data:
                    self.log_test("Export Data Content", True, 
                                 "Exported data contains aggregated information")
                else:
                    self.log_test("Export Data Content", False, 
                                 "Exported aggregated data is empty or malformed")
            else:
                self.log_test("Research Data Export API", False, 
                             f"Missing expected fields: {missing_fields}")
        else:
            self.log_test("Research Data Export API", False, 
                         f"HTTP {response['status_code']}: {response['data']}")

    def test_researcher_authentication(self):
        """Test if the researcher ID is valid by checking user login"""
        print("\n🔍 Testing Researcher Authentication...")
        
        # Try to authenticate the researcher (assuming it's a physio account)
        endpoint = "/users/login"
        login_data = {
            "email": "sarah@wba99.com",  # Known physio account
            "role": "physio"
        }
        
        response = self.make_request("POST", endpoint, login_data)
        
        if response["success"]:
            user_data = response["data"]
            user_id = user_data.get("id", "")
            
            if user_id == self.researcher_id:
                self.log_test("Researcher Authentication", True, 
                             f"Researcher ID {self.researcher_id} is valid physio account")
            else:
                self.log_test("Researcher Authentication", False, 
                             f"Researcher ID mismatch - Expected: {self.researcher_id}, Got: {user_id}")
        else:
            self.log_test("Researcher Authentication", False, 
                         f"Failed to authenticate researcher: HTTP {response['status_code']}")

    def run_all_tests(self):
        """Run all research analytics test suites"""
        print(f"🚀 Starting WBA99 Medical-Grade Research Analytics API Testing")
        print(f"🌐 Backend URL: {self.base_url}")
        print(f"👨‍🔬 Test Researcher ID: {self.researcher_id}")
        print("=" * 80)
        
        # Run all test suites
        self.test_researcher_authentication()
        self.test_aggregate_data_endpoint()
        self.test_pre_post_comparison_endpoint()
        self.test_statistical_analysis_endpoint()
        self.test_graph_data_endpoint()
        self.test_reports_endpoint()
        self.test_upload_data_endpoint()
        self.test_export_endpoint()
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("📊 RESEARCH ANALYTICS API TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t["success"]])
        failed_tests = len(self.failed_tests)
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if self.failed_tests:
            print("\n🔍 FAILED TESTS DETAILS:")
            print("-" * 40)
            for i, test in enumerate(self.failed_tests, 1):
                print(f"{i}. {test['test']}")
                print(f"   Details: {test['details']}")
                if test.get('response_data'):
                    print(f"   Response: {json.dumps(test['response_data'], indent=2)[:200]}...")
                print()
        
        print("=" * 80)
        return passed_tests, failed_tests, total_tests

if __name__ == "__main__":
    tester = ResearchAnalyticsAPITester()
    tester.run_all_tests()
    
    # Exit with error code if tests failed
    if tester.failed_tests:
        sys.exit(1)
    else:
        print("🎉 All research analytics tests passed!")
        sys.exit(0)