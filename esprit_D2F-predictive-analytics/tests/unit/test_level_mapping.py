from app.domain.value_objects.enums import Level, level_to_int


def test_level_to_int_new_enum():
    assert level_to_int("N1_DEBUTANT") == 1
    assert level_to_int("N2_ELEMENTAIRE") == 2
    assert level_to_int("N3_INTERMEDIAIRE") == 3
    assert level_to_int("N4_AVANCE") == 4
    assert level_to_int("N5_EXPERT") == 5


def test_level_to_int_legacy_aliases():
    assert level_to_int("DEBUTANT") == 1
    assert level_to_int("INITIE") == 2
    assert level_to_int("CONFIRME") == 3
    assert level_to_int("AVANCE") == 4
    assert level_to_int("EXPERT") == 5


def test_level_to_int_niveau_aliases():
    assert level_to_int("NIVEAU_1") == 1
    assert level_to_int("NIVEAU_2") == 2
    assert level_to_int("NIVEAU_3") == 3
    assert level_to_int("NIVEAU_4") == 4
    assert level_to_int("NIVEAU_5") == 5


def test_level_to_int_numeric_strings():
    assert level_to_int("1") == 1
    assert level_to_int("3") == 3
    assert level_to_int("5") == 5


def test_level_to_int_case_insensitive():
    assert level_to_int("confirme") == 3
    assert level_to_int("n3_intermediaire") == 3


def test_level_to_int_unknown_and_none():
    assert level_to_int("UNKNOWN") == 0
    assert level_to_int("") == 0
    assert level_to_int(None) == 0


def test_level_enum_to_int_consistent_with_map():
    for level in Level:
        assert level.to_int() == level_to_int(level.value)
