package esprit.pfe.serviceformation.controllers;


import esprit.pfe.serviceformation.entities.Document;
import esprit.pfe.serviceformation.services.DocumentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests améliorés pour DocumentController
 * Couvre les cas d'erreur, updateDocument et gestion des erreurs
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("DocumentController - Tests améliorés")
class DocumentControllerEnhancedTest {

    private MockMvc mockMvc;

    @Mock private DocumentService service;
    @InjectMocks private DocumentController controller;

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    @DisplayName("createDocument - Devrait créer un document avec succès")
    void testCreateDocument_Success() throws Exception {
        Document doc = createDocument(1L, "path/test.txt", "Document Test");
        when(service.createDocument(anyLong(), anyString(), anyString(), anyBoolean(), any()))
                .thenReturn(doc);

        MockMultipartFile file = new MockMultipartFile(
                "file", 
                "test.txt", 
                "text/plain", 
                "data".getBytes()
        );

        mockMvc.perform(multipart("/api/v1/documents")
                .file(file)
                .param("formationId", "1")
                .param("pathType", "T1")
                .param("nomDocument", "D1")
                .param("obligation", "true"))
                .andExpect(status().isCreated())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));

        verify(service).createDocument(eq(1L), eq("T1"), eq("D1"), eq(true), any());
    }

    @Test
    @DisplayName("createDocument - Devrait échouer avec une formation inexistante")
    void testCreateDocument_FormationNotFound() throws Exception {
        when(service.createDocument(anyLong(), anyString(), anyString(), anyBoolean(), any()))
                .thenThrow(new IllegalArgumentException("Formation non trouvée"));

        MockMultipartFile file = new MockMultipartFile(
                "file", 
                "test.txt", 
                "text/plain", 
                "data".getBytes()
        );

        mockMvc.perform(multipart("/api/v1/documents")
                .file(file)
                .param("formationId", "999")
                .param("pathType", "T1")
                .param("nomDocument", "D1")
                .param("obligation", "true"))
                .andExpect(status().isInternalServerError())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Formation non trouvée")));
    }

    @Test
    @DisplayName("createDocument - Devrait échouer sans fichier")
    void testCreateDocument_NoFile() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", 
                "", 
                "text/plain", 
                new byte[0]
        );

        mockMvc.perform(multipart("/api/v1/documents")
                .file(file)
                .param("formationId", "1")
                .param("pathType", "T1")
                .param("nomDocument", "D1")
                .param("obligation", "true"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("getById - Devrait retourner le document")
    void testGetById_Success() throws Exception {
        Document doc = createDocument(1L, "path/test.txt", "Document Test");
        when(service.getById(1L)).thenReturn(doc);

        mockMvc.perform(get("/api/v1/documents/1"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));

        verify(service).getById(1L);
    }

    @Test
    @DisplayName("getById - Devrait échouer pour un document inexistant")
    void testGetById_NotFound() throws Exception {
        when(service.getById(999L))
                .thenThrow(new IllegalArgumentException("Document introuvable"));

        mockMvc.perform(get("/api/v1/documents/999"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("getAll - Devrait retourner la liste des documents")
    void testGetAll_Success() throws Exception {
        List<Document> documents = List.of(
                createDocument(1L, "path/test1.txt", "Document 1"),
                createDocument(2L, "path/test2.txt", "Document 2")
        );
        when(service.getAll()).thenReturn(documents);

        mockMvc.perform(get("/api/v1/documents"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2));

        verify(service).getAll();
    }

    @Test
    @DisplayName("getAll - Devrait retourner une liste vide")
    void testGetAll_Empty() throws Exception {
        when(service.getAll()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/documents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @DisplayName("updateDocument - Devrait mettre à jour avec un nouveau fichier")
    void testUpdateDocument_WithNewFile() throws Exception {
        Document updated = createDocument(1L, "path/updated.txt", "Document Mis à jour");
        when(service.updateDocument(anyLong(), anyString(), anyString(), anyBoolean(), any()))
                .thenReturn(updated);

        MockMultipartFile file = new MockMultipartFile(
                "file", 
                "updated.txt", 
                "text/plain", 
                "updated data".getBytes()
        );

        mockMvc.perform(multipart("/api/v1/documents/1")
                .file(file)
                .param("pathType", "T1")
                .param("nomDocument", "D1")
                .param("obligation", "true"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));

        verify(service).updateDocument(eq(1L), eq("T1"), eq("D1"), eq(true), any());
    }

    @Test
    @DisplayName("updateDocument - Devrait mettre à jour sans nouveau fichier")
    void testUpdateDocument_WithoutNewFile() throws Exception {
        Document updated = createDocument(1L, "path/test.txt", "Document Test");
        when(service.updateDocument(anyLong(), anyString(), anyString(), anyBoolean(), isNull()))
                .thenReturn(updated);

        mockMvc.perform(multipart("/api/v1/documents/1")
                .param("pathType", "T1")
                .param("nomDocument", "D1")
                .param("obligation", "false"))
                .andExpect(status().isOk());

        verify(service).updateDocument(eq(1L), eq("T1"), eq("D1"), eq(false), isNull());
    }

    @Test
    @DisplayName("updateDocument - Devrait échouer pour un document inexistant")
    void testUpdateDocument_NotFound() throws Exception {
        when(service.updateDocument(anyLong(), anyString(), anyString(), anyBoolean(), any()))
                .thenThrow(new IllegalArgumentException("Document introuvable"));

        MockMultipartFile file = new MockMultipartFile(
                "file", 
                "test.txt", 
                "text/plain", 
                "data".getBytes()
        );

        mockMvc.perform(multipart("/api/v1/documents/999")
                .file(file)
                .param("pathType", "T1")
                .param("nomDocument", "D1")
                .param("obligation", "true"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("deleteDocument - Devrait supprimer un document")
    void testDeleteDocument_Success() throws Exception {
        doNothing().when(service).deleteDocument(1L);

        mockMvc.perform(delete("/api/v1/documents/1"))
                .andExpect(status().isNoContent());

        verify(service).deleteDocument(1L);
    }

    @Test
    @DisplayName("deleteDocument - Devrait échouer pour un document inexistant")
    void testDeleteDocument_NotFound() throws Exception {
        doThrow(new IllegalArgumentException("Document introuvable"))
                .when(service).deleteDocument(999L);

        mockMvc.perform(delete("/api/v1/documents/999"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("downloadDocument - Devrait télécharger un document")
    void testDownloadDocument_Success() throws Exception {
        Document doc = createDocument(1L, "path/test.txt", "Document Test");
        when(service.getById(1L)).thenReturn(doc);
        when(service.downloadDocumentFile(1L)).thenReturn("test content".getBytes());

        mockMvc.perform(get("/api/v1/documents/download/1"))
                .andExpect(status().isOk())
                .andExpect(header().exists("Content-Disposition"));

        verify(service).getById(1L);
        verify(service).downloadDocumentFile(1L);
    }

    @Test
    @DisplayName("downloadDocument - Devrait échouer pour un document inexistant")
    void testDownloadDocument_NotFound() throws Exception {
        when(service.getById(999L))
                .thenThrow(new IllegalArgumentException("Document introuvable"));

        mockMvc.perform(get("/api/v1/documents/download/999"))
                .andExpect(status().isNotFound());
    }

    // Méthodes utilitaires pour créer des objets de test
    private Document createDocument(Long id, String filePath, String nomDocument) {
        Document doc = new Document();
        doc.setId(id);
        doc.setFilePath(filePath);
        doc.setNomDocument(nomDocument);
        doc.setDate(new java.util.Date());
        return doc;
    }
}
