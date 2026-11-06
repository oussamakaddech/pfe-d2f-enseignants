package esprit.pfe.serviceformation.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceformation.dto.animator.AnimatorProposalResponse;
import esprit.pfe.serviceformation.services.animator.AnimatorProposalService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests des endpoints du workflow d'animation (mapper, statuts HTTP, sécurité).
 */
@ExtendWith(MockitoExtension.class)
class AnimatorProposalControllerTest {

    private MockMvc mockMvc;

    @Mock private AnimatorProposalService animatorProposalService;
    @InjectMocks private AnimatorProposalController controller;

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void testCreateManagerProposal_Returns201() throws Exception {
        when(animatorProposalService.createManagerProposal(eq(1L), any()))
                .thenReturn(new AnimatorProposalResponse());
        mockMvc.perform(post("/api/v1/formations/1/animator-proposals")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"proposerId\":\"E00001\",\"proposerType\":\"TEACHER\",\"role\":\"LEAD_TRAINER\",\"proposalType\":\"MANAGER_PROPOSAL\",\"motivation\":\"Expertise ML\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    void testCreateManagerProposal_BadRequest() throws Exception {
        mockMvc.perform(post("/api/v1/formations/1/animator-proposals")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testCreateSelfProposal_Returns201() throws Exception {
        when(animatorProposalService.createSelfProposal(eq(1L), any()))
                .thenReturn(new AnimatorProposalResponse());
        mockMvc.perform(post("/api/v1/formations/1/self-animator-proposals")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"LEAD_TRAINER\",\"motivation\":\"Je possède une expertise avancée dans cette compétence.\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    void testCreateSelfProposal_MissingMotivation_BadRequest() throws Exception {
        mockMvc.perform(post("/api/v1/formations/1/self-animator-proposals")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"LEAD_TRAINER\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testListFormationProposals_Returns200() throws Exception {
        when(animatorProposalService.listFormationProposals(1L)).thenReturn(List.of());
        mockMvc.perform(get("/api/v1/formations/1/animator-proposals"))
                .andExpect(status().isOk());
    }

    @Test
    void testListMyProposals_Returns200() throws Exception {
        when(animatorProposalService.listMyProposals()).thenReturn(List.of());
        mockMvc.perform(get("/api/v1/animator-proposals/mine"))
                .andExpect(status().isOk());
    }

    @Test
    void testListPendingProposals_Returns200() throws Exception {
        when(animatorProposalService.listPendingProposals()).thenReturn(List.of());
        mockMvc.perform(get("/api/v1/animator-proposals/pending"))
                .andExpect(status().isOk());
    }

    @Test
    void testAcceptProposal_Returns200() throws Exception {
        when(animatorProposalService.acceptProposal(eq(10L), isNull()))
                .thenReturn(new AnimatorProposalResponse());
        mockMvc.perform(put("/api/v1/animator-proposals/10/accept"))
                .andExpect(status().isOk());
    }

    @Test
    void testRejectProposal_Returns200() throws Exception {
        when(animatorProposalService.rejectProposal(eq(10L), eq("Je ne suis pas disponible à cette période.")))
                .thenReturn(new AnimatorProposalResponse());
        mockMvc.perform(put("/api/v1/animator-proposals/10/reject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comment\":\"Je ne suis pas disponible à cette période.\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void testApproveProposal_Returns200() throws Exception {
        when(animatorProposalService.approveProposal(10L)).thenReturn(new AnimatorProposalResponse());
        mockMvc.perform(put("/api/v1/animator-proposals/10/approve"))
                .andExpect(status().isOk());
    }

    @Test
    void testManagerRejectProposal_Returns200() throws Exception {
        when(animatorProposalService.managerRejectProposal(eq(10L), isNull()))
                .thenReturn(new AnimatorProposalResponse());
        mockMvc.perform(put("/api/v1/animator-proposals/10/manager-reject"))
                .andExpect(status().isOk());
    }

    @Test
    void testWithdrawProposal_Returns200() throws Exception {
        when(animatorProposalService.withdrawProposal(10L)).thenReturn(new AnimatorProposalResponse());
        mockMvc.perform(put("/api/v1/animator-proposals/10/withdraw"))
                .andExpect(status().isOk());
    }

    @Test
    void testAssignAnimator_Returns201() throws Exception {
        when(animatorProposalService.assignAnimator(1L, 10L))
                .thenReturn(new esprit.pfe.serviceformation.dto.animator.FormationAnimatorResponse());
        mockMvc.perform(post("/api/v1/formations/1/animators/10/assign"))
                .andExpect(status().isCreated());
    }

    @Test
    void testListFormationAnimators_Returns200() throws Exception {
        when(animatorProposalService.listFormationAnimators(1L)).thenReturn(List.of());
        mockMvc.perform(get("/api/v1/formations/1/animators"))
                .andExpect(status().isOk());
    }

    @Test
    void testAuthorizationMatrixConstants() {
        // Matrice d'autorisation : les nouvelles entrées existent et couvrent
        // exactement les rôles attendus.
        assertTrue(AuthorizationMatrix.ANIMATOR_PROPOSAL_SELF.contains("ROLE_ENSEIGNANT"));
        assertTrue(AuthorizationMatrix.ANIMATOR_PROPOSAL_SELF.contains("ROLE_ANIMATEUR"));
        assertFalse(AuthorizationMatrix.ANIMATOR_PROPOSAL_SELF.contains("ROLE_CUP"));
        assertTrue(AuthorizationMatrix.ANIMATOR_PROPOSAL_MANAGER.contains("ROLE_CUP"));
        assertTrue(AuthorizationMatrix.ANIMATOR_PROPOSAL_MANAGER.contains("ROLE_ADMIN"));
        assertTrue(AuthorizationMatrix.ANIMATOR_PROPOSAL_VALIDATE.contains("ROLE_CHEF_DEPARTEMENT"));
        assertTrue(AuthorizationMatrix.ANIMATOR_PROPOSAL_VALIDATE.contains("ROLE_CUP"));
        assertTrue(AuthorizationMatrix.ANIMATOR_PROPOSAL_VALIDATE.contains("ROLE_ADMIN"));
        assertFalse(AuthorizationMatrix.ANIMATOR_PROPOSAL_VALIDATE.contains("ROLE_ENSEIGNANT"));
    }

    private static void assertTrue(boolean condition) {
        org.junit.jupiter.api.Assertions.assertTrue(condition);
    }

    private static void assertFalse(boolean condition) {
        org.junit.jupiter.api.Assertions.assertFalse(condition);
    }
}
