package tn.esprit.d2f.competence.repository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Implémentation JDBC du port d'annuaire.
 *
 * <p>Le rôle {@code app_user_competence} ne dispose que de {@code USAGE} sur le
 * schéma {@code formation} et de {@code SELECT} sur les colonnes
 * d'identification / rattachement de {@code formation.enseignants} (voir
 * {@code infra/postgres/sql/10_schemas_and_grants.sql}). Toute écriture est
 * révoquée par le garde-fou.</p>
 */
@Slf4j
@Repository
@RequiredArgsConstructor
public class JdbcEnseignantScopePort implements EnseignantScopePort {

    /** Fiche de l'utilisateur connecté (par {@code user_id}, repli sur l'e-mail). */
    private static final String OWN_FICHE_SQL = """
            SELECT up_id, dept_id FROM formation.enseignants
            WHERE deleted_at IS NULL
              AND ((? <> '' AND user_id = ?) OR (? <> '' AND lower(mail) = lower(?)))
            ORDER BY id
            LIMIT 1
            """;

    /** Rattachement UP / département de l'enseignant ciblé. */
    private static final String ENSEIGNANT_SCOPE_SQL =
            "SELECT up_id, dept_id FROM formation.enseignants WHERE id = ? AND deleted_at IS NULL";

    private final JdbcTemplate jdbcTemplate;

    @Override
    public Optional<Fiche> findOwnFiche(String userId, String email) {
        String compte = userId == null ? "" : userId.trim();
        String mail = email == null ? "" : email.trim();
        List<Fiche> fiches = jdbcTemplate.query(OWN_FICHE_SQL,
                (rs, rowNum) -> new Fiche(rs.getString("up_id"), rs.getString("dept_id")),
                compte, compte, mail, mail);
        return fiches.stream().findFirst();
    }

    @Override
    public Optional<Fiche> findById(String enseignantId) {
        if (enseignantId == null || enseignantId.isBlank()) {
            return Optional.empty();
        }
        List<Fiche> fiches = jdbcTemplate.query(ENSEIGNANT_SCOPE_SQL,
                (rs, rowNum) -> new Fiche(rs.getString("up_id"), rs.getString("dept_id")),
                enseignantId.trim());
        return fiches.stream().findFirst();
    }

    @Override
    public List<String> findIds(String upId, String deptId) {
        boolean up = upId != null && !upId.isBlank();
        boolean dept = deptId != null && !deptId.isBlank();
        if (!up && !dept) {
            return List.of();
        }
        StringBuilder sql = new StringBuilder(
                "SELECT id FROM formation.enseignants WHERE deleted_at IS NULL AND (");
        List<Object> args = new ArrayList<>();
        if (up) {
            sql.append("up_id = ?");
            args.add(upId);
        }
        if (up && dept) {
            sql.append(" OR ");
        }
        if (dept) {
            sql.append("dept_id = ?");
            args.add(deptId);
        }
        sql.append(") ORDER BY id");
        return jdbcTemplate.query(sql.toString(),
                (rs, rowNum) -> rs.getString("id"), args.toArray());
    }
}
