package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.entities.Dept;
import esprit.pfe.serviceformation.exception.GlobalExceptionHandler;
import esprit.pfe.serviceformation.services.DeptService;
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
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Collections;


import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class DeptControllerTest {

    private MockMvc mockMvc;

        @Mock private DeptService deptService;
    @InjectMocks private DeptController controller;

    @BeforeEach
    void setup() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new org.springframework.data.web.config.SpringDataJacksonConfiguration.PageModule(new org.springframework.data.web.config.SpringDataWebSettings(org.springframework.data.web.config.EnableSpringDataWebSupport.PageSerializationMode.DIRECT)));
        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter(mapper);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .setMessageConverters(converter)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void testImportExcel_Success() throws Exception {
        MockMultipartFile file = TestMockMvcHelper.createValidExcelFile("file", "test.xlsx", "test content");

        mockMvc.perform(multipart("/api/v1/departements/import-excel")
                .file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value("Import Dept réussi"));

        verify(deptService, times(1)).importDeptsFromExcel(any());
    }

    @Test
    void testImportExcel_EmptyFile() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                new byte[0]);

        mockMvc.perform(multipart("/api/v1/departements/import-excel")
                .file(file))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$").value("Fichier vide ou absent."));

        verify(deptService, never()).importDeptsFromExcel(any());
    }

    @Test
    void testImportExcel_Error() throws Exception {
        MockMultipartFile file = TestMockMvcHelper.createValidExcelFile("file", "test.xlsx", "test content");

        doThrow(new RuntimeException("Import error")).when(deptService).importDeptsFromExcel(any());

        mockMvc.perform(multipart("/api/v1/departements/import-excel")
                .file(file))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$").value("Erreur import Dept : Import error"));

        verify(deptService, times(1)).importDeptsFromExcel(any());
    }

    @Test
    void testGetAllDept() throws Exception {
        Dept dept = new Dept();
        dept.setId("D001");
        dept.setLibelle("Département Test");
                when(deptService.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(Collections.singletonList(dept)));

        mockMvc.perform(get("/api/v1/departements"))
                .andExpect(status().isOk());
    }

    @Test
    void testGetDeptById_Success() throws Exception {
        Dept dept = new Dept();
        dept.setId("D001");
        dept.setLibelle("Département Test");
                when(deptService.findById("D001")).thenReturn(dept);

        mockMvc.perform(get("/api/v1/departements/D001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("D001"))
                .andExpect(jsonPath("$.libelle").value("Département Test"));
    }

    @Test
    void testGetDeptById_NotFound() throws Exception {
        when(deptService.findById("D999")).thenThrow(new EntityNotFoundException("Département introuvable : D999"));

        mockMvc.perform(get("/api/v1/departements/D999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void testCreateDept() throws Exception {
        Dept dept = new Dept();
        dept.setId("D001");
        dept.setLibelle("Département Test");
                when(deptService.create(any())).thenReturn(dept);

        mockMvc.perform(post("/api/v1/departements")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"id\":\"D001\",\"libelle\":\"Département Test\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("D001"))
                .andExpect(jsonPath("$.libelle").value("Département Test"));
    }

    @Test
    void testUpdateDept_Success() throws Exception {
        Dept existing = new Dept();
        existing.setId("D001");
        existing.setLibelle("Ancien Libellé");

        Dept updated = new Dept();
        updated.setId("D001");
        updated.setLibelle("Nouveau Libellé");
                when(deptService.update(eq("D001"), any())).thenReturn(updated);

        mockMvc.perform(put("/api/v1/departements/D001")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"libelle\":\"Nouveau Libellé\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.libelle").value("Nouveau Libellé"));
    }

    @Test
    void testUpdateDept_NotFound() throws Exception {
        when(deptService.update(eq("D999"), any())).thenThrow(new EntityNotFoundException("Département introuvable : D999"));

        mockMvc.perform(put("/api/v1/departements/D999")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"libelle\":\"Nouveau Libellé\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void testDeleteDept() throws Exception {
        doNothing().when(deptService).delete("D001");

        mockMvc.perform(delete("/api/v1/departements/D001"))
                .andExpect(status().isNoContent());

        verify(deptService, times(1)).delete("D001");
    }
}

