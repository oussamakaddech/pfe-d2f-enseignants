package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.*;
import esprit.pfe.serviceformation.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Date;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("InscriptionService - Tests unitaires")
class InscriptionServiceImplTest {

    @Mock
    private InscriptionRepository inscriptionRepo;

    @Mock
    private FormationRepository formationRepo;

    @Mock
    private EnseignantRepository enseignantRepo;

    @InjectMocks
    private InscriptionService inscriptionService;

    private Formation formation;
    private Enseignant enseignant;
    private Up up;

    @BeforeEach
    void setUp() {
        up = new Up();
        up.setId("UP001");
        up.setLibelle("Informatique");

        Dept dept = new Dept();
        dept.setId("DEPT001");
        dept.setLibelle("Ingénierie");

        enseignant = new Enseignant();
        enseignant.setId("ENS001");
        enseignant.setNom("Dupont");
        enseignant.setPrenom("Jean");
        enseignant.setMail("jean@esprit.tn");
        enseignant.setUp(up);
        enseignant.setDept(dept);

        formation = new Formation();
        formation.setIdFormation(1L);
        formation.setTitreFormation("Spring Boot");
        formation.setInscriptionsOuvertes(true);
        formation.setOuverte(true);
        formation.setUp(up);
        formation.setDateDebut(new Date());
        formation.setDateFin(new Date(System.currentTimeMillis() + 86400000));
        formation.setSeances(new ArrayList<>());
    }

    @Nested
    @DisplayName("demanderInscription()")
    class DemanderInscription {

        @Test
        @DisplayName("crée une inscription pour une formation ouverte")
        void shouldCreateInscription() {
            Inscription saved = new Inscription();
            saved.setId(1L);
            saved.setFormation(formation);
            saved.setEnseignant(enseignant);
            saved.setEtat(EtatInscription.PENDING);

            when(formationRepo.findById(1L)).thenReturn(Optional.of(formation));
            when(enseignantRepo.findById("ENS001")).thenReturn(Optional.of(enseignant));
            when(inscriptionRepo.findByEnseignant_Id("ENS001")).thenReturn(new ArrayList<>());
            when(inscriptionRepo.save(any())).thenReturn(saved);

            Inscription result = inscriptionService.demanderInscription(1L, "ENS001");

            assertThat(result).isNotNull();
            assertThat(result.getFormation().getTitreFormation()).isEqualTo("Spring Boot");
            verify(inscriptionRepo).save(any());
        }

        @Test
        @DisplayName("refuse si inscriptions fermées")
        void shouldRejectWhenClosed() {
            formation.setInscriptionsOuvertes(false);
            when(formationRepo.findById(1L)).thenReturn(Optional.of(formation));

            assertThatThrownBy(() -> inscriptionService.demanderInscription(1L, "ENS001"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("pas visible");
        }

        @Test
        @DisplayName("refuse si formation introuvable")
        void shouldRejectWhenFormationNotFound() {
            when(formationRepo.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> inscriptionService.demanderInscription(999L, "ENS001"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("introuvable");
        }

        @Test
        @DisplayName("refuse si UP ne correspond pas (formation non ouverte)")
        void shouldRejectWhenUpMismatch() {
            formation.setOuverte(false);
            Up otherUp = new Up();
            otherUp.setId("UP_OTHER");
            enseignant.setUp(otherUp);

            when(formationRepo.findById(1L)).thenReturn(Optional.of(formation));
            when(enseignantRepo.findById("ENS001")).thenReturn(Optional.of(enseignant));

            assertThatThrownBy(() -> inscriptionService.demanderInscription(1L, "ENS001"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("pas autorisé");
        }
    }

    @Nested
    @DisplayName("traiterDemande()")
    class TraiterDemande {

        @Test
        @DisplayName("approuve une demande")
        void shouldApprove() {
            Inscription ins = new Inscription();
            ins.setId(1L);
            ins.setEtat(EtatInscription.PENDING);

            when(inscriptionRepo.findById(1L)).thenReturn(Optional.of(ins));
            when(inscriptionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Inscription result = inscriptionService.traiterDemande(1L, true);

            assertThat(result.getEtat()).isEqualTo(EtatInscription.APPROVED);
        }

        @Test
        @DisplayName("rejette une demande")
        void shouldReject() {
            Inscription ins = new Inscription();
            ins.setId(1L);
            ins.setEtat(EtatInscription.PENDING);

            when(inscriptionRepo.findById(1L)).thenReturn(Optional.of(ins));
            when(inscriptionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Inscription result = inscriptionService.traiterDemande(1L, false);

            assertThat(result.getEtat()).isEqualTo(EtatInscription.REJECTED);
        }

        @Test
        @DisplayName("lève une exception si demande introuvable")
        void shouldThrowWhenNotFound() {
            when(inscriptionRepo.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> inscriptionService.traiterDemande(999L, true))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("introuvable");
        }
    }
}
