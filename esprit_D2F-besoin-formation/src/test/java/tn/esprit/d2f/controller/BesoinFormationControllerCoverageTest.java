package tn.esprit.d2f.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tn.esprit.d2f.service.IBesoinFormationService;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Additional controller coverage tests targeting the getSortOrder private method
 * and query parameter edge cases.
 */
@WebMvcTest(BesoinFormationController.class)
@AutoConfigureMockMvc(addFilters = false)
@WithMockUser(roles = "ADMIN")
class BesoinFormationControllerCoverageTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IBesoinFormationService service;

    // Required to prevent "JPA metamodel must not be empty" and "auditorProvider not found"
    // in @WebMvcTest slices when @EnableJpaAuditing is on the main @SpringBootApplication class.
    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @SuppressWarnings("rawtypes")
    @MockitoBean(name = "auditorProvider")
    private AuditorAware auditorProvider;

    @Autowired
    private ObjectMapper objectMapper;

    @ParameterizedTest
    @ValueSource(strings = {
            "/api/v1/besoins-formations?sort=titre",
            "/api/v1/besoins-formations?sort=titre,desc",
            "/api/v1/besoins-formations?page=2&size=5"
    })
    void getBesoinFormations_withVariousParams_shouldReturnOk(String url) throws Exception {
        when(service.retrieveAllBesoinFormations(any(Pageable.class))).thenReturn(Page.empty());
        mockMvc.perform(get(url))
                .andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "/api/v1/besoins-formations/notifications/user1?page=1&size=5",
            "/api/v1/besoins-formations/approved?page=1&size=20",
            "/api/v1/besoins-formations/by-priorite/BASSE?page=0&size=5",
            "/api/v1/besoins-formations/by-up/UP1?page=0&size=5",
            "/api/v1/besoins-formations/by-departement/GL?page=1&size=15"
    })
    void getBesoinsWithPagination_shouldReturnOk(String url) throws Exception {
        when(service.retrieveApprovedBesoinFormations(any(Pageable.class))).thenReturn(Page.empty());
        when(service.retrieveByPriorite(any(), any(Pageable.class))).thenReturn(Page.empty());
        when(service.retrieveByUp(any(), any(Pageable.class))).thenReturn(Page.empty());
        when(service.retrieveByDepartement(any(), any(Pageable.class))).thenReturn(Page.empty());
        when(service.findNotificationsByUsername(any(), any(Pageable.class))).thenReturn(Page.empty());

        mockMvc.perform(get(url))
                .andExpect(status().isOk());
    }
}
