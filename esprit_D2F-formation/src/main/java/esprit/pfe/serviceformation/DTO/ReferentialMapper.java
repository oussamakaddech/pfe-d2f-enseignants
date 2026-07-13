package esprit.pfe.serviceformation.dto;

import esprit.pfe.serviceformation.entities.AnimateurExterne;
import esprit.pfe.serviceformation.entities.Bureau;
import esprit.pfe.serviceformation.entities.Dept;
import esprit.pfe.serviceformation.entities.FormationCompetence;
import esprit.pfe.serviceformation.entities.Up;

/**
 * Mapping entité → DTO pour les données de référence (DSI #7 : ne jamais
 * retourner l'entité JPA brute à l'API — masque les champs d'audit/relations).
 */
public final class ReferentialMapper {

    private ReferentialMapper() {
        throw new UnsupportedOperationException("Utility class");
    }

    public static DeptDTO toDeptDTO(Dept dept) {
        if (dept == null) {
            return null;
        }
        DeptDTO dto = new DeptDTO();
        dto.setId(dept.getId());
        dto.setLibelle(dept.getLibelle());
        return dto;
    }

    public static UpDTO toUpDTO(Up up) {
        if (up == null) {
            return null;
        }
        UpDTO dto = new UpDTO();
        dto.setId(up.getId());
        dto.setLibelle(up.getLibelle());
        return dto;
    }

    public static BureauDTO toBureauDTO(Bureau bureau) {
        if (bureau == null) {
            return null;
        }
        BureauDTO dto = new BureauDTO();
        dto.setId(bureau.getId());
        dto.setNom(bureau.getNom());
        dto.setEmail(bureau.getEmail());
        dto.setNumeroTelephone(bureau.getNumeroTelephone());
        return dto;
    }

    public static AnimateurExterneDTO toAnimateurExterneDTO(AnimateurExterne animateur) {
        if (animateur == null) {
            return null;
        }
        AnimateurExterneDTO dto = new AnimateurExterneDTO();
        dto.setId(animateur.getId());
        dto.setNom(animateur.getNom());
        dto.setPrenom(animateur.getPrenom());
        dto.setEmail(animateur.getEmail());
        dto.setBureauId(animateur.getBureau() != null ? animateur.getBureau().getId() : null);
        return dto;
    }

    /**
     * DTO → entité (requête d'écriture). On ne copie que les champs modifiables ;
     * l'id est laissé à null (généré) ou ignoré selon le service appelant.
     */
    public static Bureau toBureauEntity(BureauDTO dto) {
        if (dto == null) {
            return null;
        }
        Bureau bureau = new Bureau();
        bureau.setNom(dto.getNom());
        bureau.setEmail(dto.getEmail());
        bureau.setNumeroTelephone(dto.getNumeroTelephone());
        return bureau;
    }

    public static Dept toDeptEntity(DeptDTO dto) {
        if (dto == null) {
            return null;
        }
        Dept dept = new Dept();
        dept.setId(dto.getId());
        dept.setLibelle(dto.getLibelle());
        return dept;
    }

    public static Up toUpEntity(UpDTO dto) {
        if (dto == null) {
            return null;
        }
        Up up = new Up();
        up.setId(dto.getId());
        up.setLibelle(dto.getLibelle());
        return up;
    }

    public static FormationCompetence toFormationCompetenceEntity(FormationCompetenceRequestDTO dto) {
        if (dto == null) {
            return null;
        }
        FormationCompetence fc = new FormationCompetence();
        fc.setDomaineId(dto.getDomaineId());
        fc.setCompetenceId(dto.getCompetenceId());
        fc.setCompetenceNom(dto.getCompetenceNom());
        fc.setSousCompetenceId(dto.getSousCompetenceId());
        fc.setSousCompetenceNom(dto.getSousCompetenceNom());
        fc.setSavoirId(dto.getSavoirId());
        fc.setSavoirNom(dto.getSavoirNom());
        fc.setSavoirType(dto.getSavoirType());
        fc.setNiveauPrerequis(dto.getNiveauPrerequis());
        fc.setNiveauVise(dto.getNiveauVise());
        return fc;
    }
}
