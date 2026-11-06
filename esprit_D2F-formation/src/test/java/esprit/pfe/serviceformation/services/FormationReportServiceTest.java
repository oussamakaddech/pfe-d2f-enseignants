package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.entities.EtatFormation;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import esprit.pfe.serviceformation.repositories.PresenceRepository;
import esprit.pfe.serviceformation.repositories.SeanceFormationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FormationReportServiceTest {

    @Mock private SeanceFormationRepository seanceRepo;
    @Mock private PresenceRepository presenceRepo;
    @Mock private FormationRepository formationRepo;
    @Mock private EnseignantRepository enseignantRepo;
    @InjectMocks private FormationReportService service;

    private Formation formation(long id, String titre, EtatFormation etat) {
        Formation f = new Formation();
        f.setIdFormation(id);
        f.setTitreFormation(titre);
        f.setEtatFormation(etat);
        f.setChargeHoraireGlobal(0);
        return f;
    }

    @Test
    void testGetFormationsParRoleEtPeriode_Animateur() {
        Formation f = formation(1L, "Animation", EtatFormation.PLANIFIE);
        when(seanceRepo.findFormationsByAnimateurAndPeriod(anyString(), any(), any())).thenReturn(List.of(f));
        assertFalse(service.getFormationsParRoleEtPeriode("animateur", "E1", LocalDate.now(), LocalDate.now()).isEmpty());
    }

    @Test
    void testGetFormationsParRoleEtPeriode_Participant() {
        Formation f = formation(1L, "Participation", EtatFormation.ACHEVE);
        when(presenceRepo.findFormationsByParticipantAndPeriod(anyString(), any(), any())).thenReturn(List.of(f));
        when(seanceRepo.findAnimateursByFormation(any())).thenReturn(Collections.emptyList());
        when(enseignantRepo.findById(anyString())).thenReturn(Optional.empty());
        assertFalse(service.getFormationsParRoleEtPeriode("participant", "E1", LocalDate.now(), LocalDate.now()).isEmpty());
    }

    @Test
    void testGetFormationsParRoleEtPeriode_InvalidRole() {
        LocalDate d1 = LocalDate.now();
        LocalDate d2 = LocalDate.now();
        assertThrows(IllegalArgumentException.class, () -> service.getFormationsParRoleEtPeriode("invalid", "E1", d1, d2));
    }

    /** Une formation encore « Enregistrée » (sans séance) reste proposée à l'animateur. */
    @Test
    void animateur_voitFormationEnregistreeSansSeance() {
        Formation enregistree = formation(60L, "Docker", EtatFormation.ENREGISTRE);
        when(seanceRepo.findFormationsByAnimateurAndPeriod(anyString(), any(), any()))
                .thenReturn(Collections.emptyList());
        when(formationRepo.findFormationsByAnimateurAndPeriod(anyString(), any(), any(), eq(EtatFormation.ANNULE)))
                .thenReturn(List.of(enregistree));

        assertEquals(1, service.getFormationsParRoleEtPeriode(
                "animateur", "E1", LocalDate.now(), LocalDate.now()).size());
    }

    /** Une formation annulée n'est jamais attestée. */
    @Test
    void etatAnnule_exclu() {
        Formation annulee = formation(7L, "Annulée", EtatFormation.ANNULE);
        when(seanceRepo.findFormationsByAnimateurAndPeriod(anyString(), any(), any()))
                .thenReturn(List.of(annulee));

        assertEquals(0, service.getFormationsParRoleEtPeriode(
                "animateur", "E1", LocalDate.now(), LocalDate.now()).size());
    }

    /** Participant inscrit (sans présence) : la formation apparaît une seule fois malgré plusieurs sources. */
    @Test
    void participant_inscriptionSansPresence_dedoublonnee() {
        Formation achevee = formation(12L, "Spring", EtatFormation.ACHEVE);
        Enseignant ens = new Enseignant();
        ens.setId("E1");
        ens.setMail("e1@esprit.tn");
        when(presenceRepo.findFormationsByParticipantAndPeriod(anyString(), any(), any()))
                .thenReturn(Collections.emptyList());
        when(seanceRepo.findFormationsBySeanceParticipantAndPeriod(anyString(), any(), any()))
                .thenReturn(List.of(achevee));
        when(formationRepo.findFormationsByInscriptionAndPeriod(anyString(), any(), any(), any()))
                .thenReturn(List.of(achevee));
        when(enseignantRepo.findById("E1")).thenReturn(Optional.of(ens));
        when(formationRepo.findFormationsByParticipantEmailAndPeriod(anyString(), any(), any(), any()))
                .thenReturn(List.of(achevee));
        when(seanceRepo.findAnimateursByFormation(any())).thenReturn(Collections.emptyList());

        assertEquals(1, service.getFormationsParRoleEtPeriode(
                "participant", "E1", LocalDate.now(), LocalDate.now()).size());
    }
}
