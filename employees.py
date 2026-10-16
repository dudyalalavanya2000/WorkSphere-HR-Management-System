
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models import EmployeeProfile, User, UserRole
from app.schemas import (
    EmployeeListItem,
    EmployeeProfileCreate,
    EmployeeProfileResponse,
    EmployeeProfileUpdate,
)


router = APIRouter(
    prefix="/api/v1/employees",
    tags=["Employee Management"],
)


@router.get("/me", response_model=EmployeeListItem)
def get_my_employee_record(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = (
        db.query(EmployeeProfile)
        .filter(EmployeeProfile.user_id == current_user.id)
        .first()
    )

    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
        "employee_profile": profile,
    }


@router.get("/", response_model=list[EmployeeListItem])
def list_employees(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.HR, UserRole.ADMIN)
    ),
):
    users = db.query(User).order_by(User.id).all()

    return [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "employee_profile": (
                db.query(EmployeeProfile)
                .filter(EmployeeProfile.user_id == user.id)
                .first()
            ),
        }
        for user in users
    ]


@router.get("/{user_id}", response_model=EmployeeListItem)
def get_employee(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.HR, UserRole.ADMIN)
    ),
):
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )

    profile = (
        db.query(EmployeeProfile)
        .filter(EmployeeProfile.user_id == user.id)
        .first()
    )

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "employee_profile": profile,
    }


@router.post(
    "/{user_id}/profile",
    response_model=EmployeeProfileResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_employee_profile(
    user_id: int,
    profile_data: EmployeeProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.HR, UserRole.ADMIN)
    ),
):
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )

    existing_profile = (
        db.query(EmployeeProfile)
        .filter(EmployeeProfile.user_id == user_id)
        .first()
    )

    if existing_profile:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Employee profile already exists",
        )

    profile = EmployeeProfile(
        user_id=user_id,
        **profile_data.model_dump(),
    )

    db.add(profile)
    db.commit()
    db.refresh(profile)

    return profile


@router.patch(
    "/{user_id}/profile",
    response_model=EmployeeProfileResponse,
)
def update_employee_profile(
    user_id: int,
    profile_data: EmployeeProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.HR, UserRole.ADMIN)
    ),
):
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )

    profile = (
        db.query(EmployeeProfile)
        .filter(EmployeeProfile.user_id == user_id)
        .first()
    )

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee profile not found",
        )

    update_data = profile_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)

    return profile
