package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.dto.EnseignantDTO;
import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.services.EnseignantExcelService;
import esprit.pfe.serviceformation.services.EnseignantService;
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

import static org.mockito.ArgumentMatchers.any;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests améliorés pour EnseignantController
 * Couvre les cas d'erreur et de validation des données
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("EnseignantController - Tests améliorés")
class EnseignantControllerEnhancedTest {

        private MockMvc mockMvc;

        @Mock
        private EnseignantService enseignantService;
        @Mock
        private EnseignantExcelService excelService;
        @InjectMocks
        private EnseignantController controller;

        @BeforeEach
        void setup() {
                mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        }

        @Test
        @DisplayName("getAllEnseignants - Devrait retourner la liste des enseignants")
        void testGetAllEnseignants() throws Exception {
                List<EnseignantDTO> expectedList = List.of(
                                createEnseignantDTO("E001", "Dupont", "Jean", "jean.dupont@esprit.tn"),
                                createEnseignantDTO("E002", "Martin", "Marie", "marie.martin@esprit.tn"));

                when(enseignantService.getAllEnseignantsDTO()).thenReturn(expectedList);

                mockMvc.perform(get("/api/v1/enseignants"))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON));

                verify(enseignantService).getAllEnseignantsDTO();
        }

        @Test
        @DisplayName("getAllEnseignants - Devrait retourner une liste vide")
        void testGetAllEnseignants_Empty() throws Exception {
                when(enseignantService.getAllEnseignantsDTO()).thenReturn(Collections.emptyList());

                mockMvc.perform(get("/api/v1/enseignants"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$").isArray())
                                .andExpect(jsonPath("$.length()").value(0));
        }

        @Test
        @DisplayName("getEnseignantById - Devrait retourner l'enseignant")
        void testGetEnseignantById_Success() throws Exception {
                Enseignant expected = createEnseignant("E001", "Dupont", "Jean", "jean.dupont@esprit.tn");
                when(enseignantService.getEnseignantById("E001")).thenReturn(expected);

                mockMvc.perform(get("/api/v1/enseignants/E001"))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON));

                verify(enseignantService).getEnseignantById("E001");
        }

        @Test
        @DisplayName("createEnseignant - Devrait créer un enseignant valide")
        void testCreateEnse_Valid() throws Exception {
                Enseignant created = createEnseignant("E001", "Dupont", "Jean", "jean.dupont@esprit.tn");
                when(enseignantService.createEnseignant(any(Enseignant.class))).thenReturn(created);

                String enseignantJson = "{" +
                                "\"nom\":\"Dupont\"," +
                                "\"prenom\":\"Jean\"," +
                                "\"mail\":\"jean.dupont@esprit.tn\"," +
                                "\"type\":\"Permanent\"}";

                mockMvc.perform(post("/api/v1/enseignants")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(enseignantJson))
                                .andExpect(status().isOk());

                verify(enseignantService).createEnseignant(any(Enseignant.class));
        }

        @Test
        @DisplayName("updateEnseignant - Devrait mettre à jour un enseignant existant")
        void testUpdateEnseignant_Success() throws Exception {
                Enseignant updated = createEnseignant("E001", "Dupont", "Jean-Pierre", "jean.dupont@esprit.tn");
                when(enseignantService.updateEnseignant(eq("E001"), any(Enseignant.class))).thenReturn(updated);

                String enseignantJson = "{" +
                                "\"nom\":\"Dupont\"," +
                                "\"prenom\":\"Jean-Pierre\"," +
                                "\"mail\":\"jean.dupont@esprit.tn\"}";

                mockMvc.perform(put("/api/v1/enseignants/E001")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(enseignantJson))
                                .andExpect(status().isOk());

                verify(enseignantService).updateEnseignant(eq("E001"), any(Enseignant.class));
        }

        @Test
        @DisplayName("deleteEnseignant - Devrait supprimer un enseignant")
        void testDeleteEnseignant_Success() throws Exception {
                doNothing().when(enseignantService).deleteEnseignant("E001");

                mockMvc.perform(delete("/api/v1/enseignants/E001"))
                                .andExpect(status().isNoContent());

                verify(enseignantService).deleteEnseignant("E001");
        }

        @Test
        @DisplayName("uploadEnseignants - Devrait échouer avec un fichier corrompu")
        void testUploadEnseignants_Failure() throws Exception {
                MockMultipartFile file = new MockMultipartFile(
                                "file",
                                "enseignants.xlsx",
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                "corrupted content".getBytes());
                doThrow(new RuntimeException("Format de fichier invalide"))
                                .when(excelService).importEnseignantsFromExcel(any());

                mockMvc.perform(multipart("/api/v1/enseignants/upload").file(file))
                                .andExpect(status().isBadRequest())
                                .andExpect(content().string(
                                                org.hamcrest.Matchers.containsString("Format de fichier invalide")));
        }

        @Test
        @DisplayName("uploadEnseignants - Devrait échouer sans fichier")
        void testUploadEnseignants_NoFile() throws Exception {
                MockMultipartFile file = new MockMultipartFile(
                                "file",
                                "empty.xlsx",
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                new byte[0]);

                mockMvc.perform(multipart("/api/v1/enseignants/upload").file(file))
                                .andExpect(status().isBadRequest());
        }

        // Méthodes utilitaires pour créer des objets de test
        private Enseignant createEnseignant(String id, String nom, String prenom, String mail) {
                Enseignant e = new Enseignant();
                e.setId(id);
                e.setNom(nom);
                e.setPrenom(prenom);
                e.setMail(mail);
                return e;
        }

        private EnseignantDTO createEnseignantDTO(String id, String nom, String prenom, String mail) {
                EnseignantDTO dto = new EnseignantDTO();
                dto.setId(id);
                dto.setNom(nom);
                dto.setPrenom(prenom);
                dto.setMail(mail);
                return dto;
        }
}
