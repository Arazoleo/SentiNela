from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import pandas as pd

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.epidemiological_case import EpidemiologicalCase
from app.ml.prophet_model import train, predict, forecast_to_dict

router = APIRouter(prefix="/forecast", tags=["forecast"])


@router.get("/{state}/{city}")
async def get_forecast(
    state: str,
    city: str,
    syndrome: str = Query(default="Síndrome Gripal"),
    periods: int = Query(default=30, ge=7, le=90),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    location_key = f"{state}_{city}"

    # Tenta predição com modelo salvo
    forecast_df = predict(location_key, syndrome, periods)

    if forecast_df is None:
        # Retreina com dados históricos
        result = await db.execute(
            select(
                EpidemiologicalCase.case_date,
                func.sum(EpidemiologicalCase.case_count).label("total"),
            )
            .where(EpidemiologicalCase.city == city)
            .where(EpidemiologicalCase.state == state)
            .where(EpidemiologicalCase.syndrome_name == syndrome)
            .group_by(EpidemiologicalCase.case_date)
            .order_by(EpidemiologicalCase.case_date)
        )
        rows = result.all()

        if len(rows) < 10:
            return {
                "location": f"{city} - {state}",
                "syndrome": syndrome,
                "forecast": [],
                "message": "Dados insuficientes para previsão. Mínimo de 10 registros históricos necessários.",
            }

        df = pd.DataFrame([{"ds": r.case_date, "y": int(r.total)} for r in rows])
        model = train(df, location_key, syndrome)
        if model:
            forecast_df = predict(location_key, syndrome, periods)

    result_data = forecast_to_dict(forecast_df) if forecast_df is not None else []

    # Tendência simples: compara última semana com a semana anterior
    trend = "stable"
    if len(result_data) >= 14:
        last_week = sum(d["predicted"] for d in result_data[:7])
        prev_week = sum(d["predicted"] for d in result_data[7:14])
        if prev_week > 0:
            change = (last_week - prev_week) / prev_week
            if change > 0.2:
                trend = "rising"
            elif change < -0.2:
                trend = "falling"

    return {
        "location": f"{city} - {state}",
        "syndrome": syndrome,
        "forecast": result_data,
        "trend": trend,
        "periods": periods,
    }


@router.get("/syndromes/list")
async def list_syndromes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EpidemiologicalCase.syndrome_name, func.count().label("total"))
        .group_by(EpidemiologicalCase.syndrome_name)
        .order_by(func.count().desc())
    )
    return [{"syndrome": r.syndrome_name, "total_cases": r.total} for r in result.all()]
