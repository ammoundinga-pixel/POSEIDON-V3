from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from enum import Enum
import secrets
import string

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 480

# Password hashing
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI(title="POSÉIDON API")

# Create a router with the /api prefix
api_router = APIRouter(prefix='/api')

# Enums
class UserRole(str, Enum):
    SUPER_ADMIN = 'super_admin'
    ADMIN = 'admin'
    MANAGER = 'manager'
    EMPLOYEE = 'employee'

class TimeEntryStatus(str, Enum):
    DRAFT = 'draft'
    SUBMITTED = 'submitted'
    VALIDATED = 'validated'
    REJECTED = 'rejected'

class Discipline(str, Enum):
    STR = 'STR'
    CVC = 'CVC'
    ELECTRICITE = 'Électricité'
    BIM = 'BIM'
    ENVIRONNEMENT = 'Environnement'
    MANAGEMENT = 'Management'
    SUPPORT = 'Support'

class Activity(str, Enum):
    APS = 'APS'
    APD = 'APD'
    CALCUL = 'Calcul'
    DESSIN = 'Dessin'
    EXE = 'EXE'
    CHANTIER = 'Chantier'
    COORDINATION = 'Coordination'

class ServiceType(str, Enum):
    DESSIN = 'Dessin'
    BIM = 'BIM'
    CALCUL = 'Calcul / Ingénierie'
    CONSEIL = 'Consultation / Conseil'
    COORDINATION = 'Coordination / Management'
    SUPPORT = 'Support / Qualité'

class ProjectStatus(str, Enum):
    PLANNED = 'planned'
    ACTIVE = 'active'
    ON_HOLD = 'on_hold'
    COMPLETED = 'completed'

class DayType(str, Enum):
    PRESENTIEL = 'présentiel'
    TELETRAVAIL = 'télétravail'
    DEPLACEMENT = 'déplacement'
    CONGE = 'congé'
    ABSENCE = 'absence'

# Models
class Team(BaseModel):
    model_config = ConfigDict(extra='ignore')
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    manager_id: Optional[str] = None
    member_ids: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None
    manager_id: Optional[str] = None
    member_ids: List[str] = Field(default_factory=list)

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    manager_id: Optional[str] = None
    member_ids: Optional[List[str]] = None

class User(BaseModel):
    model_config = ConfigDict(extra='ignore')
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    first_name: str
    last_name: str
    role: UserRole
    password_hash: str
    must_change_password: bool = True
    department: Optional[str] = None
    manager_id: Optional[str] = None
    team_id: Optional[str] = None
    created_by: Optional[str] = None
    is_active: bool = True
    capacity_hours_per_day: float = 7.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    role: UserRole
    temporary_password: str
    department: Optional[str] = None
    manager_id: Optional[str] = None
    team_id: Optional[str] = None

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[UserRole] = None
    department: Optional[str] = None
    manager_id: Optional[str] = None
    team_id: Optional[str] = None
    is_active: Optional[bool] = None
    capacity_hours_per_day: Optional[float] = None

class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    role: UserRole
    must_change_password: bool
    department: Optional[str] = None
    manager_id: Optional[str] = None
    team_id: Optional[str] = None
    is_active: bool
    capacity_hours_per_day: float
    created_at: datetime

class ResetPasswordRequest(BaseModel):
    user_id: str

class ResetPasswordResponse(BaseModel):
    new_password: str
    message: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class Project(BaseModel):
    model_config = ConfigDict(extra='ignore')
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str
    description: Optional[str] = None
    client: Optional[str] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    budget_hours: Optional[float] = None
    status: ProjectStatus = ProjectStatus.ACTIVE
    team_members: List[Dict[str, Any]] = Field(default_factory=list)
    manager_id: Optional[str] = None
    disciplines: List[Discipline] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProjectCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    client: Optional[str] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    budget_hours: Optional[float] = None
    manager_id: Optional[str] = None
    disciplines: List[Discipline] = Field(default_factory=list)

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    client: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget_hours: Optional[float] = None
    status: Optional[ProjectStatus] = None
    manager_id: Optional[str] = None
    disciplines: Optional[List[Discipline]] = None

class TeamMemberAssignment(BaseModel):
    user_id: str
    allocation_percentage: float = 100.0
    start_date: datetime
    end_date: Optional[datetime] = None

class TimeEntry(BaseModel):
    model_config = ConfigDict(extra='ignore')
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    project_id: str
    date: datetime
    discipline: Discipline
    activity: Activity
    service_type: ServiceType
    task_description: Optional[str] = None
    hours: float
    status: TimeEntryStatus = TimeEntryStatus.DRAFT
    day_type: DayType = DayType.PRESENTIEL
    submitted_at: Optional[datetime] = None
    validated_at: Optional[datetime] = None
    validated_by: Optional[str] = None
    rejection_reason: Optional[str] = None
    week_number: int
    year: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TimeEntryCreate(BaseModel):
    project_id: str
    date: datetime
    discipline: Discipline
    activity: Activity
    service_type: ServiceType
    task_description: Optional[str] = None
    hours: float
    day_type: DayType = DayType.PRESENTIEL

class TimeEntryUpdate(BaseModel):
    project_id: Optional[str] = None
    date: Optional[datetime] = None
    discipline: Optional[Discipline] = None
    activity: Optional[Activity] = None
    service_type: Optional[ServiceType] = None
    task_description: Optional[str] = None
    hours: Optional[float] = None
    day_type: Optional[DayType] = None

class TimeEntryValidation(BaseModel):
    time_entry_ids: List[str]
    action: str
    rejection_reason: Optional[str] = None

# Auth utilities
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def generate_random_password(length: int = 12) -> str:
    """Generate a secure random password"""
    characters = string.ascii_letters + string.digits + "!@#$%^&*()"
    return ''.join(secrets.choice(characters) for _ in range(length))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({'exp': expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail='Could not validate credentials',
        headers={'WWW-Authenticate': 'Bearer'},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get('sub')
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({'id': user_id}, {'_id': 0})
    if user is None:
        raise credentials_exception
    
    return user

async def require_role(required_roles: List[UserRole]):
    async def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user['role'] not in [r.value for r in required_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail='Not enough permissions'
            )
        return current_user
    return role_checker

# Auth routes
@api_router.post('/auth/login', response_model=LoginResponse)
async def login(login_data: LoginRequest):
    user = await db.users.find_one({'email': login_data.email, 'is_active': True}, {'_id': 0})
    if not user or not verify_password(login_data.password, user['password_hash']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Incorrect email or password'
        )
    
    access_token = create_access_token(data={'sub': user['id']})
    user_response = UserResponse(**user)
    
    return LoginResponse(
        access_token=access_token,
        token_type='bearer',
        user=user_response
    )

@api_router.get('/auth/me', response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

@api_router.post('/auth/change-password')
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    if not verify_password(password_data.old_password, current_user['password_hash']):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Incorrect old password'
        )
    
    new_password_hash = get_password_hash(password_data.new_password)
    await db.users.update_one(
        {'id': current_user['id']},
        {'$set': {
            'password_hash': new_password_hash,
            'must_change_password': False,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {'message': 'Password changed successfully'}

# User routes
@api_router.get('/users', response_model=List[UserResponse])
async def get_users(
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] == 'employee':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Not enough permissions'
        )
    
    users = await db.users.find({'is_active': True}, {'_id': 0, 'password_hash': 0}).to_list(1000)
    return [UserResponse(**user) for user in users]

@api_router.post('/users', response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] not in ['super_admin', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Not enough permissions'
        )
    
    existing_user = await db.users.find_one({'email': user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Email already registered'
        )
    
    password_hash = get_password_hash(user_data.temporary_password)
    
    user = User(
        email=user_data.email,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role=user_data.role,
        password_hash=password_hash,
        department=user_data.department,
        manager_id=user_data.manager_id,
        team_id=user_data.team_id,
        created_by=current_user['id'],
        must_change_password=True
    )
    
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    user_dict['updated_at'] = user_dict['updated_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    return UserResponse(**user.model_dump())

@api_router.put('/users/{user_id}', response_model=UserResponse)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] not in ['super_admin', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Not enough permissions'
        )
    
    user = await db.users.find_one({'id': user_id}, {'_id': 0})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='User not found'
        )
    
    update_data = {k: v for k, v in user_data.model_dump().items() if v is not None}
    if update_data:
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({'id': user_id}, {'$set': update_data})
    
    updated_user = await db.users.find_one({'id': user_id}, {'_id': 0})
    return UserResponse(**updated_user)

@api_router.delete('/users/{user_id}')
async def delete_user(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] not in ['super_admin', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Not enough permissions'
        )
    
    await db.users.update_one(
        {'id': user_id},
        {'$set': {'is_active': False, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return {'message': 'User deactivated successfully'}

@api_router.post('/users/{user_id}/reset-password', response_model=ResetPasswordResponse)
async def reset_user_password(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] != 'super_admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Only super admin can reset passwords'
        )
    
    user = await db.users.find_one({'id': user_id}, {'_id': 0})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='User not found'
        )
    
    new_password = generate_random_password()
    password_hash = get_password_hash(new_password)
    
    await db.users.update_one(
        {'id': user_id},
        {'$set': {
            'password_hash': password_hash,
            'must_change_password': True,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return ResetPasswordResponse(
        new_password=new_password,
        message=f"Password reset for {user['email']}. New temporary password generated."
    )

# Team routes
@api_router.get('/teams')
async def get_teams(
    current_user: dict = Depends(get_current_user)
):
    teams = await db.teams.find({}, {'_id': 0}).to_list(1000)
    return teams

@api_router.post('/teams')
async def create_team(
    team_data: TeamCreate,
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] not in ['super_admin', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Not enough permissions'
        )
    
    team = Team(**team_data.model_dump())
    team_dict = team.model_dump()
    team_dict['created_at'] = team_dict['created_at'].isoformat()
    team_dict['updated_at'] = team_dict['updated_at'].isoformat()
    
    await db.teams.insert_one(team_dict)
    
    return team.model_dump()

@api_router.put('/teams/{team_id}')
async def update_team(
    team_id: str,
    team_data: TeamUpdate,
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] not in ['super_admin', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Not enough permissions'
        )
    
    team = await db.teams.find_one({'id': team_id}, {'_id': 0})
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Team not found'
        )
    
    update_data = {k: v for k, v in team_data.model_dump().items() if v is not None}
    if update_data:
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        await db.teams.update_one({'id': team_id}, {'$set': update_data})
    
    updated_team = await db.teams.find_one({'id': team_id}, {'_id': 0})
    return updated_team

@api_router.delete('/teams/{team_id}')
async def delete_team(
    team_id: str,
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] not in ['super_admin', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Not enough permissions'
        )
    
    await db.teams.delete_one({'id': team_id})
    return {'message': 'Team deleted successfully'}

@api_router.get('/organization/hierarchy')
async def get_organization_hierarchy(
    current_user: dict = Depends(get_current_user)
):
    """Get complete organization hierarchy"""
    users = await db.users.find({'is_active': True}, {'_id': 0, 'password_hash': 0}).to_list(1000)
    teams = await db.teams.find({}, {'_id': 0}).to_list(1000)
    
    return {
        'users': users,
        'teams': teams
    }

# Continue with existing time entry and analytics routes...
# (Keep all the existing time entry, project, dashboard, analytics code from before)

# Import additional routes
from server_routes import (
    add_project_routes, 
    add_time_entry_routes, 
    add_dashboard_routes,
    add_planning_routes,
    add_presence_routes,
    add_team_routes,
    add_employee_calendar_routes,
    add_master_data_routes
)

# Add all routes to the API router
add_master_data_routes(api_router, db, get_current_user)
add_project_routes(api_router, db, get_current_user)
add_time_entry_routes(api_router, db, get_current_user)
add_dashboard_routes(api_router, db, get_current_user)
add_planning_routes(api_router, db, get_current_user)
add_presence_routes(api_router, db, get_current_user)
add_team_routes(api_router, db, get_current_user)
add_employee_calendar_routes(api_router, db, get_current_user)

# Include router and setup middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=['*'],
    allow_headers=['*'],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event('shutdown')
async def shutdown_db_client():
    client.close()

@app.on_event('startup')
async def create_initial_super_admin():
    existing_admin = await db.users.find_one({'role': 'super_admin'})
    if not existing_admin:
        super_admin = User(
            email='admin@poseidon.com',
            first_name='Super',
            last_name='Admin',
            role=UserRole.SUPER_ADMIN,
            password_hash=get_password_hash('admin123'),
            must_change_password=True,
            is_active=True
        )
        admin_dict = super_admin.model_dump()
        admin_dict['created_at'] = admin_dict['created_at'].isoformat()
        admin_dict['updated_at'] = admin_dict['updated_at'].isoformat()
        await db.users.insert_one(admin_dict)
        logger.info('Initial super admin created: admin@poseidon.com / admin123')
