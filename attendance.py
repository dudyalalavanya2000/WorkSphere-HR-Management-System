
from datetime import date, datetime, time, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models import Attendance, User, UserRole
from app.schemas import AttendanceHistoryItem, AttendanceResponse


router = APIRouter(
    prefix="/api/v1/attendance",
    tags=["Attendance Management"],
)


@router.post(
    "/check-in",
    response_model=AttendanceResponse,
    status_code=status.HTTP_201_CREATED,
)
def check_in(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()

    existing_record = (
        db.query(Attendance)
        .filter(
            Attendance.user_id == current_user.id,
            Attendance.attendance_date == today,
        )
        .first()
    )

    if existing_record:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already checked in today",
        )

    record = Attendance(
        user_id=current_user.id,
        attendance_date=today,
        check_in=datetime.now(timezone.utc),
        status="PRESENT",
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return record


@router.post(
    "/check-out",
    response_model=AttendanceResponse,
)
def check_out(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()

    record = (
        db.query(Attendance)
        .filter(
            Attendance.user_id == current_user.id,
            Attendance.attendance_date == today,
        )
        .first()
    )

    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No check-in record found for today",
        )

    if record.check_out is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already checked out today",
        )

    record.check_out = datetime.now(timezone.utc)

    db.commit()
    db.refresh(record)

    return record


@router.get(
    "/me",
    response_model=list[AttendanceResponse],
)
def my_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Attendance)
        .filter(Attendance.user_id == current_user.id)
        .order_by(Attendance.attendance_date.desc())
        .all()
    )


@router.get(
    "/",
    response_model=list[AttendanceHistoryItem],
)
def list_attendance(
    attendance_date: date | None = Query(default=None),
    user_id: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.HR, UserRole.ADMIN)
    ),
):
    query = (
        db.query(Attendance, User)
        .join(User, Attendance.user_id == User.id)
    )

    if attendance_date is not None:
        query = query.filter(
            Attendance.attendance_date == attendance_date
        )

    if user_id is not None:
        query = query.filter(Attendance.user_id == user_id)

    results = query.order_by(
        Attendance.attendance_date.desc(),
        Attendance.user_id,
    ).all()

    return [
        {
            "id": record.id,
            "user_id": record.user_id,
            "attendance_date": record.attendance_date,
            "check_in": record.check_in,
            "check_out": record.check_out,
            "status": record.status,
            "created_at": record.created_at,
            "username": user.username,
            "email": user.email,
        }
        for record, user in results
    ]


@router.get(
    "/summary",
    response_model=dict[str, int],
)
def attendance_summary(
    attendance_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.HR, UserRole.ADMIN)
    ),
):
    target_date = attendance_date or date.today()

    records = (
        db.query(Attendance)
        .filter(Attendance.attendance_date == target_date)
        .all()
    )

    return {
        "total_days": len(records),
        "present_days": sum(
            1 for record in records if record.status == "PRESENT"
        ),
        "checked_out_days": sum(
            1 for record in records if record.check_out is not None
        ),
    }
