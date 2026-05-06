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
import tn.esprit.d2f.DTO.BesoinFormationRequest;
import tn.esprit.d2f.DTO.BesoinFormationResponse;
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
    @WithMockUser(authorities = "ROLE_USER")
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
    @WithMockUser(authorities = "ROLE_ADMIN")
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
    @WithMockUser(authorities = "ROLE_GUEST")
    void add_SecurityFailure() throws Exception {
        BesoinFormationRequest request = new BesoinFormationRequest();
        request.setTitre("New Training");

        mockMvc.perform(post("/api/v1/besoinsFormations/add-BesoinFormation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /retrieve/{id} - Success")
    @WithMockUser(authorities = "ROLE_USER")
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
