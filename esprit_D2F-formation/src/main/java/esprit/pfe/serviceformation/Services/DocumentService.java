package esprit.pfe.serviceformation.Services;

import esprit.pfe.serviceformation.Entities.Document;
import esprit.pfe.serviceformation.Entities.DriveSubPath;
import esprit.pfe.serviceformation.Entities.Formation;
import esprit.pfe.serviceformation.Microsoft.OneDriveService;
import esprit.pfe.serviceformation.Repositories.DocumentRepository;
import esprit.pfe.serviceformation.Repositories.FormationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Date;
import java.util.List;

@Service
public class DocumentService {

    @Autowired
    private DocumentRepository       documentRepo;

    @Autowired
    private FormationRepository      formationRepo;

    @Autowired
    private OneDriveService          oneDriveService;

    /**
     * Crée + upload :
     * d2F/{formation}/{pathType}/{nomDocument}/{fichier}
     */
    public Document createDocument(
            Long formationId,
            String pathType,
            String nomDocument,
            boolean obligation,
            MultipartFile file
    ) throws IOException {
        Formation f = formationRepo.findById(formationId)
                .orElseThrow(() -> new RuntimeException("Formation non trouvée"));

        String url = oneDriveService.uploadDocumentToFormationFolder(
                f.getTitreFormation(), pathType, nomDocument,
                file.getBytes(), file.getOriginalFilename()
        );

        Document doc = new Document();
        doc.setPathType(pathType);
        doc.setNomDocument(nomDocument);
        doc.setObligation(obligation);
        doc.setDate(new Date());
        doc.setFormation(f);
        doc.setFilePath(url);

        return documentRepo.save(doc);
    }

    public Document getById(Long id) {
        return documentRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Document introuvable"));
    }

    public List<Document> getAll() {
        return documentRepo.findAll();
    }

    /**
     * Si `file` fourni ⇒ ré-upload,
     * sinon si `nomDocument` change ⇒ rename dossier.
     */
    public Document updateDocument(
            Long id,
            String pathType,
            String newNomDocument,
            boolean obligation,
            MultipartFile file
    ) throws IOException {
        Document doc = getById(id);
        String formation = doc.getFormation().getTitreFormation();

        if (file != null && !file.isEmpty()) {
            String url = oneDriveService.uploadDocumentToFormationFolder(
                    formation, pathType, newNomDocument,
                    file.getBytes(), file.getOriginalFilename()
            );
            doc.setFilePath(url);
        } else if (!doc.getNomDocument().equals(newNomDocument)) {
            oneDriveService.renameDocumentFolder(
                    formation, pathType,
                    doc.getNomDocument(), newNomDocument
            );
            doc.setFilePath(
                    doc.getFilePath().replace(doc.getNomDocument(), newNomDocument)
            );
        }

        doc.setNomDocument(newNomDocument);
        doc.setObligation(obligation);
        doc.setDate(new Date());
        return documentRepo.save(doc);
    }

    /**
     * Supprime en base ET dans OneDrive.
     */
    public void deleteDocument(Long id) {
        Document doc = getById(id);
        String formation = doc.getFormation().getTitreFormation();

        // extraction des segments du path
        String[] parts = doc.getFilePath().split("/");
        // …/d2F/{formation}/{pathType}/{nomDocument}/{fileName}
        String pathType    = parts[parts.length - 3];
        String nomDocument = parts[parts.length - 2];
        String fileName    = parts[parts.length - 1];

        // 1) on supprime sur OneDrive (on ignore les erreurs pour ne pas bloquer la base)
        try {
            oneDriveService.deleteDocument(
                    formation,
                    pathType,
                    nomDocument,
                    fileName
            );
        } catch (Exception e) {
            // log éventuellement
            System.err.println("Erreur OneDrive delete: " + e.getMessage());
        }

        // 2) on supprime en base
        documentRepo.delete(doc);
    }


    /**
     * Télécharge le contenu OneDrive à partir
     * de l’URL stockée.
     */
    public byte[] downloadDocumentFile(Long id) {
        Document doc = getById(id);
        String formation = doc.getFormation().getTitreFormation();
        String fn = doc.getFilePath()
                .substring(doc.getFilePath().lastIndexOf("/") + 1);

        return oneDriveService.downloadDocument(
                formation,
                doc.getNomDocument(),
                doc.getNomDocument(),
                fn
        );
    }
}
