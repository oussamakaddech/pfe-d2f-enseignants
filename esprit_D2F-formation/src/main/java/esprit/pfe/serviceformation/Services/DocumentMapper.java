package esprit.pfe.serviceformation.Services;


import esprit.pfe.serviceformation.DTO.DocumentDTO;
import esprit.pfe.serviceformation.Entities.Document;

public class DocumentMapper {

    public static DocumentDTO mapToDTO(Document doc) {
        DocumentDTO dto = new DocumentDTO();
        dto.setIdDocument(doc.getIdDocument());
        dto.setNomDocument(doc.getNomDocument());
        dto.setObligation(doc.isObligation());
        dto.setDate(doc.getDate());
        dto.setFilePath(doc.getFilePath());
        dto.setPathType(doc.getPathType());
        if(doc.getFormation() != null) {
            dto.setFormationId(doc.getFormation().getIdFormation());
            dto.setFormationTitre(doc.getFormation().getTitreFormation());
        }
        return dto;
    }
}
