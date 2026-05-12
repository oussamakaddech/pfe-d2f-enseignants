package tn.esprit.d2f.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import tn.esprit.d2f.dto.BesoinFormationRequest;
import tn.esprit.d2f.dto.BesoinFormationResponse;
import tn.esprit.d2f.repository.NotificationRepository;
import tn.esprit.d2f.service.IBesoinFormationService;


import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BesoinFormationController.class)
@AutoConfigureMockMvc(addFilters = false)
@WithMockUser(roles = "ADMIN")
class BesoinFormationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IBesoinFormationService service;

    @MockitoBean
    private NotificationRepository notificationRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void getBesoinFormations_shouldReturnOk() throws Exception {
        when(service.retrieveAllBesoinFormations(any(Pageable.class))).thenReturn(Page.empty());
        mockMvc.perform(get("/api/v1/besoins-formations"))
                .andExpect(status().isOk());
    }

    @Test
    void addBesoinFormation_shouldReturnOk() throws Exception {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setTitre("Formation Spring Boot");
        request.setUsername("testuser");
        request.setTypeBesoin(tn.esprit.d2f.entity.enumerations.TypeBesoin.COLLECTIF);
        request.setObjectifFormation("Objectif");
        request.setUp("Informatique");
        request.setDepartement("Genie Logiciel");
        request.setPriorite(tn.esprit.d2f.entity.enumerations.Priorite.HAUTE);
        
        request.setNbMaxParticipants(10);
        request.setDureeFormation(20);
        
        when(service.addBesoinFormation(any())).thenReturn(new BesoinFormationResponse());

        mockMvc.perform(post("/api/v1/besoins-formations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    void removeBesoinFormation_shouldReturnNoContent() throws Exception {
        mockMvc.perform(delete("/api/v1/besoins-formations/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    void addBesoinFormation_withValidationErrors_shouldReturnBadRequest() {
        BesoinFormationController controller = new BesoinFormationController(service, notificationRepository);
        org.springframework.validation.BindingResult bindingResult = mock(org.springframework.validation.BindingResult.class);
        when(bindingResult.hasErrors()).thenReturn(true);
        when(bindingResult.getAllErrors()).thenReturn(java.util.Collections.emptyList());

        org.springframework.http.ResponseEntity<?> response = controller.addBesoinFormation(new BesoinFormationRequest(), bindingResult);
        
        org.junit.jupiter.api.Assertions.assertEquals(org.springframework.http.HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void retrieveBesoinFormation_shouldReturnOk() throws Exception {
        when(service.retrieveBesoinFormation(1L)).thenReturn(new BesoinFormationResponse());
        mockMvc.perform(get("/api/v1/besoins-formations/1"))
                .andExpect(status().isOk());
    }

    @Test
    void modifyBesoinFormation_shouldReturnOk() throws Exception {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setTitre("Modif");
        request.setUsername("user");
        request.setTypeBesoin(tn.esprit.d2f.entity.enumerations.TypeBesoin.INDIVIDUEL);
        request.setObjectifFormation("Obj");
        request.setUp("UP");
        request.setDepartement("Dep");
        request.setPriorite(tn.esprit.d2f.entity.enumerations.Priorite.BASSE);
        request.setNbMaxParticipants(5);
        request.setDureeFormation(10);

        when(service.modifyBesoinFormation(any())).thenReturn(new BesoinFormationResponse());
        mockMvc.perform(put("/api/v1/besoins-formations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    void getUserNotifications_shouldReturnOk() throws Exception {
        when(notificationRepository.findByUsername(any(), any(Pageable.class))).thenReturn(Page.empty());
        mockMvc.perform(get("/api/v1/besoins-formations/notifications/testuser"))
                .andExpect(status().isOk());
    }

    @Test
    void approveBesoin_shouldReturnOk() throws Exception {
        when(service.approuverBesoin(1L)).thenReturn(new BesoinFormationResponse());
        mockMvc.perform(put("/api/v1/besoins-formations/1/approve"))
                .andExpect(status().isOk());
    }

    @Test
    void getApprovedBesoinFormations_shouldReturnOk() throws Exception {
        when(service.retrieveApprovedBesoinFormations(any(Pageable.class))).thenReturn(Page.empty());
        mockMvc.perform(get("/api/v1/besoins-formations/approved"))
                .andExpect(status().isOk());
    }

    @Test
    void getBesoinsByUp_shouldReturnOk() throws Exception {
        when(service.retrieveByUp(any(), any(Pageable.class))).thenReturn(Page.empty());
        mockMvc.perform(get("/api/v1/besoins-formations/by-up/Info"))
                .andExpect(status().isOk());
    }

    @Test
    void getBesoinsByDepartement_shouldReturnOk() throws Exception {
        when(service.retrieveByDepartement(any(), any(Pageable.class))).thenReturn(Page.empty());
        mockMvc.perform(get("/api/v1/besoins-formations/by-departement/GL"))
                .andExpect(status().isOk());
    }

    @Test
    void getBesoinsByPriorite_shouldReturnOk() throws Exception {
        when(service.retrieveAllByPriorite(any(Pageable.class))).thenReturn(Page.empty());
        mockMvc.perform(get("/api/v1/besoins-formations/by-priorite"))
                .andExpect(status().isOk());
    }

    @Test
    void getBesoinsByPrioriteLevel_shouldReturnOk() throws Exception {
        when(service.retrieveByPriorite(any(), any(Pageable.class))).thenReturn(Page.empty());
        mockMvc.perform(get("/api/v1/besoins-formations/by-priorite/HAUTE"))
                .andExpect(status().isOk());
    }

    @Test
    void getBesoinFormations_withSortOrderAsc_shouldReturnOk() throws Exception {
        when(service.retrieveAllBesoinFormations(any(Pageable.class))).thenReturn(Page.empty());
        mockMvc.perform(get("/api/v1/besoins-formations?sort=titre,asc"))
                .andExpect(status().isOk());
    }
}
