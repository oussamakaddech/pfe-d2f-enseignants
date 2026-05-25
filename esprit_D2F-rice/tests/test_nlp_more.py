from rice import nlp


def test_normalize_slug_and_domain_build():
    assert nlp._normalize('Éléments') == 'elements'
    assert nlp._slug('Programmation Avancée en Python')
    dn = nlp._build_domain_name_from_file('fiche_module_GenieCivil_MT-34.docx')
    assert isinstance(dn, str) and dn


def test_normalize_ref_and_codes_match():
    assert nlp._normalize_ref_code('GC-01-S2a') == 'S2a'
    assert nlp._codes_match('GC-01-S2a', 'S2a')


def test_bloom_and_type_detection():
    t1 = 'Analyser et comparer des structures'
    assert nlp._detect_bloom_level(t1) >= 4
    assert nlp._bloom_to_niveau(4).startswith('N4')

    prat_text = 'TP laboratoire montage circuit arduino'
    assert nlp._detect_type(prat_text, 'ge') == 'PRATIQUE'
    theo_text = 'cours theorie algorithmique complexite'
    assert nlp._detect_type(theo_text, 'info') == 'THEORIQUE'


def test_clean_name_edgecases():
    assert nlp._clean_name('Dr. X') is None
    assert nlp._clean_name('Abidi Mounir') is not None
