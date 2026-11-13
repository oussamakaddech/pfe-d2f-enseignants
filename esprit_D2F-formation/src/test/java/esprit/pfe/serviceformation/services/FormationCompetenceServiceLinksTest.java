package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.FormationCompetenceLinkDTO;
import esprit.pfe.serviceformation.repositories.FormationCompetenceRepository;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

/**
 * Les liaisons formation ↔ compétence servent au filtre « par compétence » du
 * catalogue et à son export : une seule requête, lignes incomplètes ignorées.
 */
@ExtendWith(MockitoExtension.class)
class FormationCompetenceServiceLinksTest {

    @Mock
    private FormationCompetenceRepository formationCompetenceRepository;

    @Mock
    private FormationRepository formationRepository;

    @InjectMocks
    private FormationCompetenceService formationCompetenceService;

    @Test
    void getAllLinksMapsRowsAndSkipsIncompleteOnes() {
        when(formationCompetenceRepository.findAllFormationCompetenceLinks()).thenReturn(Arrays.asList(
                new Object[] {42L, 5L, "Web Sémantique"},
                new Object[] {43L, 5L, "Web Sémantique"},
                new Object[] {44L, 9L, null},
                new Object[] {null, 9L, "Sans formation"},
                new Object[] {45L, null, "Sans competence"}));

        List<FormationCompetenceLinkDTO> links = formationCompetenceService.getAllLinks();

        assertEquals(3, links.size());
        assertEquals(42L, links.get(0).formationId());
        assertEquals(5L, links.get(0).competenceId());
        assertEquals("Web Sémantique", links.get(0).competenceNom());
        assertEquals(44L, links.get(2).formationId());
        assertEquals(null, links.get(2).competenceNom());
    }

    @Test
    void getAllLinksReturnsEmptyListWhenNoLink() {
        when(formationCompetenceRepository.findAllFormationCompetenceLinks())
                .thenReturn(Collections.emptyList());

        assertTrue(formationCompetenceService.getAllLinks().isEmpty());
    }
}
