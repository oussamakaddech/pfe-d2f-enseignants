import pytest

from rice import nlp


def test_extract_aa_block_and_parse_lines():
    text = (
        "Acquis d'apprentissage\n"
        "AA1 Faire un test 3\n"
        "AA2 Analyser des resultats 4\n"
        "Contenu détaillé\n"
    )
    block = nlp._extract_aa_block(text)
    assert block is not None
    parsed = nlp._parse_aa_lines(block)
    assert any(p['type'] == 'marker' for p in parsed)

    acquis = nlp._extract_acquis_apprentissage(text)
    assert isinstance(acquis, list)
    assert len(acquis) >= 1


def test_parse_aa_bloom_and_collect_standalone():
    bm, rest = nlp._parse_aa_bloom("Some text 4")
    assert bm == 4
    assert "Some text" in rest or rest == "Some text"
    assert nlp._collect_standalone_bloom("1") == 1


def test_extract_seances_items_and_blocks():
    txt = (
        "Séance 1: Introduction\n- Point A\n- Point B\n"
        "Séance 2: TP\n- Atelier\n"
    )
    seances = nlp._extract_seances(txt)
    assert len(seances) == 2
    assert any(s['items'] for s in seances)


def test_extract_referentiel_competences_minimum():
    # Build three items matching the referential pattern
    txt = (
        "A 1 - Première compétence importante\n"
        "A 2 - Deuxième compétence importante\n"
        "A 3 - Troisième compétence importante\n"
    )
    items = nlp._extract_referentiel_competences(txt)
    # function returns list only when >=3 items found
    assert isinstance(items, list)
    assert len(items) >= 3
