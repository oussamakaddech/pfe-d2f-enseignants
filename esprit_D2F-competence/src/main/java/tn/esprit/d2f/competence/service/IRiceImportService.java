package tn.esprit.d2f.competence.service;

import tn.esprit.d2f.competence.dto.RiceImportRequest;
import tn.esprit.d2f.competence.dto.RiceImportResult;

import java.util.List;

public interface IRiceImportService {
    /**
     * Persist the full validated RICE structure (domaines → compétences → sous-compétences →
     * savoirs + enseignant assignments) in a single transaction.
     */
    RiceImportResult importRice(RiceImportRequest request);

    /** Retourne l'historique de tous les imports RICE effectués. */
    List<RiceImportResult> getImportHistory();
}
