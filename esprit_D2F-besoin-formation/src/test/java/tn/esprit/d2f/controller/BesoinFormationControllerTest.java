package tn.esprit.d2f.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import tn.esprit.d2f.dto.BesoinFormationRequest;
import tn.esprit.d2f.dto.BesoinFormationResponse;
import tn.esprit.d2f.repository.NotificationRepository;
import tn.esprit.d2f.service.IBesoinFormationService;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BesoinFormationController.class)
@AutoConfigureMockMvc(addFilters = false)
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
        mockMvc.perform(get("/api/v1/besoinsFormations/retrieve-all-BesoinFormations"))
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

        mockMvc.perform(post("/api/v1/besoinsFormations/add-BesoinFormation")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    void removeBesoinFormation_shouldReturnNoContent() throws Exception {
        mockMvc.perform(delete("/api/v1/besoinsFormations/remove-BesoinFormation/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    void approveBesoin_shouldReturnOk() throws Exception {
        when(service.approuverBesoin(1L)).thenReturn(new BesoinFormationResponse());
        mockMvc.perform(put("/api/v1/besoinsFormations/1/approve"))
                .andExpect(status().isOk());
    }
}
