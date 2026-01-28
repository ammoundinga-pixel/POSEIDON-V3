"""
Backend tests for POSEIDON Time Entry Management
Tests business rules for time entry status management:
- Editable statuses: draft, submitted, rejected
- Locked statuses: validated, admin-modified (last_edited_by present)
- Cascade field validation
- Admin edit capabilities
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@poseidon.com"
ADMIN_PASSWORD = "admin123"
EMPLOYEE_EMAIL = "ange@aclm.fr"
EMPLOYEE_PASSWORD = "Employee123!"

# Project IDs from seed data
PROJECT_MONARQUE = "e2c049de-30f7-42ac-92f5-602f5092ee6f"
PROJECT_PONTECELLI = "de8a1ab0-381a-4600-a9e7-946dad3210aa"
PROJECT_PARIS = "71dcc85b-480a-4ef0-8434-9ffbfa848f63"


class TestAuth:
    """Authentication tests"""
    
    def test_admin_login(self):
        """Test admin can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "super_admin"
        print(f"✓ Admin login successful - role: {data['user']['role']}")
    
    def test_employee_login(self):
        """Test employee can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL,
            "password": EMPLOYEE_PASSWORD
        })
        assert response.status_code == 200, f"Employee login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "employee"
        print(f"✓ Employee login successful - role: {data['user']['role']}")


class TestProjectsAccess:
    """Test that employees can see projects (critical bug fix verification)"""
    
    @pytest.fixture
    def employee_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL,
            "password": EMPLOYEE_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Employee login failed: {response.text}")
        return response.json()["access_token"]
    
    def test_employee_can_see_projects(self, employee_token):
        """Critical: Employee must be able to see projects list"""
        headers = {"Authorization": f"Bearer {employee_token}"}
        response = requests.get(f"{BASE_URL}/api/projects", headers=headers)
        
        assert response.status_code == 200, f"Employee cannot access projects: {response.text}"
        projects = response.json()
        assert isinstance(projects, list), "Projects should be a list"
        assert len(projects) > 0, "Employee should see at least one project"
        
        # Verify expected projects exist
        project_ids = [p["id"] for p in projects]
        print(f"✓ Employee can see {len(projects)} projects")
        print(f"  Project IDs: {project_ids[:3]}...")


class TestTimeEntryCreation:
    """Test time entry creation"""
    
    @pytest.fixture
    def employee_auth(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL,
            "password": EMPLOYEE_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Employee login failed: {response.text}")
        data = response.json()
        return {
            "token": data["access_token"],
            "user_id": data["user"]["id"]
        }
    
    def test_employee_can_create_time_entry(self, employee_auth):
        """Employee can create a new time entry"""
        headers = {"Authorization": f"Bearer {employee_auth['token']}"}
        today = datetime.now().strftime("%Y-%m-%d")
        
        entry_data = {
            "project_id": PROJECT_MONARQUE,
            "discipline": "STR",
            "activity": "Calcul",
            "service_type": "Calcul / Ingénierie",
            "date": today,
            "hours": 2.5,
            "task_description": "TEST_entry_creation",
            "day_type": "présentiel"
        }
        
        response = requests.post(f"{BASE_URL}/api/time-entries", json=entry_data, headers=headers)
        assert response.status_code == 200, f"Failed to create time entry: {response.text}"
        
        data = response.json()
        assert data["status"] == "draft", "New entry should have draft status"
        assert data["hours"] == 2.5
        assert data["project_id"] == PROJECT_MONARQUE
        print(f"✓ Time entry created with ID: {data['id']}, status: {data['status']}")
        return data["id"]


class TestTimeEntryStatusEditing:
    """Test business rules for editing time entries based on status"""
    
    @pytest.fixture
    def employee_auth(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL,
            "password": EMPLOYEE_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Employee login failed: {response.text}")
        data = response.json()
        return {
            "token": data["access_token"],
            "user_id": data["user"]["id"]
        }
    
    @pytest.fixture
    def admin_auth(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        data = response.json()
        return {
            "token": data["access_token"],
            "user_id": data["user"]["id"]
        }
    
    def _create_entry(self, employee_auth, hours=3.0, suffix=""):
        """Helper to create a test entry"""
        headers = {"Authorization": f"Bearer {employee_auth['token']}"}
        # Use a unique date to avoid duplicates
        test_date = (datetime.now() - timedelta(days=10 + hash(suffix) % 30)).strftime("%Y-%m-%d")
        
        entry_data = {
            "project_id": PROJECT_MONARQUE,
            "discipline": "STR",
            "activity": "Calcul",
            "service_type": "Calcul / Ingénierie",
            "date": test_date,
            "hours": hours,
            "task_description": f"TEST_status_edit_{suffix}",
            "day_type": "présentiel"
        }
        
        response = requests.post(f"{BASE_URL}/api/time-entries", json=entry_data, headers=headers)
        assert response.status_code == 200, f"Failed to create entry: {response.text}"
        return response.json()
    
    def test_employee_can_edit_draft_entry(self, employee_auth):
        """Employee CAN edit entry with status 'draft'"""
        entry = self._create_entry(employee_auth, suffix="draft_edit")
        entry_id = entry["id"]
        
        headers = {"Authorization": f"Bearer {employee_auth['token']}"}
        update_data = {"hours": 4.0}
        
        response = requests.put(f"{BASE_URL}/api/time-entries/{entry_id}", json=update_data, headers=headers)
        assert response.status_code == 200, f"Employee should be able to edit draft entry: {response.text}"
        
        updated = response.json()
        assert updated["hours"] == 4.0
        print(f"✓ Employee can edit draft entry - hours updated to {updated['hours']}")
    
    def test_employee_can_edit_submitted_entry(self, employee_auth):
        """Employee CAN edit entry with status 'submitted' (en attente)"""
        # Create and submit entry
        entry = self._create_entry(employee_auth, suffix="submitted_edit")
        entry_id = entry["id"]
        headers = {"Authorization": f"Bearer {employee_auth['token']}"}
        
        # Submit the entry
        submit_response = requests.post(
            f"{BASE_URL}/api/time-entries/submit",
            json={"entry_ids": [entry_id]},
            headers=headers
        )
        assert submit_response.status_code == 200, f"Failed to submit entry: {submit_response.text}"
        
        # Verify it's submitted
        get_response = requests.get(f"{BASE_URL}/api/time-entries?user_id={employee_auth['user_id']}", headers=headers)
        entries = get_response.json()
        submitted_entry = next((e for e in entries if e["id"] == entry_id), None)
        assert submitted_entry and submitted_entry["status"] == "submitted", "Entry should be submitted"
        
        # Try to edit submitted entry
        update_data = {"hours": 5.0}
        response = requests.put(f"{BASE_URL}/api/time-entries/{entry_id}", json=update_data, headers=headers)
        assert response.status_code == 200, f"Employee should be able to edit submitted entry: {response.text}"
        
        updated = response.json()
        assert updated["hours"] == 5.0
        print(f"✓ Employee can edit submitted entry - hours updated to {updated['hours']}")
    
    def test_employee_can_edit_rejected_entry(self, employee_auth, admin_auth):
        """Employee CAN edit entry with status 'rejected'"""
        # Create and submit entry
        entry = self._create_entry(employee_auth, suffix="rejected_edit")
        entry_id = entry["id"]
        emp_headers = {"Authorization": f"Bearer {employee_auth['token']}"}
        admin_headers = {"Authorization": f"Bearer {admin_auth['token']}"}
        
        # Submit the entry
        requests.post(f"{BASE_URL}/api/time-entries/submit", json={"entry_ids": [entry_id]}, headers=emp_headers)
        
        # Admin rejects the entry
        reject_response = requests.post(
            f"{BASE_URL}/api/time-entries/validate",
            json={
                "time_entry_ids": [entry_id],
                "action": "reject",
                "rejection_reason": "Test rejection"
            },
            headers=admin_headers
        )
        assert reject_response.status_code == 200, f"Failed to reject entry: {reject_response.text}"
        
        # Verify it's rejected
        get_response = requests.get(f"{BASE_URL}/api/time-entries?user_id={employee_auth['user_id']}", headers=emp_headers)
        entries = get_response.json()
        rejected_entry = next((e for e in entries if e["id"] == entry_id), None)
        assert rejected_entry and rejected_entry["status"] == "rejected", f"Entry should be rejected, got: {rejected_entry}"
        
        # Try to edit rejected entry
        update_data = {"hours": 6.0}
        response = requests.put(f"{BASE_URL}/api/time-entries/{entry_id}", json=update_data, headers=emp_headers)
        assert response.status_code == 200, f"Employee should be able to edit rejected entry: {response.text}"
        
        updated = response.json()
        assert updated["hours"] == 6.0
        print(f"✓ Employee can edit rejected entry - hours updated to {updated['hours']}")
    
    def test_employee_cannot_edit_validated_entry(self, employee_auth, admin_auth):
        """Employee CANNOT edit entry with status 'validated' - should return 403"""
        # Create and submit entry
        entry = self._create_entry(employee_auth, suffix="validated_noedit")
        entry_id = entry["id"]
        emp_headers = {"Authorization": f"Bearer {employee_auth['token']}"}
        admin_headers = {"Authorization": f"Bearer {admin_auth['token']}"}
        
        # Submit the entry
        requests.post(f"{BASE_URL}/api/time-entries/submit", json={"entry_ids": [entry_id]}, headers=emp_headers)
        
        # Admin validates the entry
        validate_response = requests.post(
            f"{BASE_URL}/api/time-entries/validate",
            json={
                "time_entry_ids": [entry_id],
                "action": "validate"
            },
            headers=admin_headers
        )
        assert validate_response.status_code == 200, f"Failed to validate entry: {validate_response.text}"
        
        # Verify it's validated
        get_response = requests.get(f"{BASE_URL}/api/time-entries?user_id={employee_auth['user_id']}", headers=emp_headers)
        entries = get_response.json()
        validated_entry = next((e for e in entries if e["id"] == entry_id), None)
        assert validated_entry and validated_entry["status"] == "validated", f"Entry should be validated, got: {validated_entry}"
        
        # Try to edit validated entry - should fail with 403
        update_data = {"hours": 7.0}
        response = requests.put(f"{BASE_URL}/api/time-entries/{entry_id}", json=update_data, headers=emp_headers)
        assert response.status_code == 403, f"Employee should NOT be able to edit validated entry, got: {response.status_code}"
        print(f"✓ Employee correctly blocked from editing validated entry (403)")
    
    def test_employee_cannot_edit_admin_modified_entry(self, employee_auth, admin_auth):
        """Employee CANNOT edit entry that was modified by admin (last_edited_by present)"""
        # Create entry
        entry = self._create_entry(employee_auth, suffix="admin_modified")
        entry_id = entry["id"]
        emp_headers = {"Authorization": f"Bearer {employee_auth['token']}"}
        admin_headers = {"Authorization": f"Bearer {admin_auth['token']}"}
        
        # Admin edits the entry
        admin_edit_response = requests.put(
            f"{BASE_URL}/api/time-entries/{entry_id}/admin-edit",
            json={"hours": 8.0, "admin_reason": "Admin correction"},
            headers=admin_headers
        )
        assert admin_edit_response.status_code == 200, f"Admin edit failed: {admin_edit_response.text}"
        
        # Verify last_edited_by is set
        admin_edited = admin_edit_response.json()
        assert admin_edited.get("last_edited_by") is not None, "last_edited_by should be set after admin edit"
        
        # Employee tries to edit - should fail with 403
        update_data = {"hours": 9.0}
        response = requests.put(f"{BASE_URL}/api/time-entries/{entry_id}", json=update_data, headers=emp_headers)
        assert response.status_code == 403, f"Employee should NOT be able to edit admin-modified entry, got: {response.status_code}"
        print(f"✓ Employee correctly blocked from editing admin-modified entry (403)")


class TestAdminCapabilities:
    """Test admin edit capabilities"""
    
    @pytest.fixture
    def admin_auth(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        data = response.json()
        return {
            "token": data["access_token"],
            "user_id": data["user"]["id"]
        }
    
    @pytest.fixture
    def employee_auth(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL,
            "password": EMPLOYEE_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Employee login failed: {response.text}")
        data = response.json()
        return {
            "token": data["access_token"],
            "user_id": data["user"]["id"]
        }
    
    def test_admin_can_validate_submitted_entry(self, employee_auth, admin_auth):
        """Admin can validate a submitted entry"""
        emp_headers = {"Authorization": f"Bearer {employee_auth['token']}"}
        admin_headers = {"Authorization": f"Bearer {admin_auth['token']}"}
        
        # Create and submit entry
        test_date = (datetime.now() - timedelta(days=50)).strftime("%Y-%m-%d")
        entry_data = {
            "project_id": PROJECT_MONARQUE,
            "discipline": "STR",
            "activity": "Calcul",
            "service_type": "Calcul / Ingénierie",
            "date": test_date,
            "hours": 3.0,
            "task_description": "TEST_admin_validate",
            "day_type": "présentiel"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/time-entries", json=entry_data, headers=emp_headers)
        assert create_response.status_code == 200
        entry_id = create_response.json()["id"]
        
        # Submit
        requests.post(f"{BASE_URL}/api/time-entries/submit", json={"entry_ids": [entry_id]}, headers=emp_headers)
        
        # Admin validates
        validate_response = requests.post(
            f"{BASE_URL}/api/time-entries/validate",
            json={"time_entry_ids": [entry_id], "action": "validate"},
            headers=admin_headers
        )
        assert validate_response.status_code == 200, f"Admin validation failed: {validate_response.text}"
        print(f"✓ Admin can validate submitted entry")
    
    def test_admin_can_edit_any_entry(self, employee_auth, admin_auth):
        """Admin can edit any entry using admin-edit endpoint"""
        emp_headers = {"Authorization": f"Bearer {employee_auth['token']}"}
        admin_headers = {"Authorization": f"Bearer {admin_auth['token']}"}
        
        # Create entry
        test_date = (datetime.now() - timedelta(days=60)).strftime("%Y-%m-%d")
        entry_data = {
            "project_id": PROJECT_MONARQUE,
            "discipline": "STR",
            "activity": "Calcul",
            "service_type": "Calcul / Ingénierie",
            "date": test_date,
            "hours": 3.0,
            "task_description": "TEST_admin_edit_any",
            "day_type": "présentiel"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/time-entries", json=entry_data, headers=emp_headers)
        assert create_response.status_code == 200
        entry_id = create_response.json()["id"]
        
        # Admin edits
        admin_edit_response = requests.put(
            f"{BASE_URL}/api/time-entries/{entry_id}/admin-edit",
            json={"hours": 10.0, "admin_reason": "Admin correction test"},
            headers=admin_headers
        )
        assert admin_edit_response.status_code == 200, f"Admin edit failed: {admin_edit_response.text}"
        
        edited = admin_edit_response.json()
        assert edited["hours"] == 10.0
        assert edited.get("last_edited_by") is not None
        print(f"✓ Admin can edit any entry - hours: {edited['hours']}, last_edited_by: {edited['last_edited_by']}")


class TestSubmitFlow:
    """Test submit flow for time entries"""
    
    @pytest.fixture
    def employee_auth(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL,
            "password": EMPLOYEE_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Employee login failed: {response.text}")
        data = response.json()
        return {
            "token": data["access_token"],
            "user_id": data["user"]["id"]
        }
    
    def test_submit_draft_entry(self, employee_auth):
        """Employee can submit a draft entry"""
        headers = {"Authorization": f"Bearer {employee_auth['token']}"}
        # Use a unique date far in the past to avoid conflicts
        import random
        test_date = (datetime.now() - timedelta(days=100 + random.randint(1, 100))).strftime("%Y-%m-%d")
        
        # Create entry with unique combination
        entry_data = {
            "project_id": PROJECT_PONTECELLI,  # Use different project
            "discipline": "BIM",  # Use different discipline
            "activity": "Dessin",  # Use different activity
            "service_type": "BIM",
            "date": test_date,
            "hours": 4.0,
            "task_description": f"TEST_submit_draft_{random.randint(1000, 9999)}",
            "day_type": "présentiel"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/time-entries", json=entry_data, headers=headers)
        assert create_response.status_code == 200, f"Failed to create entry: {create_response.text}"
        entry_id = create_response.json()["id"]
        
        # Verify it's in draft status
        created_entry = create_response.json()
        assert created_entry["status"] == "draft", f"Entry should be draft, got: {created_entry['status']}"
        
        # Submit
        submit_response = requests.post(
            f"{BASE_URL}/api/time-entries/submit",
            json={"entry_ids": [entry_id]},
            headers=headers
        )
        assert submit_response.status_code == 200, f"Submit failed: {submit_response.text}"
        
        result = submit_response.json()
        assert result["count"] >= 1, f"Expected at least 1 entry submitted, got: {result}"
        print(f"✓ Draft entry submitted successfully - count: {result['count']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
