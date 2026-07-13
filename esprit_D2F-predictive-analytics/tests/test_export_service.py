"""Tests for services/export_service.py — Export functionality."""

import pytest
from unittest.mock import MagicMock, patch


class TestExportService:
    def test_build_excel_inactifs(self):
        from app.services.export_service import build_excel
        mock_db = MagicMock()
        with patch("app.services.export_service.ReportingEngine") as MockEngine:
            MockEngine.return_value.enseignants_sans_formation.return_value = {
                "items": [
                    {"nom": "Dupont", "prenom": "Jean", "email": "j@test.com",
                     "departement": "Info", "up": "UP1",
                     "derniereFormationDate": "2025-01-01",
                     "nombreMoisDepuisDerniereFormation": 12,
                     "scoreRisqueDecrochage": 0.8, "niveauRisque": "CRITIQUE"},
                ]
            }
            data, filename = build_excel(mock_db, "INACTIFS", mois=6, annee=2025, departement=None, up=None)
            assert isinstance(data, bytes)
            assert filename.startswith("rapport_inactifs_")
            assert filename.endswith(".xlsx")

    def test_build_excel_invalid_type(self):
        from app.services.export_service import build_excel
        mock_db = MagicMock()
        with pytest.raises(Exception):
            build_excel(mock_db, "INVALID", mois=6, annee=2025, departement=None, up=None)

    def test_build_excel_par_dept(self):
        from app.services.export_service import build_excel
        mock_db = MagicMock()
        with patch("app.services.export_service.ReportingEngine") as MockEngine:
            MockEngine.return_value.formations_par_departement.return_value = {
                "departements": [
                    {"departementNom": "Info", "nombreEnseignants": 10,
                     "nombreFormationsOrganisees": 5, "nombreParticipations": 20,
                     "tauxParticipation": 80.0, "pourcentageARisque": 10.0,
                     "niveauCompetenceMoyen": 3.5, "scoreEngagement": 75.0},
                ]
            }
            data, filename = build_excel(mock_db, "PAR_DEPT", mois=6, annee=2025, departement=None, up=None)
            assert isinstance(data, bytes)
            assert "par_dept" in filename

    def test_build_pdf(self):
        from app.services.export_service import build_pdf
        mock_db = MagicMock()
        with patch("app.services.export_service.ReportingEngine") as MockEngine:
            MockEngine.return_value.formations_par_departement.return_value = {
                "departements": [
                    {"departementNom": "Info", "nombreEnseignants": 10,
                     "nombreFormationsOrganisees": 5, "tauxParticipation": 80.0,
                     "pourcentageARisque": 10.0, "scoreEngagement": 75.0},
                ]
            }
            data, filename = build_pdf(mock_db, "RAPPORT_MENSUEL", annee=2025)
            assert isinstance(data, bytes)
            assert filename.endswith(".pdf")
