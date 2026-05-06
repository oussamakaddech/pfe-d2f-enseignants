package esprit.pfe.serviceformation.Services;

import esprit.pfe.serviceformation.DTO.FormationDTO;
import esprit.pfe.serviceformation.DTO.InscriptionDTO;
import esprit.pfe.serviceformation.Entities.*;
import esprit.pfe.serviceformation.Repositories.EnseignantRepository;
import esprit.pfe.serviceformation.Repositories.FormationRepository;
import esprit.pfe.serviceformation.Repositories.InscriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Date;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("InscriptionService - Tests unitaires")
class InscriptionServiceTest {

    @Mock
    private FormationRepository formationRepo;

    @Mock
    private EnseignantRepository enseignantRepo;

    @Mock
    private InscriptionRepository inscriptionRepo;

    @InjectMocks
    private InscriptionService inscriptionService;

    private Enseignant enseignant;
    private Formation formation;
    private Up up;

    @BeforeEach
    void setUp() {
        up = new Up();
        up.setId("UP1");

        enseignant = new Enseignant();
        enseignant.setId("ENS1");
        enseignant.setUp(up);

        formation = new Formation();
        formation.setIdFormation(1L);
        formation.setTitreFormation("Spring Boot");
        formation.setInscriptionsOuvertes(true);
        formation.setOuverte(false);
        formation.setUp(up);
        formation.setDateDebut(new Date());
        formation.setDateFin(new Date(System.currentTimeMillis() + 86400000L));
    }

    @Test
    @DisplayName("listerFormationsAccessibles - Succès")
    void shouldListFormationsAccessibles() {
        when(enseignantRepo.findById("ENS1")).thenReturn(Optional.of(enseignant));
        when(formationRepo.findAll()).thenReturn(List.of(formation));

        List<FormationDTO> result = inscriptionService.listerFormationsAccessibles("ENS1");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getIdFormation()).isEqualTo(1L);
    }

    @Test
    @DisplayName("demanderInscription - Succès")
    void shouldDemanderInscription() {
        when(formationRepo.findById(1L)).thenReturn(Optional.of(formation));
        when(enseignantRepo.findById("ENS1")).thenReturn(Optional.of(enseignant));
        when(inscriptionRepo.findByEnseignant_Id("ENS1")).thenReturn(List.of());
        when(inscriptionRepo.save(any())).thenAnswer(inv -> {
            Inscription ins = inv.getArgument(0);
            ins.setId(1L);
            return ins;
        });

        Inscription result = inscriptionService.demanderInscription(1L, "ENS1");

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getEnseignant().getId()).isEqualTo("ENS1");
        verify(inscriptionRepo).save(any());
    }

    @Test
    @DisplayName("demanderInscription - Echec : Non visible")
    void shouldThrowIfInscriptionsClosed() {
        formation.setInscriptionsOuvertes(false);
        when(formationRepo.findById(1L)).thenReturn(Optional.of(formation));

        assertThatThrownBy(() -> inscriptionService.demanderInscription(1L, "ENS1"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("n'est pas visible");
    }

    @Test
    @DisplayName("demanderInscription - Echec : Chevauchement")
    void shouldThrowIfOverlap() {
        Inscription existante = new Inscription();
        existante.setEtat(EtatInscription.APPROVED);
        existante.setFormation(formation);

        when(formationRepo.findById(1L)).thenReturn(Optional.of(formation));
        when(enseignantRepo.findById("ENS1")).thenReturn(Optional.of(enseignant));
        when(inscriptionRepo.findByEnseignant_Id("ENS1")).thenReturn(List.of(existante));

        assertThatThrownBy(() -> inscriptionService.demanderInscription(1L, "ENS1"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Chevauchement");
    }

    @Test
    @DisplayName("traiterDemande - Approuver")
    void shouldApproveDemande() {
        Inscription ins = new Inscription();
        ins.setId(1L);
        ins.setEtat(EtatInscription.PENDING);

        when(inscriptionRepo.findById(1L)).thenReturn(Optional.of(ins));
        when(inscriptionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Inscription result = inscriptionService.traiterDemande(1L, true);

        assertThat(result.getEtat()).isEqualTo(EtatInscription.APPROVED);
    }

    @Test
    @DisplayName("listerInscriptionsParFormation - Succès")
    void shouldListInscriptionsParFormation() {
        Inscription ins = new Inscription();
        ins.setId(1L);
        ins.setEnseignant(enseignant);
        ins.setFormation(formation);

        when(formationRepo.findById(1L)).thenReturn(Optional.of(formation));
        when(inscriptionRepo.findByFormation_IdFormation(1L)).thenReturn(List.of(ins));

        List<InscriptionDTO> result = inscriptionService.listerInscriptionsParFormation(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(1L);
    }
}
