#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class PoseidonAPITester:
    def __init__(self, base_url: str = "https://poseidon-timetrack.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.employee_token = None
        self.test_project_id = None
        self.test_user_id = None
        self.test_time_entry_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
        if details:
            print(f"    {details}")
        
        if success:
            self.tests_passed += 1
        else:
            self.failed_tests.append({"test": test_name, "details": details})

    def make_request(self, method: str, endpoint: str, data: Dict = None, token: str = None, expected_status: int = 200) -> tuple:
        """Make HTTP request and return success status and response"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}
            
            return success, response_data

        except Exception as e:
            return False, {"error": str(e)}

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.make_request(
            'POST', 
            'auth/login',
            {'email': 'admin@poseidon.com', 'password': 'admin123'}
        )
        
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            self.log_test("Admin Login", True, f"Token received, user: {response['user']['email']}")
            return True
        else:
            self.log_test("Admin Login", False, f"Response: {response}")
            return False

    def test_employee_login(self):
        """Test employee login"""
        success, response = self.make_request(
            'POST', 
            'auth/login',
            {'email': 'manager1@poseidon.com', 'password': 'manager123'}
        )
        
        if success and 'access_token' in response:
            self.employee_token = response['access_token']
            self.log_test("Employee Login", True, f"Token received, user: {response['user']['email']}")
            return True
        else:
            self.log_test("Employee Login", False, f"Response: {response}")
            return False

    def test_auth_me(self):
        """Test /auth/me endpoint"""
        success, response = self.make_request('GET', 'auth/me', token=self.admin_token)
        
        if success and 'email' in response:
            self.log_test("Auth Me", True, f"User info retrieved: {response['email']}")
            return True
        else:
            self.log_test("Auth Me", False, f"Response: {response}")
            return False

    def test_get_users(self):
        """Test get users endpoint"""
        success, response = self.make_request('GET', 'users', token=self.admin_token)
        
        if success and isinstance(response, list):
            self.log_test("Get Users", True, f"Retrieved {len(response)} users")
            return True
        else:
            self.log_test("Get Users", False, f"Response: {response}")
            return False

    def test_create_project(self):
        """Test project creation"""
        project_data = {
            "name": "Test Project API",
            "code": "TEST-API",
            "description": "Test project for API testing",
            "client": "Test Client",
            "start_date": datetime.now().isoformat(),
            "budget_hours": 100.0,
            "disciplines": ["STR", "CVC"]
        }
        
        success, response = self.make_request('POST', 'projects', project_data, self.admin_token)
        
        if success and 'id' in response:
            self.test_project_id = response['id']
            self.log_test("Create Project", True, f"Project created with ID: {self.test_project_id}")
            return True
        else:
            self.log_test("Create Project", False, f"Response: {response}")
            return False

    def test_get_projects(self):
        """Test get projects endpoint"""
        success, response = self.make_request('GET', 'projects', token=self.admin_token)
        
        if success and isinstance(response, list):
            self.log_test("Get Projects", True, f"Retrieved {len(response)} projects")
            return True
        else:
            self.log_test("Get Projects", False, f"Response: {response}")
            return False

    def test_create_time_entry(self):
        """Test time entry creation"""
        if not self.test_project_id:
            self.log_test("Create Time Entry", False, "No test project available")
            return False
            
        time_entry_data = {
            "project_id": self.test_project_id,
            "date": datetime.now().isoformat(),
            "discipline": "STR",
            "activity": "APS",
            "service_type": "Dessin",
            "task_description": "Test task",
            "hours": 8.0,
            "day_type": "présentiel"
        }
        
        success, response = self.make_request('POST', 'time-entries', time_entry_data, self.admin_token)
        
        if success and 'id' in response:
            self.test_time_entry_id = response['id']
            self.log_test("Create Time Entry", True, f"Time entry created with ID: {self.test_time_entry_id}")
            return True
        else:
            self.log_test("Create Time Entry", False, f"Response: {response}")
            return False

    def test_get_time_entries(self):
        """Test get time entries endpoint"""
        success, response = self.make_request('GET', 'time-entries', token=self.admin_token)
        
        if success and isinstance(response, list):
            self.log_test("Get Time Entries", True, f"Retrieved {len(response)} time entries")
            return True
        else:
            self.log_test("Get Time Entries", False, f"Response: {response}")
            return False

    def test_dashboard_global(self):
        """Test global dashboard endpoint"""
        success, response = self.make_request('GET', 'dashboard/global', token=self.admin_token)
        
        if success and 'total_hours' in response:
            self.log_test("Dashboard Global", True, f"Dashboard data retrieved, total hours: {response['total_hours']}")
            return True
        else:
            self.log_test("Dashboard Global", False, f"Response: {response}")
            return False

    def test_dashboard_personal(self):
        """Test personal dashboard endpoint"""
        success, response = self.make_request('GET', 'dashboard/personal', token=self.admin_token)
        
        if success and 'week_hours' in response:
            self.log_test("Dashboard Personal", True, f"Personal dashboard retrieved, week hours: {response['week_hours']}")
            return True
        else:
            self.log_test("Dashboard Personal", False, f"Response: {response}")
            return False

    def test_change_password(self):
        """Test password change"""
        password_data = {
            "old_password": "admin123",
            "new_password": "newpass123"
        }
        
        success, response = self.make_request('POST', 'auth/change-password', password_data, self.admin_token)
        
        if success:
            # Change it back
            password_data_back = {
                "old_password": "newpass123",
                "new_password": "admin123"
            }
            success_back, _ = self.make_request('POST', 'auth/change-password', password_data_back, self.admin_token)
            
            if success_back:
                self.log_test("Change Password", True, "Password changed and reverted successfully")
                return True
            else:
                self.log_test("Change Password", False, "Could not revert password")
                return False
        else:
            self.log_test("Change Password", False, f"Response: {response}")
            return False

    def test_unauthorized_access(self):
        """Test unauthorized access"""
        success, response = self.make_request('GET', 'users', expected_status=401)
        
        if not success:  # We expect this to fail (401)
            self.log_test("Unauthorized Access Protection", True, "Correctly blocked unauthorized access")
            return True
        else:
            self.log_test("Unauthorized Access Protection", False, "Should have blocked unauthorized access")
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting POSÉIDON API Tests")
        print("=" * 50)
        
        # Authentication tests
        if not self.test_admin_login():
            print("❌ Admin login failed - stopping tests")
            return False
            
        self.test_employee_login()
        self.test_auth_me()
        self.test_unauthorized_access()
        
        # User management tests
        self.test_get_users()
        
        # Project tests
        self.test_create_project()
        self.test_get_projects()
        
        # Time entry tests
        self.test_create_time_entry()
        self.test_get_time_entries()
        
        # Dashboard tests
        self.test_dashboard_global()
        self.test_dashboard_personal()
        
        # Security tests
        self.test_change_password()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = PoseidonAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())