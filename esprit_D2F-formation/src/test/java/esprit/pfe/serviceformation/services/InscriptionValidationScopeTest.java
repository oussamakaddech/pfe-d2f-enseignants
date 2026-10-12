package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.Dept;
import esprit.pfe.serviceformation.entities.EtatInscription;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.entities.Inscription;
import esprit.pfe.serviceformation.entities.Up;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import esprit.pfe.serviceformation.repositories.FormationCompetenceRepository;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import esprit.pfe.serviceformation.repositories.InscriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Audit des rôles du 07/10/2026 : la validation des inscriptions est cloisonnée
 * au périmètre de l'appelant (CUP = son UP, chef = son département).
 */
class InscriptionValidationScopeTest {

    private InscriptionRepository inscriptionRepo;
    private KpiScopeService scopeService;
    private InscriptionService service;
    private final Pageable page = PageRequest.of(0, 20);

    @BeforeEach
    void setUp() {
        inscriptionRepo = mock(InscriptionRepository.class);
        scopeService = mock(KpiScopeService.class);
        service = new InscriptionService(mock(FormationRepository.class), mock(EnseignantRepository.class),
                inscriptionRepo, mock(FormationCompetenceRepository.class), null, new FormationMapper(),
                scopeService);
        when(inscriptionRepo.save(any(Inscription.class))).thenAnswer(i -> i.getArgument(0));
    }

    private static Inscription inscriptionOn(String upId, String deptId) {
        Formation f = new Formation();
        f.setIdFormation(7L);
        if (upId != null) {
            Up up = new Up();
            up.setId(upId);
            f.setUp(up);
        }
        if (deptId != null) {
            Dept d = new Dept();
            d.setId(deptId);
            f.setDepartement(d);
        }
        Inscription ins = new Inscription();
        ins.setId(1L);
        ins.setFormation(f);
        ins.setEtat(EtatInscription.PENDING);
        return ins;
    }

    @Test
    void cupListsOnlyTheInscriptionsOfHisUp() {
        when(scopeService.resolveScope()).thenReturn(new KpiScopeService.KpiScope("UP_GC", null));
        Page<Inscription> empty = new PageImpl<>(List.of());
        when(inscriptionRepo.findByFormation_Up_Id("UP_GC", page)).thenReturn(empty);

        service.listerToutesInscriptions(page);

        verify(inscriptionRepo).findByFormation_Up_Id("UP_GC", page);
        verify(inscriptionRepo, never()).findAll(page);
    }

    @Test
    void chefListsOnlyTheInscriptionsOfHisDepartment() {
        when(scopeService.resolveScope()).thenReturn(new KpiScopeService.KpiScope(null, "DEPT_GC"));
        when(inscriptionRepo.findByFormation_Departement_Id("DEPT_GC", page)).thenReturn(new PageImpl<>(List.of()));

        service.listerToutesInscriptions(page);

        verify(inscriptionRepo).findByFormation_Departement_Id("DEPT_GC", page);
        verify(inscriptionRepo, never()).findAll(page);
    }

    @Test
    void adminListsEverything() {
        when(scopeService.resolveScope()).thenReturn(new KpiScopeService.KpiScope(null, null));
        when(inscriptionRepo.findAll(page)).thenReturn(new PageImpl<>(List.of()));

        service.listerToutesInscriptions(page);

        verify(inscriptionRepo).findAll(page);
    }

    @Test
    void cupCannotProcessAnInscriptionOutsideHisUp() {
        when(scopeService.resolveScope()).thenReturn(new KpiScopeService.KpiScope("UP_GC", null));
        when(inscriptionRepo.findById(1L)).thenReturn(Optional.of(inscriptionOn("UP_INFO", "DEPT_INFO")));

        assertThrows(AccessDeniedException.class, () -> service.traiterDemande(1L, true, null));
        verify(inscriptionRepo, never()).save(any());
    }

    @Test
    void chefCannotProcessAnInscriptionOutsideHisDepartment() {
        when(scopeService.resolveScope()).thenReturn(new KpiScopeService.KpiScope(null, "DEPT_GC"));
        when(inscriptionRepo.findById(1L)).thenReturn(Optional.of(inscriptionOn("UP_GC", "DEPT_INFO")));

        assertThrows(AccessDeniedException.class, () -> service.traiterDemande(1L, false, "hors périmètre"));
    }

    @Test
    void cupProcessesAnInscriptionOfHisUp() {
        when(scopeService.resolveScope()).thenReturn(new KpiScopeService.KpiScope("UP_GC", null));
        when(inscriptionRepo.findById(1L)).thenReturn(Optional.of(inscriptionOn("UP_GC", null)));

        Inscription done = service.traiterDemande(1L, true, null);

        assertEquals(EtatInscription.APPROVED, done.getEtat());
    }

    @Test
    void scopeWithoutResolvedUpDeniesEverything() {
        // CUP sans fiche ou sans UP : identifiant sentinelle, aucune formation ne correspond.
        when(scopeService.resolveScope()).thenReturn(new KpiScopeService.KpiScope(KpiScopeService.NO_SCOPE_ID, null));
        when(inscriptionRepo.findById(1L)).thenReturn(Optional.of(inscriptionOn("UP_GC", "DEPT_GC")));

        assertThrows(AccessDeniedException.class, () -> service.traiterDemande(1L, true, null));
    }
}
