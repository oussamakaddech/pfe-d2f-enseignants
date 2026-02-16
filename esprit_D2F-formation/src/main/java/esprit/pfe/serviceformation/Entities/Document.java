package esprit.pfe.serviceformation.Entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "documents")
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idDocument;

    private String nomDocument;

    // Chemin/URL du fichier stocké sur OneDrive
    private String filePath;

    @Temporal(TemporalType.DATE)
    private Date date;

    private boolean obligation;

    @Column(nullable = false)
    private String pathType;
    // Association avec la formation associée
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "formation_id")
    private Formation formation;
}
