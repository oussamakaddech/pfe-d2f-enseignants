package esprit.pfe.serviceformation.Entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"}) // Évite les erreurs de proxy
@Entity
@Table(name = "departements")
public class Dept {

    @Id

    private String id; // Identifiant unique du département

    private String libelle; // Nom ou libellé du département
}

