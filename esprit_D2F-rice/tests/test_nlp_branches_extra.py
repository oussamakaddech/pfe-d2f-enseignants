"""Extra branch tests for rice.nlp helpers."""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASS", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")

from rice import nlp


def test_extract_enseignants_dual_label_formats():
    txt_std = "Enseignants - Intervenants: Ahmed Ben Ali, Sarah Martin"
    names_std = nlp._extract_ens_names_from_standard(txt_std)
    assert any("Ahmed" in n for n in names_std)

    txt_rev = "Ahmed Ben Ali\nEnseignants - Intervenants"
    names_rev = nlp._extract_ens_names_from_rev(txt_rev)
    assert any("Ahmed" in n for n in names_rev)


def test_extract_block_type_paths():
    assert nlp._extract_block_type("Type: TP") == "TP"
    assert nlp._extract_block_type("Situation (s): Projet") == "Projet"
    assert nlp._extract_block_type("Sans type ici") is None


def test_extract_seances_regex_non_greedy_replacement():
    text = "Seance 1: Intro\n- point 1\nSeance 2: Avance\n- point 2"
    out = nlp._extract_seances(text)
    assert len(out) == 2
    assert out[0]["titre"] == "Intro"
    assert out[1]["titre"] == "Avance"


def test_build_section_map_after_normalization():
    text = "Competences dans le domaine des Sols (S)\nCompetences en Eau (E)"
    m = nlp._build_section_map(text)
    assert m.get("S")
    assert m.get("E")
