"""Le moteur legacy lit les niveaux comme le moteur principal (audit C1, 2026-09-24).

Avant correctif, la requête legacy ne connaissait que N1_DEBUTANT..N5_EXPERT :
les 370 niveaux sur 514 saisis en DEBUTANT/INITIE/CONFIRME/AVANCE étaient lus
0 puis ramenés à 1, et les enseignants supprimés étaient comptés.
"""
import re

from app.domain.value_objects.enums import LEVEL_INT_MAP, sql_level_case
from app.legacy_compat_runtime import ensure_legacy_aliases

ensure_legacy_aliases()

from app_legacy.engines.feature_engine import niveau_to_int  # noqa: E402
from app_legacy.services import data_service  # noqa: E402


def _branches(case_sql: str) -> dict[str, int]:
    return {label: int(v) for label, v in re.findall(r"WHEN '([^']+)' THEN (\d)", case_sql)}


def test_sql_case_covers_every_label_of_the_domain_map():
    assert _branches(sql_level_case("x.niveau")) == LEVEL_INT_MAP


def test_legacy_query_reads_both_vocabularies():
    branches = _branches(data_service.NIVEAU_CASE)
    for label, expected in {"DEBUTANT": 1, "INITIE": 2, "CONFIRME": 3, "AVANCE": 4, "EXPERT": 5,
                            "N3_INTERMEDIAIRE": 3}.items():
        assert branches[label] == expected
    assert _branches(data_service.NIVEAU_REQUIS_CASE) == LEVEL_INT_MAP


def test_legacy_query_excludes_deleted_teachers_and_unreadable_levels():
    query = " ".join(data_service.COMPETENCY_LEVELS_QUERY.split())
    assert "ens.deleted_at IS NULL" in query
    # un niveau illisible est écarté, pas ramené à 1
    assert "END) > 0" in query


def test_legacy_feature_engine_uses_the_domain_map():
    assert niveau_to_int("CONFIRME") == 3
    assert niveau_to_int("initie") == 2
    assert niveau_to_int("N5_EXPERT") == 5
    assert niveau_to_int("inconnu") == 0
