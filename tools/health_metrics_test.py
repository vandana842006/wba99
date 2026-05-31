#!/usr/bin/env python3
"""
Health Metrics API Testing
Tests the new Health Metrics API endpoints as requested in the review
"""

import requests
import json
from datetime import datetime, timedelta
import sys

# Use the frontend environment URL for testing
BASE_URL = "https://posture-engine-1.preview.emergentagent.com/api"

def print_test_header(test_name):
    print(f"\n{'='*60}")
    print(f"TESTING: {test_name}")
    print(f"{'='*60}")

def print_result(success, message, response=None):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")
    if response and not success:
        print(f"Response: {response.status_code} - {response.text}")
    print("-" * 40)

def test_seed_database():
    """Test seeding the database first"""
    print_test_header("Seed Database")
    
    try:
        response = requests.post(f"{BASE_URL}/seed")
        if response.status_code == 200:
            print_result(True, "Database seeded successfully")
            return True
        else:
            print_result(False, f"Failed to seed database", response)
            return False
    except Exception as e:
        print_result(False, f"Error seeding database: {str(e)}")
        return False

def test_get_patient_users():
    """Test getting patient users"""
    print_test_header("Get Patient Users")
    
    try:
        response = requests.get(f"{BASE_URL}/users?role=patient")
        if response.status_code == 200:
            patients = response.json()
            if patients:
                print_result(True, f"Found {len(patients)} patient users")
                print(f"First patient: {patients[0]['name']} (ID: {patients[0]['id']})")
                return patients[0]['id']  # Return first patient ID
            else:
                print_result(False, "No patient users found")
                return None
        else:
            print_result(False, f"Failed to get patient users", response)
            return None
    except Exception as e:
        print_result(False, f"Error getting patient users: {str(e)}")
        return None

def test_create_health_metrics(patient_id):
    """Test creating health metrics for a patient"""
    print_test_header("Create Health Metrics")
    
    health_data = {
        "patient_id": patient_id,
        "load_monitoring": 6,
        "resting_heart_rate": 72,
        "hydration_level": 8,
        "water_intake_liters": 2.5,
        "sleep_quality": 7,
        "sleep_duration_hours": 7.5,
        "protein_intake_grams": 110,
        "protein_target_grams": 120
    }
    
    try:
        response = requests.post(f"{BASE_URL}/health-metrics", json=health_data)
        if response.status_code == 200:
            metrics = response.json()
            print_result(True, "Health metrics created successfully")
            print(f"Wellness Score: {metrics.get('wellness_score', 'N/A')}")
            print(f"Metrics ID: {metrics.get('id', 'N/A')}")
            
            # Verify wellness_score is calculated automatically
            if 'wellness_score' in metrics and metrics['wellness_score'] > 0:
                print_result(True, f"Wellness score calculated automatically: {metrics['wellness_score']}")
            else:
                print_result(False, "Wellness score not calculated or is 0")
            
            return metrics.get('id')
        else:
            print_result(False, f"Failed to create health metrics", response)
            return None
    except Exception as e:
        print_result(False, f"Error creating health metrics: {str(e)}")
        return None

def test_get_health_metrics_by_patient(patient_id):
    """Test getting health metrics for a specific patient"""
    print_test_header("Get Health Metrics by Patient ID")
    
    try:
        response = requests.get(f"{BASE_URL}/health-metrics?patient_id={patient_id}")
        if response.status_code == 200:
            metrics_list = response.json()
            print_result(True, f"Retrieved {len(metrics_list)} health metrics entries")
            if metrics_list:
                print(f"Latest entry wellness score: {metrics_list[0].get('wellness_score', 'N/A')}")
            return True
        else:
            print_result(False, f"Failed to get health metrics by patient", response)
            return False
    except Exception as e:
        print_result(False, f"Error getting health metrics by patient: {str(e)}")
        return False

def test_get_latest_health_metrics(patient_id):
    """Test getting latest health metrics for a patient"""
    print_test_header("Get Latest Health Metrics")
    
    try:
        response = requests.get(f"{BASE_URL}/health-metrics/patient/{patient_id}/latest")
        if response.status_code == 200:
            latest_metrics = response.json()
            if latest_metrics:
                print_result(True, "Latest health metrics retrieved successfully")
                print(f"Date: {latest_metrics.get('date', 'N/A')}")
                print(f"Wellness Score: {latest_metrics.get('wellness_score', 'N/A')}")
                print(f"Heart Rate: {latest_metrics.get('resting_heart_rate', 'N/A')} bpm")
                return True
            else:
                print_result(True, "No health metrics found (valid response)")
                return True
        else:
            print_result(False, f"Failed to get latest health metrics", response)
            return False
    except Exception as e:
        print_result(False, f"Error getting latest health metrics: {str(e)}")
        return False

def test_get_health_trends(patient_id):
    """Test getting health trends for a patient"""
    print_test_header("Get Health Trends (30 days)")
    
    try:
        response = requests.get(f"{BASE_URL}/health-metrics/patient/{patient_id}/trends?days=30")
        if response.status_code == 200:
            trends = response.json()
            print_result(True, "Health trends retrieved successfully")
            print(f"Patient ID: {trends.get('patient_id', 'N/A')}")
            print(f"Days: {trends.get('days', 'N/A')}")
            print(f"Data Points: {trends.get('data_points', 'N/A')}")
            
            trends_data = trends.get('trends', {})
            if trends_data:
                print("Average Trends:")
                for key, value in trends_data.items():
                    print(f"  {key}: {value}")
            
            return True
        else:
            print_result(False, f"Failed to get health trends", response)
            return False
    except Exception as e:
        print_result(False, f"Error getting health trends: {str(e)}")
        return False

def test_heart_rate_validation():
    """Test heart rate validation (should be between 30-200 bpm)"""
    print_test_header("Heart Rate Validation Testing")
    
    # Get a patient ID first
    try:
        response = requests.get(f"{BASE_URL}/users?role=patient")
        if response.status_code != 200:
            print_result(False, "Could not get patient for validation test")
            return False
        
        patients = response.json()
        if not patients:
            print_result(False, "No patients available for validation test")
            return False
        
        patient_id = patients[0]['id']
        
        # Test valid heart rate (within range)
        valid_data = {
            "patient_id": patient_id,
            "resting_heart_rate": 75,  # Valid
            "load_monitoring": 5,
            "hydration_level": 7,
            "sleep_quality": 7
        }
        
        response = requests.post(f"{BASE_URL}/health-metrics", json=valid_data)
        if response.status_code == 200:
            print_result(True, "Valid heart rate (75 bpm) accepted")
        else:
            print_result(False, f"Valid heart rate rejected", response)
            return False
        
        # Test invalid heart rate (too low)
        invalid_low_data = {
            "patient_id": patient_id,
            "resting_heart_rate": 25,  # Invalid - too low
            "load_monitoring": 5,
            "hydration_level": 7,
            "sleep_quality": 7
        }
        
        response = requests.post(f"{BASE_URL}/health-metrics", json=invalid_low_data)
        if response.status_code == 422 or response.status_code == 400:
            print_result(True, "Invalid heart rate (25 bpm - too low) correctly rejected")
        else:
            print_result(False, f"Invalid low heart rate was accepted (should be rejected)", response)
        
        # Test invalid heart rate (too high)
        invalid_high_data = {
            "patient_id": patient_id,
            "resting_heart_rate": 250,  # Invalid - too high
            "load_monitoring": 5,
            "hydration_level": 7,
            "sleep_quality": 7
        }
        
        response = requests.post(f"{BASE_URL}/health-metrics", json=invalid_high_data)
        if response.status_code == 422 or response.status_code == 400:
            print_result(True, "Invalid heart rate (250 bpm - too high) correctly rejected")
        else:
            print_result(False, f"Invalid high heart rate was accepted (should be rejected)", response)
        
        # Test boundary values
        boundary_low_data = {
            "patient_id": patient_id,
            "resting_heart_rate": 30,  # Boundary - should be valid
            "load_monitoring": 5,
            "hydration_level": 7,
            "sleep_quality": 7
        }
        
        response = requests.post(f"{BASE_URL}/health-metrics", json=boundary_low_data)
        if response.status_code == 200:
            print_result(True, "Boundary heart rate (30 bpm) accepted")
        else:
            print_result(False, f"Boundary low heart rate rejected", response)
        
        boundary_high_data = {
            "patient_id": patient_id,
            "resting_heart_rate": 200,  # Boundary - should be valid
            "load_monitoring": 5,
            "hydration_level": 7,
            "sleep_quality": 7
        }
        
        response = requests.post(f"{BASE_URL}/health-metrics", json=boundary_high_data)
        if response.status_code == 200:
            print_result(True, "Boundary heart rate (200 bpm) accepted")
            return True
        else:
            print_result(False, f"Boundary high heart rate rejected", response)
            return False
            
    except Exception as e:
        print_result(False, f"Error in heart rate validation testing: {str(e)}")
        return False

def test_additional_health_metrics_endpoints():
    """Test additional health metrics functionality"""
    print_test_header("Additional Health Metrics Tests")
    
    try:
        # Test getting all health metrics (no filters)
        response = requests.get(f"{BASE_URL}/health-metrics")
        if response.status_code == 200:
            all_metrics = response.json()
            print_result(True, f"Retrieved all health metrics: {len(all_metrics)} entries")
        else:
            print_result(False, f"Failed to get all health metrics", response)
        
        # Test with limit parameter
        response = requests.get(f"{BASE_URL}/health-metrics?limit=5")
        if response.status_code == 200:
            limited_metrics = response.json()
            print_result(True, f"Retrieved limited health metrics: {len(limited_metrics)} entries (max 5)")
        else:
            print_result(False, f"Failed to get limited health metrics", response)
        
        return True
        
    except Exception as e:
        print_result(False, f"Error in additional health metrics tests: {str(e)}")
        return False

def main():
    """Main test execution"""
    print("🏥 HEALTH METRICS API TESTING")
    print("=" * 60)
    print(f"Testing against: {BASE_URL}")
    print("=" * 60)
    
    test_results = []
    
    # Step 1: Seed the database
    seed_success = test_seed_database()
    test_results.append(("Seed Database", seed_success))
    
    if not seed_success:
        print("\n❌ Cannot proceed without seeded database")
        return False
    
    # Step 2: Get patient users
    patient_id = test_get_patient_users()
    test_results.append(("Get Patient Users", patient_id is not None))
    
    if not patient_id:
        print("\n❌ Cannot proceed without patient ID")
        return False
    
    # Step 3: Create health metrics
    metrics_id = test_create_health_metrics(patient_id)
    test_results.append(("Create Health Metrics", metrics_id is not None))
    
    # Step 4: Get health metrics by patient ID
    get_by_patient_success = test_get_health_metrics_by_patient(patient_id)
    test_results.append(("Get Health Metrics by Patient", get_by_patient_success))
    
    # Step 5: Get latest health metrics
    get_latest_success = test_get_latest_health_metrics(patient_id)
    test_results.append(("Get Latest Health Metrics", get_latest_success))
    
    # Step 6: Get health trends
    get_trends_success = test_get_health_trends(patient_id)
    test_results.append(("Get Health Trends", get_trends_success))
    
    # Step 7: Test heart rate validation
    validation_success = test_heart_rate_validation()
    test_results.append(("Heart Rate Validation", validation_success))
    
    # Step 8: Additional tests
    additional_success = test_additional_health_metrics_endpoints()
    test_results.append(("Additional Health Metrics Tests", additional_success))
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = 0
    total = len(test_results)
    
    for test_name, success in test_results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if success:
            passed += 1
    
    print(f"\nResults: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL HEALTH METRICS API TESTS PASSED!")
        return True
    else:
        print("⚠️  Some tests failed - check logs above")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)