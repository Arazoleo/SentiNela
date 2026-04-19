import httpx
import logging
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Você é Sentinela, um assistente médico sindrômico especializado em vigilância epidemiológica.
Sua missão é coletar sintomas de forma empática, conversacional e estruturada, para classificar síndromes.

REGRAS IMPORTANTES:
1. Nunca diagnostique doenças específicas - apenas classifique síndromes
2. Sempre pergunte: início dos sintomas, intensidade (1-10), febre, medicamentos em uso
3. Seja empático e tranquilizante, nunca alarmista
4. Quando tiver informação suficiente (mínimo 3-4 sintomas), retorne o JSON estruturado

Quando estiver pronto para classificar, inclua ao final da resposta o bloco JSON:
```json
{
  "symptoms_extracted": ["sintoma1", "sintoma2"],
  "syndrome_hypothesis": "Nome da Síndrome",
  "icd10": "X00",
  "confidence": 0.85,
  "urgency": "low|medium|high|emergency",
  "needs_more_info": false,
  "recommended_specialty": "Especialidade",
  "recommendations": ["recomendação1", "recomendação2"]
}
```

Se precisar de mais informações, use:
```json
{
  "needs_more_info": true,
  "follow_up_question": "Sua pergunta aqui"
}
```"""


class MedGemmaService:
    def __init__(self):
        self.base_url = settings.ollama_endpoint
        self.model = settings.ollama_model
        self.timeout = 120.0

    async def generate(self, messages: list[dict], max_tokens: int = 1024) -> dict[str, Any]:
        # Garante system prompt no início
        full_messages = messages
        if not messages or messages[0].get("role") != "system":
            full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

        payload = {
            "model": self.model,
            "messages": full_messages,
            "stream": False,
            "options": {
                "temperature": 0.3,
                "num_predict": max_tokens,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()

            # Ollama retorna: {"message": {"role": "assistant", "content": "..."}}
            content = data.get("message", {}).get("content", "")
            return {"response_text": content}

        except httpx.TimeoutException:
            logger.error("Ollama timeout após %ss", self.timeout)
            return self._fallback_response("O modelo está demorando para responder. Tente novamente.")
        except httpx.HTTPStatusError as e:
            logger.error("Ollama HTTP error: %s", e)
            return self._fallback_response("Erro ao contatar o modelo. Verifique se o Ollama está rodando.")
        except Exception as e:
            logger.error("Ollama unexpected error: %s", e)
            return self._fallback_response("Ocorreu um erro interno. Por favor, tente novamente.")

    def _fallback_response(self, message: str) -> dict:
        return {
            "response_text": message,
            "needs_more_info": True,
            "symptoms_extracted": [],
            "syndrome_hypothesis": None,
            "urgency": "low",
            "confidence": 0.0,
        }

    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.get(f"{self.base_url}/api/tags")
                return r.status_code == 200
        except Exception:
            return False


medgemma_service = MedGemmaService()
