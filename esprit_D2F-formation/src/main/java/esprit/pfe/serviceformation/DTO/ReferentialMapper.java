package esprit.pfe.serviceformation.dto;

import esprit.pfe.serviceformation.entities.Bureau;
import esprit.pfe.serviceformation.entities.Dept;
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
}
