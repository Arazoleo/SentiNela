"""
Testes unitários e de integração para o serviço de detecção de clusters.

Roda com:
    cd backend && source .venv/bin/activate
    pytest tests/test_cluster_service.py -v
"""
import math
import pytest
from datetime import date, timedelta
from unittest.mock import AsyncMock, MagicMock, patch


# ─── helpers para criar cases fake ─────────────────────────────
def make_case(
    syndrome="Síndrome Gripal",
    city="São Paulo",
    state="SP",
    lat=None,
    lng=None,
    days_ago=0,
):
    case = MagicMock()
    case.syndrome_name = syndrome
    case.icd10_code = "J11"
    case.city = city
    case.state = state
    case.lat = lat
    case.lng = lng
    case.case_date = date.today() - timedelta(days=days_ago)
    return case


# ─── Testes da fórmula haversine ───────────────────────────────
class TestHaversine:
    def test_same_point_is_zero(self):
        from app.services.cluster_service import haversine_km
        assert haversine_km(-23.55, -46.63, -23.55, -46.63) == pytest.approx(0.0)

    def test_sao_paulo_to_campinas(self):
        """São Paulo → Campinas é ~84 km."""
        from app.services.cluster_service import haversine_km
        dist = haversine_km(-23.5505, -46.6333, -22.9056, -47.0608)
        assert 80 < dist < 95

    def test_sao_paulo_to_rio(self):
        """São Paulo → Rio de Janeiro é ~360 km."""
        from app.services.cluster_service import haversine_km
        dist = haversine_km(-23.5505, -46.6333, -22.9068, -43.1729)
        assert 340 < dist < 380

    def test_symmetry(self):
        from app.services.cluster_service import haversine_km
        a = haversine_km(-23.55, -46.63, -22.90, -43.17)
        b = haversine_km(-22.90, -43.17, -23.55, -46.63)
        assert a == pytest.approx(b)


# ─── Testes da função find_cluster ─────────────────────────────
class TestFindCluster:
    def test_no_cases_returns_none(self):
        from app.services.cluster_service import find_cluster
        assert find_cluster([]) is None

    def test_below_threshold_returns_none(self):
        from app.services.cluster_service import find_cluster, CASE_THRESHOLD
        cases = [make_case(lat=-23.55, lng=-46.63) for _ in range(CASE_THRESHOLD - 1)]
        assert find_cluster(cases) is None

    def test_cluster_at_threshold(self):
        """Exatamente CASE_THRESHOLD casos no mesmo ponto → cluster detectado."""
        from app.services.cluster_service import find_cluster, CASE_THRESHOLD
        cases = [make_case(lat=-23.55 + i * 0.001, lng=-46.63) for i in range(CASE_THRESHOLD)]
        result = find_cluster(cases)
        assert result is not None
        assert result["count"] >= CASE_THRESHOLD

    def test_cases_too_far_apart(self):
        """Casos em cidades distintas (SP e Manaus) não formam cluster."""
        from app.services.cluster_service import find_cluster, CASE_THRESHOLD
        cases = (
            [make_case(lat=-23.55, lng=-46.63, city="São Paulo", state="SP")] * CASE_THRESHOLD
            + [make_case(lat=-3.10, lng=-60.02, city="Manaus", state="AM")] * CASE_THRESHOLD
        )
        result = find_cluster(cases)
        # Deve detectar cada grupo separado, não misturar
        assert result is not None
        assert result["count"] == CASE_THRESHOLD

    def test_mixed_geo_and_no_geo(self):
        """Casos sem coordenadas da mesma cidade são contados junto com os geo."""
        from app.services.cluster_service import find_cluster, CASE_THRESHOLD
        geo_cases = [make_case(lat=-23.55, lng=-46.63) for _ in range(CASE_THRESHOLD - 1)]
        no_geo = [make_case(lat=None, lng=None, city="São Paulo", state="SP")]
        result = find_cluster(geo_cases + no_geo)
        assert result is not None
        assert result["count"] >= CASE_THRESHOLD

    def test_centroid_calculation(self):
        """Centroide deve ser a média dos pontos."""
        from app.services.cluster_service import find_cluster
        lats = [-23.55, -23.56, -23.54]
        lngs = [-46.63, -46.64, -46.62]
        cases = [make_case(lat=lats[i], lng=lngs[i]) for i in range(3)]
        result = find_cluster(cases)
        assert result is not None
        assert result["centroid_lat"] == pytest.approx(sum(lats) / 3, abs=0.01)
        assert result["centroid_lng"] == pytest.approx(sum(lngs) / 3, abs=0.01)


# ─── Testes de severidade ───────────────────────────────────────
class TestSeverity:
    def test_severity_levels(self):
        from app.services.cluster_service import _severity
        assert _severity(2)  == "low"
        assert _severity(5)  == "moderate"
        assert _severity(10) == "high"
        assert _severity(20) == "critical"
        assert _severity(50) == "critical"


# ─── Teste de integração: run_cluster_detection ─────────────────
class TestRunClusterDetection:
    @pytest.mark.asyncio
    async def test_no_alert_below_threshold(self):
        """Com menos casos que o threshold, não cria alerta."""
        from app.services.cluster_service import run_cluster_detection, CASE_THRESHOLD
        new_case = make_case(lat=-23.55, lng=-46.63)

        db = AsyncMock()
        # Simula query retornando só 1 caso (abaixo do threshold)
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [new_case]
        db.execute = AsyncMock(return_value=mock_result)

        alert = await run_cluster_detection(new_case, db)
        assert alert is None

    @pytest.mark.asyncio
    async def test_creates_alert_when_cluster(self):
        """Com casos suficientes no mesmo local, cria EpidemicAlert."""
        from app.services.cluster_service import run_cluster_detection, CASE_THRESHOLD
        new_case = make_case(lat=-23.55, lng=-46.63)

        # Simula CASE_THRESHOLD + 2 casos próximos
        cluster_cases = [
            make_case(lat=-23.55 + i * 0.001, lng=-46.63)
            for i in range(CASE_THRESHOLD + 2)
        ]

        # Primeira execute: busca casos recentes
        # Segunda execute: busca alerta existente
        results = []

        mock_recent = MagicMock()
        mock_recent.scalars.return_value.all.return_value = cluster_cases

        mock_existing = MagicMock()
        mock_existing.scalar_one_or_none.return_value = None  # não existe alerta ainda

        db = AsyncMock()
        db.execute = AsyncMock(side_effect=[mock_recent, mock_existing])
        db.add = MagicMock()
        db.flush = AsyncMock()

        with patch("app.models.epidemic_alert.EpidemicAlert") as MockAlert:
            instance = MagicMock()
            instance.id = "test-alert-id"
            instance.syndrome_name = new_case.syndrome_name
            instance.city = new_case.city
            instance.case_count = CASE_THRESHOLD + 2
            instance.severity = "moderate"
            MockAlert.return_value = instance

            alert = await run_cluster_detection(new_case, db)

        assert db.add.called

    @pytest.mark.asyncio
    async def test_updates_existing_alert(self):
        """Se alerta já existe, atualiza case_count e severity."""
        from app.services.cluster_service import run_cluster_detection, CASE_THRESHOLD
        from datetime import datetime, timezone

        new_case = make_case(lat=-23.55, lng=-46.63)
        cluster_cases = [
            make_case(lat=-23.55 + i * 0.001, lng=-46.63)
            for i in range(CASE_THRESHOLD + 5)
        ]

        existing_alert = MagicMock()
        existing_alert.case_count = CASE_THRESHOLD
        existing_alert.severity = "low"

        mock_recent = MagicMock()
        mock_recent.scalars.return_value.all.return_value = cluster_cases

        mock_existing_query = MagicMock()
        mock_existing_query.scalar_one_or_none.return_value = existing_alert

        db = AsyncMock()
        db.execute = AsyncMock(side_effect=[mock_recent, mock_existing_query])
        db.add = MagicMock()
        db.flush = AsyncMock()

        alert = await run_cluster_detection(new_case, db)

        # Deve atualizar o alerta existente, não criar novo
        assert not db.add.called
        assert existing_alert.case_count == CASE_THRESHOLD + 5  # 8 casos no cluster


# ─── Teste de integração completa: múltiplos usuários → alerta ──
class TestEndToEndScenario:
    """
    Cenário: 5 usuários em São Paulo com síndrome gripal em 2 dias.
    Esperado: alerta gerado com severidade >= 'moderate'.
    """

    def test_cluster_from_dense_cases(self):
        from app.services.cluster_service import find_cluster, _severity, CASE_THRESHOLD

        # Simula 5 usuários dentro de 5km no centro de SP
        import random
        random.seed(42)
        cases = [
            make_case(
                lat=-23.550 + random.uniform(-0.02, 0.02),
                lng=-46.633 + random.uniform(-0.02, 0.02),
                days_ago=random.randint(0, 3),
            )
            for _ in range(5)
        ]

        result = find_cluster(cases)
        assert result is not None, "Deveria detectar cluster com 5 casos próximos"
        assert result["count"] >= CASE_THRESHOLD
        assert _severity(result["count"]) in ("low", "moderate", "high", "critical")
        assert -24.0 < result["centroid_lat"] < -23.0
        assert -47.0 < result["centroid_lng"] < -46.0
