package tn.esprit.d2f.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserCompetence implements Serializable {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JsonProperty("idUserCompetence")
    private Long id;

    @Column(nullable = false)
    @JsonProperty("idUser")
    private String userId;

    @ManyToOne
    @JoinColumn(name = "id_competence", nullable = false)
    @JsonProperty("idCompetence")
    private Competence competence;
    public void setUserId(String userId) {
        this.userId = userId;
    }

    public void setCompetence(Competence competence) {
        this.competence = competence;
    }
}
