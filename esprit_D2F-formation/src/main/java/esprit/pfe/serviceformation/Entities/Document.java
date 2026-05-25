package esprit.pfe.serviceformation.entities;

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
public class Document extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idDocument;

    // Add a setter for the id field to match the test expectation
    public void setIdDocument(Long idDocument) {
        this.idDocument = idDocument;
    }

    // Add a setter to match the test expectation
    public void setId(Long id) {
        this.idDocument = id;
    }

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
