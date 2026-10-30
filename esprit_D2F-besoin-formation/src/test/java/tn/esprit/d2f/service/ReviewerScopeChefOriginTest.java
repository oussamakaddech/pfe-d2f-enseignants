package tn.esprit.d2f.service;

import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import tn.esprit.d2f.entity.BesoinFormation;
import tn.esprit.d2f.entity.enumerations.CreatorRole;
import tn.esprit.d2f.repository.ReviewerScopeRepository;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

/** Chef de département : seuls les besoins des CUP de son département (et les siens). */
class ReviewerScopeChefOriginTest {

    private final ReviewerScopeService service = new ReviewerScopeService(mock(ReviewerScopeRepository.class));
    private final ReviewerScopeService.ResolvedScope chef = new ReviewerScopeService.ResolvedScope(
            "chef-gl", "chef-id", CreatorRole.CHEF_DEPARTEMENT, null, "DEPT_GL", false);

    private static BesoinFormation besoin(CreatorRole createdBy, String username, String departement) {
        BesoinFormation b = new BesoinFormation();
        b.setIdBesoinFormation(7L);
        b.setCreatedByRole(createdBy);
        b.setUsername(username);
        b.setUp("UP_GL1");
        b.setDepartement(departement);
        return b;
    }

    @Test
    void chef_voitLeBesoinDUnCupDeSonDepartement() {
        assertThatCode(() -> service.ensureInScope(chef, besoin(CreatorRole.CUP, "cup-gl1", "DEPT_GL")))
                .doesNotThrowAnyException();
    }

    @Test
    void chef_voitSonPropreBesoin() {
        assertThatCode(() -> service.ensureInScope(chef,
                besoin(CreatorRole.CHEF_DEPARTEMENT, "chef-gl", "DEPT_GL")))
                .doesNotThrowAnyException();
    }

    @Test
    void chef_neVoitPasLeBesoinIndividuelDUnEnseignant() {
        assertThatThrownBy(() -> service.ensureInScope(chef,
                besoin(CreatorRole.ENSEIGNANT, "ens-gl", "DEPT_GL")))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("CUP");
    }

    @Test
    void chef_neVoitPasLeBesoinDUnAutreChef() {
        assertThatThrownBy(() -> service.ensureInScope(chef,
                besoin(CreatorRole.CHEF_DEPARTEMENT, "autre-chef", "DEPT_GL")))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void chef_neVoitPasLeBesoinDUnCupDUnAutreDepartement() {
        assertThatThrownBy(() -> service.ensureInScope(chef, besoin(CreatorRole.CUP, "cup-info", "DEPT_INFO")))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void cup_nEstPasConcerneParLaRegleDOrigine() {
        var cup = new ReviewerScopeService.ResolvedScope(
                "cup-gl1", "cup-id", CreatorRole.CUP, "UP_GL1", "DEPT_GL", false);
        assertThatCode(() -> service.ensureInScope(cup, besoin(CreatorRole.ENSEIGNANT, "ens-gl", "DEPT_GL")))
                .doesNotThrowAnyException();
    }
}
