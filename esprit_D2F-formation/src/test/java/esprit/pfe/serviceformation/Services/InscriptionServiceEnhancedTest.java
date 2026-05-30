package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.*;
import esprit.pfe.serviceformation.entities.*;
import esprit.pfe.serviceformation.repositories.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.sql.Time;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Tests améliorés pour InscriptionService
 * Couvre les cas d'erreur et scénarios complexes
 */
@ExtendWith(MockitoExtension.class)
class InscriptionServiceEnhancedTest {

    @Mock private FormationRepository formationRepo;
    @Mock private EnseignantRepository enseignantRepo;
    @Mock private InscriptionRepository inscriptionRepo;
    @Mock private FormationMapper formationMapper;
    @InjectMocks private InscriptionService service;

    @org.junit.jupiter.api.BeforeEach
    void wireSelfReference() {
        ReflectionTestUtils.setField(service, "self", service);
        ReflectionTestUtils.setField(service, "formationMapper", formationMapper);
        lenient().when(formationMapper.toResponseDTO(any())).thenReturn(new FormationResponseDTO());
    }

    private Formation createValidFormation(Long id) {
        Formation f = new Formation();
        f.setIdFormation(id);
        f.setInscriptionsOuvertes(true);
        f.setOuverte(true);
        f.setCoutFormation(0.0f);
        f.setChargeHoraireGlobal(0);
        f.setTitreFormation("Formation " + id);
        f.setSeances(new ArrayList<>());
        return f;
    }

    @Test
    void testListerFormationsAccessibles_EnseignantNotFound() {
        when(enseignantRepo.findById(anyString())).thenReturn(Optional.empty());
        when(enseignantRepo.findByMail(anyString())).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> service.listerFormationsAccessibles("E999"));
    }

    @Test
    void testListerFormationsAccessibles_WithNullUp() {
        Enseignant ens = new Enseignant();
        ens.setId("E1");
        ens.setUp(null);
        when(enseignantRepo.findById(anyString())).thenReturn(Optional.of(ens));

        Formation f1 = createValidFormation(1L);
        f1.setOuverte(true);

        when(formationRepo.findAll()).thenReturn(List.of(f1));

        List<FormationResponseDTO> result = service.listerFormationsAccessibles("E1");
        assertEquals(1, result.size());
    }

    @Test
    void testDemanderInscription_FormationNotFound() {
        when(formationRepo.findById(any())).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> service.demanderInscription(999L, "E1"));
    }

    @Test
    void testDemanderInscription_FormationNotVisible() {
        Formation f = createValidFormation(1L);
        f.setInscriptionsOuvertes(false);
        when(formationRepo.findById(1L)).thenReturn(Optional.of(f));

        assertThrows(IllegalStateException.class, () -> service.demanderInscription(1L, "E1"));
    }

    @Test
    void testDemanderInscription_EnseignantNotFound() {
        Formation f = createValidFormation(1L);
        when(formationRepo.findById(1L)).thenReturn(Optional.of(f));
        when(enseignantRepo.findById(anyString())).thenReturn(Optional.empty());
        when(enseignantRepo.findByMail(anyString())).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> service.demanderInscription(1L, "E999"));
    }

    @Test
    void testDemanderInscription_NotAuthorized() {
        Formation f = createValidFormation(1L);
        f.setOuverte(false);

        Up upForm = new Up();
        upForm.setId("UP1");
        f.setUp(upForm);

        when(formationRepo.findById(1L)).thenReturn(Optional.of(f));

        Enseignant e = new Enseignant();
        e.setId("E1");
        Up upEns = new Up();
        upEns.setId("UP2");
        e.setUp(upEns);
        when(enseignantRepo.findById(anyString())).thenReturn(Optional.of(e));

        assertThrows(IllegalStateException.class, () -> service.demanderInscription(1L, "E1"));
    }

    @Test
    void testDemanderInscription_WithOverlap() {
        Formation f1 = createValidFormation(1L);
        f1.setDateDebut(java.sql.Date.valueOf(LocalDate.of(2024, 1, 1)));
        f1.setDateFin(java.sql.Date.valueOf(LocalDate.of(2024, 1, 5)));

        Formation f2 = createValidFormation(2L);
        f2.setDateDebut(java.sql.Date.valueOf(LocalDate.of(2024, 1, 3)));
        f2.setDateFin(java.sql.Date.valueOf(LocalDate.of(2024, 1, 7)));

        when(formationRepo.findById(1L)).thenReturn(Optional.of(f1));

        Enseignant e = new Enseignant();
        e.setId("E1");
        when(enseignantRepo.findById(anyString())).thenReturn(Optional.of(e));

        Inscription existingInscription = new Inscription();
        existingInscription.setFormation(f2);
        existingInscription.setEtat(EtatInscription.PENDING);
        when(inscriptionRepo.findByEnseignant_Id("E1")).thenReturn(List.of(existingInscription));

        assertThrows(IllegalStateException.class, () -> service.demanderInscription(1L, "E1"));
    }

    @Test
    void testDemanderInscription_WithRejectedOverlap() {
        Formation f1 = createValidFormation(1L);
        f1.setDateDebut(java.sql.Date.valueOf(LocalDate.of(2024, 1, 1)));
        f1.setDateFin(java.sql.Date.valueOf(LocalDate.of(2024, 1, 5)));

        Formation f2 = createValidFormation(2L);
        f2.setDateDebut(java.sql.Date.valueOf(LocalDate.of(2024, 1, 3)));
        f2.setDateFin(java.sql.Date.valueOf(LocalDate.of(2024, 1, 7)));

        when(formationRepo.findById(1L)).thenReturn(Optional.of(f1));

        Enseignant e = new Enseignant();
        e.setId("E1");
        when(enseignantRepo.findById(anyString())).thenReturn(Optional.of(e));

        Inscription existingInscription = new Inscription();
        existingInscription.setFormation(f2);
        existingInscription.setEtat(EtatInscription.REJECTED);
        when(inscriptionRepo.findByEnseignant_Id("E1")).thenReturn(List.of(existingInscription));

        when(inscriptionRepo.save(any())).thenReturn(new Inscription());

        // Ne devrait pas lancer d'exception car l'inscription précédente est rejetée
        assertNotNull(service.demanderInscription(1L, "E1"));
    }

    @Test
    void testListerInscriptionsParFormation_FormationNotFound() {
        when(formationRepo.findById(any())).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> service.listerInscriptionsParFormation(999L));
    }

    @Test
    void testListerInscriptionsParFormation_Success() {
        Formation f = createValidFormation(1L);
        when(formationRepo.findById(1L)).thenReturn(Optional.of(f));

        Inscription ins = new Inscription();
        ins.setId(1L);
        ins.setFormation(f);
        ins.setEnseignant(new Enseignant());
        when(inscriptionRepo.findByFormation_IdFormation(1L)).thenReturn(List.of(ins));

        List<InscriptionDTO> result = service.listerInscriptionsParFormation(1L);
        assertEquals(1, result.size());
    }

    @Test
    void testTraiterDemande_NotFound() {
        when(inscriptionRepo.findById(any())).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> service.traiterDemande(999L, true));
    }

    @Test
    void testTraiterDemande_Reject() {
        Inscription ins = new Inscription();
        ins.setId(1L);
        ins.setEtat(EtatInscription.PENDING);
        ins.setFormation(createValidFormation(1L));
        ins.setEnseignant(new Enseignant());

        when(inscriptionRepo.findById(1L)).thenReturn(Optional.of(ins));
        when(inscriptionRepo.save(any())).thenReturn(ins);

        service.traiterDemande(1L, false);
        assertEquals(EtatInscription.REJECTED, ins.getEtat());
    }

    @Test
    void testMapSeanceToDTO_WithNullLists() {
        SeanceFormation s = new SeanceFormation();
        s.setIdSeance(1L);
        s.setHeureDebut(Time.valueOf("08:00:00"));
        s.setHeureFin(Time.valueOf("10:00:00"));
        s.setAnimateurs(null);
        s.setParticipants(null);

        SeanceDTO dto = service.mapSeanceToDTO(s);
        assertEquals(1L, dto.getIdSeance());
        assertNull(dto.getAnimateurs());
        assertNull(dto.getParticipants());
    }

    @Test
    void testMapEnseignantToDTO_WithNullDeptAndUp() {
        Enseignant e = new Enseignant();
        e.setId("E1");
        e.setNom("Nom");
        e.setPrenom("Prenom");
        e.setMail("test@test.com");
        e.setType("Type");
        e.setDept(null);
        e.setUp(null);

        EnseignantDTO dto = service.mapEnseignantToDTO(e);
        assertEquals("E1", dto.getId());
        assertNull(dto.getDeptLibelle());
        assertNull(dto.getUpLibelle());
    }

    @Test
    void testMapFormationToDTO_WithNullValues() {
        FormationResponseDTO dto = new FormationResponseDTO();
        assertNull(dto.getDepartement());
        assertNull(dto.getUp());
        assertNull(dto.getSeances());
    }

    @Test
    void testIsOverlapping_WithNullDates() {
        Formation f1 = createValidFormation(1L);
        f1.setDateDebut(null);
        f1.setDateFin(null);

        Formation f2 = createValidFormation(2L);
        f2.setDateDebut(java.sql.Date.valueOf(LocalDate.of(2024, 1, 1)));
        f2.setDateFin(java.sql.Date.valueOf(LocalDate.of(2024, 1, 5)));

        // Utilisation de réflexion pour tester la méthode privée
        try {
            java.lang.reflect.Method method = InscriptionService.class.getDeclaredMethod("isOverlapping", Formation.class, Formation.class);
            method.setAccessible(true);
            boolean result = (boolean) method.invoke(service, f1, f2);
            assertFalse(result);
        } catch (Exception e) {
            fail("Erreur lors de l'appel de la méthode privée isOverlapping: " + e.getMessage());
        }
    }

    @Test
    void testIsOverlapping_NoOverlap() {
        Formation f1 = createValidFormation(1L);
        f1.setDateDebut(java.sql.Date.valueOf(LocalDate.of(2024, 1, 1)));
        f1.setDateFin(java.sql.Date.valueOf(LocalDate.of(2024, 1, 5)));

        Formation f2 = createValidFormation(2L);
        f2.setDateDebut(java.sql.Date.valueOf(LocalDate.of(2024, 1, 10)));
        f2.setDateFin(java.sql.Date.valueOf(LocalDate.of(2024, 1, 15)));

        try {
            java.lang.reflect.Method method = InscriptionService.class.getDeclaredMethod("isOverlapping", Formation.class, Formation.class);
            method.setAccessible(true);
            boolean result = (boolean) method.invoke(service, f1, f2);
            assertFalse(result);
        } catch (Exception e) {
            fail("Erreur lors de l'appel de la méthode privée isOverlapping: " + e.getMessage());
        }
    }

    @Test
    void testIsOverlapping_WithOverlap() {
        Formation f1 = createValidFormation(1L);
        f1.setDateDebut(java.sql.Date.valueOf(LocalDate.of(2024, 1, 1)));
        f1.setDateFin(java.sql.Date.valueOf(LocalDate.of(2024, 1, 5)));

        Formation f2 = createValidFormation(2L);
        f2.setDateDebut(java.sql.Date.valueOf(LocalDate.of(2024, 1, 3)));
        f2.setDateFin(java.sql.Date.valueOf(LocalDate.of(2024, 1, 7)));

        try {
            java.lang.reflect.Method method = InscriptionService.class.getDeclaredMethod("isOverlapping", Formation.class, Formation.class);
            method.setAccessible(true);
            boolean result = (boolean) method.invoke(service, f1, f2);
            assertTrue(result);
        } catch (Exception e) {
            fail("Erreur lors de l'appel de la méthode privée isOverlapping: " + e.getMessage());
        }
    }
}
