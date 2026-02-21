package tn.esprit.d2f.competence.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sous_competences")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SousCompetence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String code;

    @Column(nullable = false)
    private String nom;

    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "competence_id", nullable = false)
    @JsonBackReference("competence-souscompetence")
    private Competence competence;

    @OneToMany(mappedBy = "sousCompetence", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference("souscompetence-savoir")
    @Builder.Default
    private List<Savoir> savoirs = new ArrayList<>();
}
