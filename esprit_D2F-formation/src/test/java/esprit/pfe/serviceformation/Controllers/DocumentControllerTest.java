package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.entities.Document;
import esprit.pfe.serviceformation.services.DocumentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class DocumentControllerTest {

    private MockMvc mockMvc;

    @Mock private DocumentService service;
    @InjectMocks private DocumentController controller;

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void testCreateDocument_Success() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "test.txt", "text/plain", "data".getBytes());
        Document doc = new Document();
        doc.setFilePath("path/test.txt");
        
        when(service.createDocument(anyLong(), anyString(), anyString(), anyBoolean(), any())).thenReturn(doc);
        
        mockMvc.perform(multipart("/api/v1/documents")
                .file(file)
                .param("formationId", "1")
                .param("pathType", "T1")
                .param("nomDocument", "D1")
                .param("obligation", "true")).andExpect(status().isCreated());
    }

    @Test
    void testCreateDocument_Failure() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "test.txt", "text/plain", "data".getBytes());
        when(service.createDocument(anyLong(), anyString(), anyString(), anyBoolean(), any())).thenThrow(new RuntimeException("Error"));
        
        mockMvc.perform(multipart("/api/v1/documents")
                .file(file)
                .param("formationId", "1")
                .param("pathType", "T1")
                .param("nomDocument", "D1")
                .param("obligation", "true")).andExpect(status().isInternalServerError());
    }

    @Test
    void testGetById() throws Exception {
        Document doc = new Document();
        doc.setFilePath("path/test.txt");
        when(service.getById(anyLong())).thenReturn(doc);
        mockMvc.perform(get("/api/v1/documents/1")).andExpect(status().isOk());
    }

    @Test
    void testGetAll() throws Exception {
        when(service.getAll()).thenReturn(Collections.emptyList());
        mockMvc.perform(get("/api/v1/documents")).andExpect(status().isOk());
    }

    @Test
    void testDeleteDocument() throws Exception {
        mockMvc.perform(delete("/api/v1/documents/1")).andExpect(status().isNoContent());
    }

    @Test
    void testDownloadDocument() throws Exception {
        Document doc = new Document();
        doc.setFilePath("path/test.txt");
        when(service.getById(anyLong())).thenReturn(doc);
        when(service.downloadDocumentFile(anyLong())).thenReturn(new byte[0]);
        
        mockMvc.perform(get("/api/v1/documents/download/1")).andExpect(status().isOk());
    }
}
