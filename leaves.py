
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models import LeaveRequest, Notification, User, UserRole
from app.schemas import (
    LeaveRequestCreate,
    LeaveRequestHistoryItem,
    LeaveRequestResponse,
    LeaveReview,
)


router = APIRouter(
    prefix="/api/v1/leaves",
    tags=["Leave Management"],
)


@router.post(
    "/",
    response_model=LeaveRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
def apply_for_leave(
    leave_data: LeaveRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = datetime.now(timezone.utc).date()

    if leave_data.start_date < today:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Leave start date cannot be in the past",
        )

    leave_request = LeaveRequest(
        user_id=current_user.id,
        start_date=leave_data.start_date,
        end_date=leave_data.end_date,
        leave_type=leave_data.leave_type,
        reason=leave_data.reason,
        status="PENDING",
    )

    db.add(leave_request)
    db.commit()
    db.refresh(leave_request)

    return leave_request


@router.get(
    "/me",
    response_model=list[LeaveRequestResponse],
)
def get_my_leave_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(LeaveRequest)
        .filter(LeaveRequest.user_id == current_user.id)
        .order_by(LeaveRequest.created_at.desc())
        .all()
    )


@router.get(
    "/",
    response_model=list[LeaveRequestHistoryItem],
)
def get_all_leave_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.HR, UserRole.ADMIN)
    ),
):
    results = (
        db.query(LeaveRequest, User.username, User.email)
        .join(User, LeaveRequest.user_id == User.id)
        .order_by(LeaveRequest.created_at.desc())
        .all()
    )

    return [
        {
            **{
                column.name: getattr(leave, column.name)
                for column in LeaveRequest.__table__.columns
            },
            "username": username,
            "email": email,
        }
        for leave, username, email in results
    ]


@router.patch(
    "/{leave_id}/review",
    response_model=LeaveRequestResponse,
)
def review_leave_request(
    leave_id: int,
    review_data: LeaveReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.HR, UserRole.ADMIN)
    ),
):
    leave_request = (
        db.query(LeaveRequest)
        .filter(LeaveRequest.id == leave_id)
        .first()
    )

    if leave_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found",
        )

    if leave_request.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending leave requests can be reviewed",
        )

    leave_request.status = review_data.status
    leave_request.reviewed_by = current_user.id
    leave_request.reviewed_at = datetime.now(timezone.utc)

    notification = Notification(
        user_id=leave_request.user_id,
        title=f"Leave Request {review_data.status.title()}",
        message=(
            f"Your {leave_request.leave_type} leave request from "
            f"{leave_request.start_date} to {leave_request.end_date} "
            f"has been {review_data.status.lower()} by HR."
        ),
        notification_type="LEAVE",
        is_read=False,
    )

    db.add(notification)
    db.commit()
    db.refresh(leave_request)

    return leave_request
