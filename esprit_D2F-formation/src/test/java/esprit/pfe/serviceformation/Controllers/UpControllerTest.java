package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.entities.Up;
import esprit.pfe.serviceformation.exception.GlobalExceptionHandler;
import esprit.pfe.serviceformation.services.UpService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.converter.ByteArrayHttpMessageConverter;
import org.springframework.http.converter.StringHttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Collections;



import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class UpControllerTest {

    private MockMvc mockMvc;

        @Mock private UpService upService;
    @InjectMocks private UpController controller;

    @BeforeEach
    void setup() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new org.springframework.data.web.config.SpringDataJacksonConfiguration.PageModule(new org.springframework.data.web.config.SpringDataWebSettings(org.springframework.data.web.config.EnableSpringDataWebSupport.PageSerializationMode.DIRECT)));
        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter(mapper);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .setMessageConverters(
                        new ByteArrayHttpMessageConverter(),
                        new StringHttpMessageConverter(),
                        converter)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void testImportExcel_Success() throws Exception {
        MockMultipartFile file = TestMockMvcHelper.createValidExcelFile("file", "test.xlsx", "test content");

        mockMvc.perform(multipart("/api/v1/ups/import-excel")
                .file(file))
                .andExpect(status().isOk())
                .andExpect(content().string("Import UP réussi"));

        verify(upService, times(1)).importUpsFromExcel(any());
    }

    @Test
    void testImportExcel_EmptyFile() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                new byte[0]);

        mockMvc.perform(multipart("/api/v1/ups/import-excel")
                .file(file))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Fichier vide ou absent."));

        verify(upService, never()).importUpsFromExcel(any());
    }

    @Test
    void testImportExcel_Error() throws Exception {
        MockMultipartFile file = TestMockMvcHelper.createValidExcelFile("file", "test.xlsx", "test content");

        doThrow(new RuntimeException("Import error")).when(upService).importUpsFromExcel(any());

        mockMvc.perform(multipart("/api/v1/ups/import-excel")
                .file(file))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Erreur import UP : Import error"));

        verify(upService, times(1)).importUpsFromExcel(any());
    }

    @Test
    void testGetAllUp() throws Exception {
        Up up = new Up();
        up.setId("U001");
        up.setLibelle("UP Test");
                when(upService.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(Collections.singletonList(up)));

        mockMvc.perform(get("/api/v1/ups"))
                .andExpect(status().isOk());
    }

    @Test
    void testGetUpById_Success() throws Exception {
        Up up = new Up();
        up.setId("U001");
        up.setLibelle("UP Test");
                when(upService.findById("U001")).thenReturn(up);

        mockMvc.perform(get("/api/v1/ups/U001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("U001"))
                .andExpect(jsonPath("$.libelle").value("UP Test"));
    }

    @Test
    void testGetUpById_NotFound() throws Exception {
        when(upService.findById("U999")).thenThrow(new EntityNotFoundException("UP introuvable : U999"));

        mockMvc.perform(get("/api/v1/ups/U999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void testCreateUp() throws Exception {
        Up up = new Up();
        up.setId("U001");
        up.setLibelle("UP Test");
                when(upService.create(any())).thenReturn(up);

        mockMvc.perform(post("/api/v1/ups")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"id\":\"U001\",\"libelle\":\"UP Test\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("U001"))
                .andExpect(jsonPath("$.libelle").value("UP Test"));
    }

    @Test
    void testUpdateUp_Success() throws Exception {
        Up existing = new Up();
        existing.setId("U001");
        existing.setLibelle("Ancien Libellé");

        Up updated = new Up();
        updated.setId("U001");
        updated.setLibelle("Nouveau Libellé");
                when(upService.update(eq("U001"), any())).thenReturn(updated);

        mockMvc.perform(put("/api/v1/ups/U001")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"libelle\":\"Nouveau Libellé\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.libelle").value("Nouveau Libellé"));
    }

    @Test
    void testUpdateUp_NotFound() throws Exception {
        when(upService.update(eq("U999"), any())).thenThrow(new EntityNotFoundException("UP introuvable : U999"));

        mockMvc.perform(put("/api/v1/ups/U999")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"libelle\":\"Nouveau Libellé\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void testDeleteUp() throws Exception {
        doNothing().when(upService).delete("U001");

        mockMvc.perform(delete("/api/v1/ups/U001"))
                .andExpect(status().isNoContent());

        verify(upService, times(1)).delete("U001");
    }
}

