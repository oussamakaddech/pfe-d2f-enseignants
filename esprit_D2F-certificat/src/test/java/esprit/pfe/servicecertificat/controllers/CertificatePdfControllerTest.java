package esprit.pfe.servicecertificat.controllers;

import esprit.pfe.servicecertificat.dto.CertificateResponse;
import esprit.pfe.servicecertificat.services.CertificateService;
import esprit.pfe.servicecertificat.services.CertificatePdfGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class CertificatePdfControllerTest {

    private MockMvc mockMvc;

    @Mock
    private CertificateService certificateService;

    @Mock
    private Resource backgroundImageResource;

    private CertificatePdfController controller;

    @BeforeEach
    void setUp() {
        controller = new CertificatePdfController(certificateService, backgroundImageResource);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void generatePdfForFormation_WithNoCertificates_ShouldReturn404() throws Exception {
        when(certificateService.findByFormation(1L)).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/certificate-pdfs/generate/1"))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Aucun certificat trouvé pour la formation avec id 1"));
    }

    @Test
    void generatePdfForFormation_WithCertificates_ShouldReturnOk() throws Exception {
        when(backgroundImageResource.getInputStream()).thenReturn(new java.io.ByteArrayInputStream(new byte[0]));
        
        CertificateResponse cert = new CertificateResponse();
        cert.setFormationId(1L);
        cert.setTitreFormation("Java Training");
        cert.setTypeCertif("ATTESTATION");
        cert.setEnseignantId("E001");
        cert.setNomEnseignant("Doe");
        cert.setPrenomEnseignant("John");
        cert.setMailEnseignant("john.doe@esprit.tn");
        cert.setDeptEnseignant("Informatique");
        cert.setRoleEnFormation("ANIMATEUR");
        cert.setChargeHoraireGlobal(30);

        when(certificateService.findByFormation(1L)).thenReturn(List.of(cert));

        try (MockedStatic<CertificatePdfGenerator> gen = org.mockito.Mockito.mockStatic(CertificatePdfGenerator.class)) {
            gen.when(() -> CertificatePdfGenerator.generateCertificatesForAllTeachers(any(), any()))
                .thenReturn(List.of("/pdfs/cert_1.pdf"));

            mockMvc.perform(get("/api/v1/certificate-pdfs/generate/1"))
                    .andExpect(status().isOk());
        }
    }

    @Test
    void getPdfPathsByFormation_ShouldReturnPaths() throws Exception {
        CertificateResponse cert = new CertificateResponse();
        cert.setPdfFilePath("/pdfs/cert_1.pdf");

        CertificateResponse cert2 = new CertificateResponse();
        cert2.setPdfFilePath("/pdfs/cert_2.pdf");

        when(certificateService.findByFormation(1L)).thenReturn(List.of(cert, cert2));

        mockMvc.perform(get("/api/v1/certificate-pdfs/formation/1"))
                .andExpect(status().isOk());
    }

    @Test
    void generatePdfForFormation_WhenRepositoryThrowsException_ShouldReturn500() throws Exception {
        when(certificateService.findByFormation(1L)).thenThrow(new RuntimeException("DB error"));

        mockMvc.perform(get("/api/v1/certificate-pdfs/generate/1"))
                .andExpect(status().isInternalServerError());
    }

    @Test
    void getPdfPathsByFormation_WhenExceptionThrown_ShouldReturn500() throws Exception {
        when(certificateService.findByFormation(1L)).thenThrow(new RuntimeException("DB error"));

        mockMvc.perform(get("/api/v1/certificate-pdfs/formation/1"))
                .andExpect(status().isInternalServerError());
    }
}
