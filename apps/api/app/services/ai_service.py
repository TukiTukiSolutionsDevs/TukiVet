"""AI-assisted clinical suggestions using OpenAI."""
from __future__ import annotations

import json
from typing import Any

import httpx

from app.config import get_settings


SOAP_SYSTEM_PROMPT = """Eres un asistente clínico veterinario experto. 
El usuario te proporcionará datos de un encuentro clínico (motivo de consulta, signos vitales, 
problemas activos, hallazgos objetivos) y debes generar sugerencias estructuradas para la nota SOAP.

REGLAS:
- Responde ÚNICAMENTE con JSON válido, sin texto adicional
- Usa lenguaje clínico apropiado en español
- Las sugerencias deben ser concisas y basadas en los datos proporcionados
- No inventes datos que no estén en el contexto
- Si los datos son insuficientes, genera sugerencias genéricas apropiadas para la especie/motivo

FORMATO DE RESPUESTA:
{
  "subjective": {
    "summary": "resumen de la anamnesis",
    "history": "historia clínica relevante inferida"
  },
  "objective": {
    "physical_exam": "hallazgos del examen físico basados en vitales"
  },
  "assessment": ["diagnóstico diferencial 1", "diagnóstico diferencial 2"],
  "plan": {
    "treatment": "plan de tratamiento sugerido",
    "follow_up": "seguimiento recomendado",
    "owner_instructions": "instrucciones para el propietario"
  },
  "diagnostic_suggestions": ["examen complementario 1", "examen complementario 2"],
  "red_flags": ["signo de alarma si lo hay"]
}"""


async def suggest_soap(
    chief_complaint: str,
    species: str,
    breed: str | None,
    age_years: float | None,
    weight_kg: str | None,
    vitals: dict[str, Any],
    problems: list[str],
    existing_soap: dict[str, Any],
) -> dict[str, Any]:
    settings = get_settings()
    api_key = settings.openai_api_key.get_secret_value()

    if not api_key:
        return _mock_suggestion(chief_complaint, species)

    patient_ctx = f"""
Especie: {species}
Raza: {breed or "no especificada"}
Edad: {f"{age_years:.1f} años" if age_years else "desconocida"}
Peso: {weight_kg or "no registrado"} kg
Motivo de consulta: {chief_complaint or "no especificado"}
Problemas activos: {", ".join(problems) if problems else "ninguno registrado"}
Signos vitales: {json.dumps(vitals, ensure_ascii=False) if vitals else "no registrados"}
SOAP actual: {json.dumps(existing_soap, ensure_ascii=False)}
"""

    payload = {
        "model": settings.ai_model,
        "messages": [
            {"role": "system", "content": SOAP_SYSTEM_PROMPT},
            {"role": "user", "content": f"Genera sugerencias SOAP para este paciente:\n{patient_ctx}"},
        ],
        "temperature": 0.3,
        "max_tokens": 1000,
        "response_format": {"type": "json_object"},
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json=payload,
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
        return json.loads(content)


def _mock_suggestion(chief_complaint: str, species: str) -> dict[str, Any]:
    """Fallback when no API key is configured."""
    return {
        "subjective": {
            "summary": f"Paciente {species} que consulta por: {chief_complaint or 'motivo no especificado'}.",
            "history": "Sin antecedentes previos registrados en este sistema.",
        },
        "objective": {
            "physical_exam": "Examen físico general: Paciente alerta, activo y reactivo. Mucosas rosadas, TRC < 2s. "
                             "Temperatura, FC y FR dentro de rangos de referencia.",
        },
        "assessment": [
            f"Condición compatible con motivo de consulta ({chief_complaint or 'sin especificar'})",
            "Descartar causas sistémicas subyacentes",
        ],
        "plan": {
            "treatment": "Tratamiento sintomático según hallazgos del examen físico.",
            "follow_up": "Re-evaluación en 7-10 días o antes si hay deterioro clínico.",
            "owner_instructions": "Observar evolución. Acudir a urgencias ante signos de alarma: disnea, colapso, vómitos persistentes.",
        },
        "diagnostic_suggestions": [
            "Hemograma completo + bioquímica sérica básica",
            "Urianálisis con sedimento",
        ],
        "red_flags": [],
        "_mock": True,
    }
