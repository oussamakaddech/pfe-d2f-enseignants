package esprit.pfe.serviceformation.Entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "enseignants")
public class Enseignant {

    @Id
    @Column(length = 10, nullable = false, unique = true)
    private String id; // ex: E12345

    @Column(length = 100, nullable = false)
    private String nom;

    @Column(length = 30, nullable = false)
    private String prenom;

    @Column( nullable = false)
    private String mail;

    @Column(length = 1, nullable = false)
    private String type;

    @Column(length = 1, nullable = false)
    private String etat;

    @Column(length = 1, nullable = false)
    private String cup;

    @Column(name = "chefdepartement", length = 1, nullable = false)
    private String chefDepartement;

    // Relation avec UP et Dept si besoin
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "up_id", referencedColumnName = "id", nullable = true)
    private Up up;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "dept_id", referencedColumnName = "id", nullable = true)
    private Dept dept;

    // Présences (historique)
    @JsonIgnore
    @OneToMany(mappedBy = "enseignant", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Presence> presences;


    @OneToMany(
            mappedBy = "enseignant",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private List<Inscription> inscriptions = new ArrayList<>();

}
