from datetime import date, datetime
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, func, extract
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.users.models import User
from backend.finance.models import Expense, Budget, SavingsGoal, MonthlyAllowance

router = APIRouter()
INDIA_TZ = ZoneInfo("Asia/Kolkata")
def current_india_date() -> date:
    return datetime.now(INDIA_TZ).date()


def selected_period(month: Optional[int], year: Optional[int]) -> tuple[int, int]:
    today = current_india_date()
    selected_month = month if month is not None else today.month
    selected_year = year if year is not None else today.year
    if not 1 <= selected_month <= 12:
        raise HTTPException(status_code=422, detail="Month must be between 1 and 12")
    if not 2000 <= selected_year <= 2200:
        raise HTTPException(status_code=422, detail="Enter a valid year")
    return selected_month, selected_year


class ExpenseCreate(BaseModel):
    amount: float = Field(gt=0)
    category: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=300)
    date: Optional[str] = None
    payment_method: Optional[str] = "cash"


class ExpenseUpdate(BaseModel):
    amount: Optional[float] = Field(default=None, gt=0)
    category: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=300)
    date: Optional[str] = None


class BudgetCreate(BaseModel):
    category: str = Field(min_length=1, max_length=100)
    monthly_limit: float = Field(gt=0)
    month: Optional[int] = Field(default=None, ge=1, le=12)
    year: Optional[int] = Field(default=None, ge=2000, le=2200)


class SavingsGoalCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    target_amount: float = Field(gt=0)
    current_amount: float = Field(default=0.0, ge=0)
    deadline: Optional[str] = None


class SavingsGoalUpdate(BaseModel):
    current_amount: Optional[float] = Field(default=None, ge=0)
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    target_amount: Optional[float] = Field(default=None, gt=0)


class MonthlyAllowanceUpdate(BaseModel):
    amount: float = Field(ge=0)
    month: Optional[int] = Field(default=None, ge=1, le=12)
    year: Optional[int] = Field(default=None, ge=2000, le=2200)


# ── Daily expenses ─────────────────────────────────────────────────────────────
@router.get("/expenses")
async def get_expenses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    month: Optional[int] = None,
    year: Optional[int] = None,
    category: Optional[str] = None,
):
    month_value, year_value = selected_period(month, year)
    query = select(Expense).where(
        Expense.user_id == current_user.id,
        extract("month", Expense.date) == month_value,
        extract("year", Expense.date) == year_value,
    )
    if category:
        query = query.where(Expense.category == category.lower())
    result = await db.execute(query.order_by(Expense.date.desc(), Expense.created_at.desc()))
    expenses = result.scalars().all()
    return [{
        "id": item.id,
        "amount": item.amount,
        "category": item.category,
        "description": item.description,
        "date": item.date.isoformat(),
        "payment_method": item.payment_method,
    } for item in expenses]


@router.post("/expenses", status_code=201)
async def create_expense(
    req: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        expense_date = date.fromisoformat(req.date) if req.date else current_india_date()
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Enter a valid expense date (YYYY-MM-DD)") from exc
    category = req.category.strip().lower()
    expense = Expense(
        user_id=current_user.id,
        amount=req.amount,
        category=category,
        description=req.description.strip() if req.description else None,
        date=expense_date,
        payment_method=req.payment_method,
    )
    db.add(expense)
    await db.commit()
    await db.refresh(expense)
    return {"id": expense.id, "message": "Expense added", "amount": expense.amount, "category": expense.category}


@router.put("/expenses/{expense_id}")
async def update_expense(
    expense_id: int,
    req: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Expense).where(
        Expense.id == expense_id, Expense.user_id == current_user.id
    ))
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    for field, value in req.model_dump(exclude_unset=True).items():
        if field == "date" and value:
            try:
                setattr(expense, field, date.fromisoformat(value))
            except ValueError as exc:
                raise HTTPException(status_code=422, detail="Enter a valid expense date (YYYY-MM-DD)") from exc
        elif value is not None:
            setattr(expense, field, value.strip().lower() if field == "category" else value)
    await db.commit()
    return {"message": "Expense updated"}


@router.delete("/expenses/{expense_id}")
async def delete_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Expense).where(
        Expense.id == expense_id, Expense.user_id == current_user.id
    ))
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    await db.delete(expense)
    await db.commit()
    return {"message": "Expense deleted"}


@router.get("/expenses/summary")
async def get_expense_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    month: Optional[int] = None,
    year: Optional[int] = None,
):
    month_value, year_value = selected_period(month, year)
    result = await db.execute(
        select(Expense.category, func.sum(Expense.amount).label("total"))
        .where(
            Expense.user_id == current_user.id,
            extract("month", Expense.date) == month_value,
            extract("year", Expense.date) == year_value,
        )
        .group_by(Expense.category)
    )
    by_category = {row.category: round(float(row.total), 2) for row in result}
    total = sum(by_category.values())

    budget_result = await db.execute(select(Budget).where(
        Budget.user_id == current_user.id,
        Budget.month == month_value,
        Budget.year == year_value,
    ))
    budgets = {item.category: item.monthly_limit for item in budget_result.scalars().all()}
    return {
        "month": month_value,
        "year": year_value,
        "total_spent": round(total, 2),
        "by_category": by_category,
        "budgets": budgets,
        "budget_status": {
            category: {
                "spent": by_category.get(category, 0),
                "limit": limit,
                "percentage": round(by_category.get(category, 0) / limit * 100, 1) if limit > 0 else 0,
            }
            for category, limit in budgets.items()
        },
    }


@router.get("/expenses/trend")
async def get_expense_trend(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return actual expenditure totals for the last six calendar months."""
    today = current_india_date()
    monthly = []
    for offset in range(5, -1, -1):
        month_index = today.month - offset
        year_value = today.year + ((month_index - 1) // 12)
        month_value = ((month_index - 1) % 12) + 1
        result = await db.execute(
            select(func.sum(Expense.amount)).where(
                Expense.user_id == current_user.id,
                extract("month", Expense.date) == month_value,
                extract("year", Expense.date) == year_value,
            )
        )
        monthly.append({
            "month": f"{year_value}-{month_value:02d}",
            "total": round(float(result.scalar() or 0), 2),
        })
    return {"trend": monthly}


# ── Monthly allowance ──────────────────────────────────────────────────────────
@router.get("/allowance")
async def get_monthly_allowance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    month: Optional[int] = None,
    year: Optional[int] = None,
):
    month_value, year_value = selected_period(month, year)
    result = await db.execute(select(MonthlyAllowance).where(
        MonthlyAllowance.user_id == current_user.id,
        MonthlyAllowance.month == month_value,
        MonthlyAllowance.year == year_value,
    ))
    allowance = result.scalar_one_or_none()
    return {
        "month": month_value,
        "year": year_value,
        "amount": allowance.amount if allowance else None,
        "configured": allowance is not None,
    }


@router.put("/allowance")
async def set_monthly_allowance(
    req: MonthlyAllowanceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    month_value, year_value = selected_period(req.month, req.year)
    result = await db.execute(select(MonthlyAllowance).where(
        MonthlyAllowance.user_id == current_user.id,
        MonthlyAllowance.month == month_value,
        MonthlyAllowance.year == year_value,
    ))
    allowance = result.scalar_one_or_none()
    if allowance:
        allowance.amount = req.amount
    else:
        allowance = MonthlyAllowance(
            user_id=current_user.id,
            amount=req.amount,
            month=month_value,
            year=year_value,
        )
        db.add(allowance)
    await db.commit()
    return {
        "month": month_value,
        "year": year_value,
        "amount": req.amount,
        "configured": True,
        "message": "Monthly allowance saved",
    }


# ── Budgets ─────────────────────────────────────────────────────────────────────
@router.get("/budgets")
async def get_budgets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    month: Optional[int] = None,
    year: Optional[int] = None,
):
    month_value, year_value = selected_period(month, year)
    result = await db.execute(select(Budget).where(
        Budget.user_id == current_user.id,
        Budget.month == month_value,
        Budget.year == year_value,
    ))
    budgets = result.scalars().all()
    return [{
        "id": item.id,
        "category": item.category,
        "monthly_limit": item.monthly_limit,
        "month": item.month,
        "year": item.year,
    } for item in budgets]


@router.post("/budgets", status_code=201)
async def set_budget(
    req: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    month_value, year_value = selected_period(req.month, req.year)
    category = req.category.strip().lower()
    result = await db.execute(select(Budget).where(
        Budget.user_id == current_user.id,
        Budget.category == category,
        Budget.month == month_value,
        Budget.year == year_value,
    ))
    budget = result.scalar_one_or_none()
    if budget:
        budget.monthly_limit = req.monthly_limit
    else:
        db.add(Budget(
            user_id=current_user.id,
            category=category,
            monthly_limit=req.monthly_limit,
            month=month_value,
            year=year_value,
        ))
    await db.commit()
    return {"message": f"Budget set for {category}"}


# ── Savings goals ──────────────────────────────────────────────────────────────
@router.get("/savings")
@router.get("/savings-goals")
async def get_savings_goals(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SavingsGoal).where(
        SavingsGoal.user_id == current_user.id
    ).order_by(SavingsGoal.created_at.desc()))
    goals = result.scalars().all()
    return [{
        "id": goal.id,
        "title": goal.title,
        "target_amount": goal.target_amount,
        "current_amount": goal.current_amount,
        "deadline": goal.deadline.isoformat() if goal.deadline else None,
        "is_achieved": goal.is_achieved,
        "percentage": round(goal.current_amount / goal.target_amount * 100, 1) if goal.target_amount > 0 else 0,
    } for goal in goals]


@router.post("/savings", status_code=201)
async def create_savings_goal(
    req: SavingsGoalCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        deadline = date.fromisoformat(req.deadline) if req.deadline else None
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Enter a valid savings goal deadline") from exc
    goal = SavingsGoal(
        user_id=current_user.id,
        title=req.title.strip(),
        target_amount=req.target_amount,
        current_amount=req.current_amount,
        deadline=deadline,
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return {"id": goal.id, "message": "Savings goal created"}


@router.put("/savings/{goal_id}")
async def update_savings_goal(
    goal_id: int,
    req: SavingsGoalUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SavingsGoal).where(
        SavingsGoal.id == goal_id, SavingsGoal.user_id == current_user.id
    ))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Savings goal not found")
    for field, value in req.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(goal, field, value.strip() if field == "title" else value)
    goal.is_achieved = goal.current_amount >= goal.target_amount
    await db.commit()
    return {"message": "Savings goal updated", "achieved": goal.is_achieved}


@router.delete("/savings/{goal_id}")
async def delete_savings_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SavingsGoal).where(
        SavingsGoal.id == goal_id, SavingsGoal.user_id == current_user.id
    ))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Savings goal not found")
    await db.delete(goal)
    await db.commit()
    return {"message": "Goal deleted"}
