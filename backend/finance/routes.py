from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract
from datetime import date, datetime, timezone, timedelta
from typing import Optional, List
from pydantic import BaseModel
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.users.models import User
from backend.finance.models import Expense, Budget, SavingsGoal

router = APIRouter()

CATEGORIES = ["food", "transport", "hostel", "education", "books", "entertainment", "shopping", "subscriptions", "health", "other"]


# ── Schemas ────────────────────────────────────────────────────────────────────
class ExpenseCreate(BaseModel):
    amount: float
    category: str
    description: Optional[str] = None
    date: Optional[str] = None
    payment_method: Optional[str] = "cash"

class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None

class BudgetCreate(BaseModel):
    category: str
    monthly_limit: float
    month: Optional[int] = None
    year: Optional[int] = None

class SavingsGoalCreate(BaseModel):
    title: str
    target_amount: float
    current_amount: Optional[float] = 0.0
    deadline: Optional[str] = None

class SavingsGoalUpdate(BaseModel):
    current_amount: Optional[float] = None
    title: Optional[str] = None
    target_amount: Optional[float] = None


# ── Expenses ───────────────────────────────────────────────────────────────────
@router.get("/expenses")
async def get_expenses(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
                       month: Optional[int] = None, year: Optional[int] = None, category: Optional[str] = None):
    today = date.today()
    m = month or today.month
    y = year or today.year
    query = select(Expense).where(
        Expense.user_id == current_user.id,
        extract("month", Expense.date) == m,
        extract("year", Expense.date) == y
    )
    if category:
        query = query.where(Expense.category == category)
    query = query.order_by(Expense.date.desc())
    result = await db.execute(query)
    expenses = result.scalars().all()
    return [{"id": e.id, "amount": e.amount, "category": e.category, "description": e.description,
             "date": e.date.isoformat(), "payment_method": e.payment_method} for e in expenses]

@router.post("/expenses", status_code=201)
async def create_expense(req: ExpenseCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    expense_date = date.fromisoformat(req.date) if req.date else date.today()
    expense = Expense(user_id=current_user.id, amount=req.amount, category=req.category.lower(),
                      description=req.description, date=expense_date, payment_method=req.payment_method)
    db.add(expense); await db.commit(); await db.refresh(expense)
    return {"id": expense.id, "message": "Expense added", "amount": req.amount, "category": req.category}

@router.put("/expenses/{expense_id}")
async def update_expense(expense_id: int, req: ExpenseUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Expense).where(Expense.id == expense_id, Expense.user_id == current_user.id))
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    for field, value in req.model_dump(exclude_unset=True).items():
        if field == "date" and value:
            setattr(expense, field, date.fromisoformat(value))
        elif value is not None:
            setattr(expense, field, value)
    await db.commit()
    return {"message": "Expense updated"}

@router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Expense).where(Expense.id == expense_id, Expense.user_id == current_user.id))
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    await db.delete(expense); await db.commit()
    return {"message": "Expense deleted"}

@router.get("/expenses/summary")
async def get_expense_summary(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
                               month: Optional[int] = None, year: Optional[int] = None):
    today = date.today()
    m = month or today.month
    y = year or today.year
    result = await db.execute(
        select(Expense.category, func.sum(Expense.amount).label("total"))
        .where(Expense.user_id == current_user.id,
               extract("month", Expense.date) == m,
               extract("year", Expense.date) == y)
        .group_by(Expense.category)
    )
    by_category = {row.category: round(row.total, 2) for row in result}
    total = sum(by_category.values())

    # Get budgets for this month
    budget_r = await db.execute(select(Budget).where(Budget.user_id == current_user.id, Budget.month == m, Budget.year == y))
    budgets = {b.category: b.monthly_limit for b in budget_r.scalars().all()}

    return {
        "month": m, "year": y,
        "total_spent": round(total, 2),
        "by_category": by_category,
        "budgets": budgets,
        "budget_status": {cat: {"spent": by_category.get(cat, 0), "limit": lim, "percentage": round(by_category.get(cat, 0) / lim * 100, 1) if lim > 0 else 0} for cat, lim in budgets.items()}
    }

@router.get("/expenses/trend")
async def get_expense_trend(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Last 6 months trend"""
    today = date.today()
    monthly = []
    for i in range(5, -1, -1):
        month_date = (today.replace(day=1) - timedelta(days=1 if i > 0 else 0))
        m = (today.month - i - 1) % 12 + 1
        y = today.year - ((today.month - i - 1) // 12)
        result = await db.execute(
            select(func.sum(Expense.amount)).where(
                Expense.user_id == current_user.id,
                extract("month", Expense.date) == m,
                extract("year", Expense.date) == y
            )
        )
        total = result.scalar() or 0
        monthly.append({"month": f"{y}-{m:02d}", "total": round(total, 2)})
    return {"trend": monthly}


# ── Budgets ────────────────────────────────────────────────────────────────────
@router.get("/budgets")
async def get_budgets(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
                      month: Optional[int] = None, year: Optional[int] = None):
    today = date.today()
    m = month or today.month
    y = year or today.year
    result = await db.execute(select(Budget).where(Budget.user_id == current_user.id, Budget.month == m, Budget.year == y))
    budgets = result.scalars().all()
    return [{"id": b.id, "category": b.category, "monthly_limit": b.monthly_limit, "month": b.month, "year": b.year} for b in budgets]

@router.post("/budgets", status_code=201)
async def set_budget(req: BudgetCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    today = date.today()
    m = req.month or today.month
    y = req.year or today.year
    # Upsert
    result = await db.execute(select(Budget).where(Budget.user_id == current_user.id, Budget.category == req.category, Budget.month == m, Budget.year == y))
    budget = result.scalar_one_or_none()
    if budget:
        budget.monthly_limit = req.monthly_limit
    else:
        budget = Budget(user_id=current_user.id, category=req.category, monthly_limit=req.monthly_limit, month=m, year=y)
        db.add(budget)
    await db.commit()
    return {"message": f"Budget set for {req.category}"}


# ── Savings Goals ──────────────────────────────────────────────────────────────
@router.get("/savings")
async def get_savings_goals(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SavingsGoal).where(SavingsGoal.user_id == current_user.id).order_by(SavingsGoal.created_at.desc()))
    goals = result.scalars().all()
    return [{"id": g.id, "title": g.title, "target_amount": g.target_amount, "current_amount": g.current_amount,
             "deadline": g.deadline.isoformat() if g.deadline else None, "is_achieved": g.is_achieved,
             "percentage": round(g.current_amount / g.target_amount * 100, 1) if g.target_amount > 0 else 0} for g in goals]

@router.post("/savings", status_code=201)
async def create_savings_goal(req: SavingsGoalCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    goal = SavingsGoal(user_id=current_user.id, title=req.title, target_amount=req.target_amount,
                       current_amount=req.current_amount or 0,
                       deadline=date.fromisoformat(req.deadline) if req.deadline else None)
    db.add(goal); await db.commit(); await db.refresh(goal)
    return {"id": goal.id, "message": "Savings goal created"}

@router.put("/savings/{goal_id}")
async def update_savings_goal(goal_id: int, req: SavingsGoalUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SavingsGoal).where(SavingsGoal.id == goal_id, SavingsGoal.user_id == current_user.id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404)
    for field, value in req.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(goal, field, value)
    if goal.current_amount >= goal.target_amount:
        goal.is_achieved = True
    await db.commit()
    return {"message": "Savings goal updated", "achieved": goal.is_achieved}

@router.delete("/savings/{goal_id}")
async def delete_savings_goal(goal_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SavingsGoal).where(SavingsGoal.id == goal_id, SavingsGoal.user_id == current_user.id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404)
    await db.delete(goal); await db.commit()
    return {"message": "Goal deleted"}
