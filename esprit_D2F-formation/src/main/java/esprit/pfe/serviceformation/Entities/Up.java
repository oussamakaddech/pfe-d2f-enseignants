package esprit.pfe.serviceformation.Entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"}) // Évite les erreurs de proxy
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "ups")
public class Up {

    @Id


    private String id; // Identifiant unique de l'UP

    private String libelle; // Libellé ou nom de l'UP
}

