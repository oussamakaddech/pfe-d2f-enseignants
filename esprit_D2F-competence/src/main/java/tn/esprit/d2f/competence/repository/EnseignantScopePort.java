package tn.esprit.d2f.competence.repository;

import java.util.List;
import java.util.Optional;

/**
 * Accès en <b>lecture seule</b> à l'annuaire des enseignants (schéma
 * {@code formation}), nécessaire pour résoudre le périmètre d'affectation d'un
 * CUP / chef de département.
 *
 * <p>Isolé derrière un port pour deux raisons :</p>
 * <ul>
 *   <li>le service compétence n'a aucune entité {@code Enseignant} et ne doit
 *       pas en créer (l'annuaire appartient au service formation) ;</li>
 *   <li>la logique d'autorisation reste testable sans base de données.</li>
 * </ul>
 */
public interface EnseignantScopePort {

    /** Rattachement hiérarchique d'une fiche enseignant. */
    record Fiche(String upId, String deptId) {
    }

    /**
     * Fiche de l'utilisateur connecté, retrouvée par son identifiant de compte
     * puis, à défaut, par son adresse e-mail.
     */
    Optional<Fiche> findOwnFiche(String userId, String email);

    /** Fiche d'un enseignant ciblé (rattachement UP / département). */
    Optional<Fiche> findById(String enseignantId);

    /**
     * Identifiants des enseignants rattachés à cette UP et/ou à ce département
     * (union quand les deux sont fournis). Aucun critère → liste vide.
     */
    List<String> findIds(String upId, String deptId);
}
