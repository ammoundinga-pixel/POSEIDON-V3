# Additional routes for projects, time entries, dashboard
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta

def add_project_routes(api_router, db, get_current_user):
    @api_router.get('/projects')
    async def get_projects(current_user: dict = Depends(get_current_user)):
        projects = await db.projects.find({'status': {'$ne': 'archived'}}, {'_id': 0}).to_list(1000)
        return projects

    @api_router.post('/projects')
    async def create_project(project_data: Dict[str, Any] = Body(...), current_user: dict = Depends(get_current_user)):
        if current_user['role'] not in ['super_admin', 'admin', 'manager']:
            raise HTTPException(403, 'Not enough permissions')
        from uuid import uuid4
        project_id = str(uuid4())
        project = {
            'id': project_id,
            **project_data,
            'status': project_data.get('status', 'active'),
            'team_members': [],
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        if 'start_date' in project and isinstance(project['start_date'], datetime):
            project['start_date'] = project['start_date'].isoformat()
        if 'end_date' in project and project['end_date'] and isinstance(project['end_date'], datetime):
            project['end_date'] = project['end_date'].isoformat()
        
        # Insert and return without MongoDB _id
        await db.projects.insert_one(project)
        return {k: v for k, v in project.items() if k != '_id'}

    @api_router.put('/projects/{project_id}')
    async def update_project(project_id: str, project_data: dict, current_user: dict = Depends(get_current_user)):
        if current_user['role'] not in ['super_admin', 'admin', 'manager']:
            raise HTTPException(403, 'Not enough permissions')
        update_data = {k: v for k, v in project_data.items() if v is not None}
        if update_data:
            if 'start_date' in update_data and isinstance(update_data['start_date'], datetime):
                update_data['start_date'] = update_data['start_date'].isoformat()
            if 'end_date' in update_data and update_data['end_date'] and isinstance(update_data['end_date'], datetime):
                update_data['end_date'] = update_data['end_date'].isoformat()
            update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
            await db.projects.update_one({'id': project_id}, {'$set': update_data})
        return await db.projects.find_one({'id': project_id}, {'_id': 0})
    
    @api_router.put('/projects/{project_id}/archive')
    async def archive_project(project_id: str, current_user: dict = Depends(get_current_user)):
        if current_user['role'] not in ['super_admin', 'admin']:
            raise HTTPException(403, 'Not enough permissions')
        
        project = await db.projects.find_one({'id': project_id})
        if not project:
            raise HTTPException(404, 'Project not found')
        
        await db.projects.update_one(
            {'id': project_id},
            {'$set': {
                'status': 'archived',
                'archived_at': datetime.now(timezone.utc).isoformat(),
                'archived_by': current_user['id'],
                'updated_at': datetime.now(timezone.utc).isoformat()
            }}
        )
        return {'message': 'Project archived successfully'}
    
    @api_router.delete('/projects/{project_id}')
    async def delete_project(project_id: str, force: bool = False, current_user: dict = Depends(get_current_user)):
        if current_user['role'] not in ['super_admin', 'admin']:
            raise HTTPException(403, 'Only admins can delete projects')
        
        project = await db.projects.find_one({'id': project_id})
        if not project:
            raise HTTPException(404, 'Project not found')
        
        # Check if project has time entries
        time_entries_count = await db.time_entries.count_documents({'project_id': project_id})
        
        if time_entries_count > 0 and not force:
            return {
                'can_delete': False,
                'has_time_entries': True,
                'time_entries_count': time_entries_count,
                'message': f'Ce projet contient {time_entries_count} saisie(s) de temps. Archivage recommandé.',
                'actions': {
                    'archive': f'/api/projects/{project_id}/archive',
                    'force_delete': f'/api/projects/{project_id}?force=true'
                }
            }
        
        # Perform deletion
        if force:
            # Also delete associated time entries if force delete
            await db.time_entries.delete_many({'project_id': project_id})
        
        await db.projects.delete_one({'id': project_id})
        return {
            'message': 'Project deleted successfully',
            'deleted_time_entries': time_entries_count if force else 0
        }

def add_time_entry_routes(api_router, db, get_current_user):
    def normalize_date(date_str: str) -> str:
        """Normalize date string to YYYY-MM-DD format for comparison"""
        if not date_str:
            return date_str
        # Extract just the date part (YYYY-MM-DD)
        return date_str.split('T')[0]
    
    @api_router.get('/time-entries')
    async def get_time_entries(user_id: Optional[str] = None, project_id: Optional[str] = None,
                               start_date: Optional[str] = None, end_date: Optional[str] = None,
                               status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
        query = {}
        if current_user['role'] == 'employee':
            query['user_id'] = current_user['id']
        elif user_id:
            query['user_id'] = user_id
        if project_id:
            query['project_id'] = project_id
        if status:
            query['status'] = status
        
        # Fetch all entries matching non-date criteria first
        entries = await db.time_entries.find(query, {'_id': 0}).to_list(10000)
        
        # Filter by date in Python for accurate comparison
        if start_date or end_date:
            start_normalized = normalize_date(start_date) if start_date else None
            end_normalized = normalize_date(end_date) if end_date else None
            
            filtered_entries = []
            for entry in entries:
                entry_date = normalize_date(entry.get('date', ''))
                if start_normalized and entry_date < start_normalized:
                    continue
                if end_normalized and entry_date > end_normalized:
                    continue
                filtered_entries.append(entry)
            return filtered_entries
        
        return entries

    @api_router.post('/time-entries')
    async def create_time_entry(entry_data: dict, current_user: dict = Depends(get_current_user)):
        from uuid import uuid4
        date_str = entry_data.get('date')
        if isinstance(date_str, str):
            date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        else:
            date_obj = date_str
        
        # Normalize date for duplicate check
        normalized_date = date_obj.date().isoformat()
        
        # Check for duplicates (same user, project, discipline, activity, service_type, and date)
        existing = await db.time_entries.find_one({
            'user_id': current_user['id'],
            'project_id': entry_data['project_id'],
            'discipline': entry_data['discipline'],
            'activity': entry_data['activity'],
            'service_type': entry_data['service_type'],
            'date': {'$regex': f'^{normalized_date}'}
        })
        
        if existing:
            # Update existing entry instead of creating duplicate
            await db.time_entries.update_one(
                {'id': existing['id']},
                {'$set': {
                    'hours': float(entry_data['hours']),
                    'task_description': entry_data.get('task_description', ''),
                    'day_type': entry_data.get('day_type', 'présentiel'),
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }}
            )
            updated = await db.time_entries.find_one({'id': existing['id']}, {'_id': 0})
            return updated
        
        week_number = date_obj.isocalendar()[1]
        entry = {
            'id': str(uuid4()),
            'user_id': current_user['id'],
            'project_id': entry_data['project_id'],
            'date': date_obj.isoformat() if isinstance(date_obj, datetime) else date_obj,
            'discipline': entry_data['discipline'],
            'activity': entry_data['activity'],
            'service_type': entry_data['service_type'],
            'task_description': entry_data.get('task_description', ''),
            'hours': float(entry_data['hours']),
            'day_type': entry_data.get('day_type', 'présentiel'),
            'status': 'draft',
            'week_number': week_number,
            'year': date_obj.year,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        await db.time_entries.insert_one(entry)
        # Return without _id
        return {k: v for k, v in entry.items() if k != '_id'}

    @api_router.put('/time-entries/{entry_id}/admin-edit')
    async def admin_edit_time_entry(entry_id: str, entry_data: dict, current_user: dict = Depends(get_current_user)):
        if current_user['role'] not in ['super_admin', 'admin', 'manager']:
            raise HTTPException(403, 'Admin permissions required')
        
        # Find the entry
        entry = await db.time_entries.find_one({'id': entry_id})
        if not entry:
            raise HTTPException(404, 'Entry not found')
        
        # Create audit log before modification
        audit_entry = {
            'id': str(__import__('uuid').uuid4()),
            'action': 'admin_edit',
            'entity_type': 'time_entry',
            'entity_id': entry_id,
            'performed_by': current_user['id'],
            'performed_at': datetime.now(timezone.utc).isoformat(),
            'old_values': {k: entry.get(k) for k in entry_data.keys() if k in entry},
            'new_values': entry_data,
            'reason': entry_data.get('admin_reason', 'Correction par admin')
        }
        await db.audit_log.insert_one(audit_entry)
        
        # Update the entry
        update_data = {}
        if 'hours' in entry_data:
            update_data['hours'] = float(entry_data['hours'])
        if 'project_id' in entry_data:
            update_data['project_id'] = entry_data['project_id']
        if 'discipline' in entry_data:
            update_data['discipline'] = entry_data['discipline']
        if 'activity' in entry_data:
            update_data['activity'] = entry_data['activity']
        if 'service_type' in entry_data:
            update_data['service_type'] = entry_data['service_type']
        if 'date' in entry_data:
            update_data['date'] = entry_data['date']
        if 'status' in entry_data:
            update_data['status'] = entry_data['status']
        
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        update_data['last_edited_by'] = current_user['id']
        update_data['last_edited_at'] = datetime.now(timezone.utc).isoformat()
        
        await db.time_entries.update_one({'id': entry_id}, {'$set': update_data})
        updated = await db.time_entries.find_one({'id': entry_id}, {'_id': 0})
        return updated

    @api_router.delete('/time-entries/{entry_id}/admin-delete')
    async def admin_delete_time_entry(entry_id: str, reason: str = '', current_user: dict = Depends(get_current_user)):
        if current_user['role'] not in ['super_admin', 'admin', 'manager']:
            raise HTTPException(403, 'Admin permissions required')
        
        entry = await db.time_entries.find_one({'id': entry_id})
        if not entry:
            raise HTTPException(404, 'Entry not found')
        
        # Create audit log
        audit_entry = {
            'id': str(__import__('uuid').uuid4()),
            'action': 'admin_delete',
            'entity_type': 'time_entry',
            'entity_id': entry_id,
            'performed_by': current_user['id'],
            'performed_at': datetime.now(timezone.utc).isoformat(),
            'deleted_data': {k: v for k, v in entry.items() if k != '_id'},
            'reason': reason or 'Suppression par admin'
        }
        await db.audit_log.insert_one(audit_entry)
        
        await db.time_entries.delete_one({'id': entry_id})
        return {'message': 'Entry deleted by admin', 'audit_id': audit_entry['id']}

    @api_router.get('/audit-log')
    async def get_audit_log(
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        limit: int = 100,
        current_user: dict = Depends(get_current_user)
    ):
        if current_user['role'] not in ['super_admin', 'admin']:
            raise HTTPException(403, 'Admin permissions required')
        
        query = {}
        if entity_type:
            query['entity_type'] = entity_type
        if entity_id:
            query['entity_id'] = entity_id
        
        logs = await db.audit_log.find(query, {'_id': 0}).sort('performed_at', -1).limit(limit).to_list(limit)
        return logs

    @api_router.put('/time-entries/{entry_id}')
    async def update_time_entry(entry_id: str, entry_data: dict, current_user: dict = Depends(get_current_user)):
        # Find the entry
        entry = await db.time_entries.find_one({'id': entry_id, 'user_id': current_user['id']})
        if not entry:
            raise HTTPException(404, 'Entry not found')
        
        # Business rules: user can edit only if status is draft, submitted (en attente), or rejected
        # User CANNOT edit if status is 'validated' or if last_edited_by is set (modified by admin)
        editable_statuses = ['draft', 'submitted', 'rejected']
        if entry['status'] not in editable_statuses:
            raise HTTPException(403, 'Cette saisie est validée et ne peut plus être modifiée')
        
        # If admin modified it, user cannot overwrite
        if entry.get('last_edited_by'):
            raise HTTPException(403, 'Cette saisie a été modifiée par un admin et ne peut plus être modifiée')
        
        update_data = {}
        if 'hours' in entry_data:
            update_data['hours'] = float(entry_data['hours'])
        if 'project_id' in entry_data:
            update_data['project_id'] = entry_data['project_id']
        if 'discipline' in entry_data:
            update_data['discipline'] = entry_data['discipline']
        if 'activity' in entry_data:
            update_data['activity'] = entry_data['activity']
        if 'service_type' in entry_data:
            update_data['service_type'] = entry_data['service_type']
        if 'task_description' in entry_data:
            update_data['task_description'] = entry_data['task_description']
        if 'day_type' in entry_data:
            update_data['day_type'] = entry_data['day_type']
        
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        await db.time_entries.update_one({'id': entry_id}, {'$set': update_data})
        updated = await db.time_entries.find_one({'id': entry_id}, {'_id': 0})
        return updated

    @api_router.delete('/time-entries/{entry_id}')
    async def delete_time_entry(entry_id: str, current_user: dict = Depends(get_current_user)):
        entry = await db.time_entries.find_one({'id': entry_id})
        if not entry:
            raise HTTPException(404, 'Entry not found')
        
        # Check permissions
        if entry['user_id'] != current_user['id'] and current_user['role'] not in ['super_admin', 'admin', 'manager']:
            raise HTTPException(403, 'Not enough permissions')
        
        # Employees can only delete entries that are NOT validated and NOT admin-modified
        if current_user['role'] == 'employee':
            if entry['status'] == 'validated':
                raise HTTPException(403, 'Impossible de supprimer une saisie validée')
            if entry.get('last_edited_by'):
                raise HTTPException(403, 'Impossible de supprimer une saisie modifiée par un admin')
        
        await db.time_entries.delete_one({'id': entry_id})
        return {'message': 'Entry deleted successfully'}

    @api_router.post('/time-entries/submit')
    async def submit_time_entries(data: dict = Body(...), current_user: dict = Depends(get_current_user)):
        # Accept both formats: {"entry_ids": [...]} or direct list
        if isinstance(data, dict):
            entry_ids = data.get('entry_ids', [])
        else:
            entry_ids = data
        
        result = await db.time_entries.update_many(
            {'id': {'$in': entry_ids}, 'user_id': current_user['id'], 'status': {'$in': ['draft', 'rejected']}},
            {'$set': {'status': 'submitted', 'submitted_at': datetime.now(timezone.utc).isoformat(),
                     'updated_at': datetime.now(timezone.utc).isoformat()}}
        )
        return {'message': f'{result.modified_count} entries submitted', 'count': result.modified_count}

    @api_router.post('/time-entries/validate')
    async def validate_time_entries(validation_data: dict, current_user: dict = Depends(get_current_user)):
        if current_user['role'] not in ['super_admin', 'admin', 'manager']:
            raise HTTPException(403, 'Not enough permissions')
        action = validation_data['action']
        if action == 'validate':
            result = await db.time_entries.update_many(
                {'id': {'$in': validation_data['time_entry_ids']}, 'status': 'submitted'},
                {'$set': {'status': 'validated', 'validated_at': datetime.now(timezone.utc).isoformat(),
                         'validated_by': current_user['id'], 'updated_at': datetime.now(timezone.utc).isoformat()}}
            )
        else:
            result = await db.time_entries.update_many(
                {'id': {'$in': validation_data['time_entry_ids']}, 'status': 'submitted'},
                {'$set': {'status': 'rejected', 'rejection_reason': validation_data.get('rejection_reason'),
                         'validated_by': current_user['id'], 'updated_at': datetime.now(timezone.utc).isoformat()}}
            )
        return {'message': f'{result.modified_count} entries {action}d', 'count': result.modified_count}

def add_dashboard_routes(api_router, db, get_current_user):
    @api_router.get('/dashboard/personal')
    async def get_personal_dashboard(current_user: dict = Depends(get_current_user)):
        today = datetime.now(timezone.utc)
        week_start = today - timedelta(days=today.weekday())
        month_start = today.replace(day=1)
        week_entries = await db.time_entries.find({'user_id': current_user['id'], 'date': {'$gte': week_start.isoformat()}}, {'_id': 0}).to_list(1000)
        month_entries = await db.time_entries.find({'user_id': current_user['id'], 'date': {'$gte': month_start.isoformat()}}, {'_id': 0}).to_list(10000)
        week_hours = sum(e['hours'] for e in week_entries if e['status'] != 'rejected')
        month_hours = sum(e['hours'] for e in month_entries if e['status'] != 'rejected')
        project_hours = {}
        service_hours = {}
        for e in month_entries:
            if e['status'] != 'rejected':
                project_hours[e['project_id']] = project_hours.get(e['project_id'], 0) + e['hours']
                service_hours[e['service_type']] = service_hours.get(e['service_type'], 0) + e['hours']
        return {'week_hours': week_hours, 'month_hours': month_hours, 'project_hours': project_hours,
                'service_hours': service_hours, 'capacity_per_day': current_user['capacity_hours_per_day'],
                'pending_entries': len([e for e in week_entries if e['status'] == 'draft'])}

    @api_router.get('/dashboard/team')
    async def get_team_dashboard(current_user: dict = Depends(get_current_user)):
        if current_user['role'] not in ['super_admin', 'admin', 'manager']:
            raise HTTPException(403, 'Not enough permissions')
        team_members = await db.users.find({'is_active': True}, {'_id': 0}).to_list(1000)
        return {'team_size': len(team_members), 'pending_validation': 0, 'user_workload': {}}

    @api_router.get('/dashboard/global')
    async def get_global_dashboard(
        current_user: dict = Depends(get_current_user),
        discipline: Optional[str] = None,
        activity: Optional[str] = None,
        service_type: Optional[str] = None,
        project_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ):
        if current_user['role'] not in ['super_admin', 'admin']:
            raise HTTPException(403, 'Not enough permissions')
        
        # Build query with filters
        query = {}
        today = datetime.now(timezone.utc)
        
        if not start_date:
            month_start = today.replace(day=1)
            query['date'] = {'$gte': month_start.isoformat()}
        else:
            query['date'] = {'$gte': start_date}
            if end_date:
                query['date']['$lte'] = end_date
        
        if discipline:
            query['discipline'] = discipline
        if activity:
            query['activity'] = activity
        if service_type:
            query['service_type'] = service_type
        if project_id:
            query['project_id'] = project_id
        
        query['status'] = {'$ne': 'rejected'}
        
        all_entries = await db.time_entries.find(query, {'_id': 0}).to_list(100000)
        
        project_hours = {}
        service_hours = {}
        discipline_hours = {}
        activity_hours = {}
        
        for e in all_entries:
            project_hours[e['project_id']] = project_hours.get(e['project_id'], 0) + e['hours']
            service_hours[e['service_type']] = service_hours.get(e['service_type'], 0) + e['hours']
            discipline_hours[e['discipline']] = discipline_hours.get(e['discipline'], 0) + e['hours']
            activity_hours[e['activity']] = activity_hours.get(e['activity'], 0) + e['hours']
        
        active_projects = await db.projects.count_documents({'status': 'active'})
        active_users = await db.users.count_documents({'is_active': True})
        
        # Get project names
        projects = await db.projects.find({}, {'_id': 0}).to_list(1000)
        project_map = {p['id']: p['name'] for p in projects}
        
        project_details = [
            {
                'project_id': pid,
                'project_name': project_map.get(pid, 'Unknown'),
                'hours': hours
            }
            for pid, hours in project_hours.items()
        ]
        
        return {
            'total_hours': sum(project_hours.values()),
            'active_projects': active_projects,
            'active_users': active_users,
            'project_hours': project_details,
            'service_hours': service_hours,
            'discipline_hours': discipline_hours,
            'activity_hours': activity_hours,
            'filters_applied': {
                'discipline': discipline,
                'activity': activity,
                'service_type': service_type,
                'project_id': project_id
            }
        }

    @api_router.get('/analytics/project-hours')
    async def get_project_hours_analytics(start_date: Optional[str] = None, end_date: Optional[str] = None,
                                         current_user: dict = Depends(get_current_user)):
        query = {}
        if start_date:
            query['date'] = {'$gte': start_date}
        if end_date:
            if 'date' in query:
                query['date']['$lte'] = end_date
            else:
                query['date'] = {'$lte': end_date}
        entries = await db.time_entries.find(query, {'_id': 0}).to_list(100000)
        projects = await db.projects.find({}, {'_id': 0}).to_list(1000)
        project_map = {p['id']: p['name'] for p in projects}
        project_data = {}
        for e in entries:
            if e['status'] != 'rejected':
                pid = e['project_id']
                if pid not in project_data:
                    project_data[pid] = {'project_id': pid, 'project_name': project_map.get(pid, 'Unknown'),
                                        'total_hours': 0, 'by_service_type': {}}
                project_data[pid]['total_hours'] += e['hours']
                st = e['service_type']
                project_data[pid]['by_service_type'][st] = project_data[pid]['by_service_type'].get(st, 0) + e['hours']
        return list(project_data.values())

def add_planning_routes(api_router, db, get_current_user):
    """Routes for work assignments and planning"""
    
    @api_router.get('/planning/assignments')
    async def get_assignments(
        user_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        query = {}
        if user_id:
            query['user_id'] = user_id
        if start_date:
            query['start_date'] = {'$gte': start_date}
        if end_date:
            if 'end_date' not in query:
                query['end_date'] = {}
            query['end_date']['$lte'] = end_date
        
        assignments = await db.assignments.find(query, {'_id': 0}).to_list(1000)
        return assignments
    
    @api_router.post('/planning/assignments')
    async def create_assignment(assignment_data: dict, current_user: dict = Depends(get_current_user)):
        if current_user['role'] not in ['super_admin', 'admin', 'manager']:
            raise HTTPException(403, 'Not enough permissions')
        
        assignment = {
            'id': str(__import__('uuid').uuid4()),
            'user_id': assignment_data['user_id'],
            'project_id': assignment_data.get('project_id'),
            'start_date': assignment_data['start_date'],
            'end_date': assignment_data.get('end_date'),
            'allocation_percentage': assignment_data.get('allocation_percentage', 100.0),
            'assigned_by': current_user['id'],
            'notes': assignment_data.get('notes', ''),
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        await db.assignments.insert_one(assignment)
        return {k: v for k, v in assignment.items() if k != '_id'}
    
    @api_router.put('/planning/assignments/{assignment_id}')
    async def update_assignment(assignment_id: str, assignment_data: dict, current_user: dict = Depends(get_current_user)):
        if current_user['role'] not in ['super_admin', 'admin', 'manager']:
            raise HTTPException(403, 'Not enough permissions')
        
        update_data = {k: v for k, v in assignment_data.items() if v is not None}
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        await db.assignments.update_one({'id': assignment_id}, {'$set': update_data})
        return await db.assignments.find_one({'id': assignment_id}, {'_id': 0})
    
    @api_router.delete('/planning/assignments/{assignment_id}')
    async def delete_assignment(assignment_id: str, current_user: dict = Depends(get_current_user)):
        if current_user['role'] not in ['super_admin', 'admin', 'manager']:
            raise HTTPException(403, 'Not enough permissions')
        
        await db.assignments.delete_one({'id': assignment_id})
        return {'message': 'Assignment deleted'}

def add_presence_routes(api_router, db, get_current_user):
    """Routes for monthly presence tracking"""
    
    @api_router.get('/presence/month/{user_id}')
    async def get_user_month_presence(
        user_id: str,
        year: int,
        month: int,
        current_user: dict = Depends(get_current_user)
    ):
        # Users can only see their own data unless admin
        if user_id != current_user['id'] and current_user['role'] not in ['super_admin', 'admin', 'manager']:
            raise HTTPException(403, 'Not enough permissions')
        
        start_date = f'{year}-{month:02d}-01'
        if month == 12:
            end_date = f'{year+1}-01-01'
        else:
            end_date = f'{year}-{month+1:02d}-01'
        
        presences = await db.presence.find({
            'user_id': user_id,
            'date': {'$gte': start_date, '$lt': end_date}
        }, {'_id': 0}).to_list(1000)
        
        return presences
    
    @api_router.get('/presence/team/month')
    async def get_team_month_presence(
        year: int,
        month: int,
        current_user: dict = Depends(get_current_user)
    ):
        if current_user['role'] not in ['super_admin', 'admin', 'manager']:
            raise HTTPException(403, 'Not enough permissions')
        
        start_date = f'{year}-{month:02d}-01'
        if month == 12:
            end_date = f'{year+1}-01-01'
        else:
            end_date = f'{year}-{month+1:02d}-01'
        
        presences = await db.presence.find({
            'date': {'$gte': start_date, '$lt': end_date}
        }, {'_id': 0}).to_list(10000)
        
        return presences
    
    @api_router.post('/presence')
    async def create_presence(presence_data: dict, current_user: dict = Depends(get_current_user)):
        # Check for duplicates
        existing = await db.presence.find_one({
            'user_id': current_user['id'],
            'date': presence_data['date']
        })
        
        if existing:
            # Update instead
            await db.presence.update_one(
                {'id': existing['id']},
                {'$set': {
                    'status': presence_data['status'],
                    'location': presence_data.get('location', ''),
                    'notes': presence_data.get('notes', ''),
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }}
            )
            return await db.presence.find_one({'id': existing['id']}, {'_id': 0})
        
        presence = {
            'id': str(__import__('uuid').uuid4()),
            'user_id': current_user['id'],
            'date': presence_data['date'],
            'status': presence_data['status'],  # télétravail, client, déplacement, absence, congé
            'location': presence_data.get('location', ''),
            'notes': presence_data.get('notes', ''),
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        await db.presence.insert_one(presence)
        return {k: v for k, v in presence.items() if k != '_id'}
    
    @api_router.put('/presence/{presence_id}')
    async def update_presence(presence_id: str, presence_data: dict, current_user: dict = Depends(get_current_user)):
        presence = await db.presence.find_one({'id': presence_id})
        if not presence:
            raise HTTPException(404, 'Presence not found')
        
        # Only owner or admin can edit
        if presence['user_id'] != current_user['id'] and current_user['role'] not in ['super_admin', 'admin']:
            raise HTTPException(403, 'Not enough permissions')
        
        update_data = {k: v for k, v in presence_data.items() if v is not None}
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        await db.presence.update_one({'id': presence_id}, {'$set': update_data})
        return await db.presence.find_one({'id': presence_id}, {'_id': 0})

def add_team_routes(api_router, db, get_current_user):
    """Routes for team/organization management"""
    
    @api_router.get('/teams')
    async def get_teams(current_user: dict = Depends(get_current_user)):
        teams = await db.teams.find({}, {'_id': 0}).to_list(1000)
        return teams
    
    @api_router.post('/teams')
    async def create_team(team_data: dict, current_user: dict = Depends(get_current_user)):
        if current_user['role'] not in ['super_admin', 'admin']:
            raise HTTPException(403, 'Not enough permissions')
        
        team = {
            'id': str(__import__('uuid').uuid4()),
            'name': team_data['name'],
            'description': team_data.get('description', ''),
            'manager_id': team_data.get('manager_id'),
            'member_ids': team_data.get('member_ids', []),
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        await db.teams.insert_one(team)
        return {k: v for k, v in team.items() if k != '_id'}
    
    @api_router.put('/teams/{team_id}')
    async def update_team(team_id: str, team_data: dict, current_user: dict = Depends(get_current_user)):
        if current_user['role'] not in ['super_admin', 'admin']:
            raise HTTPException(403, 'Not enough permissions')
        
        update_data = {k: v for k, v in team_data.items() if v is not None}
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        await db.teams.update_one({'id': team_id}, {'$set': update_data})
        return await db.teams.find_one({'id': team_id}, {'_id': 0})
    
    @api_router.delete('/teams/{team_id}')
    async def delete_team(team_id: str, current_user: dict = Depends(get_current_user)):
        if current_user['role'] not in ['super_admin', 'admin']:
            raise HTTPException(403, 'Not enough permissions')
        
        await db.teams.delete_one({'id': team_id})
        return {'message': 'Team deleted'}

