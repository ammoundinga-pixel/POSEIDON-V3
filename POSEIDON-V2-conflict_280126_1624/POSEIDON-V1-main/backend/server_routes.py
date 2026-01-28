# Additional routes for projects, time entries, dashboard
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from datetime import datetime, timezone, timedelta

def add_project_routes(api_router, db, get_current_user):
    @api_router.get('/projects')
    async def get_projects(current_user: dict = Depends(get_current_user)):
        projects = await db.projects.find({'status': {'$ne': 'archived'}}, {'_id': 0}).to_list(1000)
        return projects

    @api_router.post('/projects')
    async def create_project(project_data: 'ProjectCreate', current_user: dict = Depends(get_current_user)):
        project_data = project_data.model_dump() if hasattr(project_data, 'model_dump') else project_data
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
        await db.projects.insert_one(project)
        return project

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

    @api_router.post('/time-entries/submit')
    async def submit_time_entries(entry_ids: List[str], current_user: dict = Depends(get_current_user)):
        result = await db.time_entries.update_many(
            {'id': {'$in': entry_ids}, 'user_id': current_user['id'], 'status': 'draft'},
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
    async def get_global_dashboard(current_user: dict = Depends(get_current_user)):
        if current_user['role'] not in ['super_admin', 'admin']:
            raise HTTPException(403, 'Not enough permissions')
        today = datetime.now(timezone.utc)
        month_start = today.replace(day=1)
        all_entries = await db.time_entries.find({'date': {'$gte': month_start.isoformat()}}, {'_id': 0}).to_list(100000)
        project_hours = {}
        service_hours = {}
        for e in all_entries:
            if e['status'] != 'rejected':
                project_hours[e['project_id']] = project_hours.get(e['project_id'], 0) + e['hours']
                service_hours[e['service_type']] = service_hours.get(e['service_type'], 0) + e['hours']
        active_projects = await db.projects.count_documents({'status': 'active'})
        active_users = await db.users.count_documents({'is_active': True})
        return {'total_hours': sum(project_hours.values()), 'active_projects': active_projects,
                'active_users': active_users, 'project_hours': project_hours, 'service_hours': service_hours}

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
