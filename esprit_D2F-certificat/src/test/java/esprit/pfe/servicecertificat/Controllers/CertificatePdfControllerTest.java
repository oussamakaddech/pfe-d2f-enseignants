package esprit.pfe.servicecertificat.controllers;

import esprit.pfe.servicecertificat.entities.Certificate;
import esprit.pfe.servicecertificat.repositories.CertificateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class CertificatePdfControllerTest {

    private MockMvc mockMvc;

    @Mock
    private CertificateRepository certificateRepository;

    @Mock
    private Resource backgroundImageResource;

    private CertificatePdfController controller;

    @BeforeEach
    void setUp() {
        controller = new CertificatePdfController(certificateRepository, backgroundImageResource);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void generatePdfForFormation_WithNoCertificates_ShouldReturn404() throws Exception {
        when(certificateRepository.findByFormationId(1L)).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/certificate-pdfs/generate/1"))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Aucun certificat trouvé pour la formation avec id 1"));
    }

    @Test
    void generatePdfForFormation_WithCertificates_ShouldReturnOk() throws Exception {
        when(backgroundImageResource.getInputStream()).thenReturn(new java.io.ByteArrayInputStream(new byte[0]));
        
        Certificate cert = new Certificate();
        cert.setFormationId(1L);
        cert.setTitreFormation("Java Training");
        cert.setTypeCertif("ATTESTATION");
        cert.setEnseignantId("E001");
        cert.setNomEnseignant("Doe");
        cert.setPrenomEnseignant("John");
        cert.setMailEnseignant("john@esprit.tn");
        cert.setRoleEnFormation("ANIMATEUR");

        when(certificateRepository.findByFormationId(1L)).thenReturn(List.of(cert));

        mockMvc.perform(get("/api/v1/certificate-pdfs/generate/1"))
                .andExpect(status().isOk());
    }

    @Test
    void getPdfPathsByFormation_ShouldReturnPaths() throws Exception {
        Certificate cert = new Certificate();
        cert.setPdfFilePath("/certificates/cert.pdf");
        Certificate certNull = new Certificate();
        certNull.setPdfFilePath(null);
        Certificate certEmpty = new Certificate();
        certEmpty.setPdfFilePath("");

        when(certificateRepository.findByFormationId(1L)).thenReturn(List.of(cert, certNull, certEmpty));

        mockMvc.perform(get("/api/v1/certificate-pdfs/formation/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0]").value("/certificates/cert.pdf"));
    }

    @Test
    void generatePdfForFormation_WhenRepositoryThrowsException_ShouldReturn500() throws Exception {
        when(certificateRepository.findByFormationId(1L)).thenThrow(new RuntimeException("Database connection failed"));

        mockMvc.perform(get("/api/v1/certificate-pdfs/generate/1"))
                .andExpect(status().isInternalServerError())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Erreur lors de la génération")));
    }

    @Test
    void getPdfPathsByFormation_WhenExceptionThrown_ShouldReturn500() throws Exception {
        when(certificateRepository.findByFormationId(1L)).thenThrow(new RuntimeException("DB Error"));

        mockMvc.perform(get("/api/v1/certificate-pdfs/formation/1"))
                .andExpect(status().isInternalServerError())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Erreur lors de la récupération")));
    }
}