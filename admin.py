
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models import User, UserRole
from app.schemas import UserResponse


router = APIRouter(
    prefix="/api/v1/admin",
    tags=["Admin Management"],
)


class RoleUpdate(BaseModel):
    role: Literal["EMPLOYEE", "HR", "ADMIN"]


@router.get(
    "/users",
    response_model=list[UserResponse],
)
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN)
    ),
):
    """List all registered accounts. Admin access only."""
    return db.query(User).order_by(User.id.asc()).all()


@router.patch(
    "/users/{user_id}/role",
    response_model=UserResponse,
)
def update_user_role(
    user_id: int,
    role_data: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN)
    ),
):
    """Update a user's role. Admin access only."""

    target_user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    new_role = UserRole(role_data.role)

    # Prevent an administrator from accidentally
    # removing their own administrative access.
    if (
        target_user.id == current_user.id
        and new_role != UserRole.ADMIN
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own ADMIN role",
        )

    # Prevent removing the last administrator.
    if (
        target_user.role == UserRole.ADMIN
        and new_role != UserRole.ADMIN
    ):
        admin_count = (
            db.query(User)
            .filter(User.role == UserRole.ADMIN)
            .count()
        )

        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot remove the last administrator",
            )

    target_user.role = new_role
    db.commit()
    db.refresh(target_user)

    return target_user
