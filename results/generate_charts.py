"""
Gera gráficos dos resultados do Projeto Sentinela.
- Piloto jan/2026 (2 clínicas, ~70 conversas)
- Validação retrospectiva SIVEP-Gripe SP 2024
Saída: PNGs em results/figs/
"""
import os
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Patch

OUT = os.path.join(os.path.dirname(__file__), "figs")
os.makedirs(OUT, exist_ok=True)

# Paleta (verde clínico + apoio)
PRIMARY = "#2a5e3a"
ACCENT = "#3d6e50"
WARN = "#c47a2c"
DANGER = "#a83232"
NEUTRAL = "#9aa39c"
BG = "#f7f5f0"

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.edgecolor": "#5a5a5a",
    "axes.labelcolor": "#2a2a2a",
    "xtick.color": "#2a2a2a",
    "ytick.color": "#2a2a2a",
    "axes.titleweight": "bold",
    "axes.titlesize": 13,
    "axes.titlepad": 14,
    "figure.facecolor": "white",
    "axes.facecolor": "white",
})


def save(fig, name):
    path = os.path.join(OUT, name)
    fig.savefig(path, dpi=200, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print(f"  saved: {path}")


# ---------------------------------------------------------------------------
# 1. Completude da extração (piloto)
# ---------------------------------------------------------------------------
def fig_extraction():
    campos = ["Categoria", "Sintomas", "Severidade", "Duração"]
    valores = [97, 93, 94, 91]
    order = np.argsort(valores)[::-1]
    campos = [campos[i] for i in order]
    valores = [valores[i] for i in order]

    fig, ax = plt.subplots(figsize=(8, 4.2))
    bars = ax.barh(campos, valores, color=PRIMARY, height=0.55)
    ax.axvline(90, color=WARN, linestyle="--", linewidth=1, alpha=0.7,
               label="Limiar aceitável (90%)")
    ax.set_xlim(0, 105)
    ax.set_xlabel("Completude (%)")
    ax.set_title("Completude da extração estruturada — Piloto jan/2026 (n≈70)")
    ax.invert_yaxis()
    for bar, v in zip(bars, valores):
        ax.text(v + 0.7, bar.get_y() + bar.get_height() / 2,
                f"{v}%", va="center", fontsize=10, color="#2a2a2a")
    ax.legend(loc="lower right", frameon=False, fontsize=9)
    save(fig, "01_extracao_completude.png")


# ---------------------------------------------------------------------------
# 2. Distribuição de tendências (piloto)
# ---------------------------------------------------------------------------
def fig_trends():
    labels = ["Estável", "Em alta", "Em queda"]
    valores = [75, 15, 10]
    cores = [NEUTRAL, DANGER, ACCENT]

    fig, ax = plt.subplots(figsize=(6.5, 4.5))
    wedges, _ = ax.pie(
        valores, colors=cores, startangle=90,
        wedgeprops=dict(width=0.42, edgecolor="white", linewidth=2),
    )
    ax.text(0, 0.05, "75%", ha="center", va="center",
            fontsize=26, fontweight="bold", color=PRIMARY)
    ax.text(0, -0.18, "estável", ha="center", va="center",
            fontsize=10, color="#555")
    ax.set_title("Tendência projetada por categoria — Piloto jan/2026")
    legend_items = [Patch(facecolor=c, label=f"{l} ({v}%)")
                    for l, v, c in zip(labels, valores, cores)]
    ax.legend(handles=legend_items, loc="center left",
              bbox_to_anchor=(1.02, 0.5), frameon=False, fontsize=10)
    save(fig, "02_piloto_tendencias.png")


# ---------------------------------------------------------------------------
# 3. Score epidêmico (piloto)
# ---------------------------------------------------------------------------
def fig_scores():
    fig, ax = plt.subplots(figsize=(8, 4))
    labels = ["Score médio\npor categoria", "Score agregado\n(cidade)"]
    valores = [9, 18]
    bars = ax.bar(labels, valores, color=[ACCENT, PRIMARY], width=0.45)

    # Faixas de risco
    ax.axhspan(0, 30, color="#cfe5d6", alpha=0.35, zorder=0)
    ax.axhspan(30, 70, color="#f1d9b6", alpha=0.35, zorder=0)
    ax.axhspan(70, 100, color="#e7b3b3", alpha=0.35, zorder=0)
    ax.text(1.55, 15, "Baixo", color="#3d6e50", fontsize=9, alpha=0.8)
    ax.text(1.55, 50, "Moderado", color="#a37132", fontsize=9, alpha=0.8)
    ax.text(1.55, 85, "Alto", color="#a83232", fontsize=9, alpha=0.8)

    ax.set_ylim(0, 100)
    ax.set_ylabel("Score (0–100)")
    ax.set_title("Score epidemiológico — Piloto jan/2026")
    for bar, v in zip(bars, valores):
        ax.text(bar.get_x() + bar.get_width() / 2, v + 2,
                f"{v}/100", ha="center", fontsize=11, fontweight="bold")
    save(fig, "03_piloto_scores.png")


# ---------------------------------------------------------------------------
# 4. Prophet vs baseline (MAE)
# ---------------------------------------------------------------------------
def fig_mae_vs_baseline():
    modelos = ["Baseline\n(naive)", "Prophet"]
    mae = [33.7, 18.1]
    cores = [NEUTRAL, PRIMARY]

    fig, ax = plt.subplots(figsize=(7, 4.5))
    bars = ax.bar(modelos, mae, color=cores, width=0.45)
    ax.set_ylabel("MAE (casos/dia)")
    ax.set_title("Backtest SIVEP-Gripe SP 2024 — Prophet vs. baseline (5 holdouts × 7 d)")
    for bar, v in zip(bars, mae):
        ax.text(bar.get_x() + bar.get_width() / 2, v + 0.6,
                f"{v}", ha="center", fontsize=12, fontweight="bold")

    # Annotation de redução
    ax.annotate(
        "", xy=(1, 18.1), xytext=(0, 33.7),
        arrowprops=dict(arrowstyle="->", color=DANGER, lw=1.6,
                        connectionstyle="arc3,rad=-0.25"),
    )
    ax.text(0.5, 28, "−46%", ha="center", fontsize=14,
            fontweight="bold", color=DANGER)

    ax.set_ylim(0, 42)
    save(fig, "04_prophet_vs_baseline.png")


# ---------------------------------------------------------------------------
# 5. Métricas de erro do Prophet
# ---------------------------------------------------------------------------
def fig_metrics():
    fig, ax = plt.subplots(figsize=(8, 4.2))
    nomes = ["MAE\n(casos/dia)", "RMSE\n(casos/dia)", "MAPE\n(%)"]
    valores = [18.1, 21.0, 48.0]
    cores = [PRIMARY, ACCENT, WARN]
    bars = ax.bar(nomes, valores, color=cores, width=0.5)
    for bar, v in zip(bars, valores):
        ax.text(bar.get_x() + bar.get_width() / 2, v + 0.8,
                f"{v}", ha="center", fontsize=12, fontweight="bold")
    ax.axhline(49.2, color="#888", linestyle=":", linewidth=1)
    ax.text(2.45, 50.5, "média da série: 49,2", color="#666",
            fontsize=9, ha="right")
    ax.set_ylim(0, 60)
    ax.set_ylabel("Valor")
    ax.set_title("Métricas de erro — Prophet (backtest SP 2024)")
    save(fig, "05_metricas_prophet.png")


# ---------------------------------------------------------------------------
# 6. Anomalias detectadas
# ---------------------------------------------------------------------------
def fig_anomalies():
    fig, ax = plt.subplots(figsize=(7.5, 4.2))
    metodos = ["Z-score > 2σ", "Taxa de crescimento > 50%"]
    valores = [15, 16]
    bars = ax.bar(metodos, valores, color=[ACCENT, DANGER], width=0.45)
    for bar, v in zip(bars, valores):
        ax.text(bar.get_x() + bar.get_width() / 2, v + 0.3,
                f"{v} anomalias", ha="center", fontsize=11, fontweight="bold")
    ax.set_ylabel("Pontos sinalizados")
    ax.set_title("Anomalias detectadas em 366 dias — SIVEP-Gripe SP 2024")
    ax.set_ylim(0, max(valores) * 1.25)

    # Nota de baseline esperado
    ax.text(0.5, -0.18,
            "Referência: ~18 alertas seriam esperados por puro acaso a 2σ "
            "(coerência com picos sazonais documentados é o critério qualitativo).",
            transform=ax.transAxes, ha="center", fontsize=8.5,
            color="#555", style="italic")
    save(fig, "06_anomalias.png")


# ---------------------------------------------------------------------------
# 7. Série temporal ilustrativa com anomalias (sintética, calibrada)
# ---------------------------------------------------------------------------
def fig_timeseries_illustrative():
    """
    Série sintética com perfil sazonal de SRAG (pico em jun-ago) calibrada
    para média ≈ 49 casos/dia. Apenas ilustrativa — substituir pelos dados
    reais quando disponíveis.
    """
    rng = np.random.default_rng(42)
    days = np.arange(366)
    base = 49.2
    sazonal = 35 * np.exp(-((days - 200) ** 2) / (2 * 45 ** 2))   # pico inverno
    semanal = 6 * np.sin(2 * np.pi * days / 7)
    ruido = rng.normal(0, 6, size=366)
    casos = np.clip(base + sazonal + semanal + ruido, 0, None)

    # Detecta anomalias por Z-score
    mu, sigma = casos.mean(), casos.std()
    z = (casos - mu) / sigma
    idx_anom = np.where(z > 2)[0][:15]

    fig, ax = plt.subplots(figsize=(11, 4.5))
    ax.plot(days, casos, color=PRIMARY, linewidth=1, alpha=0.85,
            label="Casos diários (ilustrativo)")
    ax.scatter(idx_anom, casos[idx_anom], color=DANGER, s=42, zorder=5,
               label="Anomalias (Z > 2σ)", edgecolor="white", linewidth=0.8)
    ax.axhline(mu, color="#888", linestyle=":", linewidth=1,
               label=f"Média (μ = {mu:.1f})")
    ax.set_xlabel("Dia do ano (2024)")
    ax.set_ylabel("Casos / dia")
    ax.set_title("Série temporal de SRAG — SP 2024 (perfil ilustrativo) com anomalias")
    ax.legend(loc="upper right", frameon=False, fontsize=9)
    ax.text(0.01, -0.18,
            "* Curva sintética calibrada para média 49,2 e perfil sazonal documentado. "
            "Substituir por dados reais do SIVEP-Gripe para uso final.",
            transform=ax.transAxes, fontsize=8, color="#666", style="italic")
    save(fig, "07_serie_temporal_ilustrativa.png")


if __name__ == "__main__":
    print("Gerando gráficos em:", OUT)
    fig_extraction()
    fig_trends()
    fig_scores()
    fig_mae_vs_baseline()
    fig_metrics()
    fig_anomalies()
    fig_timeseries_illustrative()
    print("Concluído.")
