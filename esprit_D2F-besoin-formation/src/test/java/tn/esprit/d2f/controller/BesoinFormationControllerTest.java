package tn.esprit.d2f.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import tn.esprit.d2f.dto.BesoinFormationRequest;
import tn.esprit.d2f.dto.BesoinFormationResponse;
import tn.esprit.d2f.entity.enumerations.Priorite;
import tn.esprit.d2f.entity.enumerations.TypeBesoin;
import tn.esprit.d2f.service.IBesoinFormationService;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class BesoinFormationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private IBesoinFormationService besoinFormationService;

    @Test
    @DisplayName("GET /retrieve-all - Success with Pagination")
    @WithMockUser(roles = "ADMIN")
    void getAll_Success() throws Exception {
        BesoinFormationResponse response = new BesoinFormationResponse();
        response.setIdBesoinFormation(1L);
        response.setTitre("Java Advanced");

        when(besoinFormationService.retrieveAllBesoinFormations(any()))
                .thenReturn(new PageImpl<>(Collections.singletonList(response), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/v1/besoinsFormations/retrieve-all-BesoinFormations")
                        .param("page", "0")
                        .param("size", "10")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].titre").value("Java Advanced"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    @DisplayName("POST /add - Validation Failure (Missing Title)")
    @WithMockUser(roles = "ADMIN")
    void add_ValidationFailure() throws Exception {
        BesoinFormationRequest request = new BesoinFormationRequest();
        // Titre est null => Doit échouer

        mockMvc.perform(post("/api/v1/besoinsFormations/add-BesoinFormation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BESOIN-400"));
    }

    @Test
    @DisplayName("POST /add - Security Failure (Unauthorized Role)")
    @WithMockUser(roles = "GUEST")
    void add_SecurityFailure() throws Exception {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setUsername("testuser");
        request.setTypeBesoin(TypeBesoin.INDIVIDUEL);
        request.setTitre("New Training Long Enough");
        request.setObjectifFormation("To learn something");
        request.setNbMaxParticipants(10);
        request.setDureeFormation(8);
        request.setUp("UP_JAVA");
        request.setDepartement("DEPARTEMENT_IT");
        request.setPriorite(Priorite.MOYENNE);

        mockMvc.perform(post("/api/v1/besoinsFormations/add-BesoinFormation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /retrieve/{id} - Success")
    @WithMockUser(roles = "ADMIN")
    void getById_Success() throws Exception {
        BesoinFormationResponse response = new BesoinFormationResponse();
        response.setIdBesoinFormation(1L);
        response.setTitre("Spring Boot");

        when(besoinFormationService.retrieveBesoinFormation(1L)).thenReturn(response);

        mockMvc.perform(get("/api/v1/besoinsFormations/retrieve-BesoinFormation/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.titre").value("Spring Boot"));
    }
}
