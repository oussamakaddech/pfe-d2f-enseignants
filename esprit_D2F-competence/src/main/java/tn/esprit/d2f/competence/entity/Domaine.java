package tn.esprit.d2f.competence.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "domaines")
@Data
@EqualsAndHashCode(of = "id")
@ToString(exclude = "competences")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Domaine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String code;

    @Column(nullable = false)
    private String nom;

    private String description;

    @Column(nullable = false)
    @Builder.Default
    private Boolean actif = true;

    @OneToMany(mappedBy = "domaine", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference("domaine-competence")
    @Builder.Default
    private List<Competence> competences = new ArrayList<>();
}
