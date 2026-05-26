package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.*;
import esprit.pfe.serviceformation.entities.*;
import esprit.pfe.serviceformation.repositories.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.sql.Time;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InscriptionServiceTest {

    @Mock private FormationRepository formationRepo;
    @Mock private EnseignantRepository enseignantRepo;
    @Mock private InscriptionRepository inscriptionRepo;
    @InjectMocks private InscriptionService service;

    @org.junit.jupiter.api.BeforeEach
    void wireSelfReference() {
        ReflectionTestUtils.setField(service, "self", service);
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
    void testListerFormationsAccessibles() {
        Enseignant ens = new Enseignant();
        ens.setId("E1");
        Up up = new Up();
        up.setId("UP1");
        ens.setUp(up);
        when(enseignantRepo.findById(anyString())).thenReturn(Optional.of(ens));
        
        Formation f1 = createValidFormation(1L);
        f1.setOuverte(false);
        f1.setUp(up);
        
        Formation f2 = createValidFormation(2L);
        f2.setInscriptionsOuvertes(false);
        
        when(formationRepo.findAll()).thenReturn(List.of(f1, f2));
        
        List<FormationDTO> result = service.listerFormationsAccessibles("E1");
        assertEquals(1, result.size());
        assertEquals(1L, result.get(0).getIdFormation());
    }

    @Test
    void testListerFormationsAccessibles_ByMail() {
        Enseignant ens = new Enseignant();
        ens.setId("E1");
        when(enseignantRepo.findById("E1")).thenReturn(Optional.empty());
        when(enseignantRepo.findByMail("E1")).thenReturn(Optional.of(ens));
        
        when(formationRepo.findAll()).thenReturn(Collections.emptyList());
        assertTrue(service.listerFormationsAccessibles("E1").isEmpty());
    }

    @Test
    void testListerFormationsAccessiblesPageable_shouldSliceAndPaginate() {
        Enseignant ens = new Enseignant();
        ens.setId("E1");
        when(enseignantRepo.findById("E1")).thenReturn(Optional.of(ens));

        Formation f1 = createValidFormation(1L);
        Formation f2 = createValidFormation(2L);
        when(formationRepo.findAll()).thenReturn(List.of(f1, f2));

        Page<FormationDTO> firstPage = service.listerFormationsAccessibles("E1", PageRequest.of(0, 1));
        Page<FormationDTO> emptyPage = service.listerFormationsAccessibles("E1", PageRequest.of(2, 1));

        assertEquals(2, firstPage.getTotalElements());
        assertEquals(1, firstPage.getContent().size());
        assertTrue(emptyPage.isEmpty());
        assertEquals(2, emptyPage.getTotalElements());
    }

    @Test
    void testDemanderInscription_Success() {
        Formation f = createValidFormation(1L);
        when(formationRepo.findById(1L)).thenReturn(Optional.of(f));
        
        Enseignant e = new Enseignant();
        e.setId("E1");
        when(enseignantRepo.findById("E1")).thenReturn(Optional.of(e));
        
        when(inscriptionRepo.findByEnseignant_Id("E1")).thenReturn(Collections.emptyList());
        when(inscriptionRepo.save(any())).thenReturn(new Inscription());
        
        assertNotNull(service.demanderInscription(1L, "E1"));
    }

    @Test
    void testDemanderInscription_Duplicate() {
        Formation f = createValidFormation(1L);
        when(formationRepo.findById(1L)).thenReturn(Optional.of(f));
        when(enseignantRepo.findById(anyString())).thenReturn(Optional.of(new Enseignant()));
        when(inscriptionRepo.findByEnseignant_Id(anyString())).thenReturn(Collections.emptyList());
        when(inscriptionRepo.save(any())).thenThrow(new RuntimeException("Duplicate"));
        
        assertThrows(IllegalStateException.class, () -> service.demanderInscription(1L, "E1"));
    }

    @Test
    void testMapSeanceToDTO_Full() {
        SeanceFormation s = new SeanceFormation();
        s.setIdSeance(1L);
        s.setHeureDebut(Time.valueOf("08:00:00"));
        s.setHeureFin(Time.valueOf("10:00:00"));
        
        Enseignant e = new Enseignant();
        e.setNom("Nom");
        s.setAnimateurs(List.of(e));
        s.setParticipants(List.of(e));
        
        SeanceDTO dto = service.mapSeanceToDTO(s);
        assertEquals(1L, dto.getIdSeance());
        assertFalse(dto.getAnimateurs().isEmpty());
        assertFalse(dto.getParticipants().isEmpty());
    }

    @Test
    void testMapFormationToDTO_Full() {
        Formation f = createValidFormation(1L);
        f.setTypeFormation(TypeFormation.INTERNE);
        f.setEtatFormation(EtatFormation.PLANIFIE);
        f.setDepartement(new Dept());
        f.setUp(new Up());

        SeanceFormation s = new SeanceFormation();
        f.setSeances(List.of(s));

        FormationDTO dto = service.mapFormationToDTO(f);
        assertNotNull(dto.getDepartement());
        assertNotNull(dto.getUp());
        assertFalse(dto.getSeances().isEmpty());
    }

    @Test
    void testTraiterDemande() {
        Inscription ins = new Inscription();
        ins.setId(1L);
        ins.setEtat(EtatInscription.PENDING);
        ins.setFormation(createValidFormation(1L));
        ins.setEnseignant(new Enseignant());

        when(inscriptionRepo.findById(1L)).thenReturn(Optional.of(ins));
        when(inscriptionRepo.save(any())).thenReturn(ins);
        
        service.traiterDemande(1L, true);
        assertEquals(EtatInscription.APPROVED, ins.getEtat());
    }

    @Test
    void testListerInscriptionsParFormationPageable_Success() {
        Formation f = createValidFormation(1L);
        when(formationRepo.findById(1L)).thenReturn(Optional.of(f));

        Inscription ins = new Inscription();
        ins.setId(1L);
        ins.setFormation(f);
        ins.setEnseignant(new Enseignant());
        when(inscriptionRepo.findByFormation_IdFormation(eq(1L), any(PageRequest.class)))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(ins)));

        Page<InscriptionDTO> result = service.listerInscriptionsParFormation(1L, PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
        assertEquals(1L, result.getContent().get(0).getId());
    }
}
