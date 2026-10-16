
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models import Notification, Payroll, User, UserRole
from app.schemas import (
    PayrollCreate,
    PayrollHistoryItem,
    PayrollPaymentUpdate,
    PayrollResponse,
)


router = APIRouter(
    prefix="/api/v1/payroll",
    tags=["Payroll Management"],
)


@router.post(
    "/",
    response_model=PayrollResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_payroll(
    payroll_data: PayrollCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.HR, UserRole.ADMIN)
    ),
):
    employee = (
        db.query(User)
        .filter(User.id == payroll_data.user_id)
        .first()
    )

    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )

    net_salary = (
        payroll_data.basic_salary
        + payroll_data.allowances
        - payroll_data.deductions
    )

    payroll = Payroll(
        user_id=payroll_data.user_id,
        salary_month=payroll_data.salary_month,
        basic_salary=payroll_data.basic_salary,
        allowances=payroll_data.allowances,
        deductions=payroll_data.deductions,
        net_salary=net_salary,
        payment_status="PENDING",
    )

    db.add(payroll)

    try:
        db.commit()
        db.refresh(payroll)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Payroll already exists for this employee and month",
        )

    return payroll


@router.get(
    "/me",
    response_model=list[PayrollResponse],
)
def get_my_payroll(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Payroll)
        .filter(Payroll.user_id == current_user.id)
        .order_by(Payroll.salary_month.desc())
        .all()
    )


@router.get(
    "/",
    response_model=list[PayrollHistoryItem],
)
def get_all_payroll(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.HR, UserRole.ADMIN)
    ),
):
    results = (
        db.query(Payroll, User.username, User.email)
        .join(User, Payroll.user_id == User.id)
        .order_by(Payroll.salary_month.desc())
        .all()
    )

    return [
        {
            **{
                column.name: getattr(payroll, column.name)
                for column in Payroll.__table__.columns
            },
            "username": username,
            "email": email,
        }
        for payroll, username, email in results
    ]


@router.patch(
    "/{payroll_id}/payment",
    response_model=PayrollResponse,
)
def mark_payroll_paid(
    payroll_id: int,
    payment_data: PayrollPaymentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.HR, UserRole.ADMIN)
    ),
):
    payroll = (
        db.query(Payroll)
        .filter(Payroll.id == payroll_id)
        .first()
    )

    if payroll is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payroll record not found",
        )

    if payroll.payment_status == "PAID":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payroll has already been marked as paid",
        )

    payroll.payment_status = payment_data.payment_status
    payroll.paid_at = datetime.now(timezone.utc)

    if payroll.payment_status == "PAID":
        notification = Notification(
            user_id=payroll.user_id,
            title="Salary Payment Completed",
            message=(
                f"Your salary for {payroll.salary_month} has been marked "
                f"as paid. Net salary: {payroll.net_salary}."
            ),
            notification_type="PAYROLL",
            is_read=False,
        )
        db.add(notification)

    db.commit()
    db.refresh(payroll)

    return payroll
