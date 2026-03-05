package tn.esprit.d2f.competence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Superclasse technique partagée par toutes les entités du domaine.
 *
 * <p>Fournit :
 * <ul>
 *   <li>{@code createdAt} / {@code updatedAt} via Spring Data Auditing (@EnableJpaAuditing)</li>
 *   <li>{@code version} pour le verrou optimiste Hibernate (@Version)</li>
 * </ul>
 *
 * Hibernate incrémente {@code version} à chaque UPDATE et lève
 * {@code OptimisticLockException} en cas de conflit concurrent.
 */
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
public abstract class BaseAuditEntity {

    /** Date de création de l'enregistrement – non modifiable après l'INSERT. */
    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    /** Date de la dernière modification de l'enregistrement. */
    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * Compteur de version pour le verrou optimiste.
     * Toute tentative de mise à jour d'un enregistrement dont la version
     * a déjà été incrémentée par une autre transaction lève
     * {@code jakarta.persistence.OptimisticLockException}.
     */
    @Version
    private Long version;
}
