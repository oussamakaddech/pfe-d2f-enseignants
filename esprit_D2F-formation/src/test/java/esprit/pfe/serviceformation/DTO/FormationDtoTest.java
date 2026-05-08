package esprit.pfe.serviceformation.DTO;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class FormationDtoTest {

    @Test
    void formationDTO_shouldGetSetAllFields() {
        FormationDTO dto = new FormationDTO();
        dto.setIdFormation(1L);
        dto.setTitreFormation("Java Avancé");
        dto.setDomaine("Informatique");

        assertEquals(1L, dto.getIdFormation());
        assertEquals("Java Avancé", dto.getTitreFormation());
        assertEquals("Informatique", dto.getDomaine());
    }

    @Test
    void formationsByEtatDTO_shouldGetSetAllFields() {
        FormationsByEtatDTO dto = new FormationsByEtatDTO();
        dto.setEnregistre(5);
        dto.setPlanifie(3);
        dto.setEnCours(2);
        dto.setAcheve(10);
        dto.setAnnule(1);
        dto.setTotal(21);

        assertEquals(5, dto.getEnregistre());
        assertEquals(3, dto.getPlanifie());
        assertEquals(2, dto.getEnCours());
        assertEquals(10, dto.getAcheve());
        assertEquals(1, dto.getAnnule());
        assertEquals(21, dto.getTotal());
    }

    @Test
    void formationsByTypeDTO_shouldGetSetAllFields() {
        FormationsByTypeDTO dto = new FormationsByTypeDTO(5L, 3L, 2L);
        assertEquals(5L, dto.getInterne());
        assertEquals(3L, dto.getExterne());
        assertEquals(2L, dto.getEnLigne());
    }

    @Test
    void countHeuresDTO_shouldGetSetAllFields() {
        CountHeuresDTO dto = new CountHeuresDTO(10L, 200L);
        assertEquals(10L, dto.getCount());
        assertEquals(200L, dto.getTotalHeures());
    }

    @Test
    void countByTrainerTypeWithIdsDTO_shouldGetSetAllFields() {
        CountByTrainerTypeWithIdsDTO dto = new CountByTrainerTypeWithIdsDTO(
                3L, 2L, 1L,
                List.of(1L, 2L, 3L),
                List.of(4L, 5L),
                List.of(6L)
        );
        assertEquals(3L, dto.getExterneOnlyCount());
        assertEquals(2L, dto.getInterneOnlyCount());
        assertEquals(1L, dto.getMixteCount());
        assertEquals(3, dto.getExterneOnlyIds().size());
    }

    @Test
    void enseignantDTO_shouldGetSetAllFields() {
        EnseignantDTO dto = new EnseignantDTO();
        dto.setId("ens-1");
        dto.setNom("Dupont");
        dto.setPrenom("Jean");
        dto.setMail("jean@esprit.tn");
        dto.setType("Permanent");
        dto.setDeptId("dept1");
        dto.setDeptLibelle("Informatique");
        dto.setUpId("up1");
        dto.setUpLibelle("UP Java");

        assertEquals("ens-1", dto.getId());
        assertEquals("Dupont", dto.getNom());
        assertEquals("dept1", dto.getDeptId());
        assertEquals("up1", dto.getUpId());
    }

    @Test
    void seanceDTO_shouldGetSetAllFields() {
        SeanceDTO dto = new SeanceDTO();
        dto.setIdSeance(1L);
        dto.setSalle("Salle A");

        assertEquals(1L, dto.getIdSeance());
        assertEquals("Salle A", dto.getSalle());
    }

    @Test
    void inscriptionDTO_shouldGetSetAllFields() {
        InscriptionDTO dto = new InscriptionDTO();
        dto.setId(1L);
        dto.setEtat("VALIDEE");

        assertEquals(1L, dto.getId());
        assertEquals("VALIDEE", dto.getEtat());
    }

    @Test
    void documentDTO_shouldGetSetAllFields() {
        DocumentDTO dto = new DocumentDTO();
        dto.setIdDocument(1L);
        dto.setNomDocument("Plan de formation");
        dto.setObligation(true);

        assertEquals(1L, dto.getIdDocument());
        assertEquals("Plan de formation", dto.getNomDocument());
        assertTrue(dto.isObligation());
    }

    @Test
    void deptDTO_shouldGetSetAllFields() {
        DeptDTO dto = new DeptDTO();
        dto.setId("dept1");
        dto.setLibelle("Informatique");

        assertEquals("dept1", dto.getId());
        assertEquals("Informatique", dto.getLibelle());
    }

    @Test
    void upDTO_shouldGetSetAllFields() {
        UpDTO dto = new UpDTO();
        dto.setId("up1");
        dto.setLibelle("UP Java");

        assertEquals("up1", dto.getId());
        assertEquals("UP Java", dto.getLibelle());
    }
}
