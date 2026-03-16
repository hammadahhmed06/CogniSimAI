"""Embedding & similarity utilities (Gemini + fallback).

Implements semantic embedding generation using Gemini Embeddings per docs:
https://ai.google.dev/gemini-api/docs/embeddings

Primary call pattern:
    from google import genai
    from google.genai import types
    client = genai.Client()
    resp = client.models.embed_content(
        model="gemini-embedding-001",
        contents=[...texts...],
        config=types.EmbedContentConfig(task_type="SEMANTIC_SIMILARITY")
    )
    vectors = [e.values for e in resp.embeddings]

If library / key absent we fall back to deterministic pseudo-embeddings (hash-based) to keep the pipeline functional in tests/offline.
"""
from __future__ import annotations

from typing import List, Sequence, Tuple
import os
from dataclasses import dataclass
import logging

import numpy as np

try:  # optional dependency block
    from google import genai  # type: ignore
    from google.genai import types as genai_types  # type: ignore
except Exception:  # pragma: no cover
    genai = None  # type: ignore
    genai_types = None  # type: ignore

from app.core.dependencies import supabase  # reuse existing client

EMBED_MODEL = os.getenv("EMBED_MODEL", "gemini-embedding-001")
BATCH_SIZE = 32  # conservative; Gemini allows more but keep small for latency

logger = logging.getLogger("embeddings")


@dataclass
class EmbeddingResult:
    text: str
    vector: List[float]


def _pseudo_vectors(texts: Sequence[str]) -> List[EmbeddingResult]:
    out: List[EmbeddingResult] = []
    for t in texts:
        h = abs(hash(t))
        vec = [((h >> (i*3)) & 0xFF) / 255.0 for i in range(64)]  # use 64 dims for a bit more granularity
        out.append(EmbeddingResult(text=t, vector=vec))
    return out


def embed_texts(texts: Sequence[str]) -> List[EmbeddingResult]:
    """Embed a batch of texts. Splits into sub-batches; resilient to failures.

    Returns pseudo vectors if Gemini client not available or call fails.
    """
    payload = list(texts)
    if not payload:
        return []
    if genai is None or genai_types is None:
        return _pseudo_vectors(payload)

    client = genai.Client()
    results: List[EmbeddingResult] = []
    for start in range(0, len(payload), BATCH_SIZE):
        batch = payload[start : start + BATCH_SIZE]
        results.extend(_embed_batch(client, batch))

    for idx, item in enumerate(results):
        if not item.vector:
            results[idx] = _pseudo_vectors([item.text])[0]
    return results


def _embed_batch(client, texts: List[str]) -> List[EmbeddingResult]:  # type: ignore[no-untyped-def]
    try:
        if genai_types is not None:
            resp = client.models.embed_content(
                model=EMBED_MODEL,
                contents=texts,
                config=genai_types.EmbedContentConfig(task_type="SEMANTIC_SIMILARITY"),
            )
        else:  # fallback call without config
            resp = client.models.embed_content(model=EMBED_MODEL, contents=texts)
        out: List[EmbeddingResult] = []
        embeddings = getattr(resp, 'embeddings', [])
        for text, emb in zip(texts, embeddings):
            vec = list(getattr(emb, 'values', []) or [])
            out.append(EmbeddingResult(text=text, vector=vec))
        return out
    except Exception as exc:  # pragma: no cover
        logger.warning("Embedding batch failed (%s); falling back to pseudo vectors", exc)
        return _pseudo_vectors(texts)


def cosine_sim(a: Sequence[float], b: Sequence[float]) -> float:
    if not a or not b:
        return 0.0
    if len(a) != len(b):
        m = min(len(a), len(b))
        a = a[:m]
        b = b[:m]
    va = np.array(a)
    vb = np.array(b)
    denom = (np.linalg.norm(va) * np.linalg.norm(vb))
    if denom == 0:
        return 0.0
    return float(np.dot(va, vb) / denom)


def upsert_issue_embeddings(pairs: List[Tuple[str, List[float]]]) -> None:
    if not pairs:
        return
    rows = []
    for issue_id, vector in pairs:
        rows.append({
            "issue_id": issue_id,
            "embedding": vector,
            "model": EMBED_MODEL,
        })
    try:
        supabase.table("issue_embeddings").upsert(rows, on_conflict="issue_id").execute()
    except Exception:
        pass


def fetch_issue_embeddings(issue_ids: Sequence[str]) -> dict[str, List[float]]:
    if not issue_ids:
        return {}
    try:
        res = supabase.table("issue_embeddings").select("issue_id,embedding").in_("issue_id", list(issue_ids)).execute()
        data = getattr(res, 'data', []) or []
        return {r['issue_id']: r.get('embedding') or [] for r in data}
    except Exception:
        return {}


def compute_quality_score(
    distinctness: float,
    criteria_density: float,
    warning_penalty: float,
    structure_valid: float,
    llm_alignment: float | None = None,
) -> float:
    """Blend heuristic quality metrics into a 0..1 score.

    Args:
        distinctness: Ratio of novel stories vs duplicates.
        criteria_density: How complete/testable acceptance criteria are.
        warning_penalty: Penalty derived from lint warnings per story.
        structure_valid: Whether the model returned a structurally valid payload.
        llm_alignment: Optional self-evaluation score reported by an LLM reviewer (0..1).

    Returns:
        A float in the range [0, 1]. Callers can multiply by 100 if a percentage is needed.
    """

    def clamp(x: float) -> float:
        return 0.0 if x < 0 else 1.0 if x > 1 else x

    d = clamp(distinctness)
    c = clamp(criteria_density)
    w = clamp(warning_penalty)
    s = clamp(structure_valid)
    la = clamp(llm_alignment) if llm_alignment is not None else None

    base_weights = {
        "distinctness": 0.4,
        "criteria": 0.3,
        "warnings": 0.2,
        "structure": 0.1,
    }
    llm_weight = 0.15 if la is not None else 0.0
    total_weight = sum(base_weights.values()) + llm_weight

    score = (
        base_weights["distinctness"] * d
        + base_weights["criteria"] * c
        + base_weights["warnings"] * w
        + base_weights["structure"] * s
        + (llm_weight * la if la is not None else 0.0)
    ) / total_weight

    return round(score, 3)
