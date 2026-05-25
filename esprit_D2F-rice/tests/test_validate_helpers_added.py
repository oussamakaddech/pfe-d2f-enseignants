from types import SimpleNamespace

from rice import validate_helpers


class FakeCur:
    def __init__(self):
        self.queries = []

    def execute(self, *args, **kwargs):
        self.queries.append(args[0] if args else None)

    def fetchone(self):
        return (True,)

    def close(self):
        pass


class FakeConn:
    def __init__(self):
        self.rolled = False

    def rollback(self):
        self.rolled = True


def make_savoir(code="S1", ens=["E1"]):
    return SimpleNamespace(tmpId="tmp-1", code=code, nom="Nom", description=None, type="T", niveau="N2", enseignantsSuggeres=ens)


def test_upsert_rows_and_links_success():
    cur = FakeCur()
    conn = FakeConn()
    errors = []

    # domaine
    domaine = SimpleNamespace(code="D1", nom="Domaine", description="desc", competences=[])
    assert validate_helpers._upsert_domaine(cur, domaine, errors, conn) is True

    # competence
    comp = SimpleNamespace(code="C1", nom="Comp", description="d", ordre=1, sousCompetences=[], savoirs=[])
    assert validate_helpers._upsert_competence(cur, comp, "D1", errors, conn) is True

    # sous_competence
    sc = SimpleNamespace(code="SC1", nom="SC", description=None, savoirs=[])
    assert validate_helpers._upsert_sous_competence(cur, sc, "C1", errors, conn) is True

    # upsert savoir row + links
    sv = make_savoir()
    res = validate_helpers._upsert_savoir_row(cur, sv, "C1", overwrite=False, errors=errors, conn=conn)
    assert isinstance(res, tuple) and len(res) == 3
    # inserted_links should reflect number of enseignantSuggeres
    assert res[2] == len(sv.enseignantsSuggeres)


def test_process_validate_propositions_counts():
    cur = FakeCur()
    conn = FakeConn()
    errors = []

    # Build nested structures: domaine -> competence -> sous_competence -> savoirs
    savoir = make_savoir(code="S100", ens=["E1", "E2"])
    sc = SimpleNamespace(code="SCX", nom="Sous", description=None, savoirs=[savoir])
    comp = SimpleNamespace(code="COMPX", nom="CompX", description=None, ordre=1, sousCompetences=[sc], savoirs=[savoir])
    domaine = SimpleNamespace(code="D100", nom="Dom", description=None, competences=[comp])

    req = SimpleNamespace(propositions=[domaine], overwrite=False)
    counts = validate_helpers._process_validate_propositions(cur, req, errors, conn)
    assert isinstance(counts, dict)
    # counts keys exist
    assert "upserted_domaines" in counts and "inserted_savoirs" in counts
