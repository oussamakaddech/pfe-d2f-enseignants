package tn.esprit.d2f.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

/**
 * Périmètre organisationnel d'un validateur, administré côté serveur.
 *
 * <p>Source d'autorité pour « son UP / son département » : le backend ne fait
 * JAMAIS confiance aux valeurs {@code up}/{@code departement} envoyées par le
 * frontend — il résout le périmètre de l'utilisateur connecté depuis cette
 * table (clé = username du JWT). Seul l'administrateur peut créer/modifier les
 * lignes (endpoints {@code /reviewer-scopes}).</p>
 */
@Entity
@Table(name = "reviewer_scope")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewerScope {

    /** Username du validateur (subject JWT). */
    @Id
    @Column(length = 150)
    @JsonProperty("username")
    private String username;

    /** Rôle concerné : CUP ou CHEF_DEPARTEMENT. */
    @Column(nullable = false, length = 30)
    @JsonProperty("role")
    private String role;

    /** Code UP du CUP (ex. UP_INFO). Null pour un chef de département. */
    @Column(name = "up_code")
    @JsonProperty("upCode")
    private String upCode;

    /** Code département (ex. DEPT_GL). Renseigné pour CUP et chef. */
    @Column(name = "department_code")
    @JsonProperty("departmentCode")
    private String departmentCode;
}
