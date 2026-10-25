package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.entities.EtatInscription;
import esprit.pfe.serviceformation.entities.Up;
import esprit.pfe.serviceformation.repositories.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@DisplayName("FormationServiceImpl - participant (séance) et informations pour le questionnaire")
class FormationParticipantInfoTest {

    private final FormationRepository formationRepository = mock(FormationRepository.class);
    private final InscriptionRepository inscriptionRepository = mock(InscriptionRepository.class);
    private final SeanceFormationRepository seanceRepository = mock(SeanceFormationRepository.class);
    private final EnseignantRepository enseignantRepository = mock(EnseignantRepository.class);

    private FormationServiceImpl service() {
        FormationServiceImpl s = new FormationServiceImpl(formationRepository, null, null, null, inscriptionRepository, null);
        s.setSeanceFormationRepository(seanceRepository);
        s.setEnseignantRepository(enseignantRepository);
        return s;
    }

    @Test
    @DisplayName("Participant ajouté directement à une séance (sans inscription) : reconnu")
    void seanceParticipant_isParticipant() {
        when(seanceRepository.existsParticipantInFormation(7L, "p1@esprit.tn")).thenReturn(true);
        assertThat(service().isParticipantOfFormation(7L, "p1@esprit.tn")).isTrue();
        verify(inscriptionRepository, never()).existsApprovedByIdOrMail(anyLong(), anyString(), any());
    }

    @Test
    @DisplayName("participantInfo : participant + id de fiche + libellé d'UP (recherche par e-mail)")
    void participantInfo_resolvesFicheAndUp() {
        Up up = new Up();
        up.setLibelle("UP Systèmes");
        Enseignant e = new Enseignant();
        e.setId("E1");
        e.setUp(up);
        when(seanceRepository.existsParticipantInFormation(7L, "p1@esprit.tn")).thenReturn(false);
        when(inscriptionRepository.existsApprovedByIdOrMail(7L, "p1@esprit.tn", EtatInscription.APPROVED)).thenReturn(true);
        when(enseignantRepository.findById("p1@esprit.tn")).thenReturn(Optional.empty());
        when(enseignantRepository.findByMailIgnoreCase("p1@esprit.tn")).thenReturn(Optional.of(e));

        Map<String, Object> info = service().participantInfo(7L, "p1@esprit.tn");

        assertThat(info).containsEntry("participant", true).containsEntry("enseignantId", "E1")
                .containsEntry("up", "UP Systèmes");
    }

    @Test
    @DisplayName("participantInfo : animateur seul = pas participant (il n'évalue pas sa propre formation)")
    void participantInfo_animatorIsNotParticipant() {
        when(formationRepository.existsAnimateurInFormation(7L, "a1@esprit.tn")).thenReturn(true);
        when(enseignantRepository.findById("a1@esprit.tn")).thenReturn(Optional.empty());
        when(enseignantRepository.findByMailIgnoreCase("a1@esprit.tn")).thenReturn(Optional.empty());

        assertThat(service().participantInfo(7L, "a1@esprit.tn")).containsEntry("participant", false);
    }
}
