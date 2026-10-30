package esprit.pfe.serviceevaluation.service;

import esprit.pfe.serviceevaluation.dto.CompetencyProgressionDTO;
import esprit.pfe.serviceevaluation.dto.LearningTrainingIndicatorsDTO;
import esprit.pfe.serviceevaluation.dto.TrainingEvaluationIndicatorsDTO;
import esprit.pfe.serviceevaluation.entities.EvaluationFormateur;
import esprit.pfe.serviceevaluation.entities.EvaluationGlobale;
import esprit.pfe.serviceevaluation.repositories.EvaluationFormateurRepository;
import esprit.pfe.serviceevaluation.repositories.EvaluationGlobaleRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

/**
 * Tests des indicateurs consolidés : formation, formateur, apprentissage
 * (délégué) et progression par compétence.
 */
@ExtendWith(MockitoExtension.class)
class EvaluationIndicatorServiceTest {

    @Mock
    private EvaluationGlobaleRepository globaleRepository;
    @Mock
    private EvaluationFormateurRepository formateurRepository;
    @Mock
    private LearningIndicatorService learningIndicatorService;

    @InjectMocks
    private EvaluationIndicatorService service;

    private EvaluationGlobale globale(float note, float pertinence) {
        EvaluationGlobale g = new EvaluationGlobale();
        g.setFormationId(1L);
        g.setNoteGlobale(note);
        g.setPertinenceContenu(pertinence);
        g.setOrganisation(4f);
        g.setQualiteSupports(4f);
        g.setDureeAdaptee(4f);
        g.setSatisfactionGlobale(4f);
        return g;
    }

    private EvaluationFormateur formateur(float note, String commentaire) {
        EvaluationFormateur e = new EvaluationFormateur();
        e.setFormationId(1L);
        e.setNote(note);
        e.setMaitriseSujet(4f);
        e.setClarte(4f);
        e.setPedagogie(4f);
        e.setInteraction(4f);
        e.setGestionTemps(4f);
        e.setCommentaire(commentaire);
        return e;
    }

    @Test
    void formationIndicators_agregeGlobaleEtFormateurs() {
        when(globaleRepository.findByFormationId(1L))
                .thenReturn(Optional.of(globale(4.5f, 4f)));
        when(formateurRepository.findByFormationId(1L)).thenReturn(List.of(
                formateur(4f, "Très bien"),
                formateur(5f, "  ")));

        TrainingEvaluationIndicatorsDTO dto = service.formationIndicators(1L);

        assertEquals(1L, dto.getFormationId());
        assertEquals(4.5, dto.getAverageFormationRating());
        assertEquals(4.0, dto.getAveragePertinence());
        assertEquals(4.5, dto.getAverageTrainerRating());
        assertEquals(2, dto.getResponseCount());
        // Un seul commentaire non vide.
        assertEquals(1, dto.getCommentCount());
        assertEquals(100.0, dto.getResponseRate());
        assertEquals(4.0, dto.getAverageMaitrise());
        assertEquals(4.0, dto.getAverageClarte());
    }

    @Test
    void formationIndicators_sansDonnees_nulls() {
        when(globaleRepository.findByFormationId(1L)).thenReturn(Optional.empty());
        when(formateurRepository.findByFormationId(1L)).thenReturn(List.of());

        TrainingEvaluationIndicatorsDTO dto = service.formationIndicators(1L);

        assertNull(dto.getAverageFormationRating());
        assertNull(dto.getAveragePertinence());
        assertNull(dto.getAverageTrainerRating());
        assertEquals(0, dto.getResponseCount());
        assertEquals(0, dto.getCommentCount());
    }

    @Test
    void formationIndicators_globaleNoteNulle_zero() {
        EvaluationGlobale g = globale(0f, 0f);
        g.setNoteGlobale(null);
        g.setPertinenceContenu(null);
        when(globaleRepository.findByFormationId(1L)).thenReturn(Optional.of(g));
        when(formateurRepository.findByFormationId(1L)).thenReturn(List.of());

        TrainingEvaluationIndicatorsDTO dto = service.formationIndicators(1L);

        assertEquals(0.0, dto.getAverageFormationRating());
        assertNull(dto.getAveragePertinence());
    }

    @Test
    void learningIndicators_delegueAuService() {
        LearningTrainingIndicatorsDTO expected = LearningTrainingIndicatorsDTO.builder()
                .trainingId(1L).participantCount(3).build();
        when(learningIndicatorService.calculateTrainingIndicators(1L)).thenReturn(expected);

        assertEquals(expected, service.learningIndicators(1L));
    }

    @Test
    void competencyProgression_delegueAuService() {
        List<CompetencyProgressionDTO> expected = List.of(
                CompetencyProgressionDTO.builder().trainingId(1L).competenceId(10L).build());
        when(learningIndicatorService.calculateCompetencyProgression(1L)).thenReturn(expected);

        assertEquals(expected, service.competencyProgression(1L));
    }
}
