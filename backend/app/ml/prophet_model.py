"""
Modelo Prophet para forecasting epidemiológico por localização.
Treina/prediz com dados de casos agregados por data.
"""
import logging
import pickle
import os
from pathlib import Path
from typing import Optional
import pandas as pd

logger = logging.getLogger(__name__)
CACHE_DIR = Path("models_cache")
CACHE_DIR.mkdir(exist_ok=True)


def _model_path(location_key: str, syndrome: str) -> Path:
    safe = f"{location_key}_{syndrome}".replace(" ", "_").replace("/", "-").lower()
    return CACHE_DIR / f"prophet_{safe}.pkl"


def train(df: pd.DataFrame, location_key: str, syndrome: str) -> object:
    """
    Treina Prophet com DataFrame {ds: date, y: int}.
    Salva modelo em disco.
    """
    try:
        from prophet import Prophet

        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            changepoint_prior_scale=0.05,
            seasonality_prior_scale=10,
        )
        model.fit(df)

        path = _model_path(location_key, syndrome)
        with open(path, "wb") as f:
            pickle.dump(model, f)

        logger.info("Prophet treinado e salvo: %s", path)
        return model
    except ImportError:
        logger.warning("Prophet não instalado, forecasting desabilitado")
        return None


def predict(location_key: str, syndrome: str, periods: int = 30) -> Optional[pd.DataFrame]:
    """
    Carrega modelo salvo e gera previsão para N dias.
    Retorna DataFrame com {ds, yhat, yhat_lower, yhat_upper}.
    """
    path = _model_path(location_key, syndrome)
    if not path.exists():
        return None

    try:
        from prophet import Prophet

        with open(path, "rb") as f:
            model: Prophet = pickle.load(f)

        future = model.make_future_dataframe(periods=periods)
        forecast = model.predict(future)
        return forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]].tail(periods)
    except Exception as e:
        logger.error("Erro ao predizer com Prophet: %s", e)
        return None


def forecast_to_dict(forecast_df: pd.DataFrame) -> list[dict]:
    """Converte DataFrame de forecast para lista de dicts serializável."""
    records = []
    for _, row in forecast_df.iterrows():
        records.append({
            "date": row["ds"].strftime("%Y-%m-%d"),
            "predicted": max(0, round(float(row["yhat"]), 2)),
            "lower": max(0, round(float(row["yhat_lower"]), 2)),
            "upper": max(0, round(float(row["yhat_upper"]), 2)),
        })
    return records
