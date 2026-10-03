"""Politique d'identifiants enseignant : quels formats sont acceptes.

Ces tests verrouillent une regle de gouvernance qui n'en avait aucun. Elle
rejetait le format que l'application elle-meme genere, ce qui renvoyait 400
sur les routes qui l'appliquent pour tout enseignant cree depuis l'interface.
"""
import pytest

from app.main import app  # installe les alias app.* -> app_legacy.*  # noqa: F401
from app_legacy.core.id_policy import is_canonical_ens, is_legacy_t, validate_canonical_id


class TestFormatsCanoniques:
    @pytest.mark.parametrize("teacher_id", ["ENS001", "ENS042", "ENS903", "ENS_GC1", "ENS_T01"])
    def test_identifiants_issus_du_peuplement(self, teacher_id):
        assert is_canonical_ens(teacher_id)

    @pytest.mark.parametrize("teacher_id", ["E00003", "E00004", "E00005", "E00007"])
    def test_identifiants_generes_par_l_application(self, teacher_id):
        """Le service formation fabrique ces ids via String.format("E%05d", n).

        Tout enseignant cree depuis l'interface en porte un : les refuser
        rendait la route inutilisable pour eux.
        """
        assert is_canonical_ens(teacher_id)

    def test_la_casse_et_les_espaces_sont_normalises(self):
        assert is_canonical_ens("  e00004  ")
        assert is_canonical_ens("ens903")


class TestFormatsRefuses:
    @pytest.mark.parametrize("teacher_id", ["T001", "T042", "T00123"])
    def test_le_format_historique_reste_refuse(self, teacher_id):
        """Rejet volontaire et documente : ces ids passent par l'adaptateur
        de compatibilite, pas par les nouvelles routes."""
        assert is_legacy_t(teacher_id)
        assert not is_canonical_ens(teacher_id)

    @pytest.mark.parametrize("teacher_id", ["E123", "E123456", "EXXXXX", "ENS", "", "12345"])
    def test_les_formats_malformes_restent_refuses(self, teacher_id):
        """L'elargissement ne doit pas ouvrir la porte a n'importe quoi :
        seul E suivi d'EXACTEMENT cinq chiffres est accepte."""
        assert not is_canonical_ens(teacher_id)


class TestValidation:
    @pytest.mark.parametrize("teacher_id", ["E00004", "ENS903"])
    def test_un_id_canonique_passe_et_revient_normalise(self, teacher_id):
        assert validate_canonical_id(teacher_id, path="/test") == teacher_id.upper()

    def test_un_id_historique_est_refuse(self):
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc:
            validate_canonical_id("T001", path="/test")
        assert exc.value.status_code == 400

    def test_un_id_malforme_est_refuse(self):
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc:
            validate_canonical_id("E123", path="/test")
        assert exc.value.status_code == 400
