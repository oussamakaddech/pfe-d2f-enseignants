package esprit.pfe.serviceformation.Services;

import esprit.pfe.serviceformation.Entities.Document;
import esprit.pfe.serviceformation.Entities.Formation;
import esprit.pfe.serviceformation.Microsoft.OneDriveService;
import esprit.pfe.serviceformation.Repositories.DocumentRepository;
import esprit.pfe.serviceformation.Repositories.FormationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Date;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("DocumentService - Tests unitaires")
class DocumentServiceTest {

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private FormationRepository formationRepository;

    @Mock
    private OneDriveService oneDriveService;

    @InjectMocks
    private DocumentService documentService;

    private Formation formation;
    private Document document;

    @BeforeEach
    void setUp() {
        formation = new Formation();
        formation.setIdFormation(1L);
        formation.setTitreFormation("Spring Boot Avancé");

        document = new Document();
        document.setIdDocument(1L);
        document.setNomDocument("Support Cours");
        document.setPathType("SUPPORT");
        document.setFilePath("https://onedrive.live.com/test");
        document.setFormation(formation);
        document.setDate(new Date());
    }

    @Test
    @DisplayName("createDocument - Succès")
    void shouldCreateDocument() throws IOException {
        MockMultipartFile file = new MockMultipartFile("file", "test.pdf", "application/pdf", "Contenu".getBytes());

        when(formationRepository.findById(1L)).thenReturn(Optional.of(formation));
        when(oneDriveService.uploadDocumentToFormationFolder(any(), any(), any(), any(), any()))
                .thenReturn("https://onedrive.live.com/test.pdf");
        when(documentRepository.save(any())).thenAnswer(inv -> {
            Document d = inv.getArgument(0);
            d.setIdDocument(1L);
            return d;
        });

        Document result = documentService.createDocument(1L, "SUPPORT", "Support Cours", true, file);

        assertThat(result).isNotNull();
        assertThat(result.getIdDocument()).isEqualTo(1L);
        assertThat(result.getFilePath()).isEqualTo("https://onedrive.live.com/test.pdf");
        verify(oneDriveService).uploadDocumentToFormationFolder(any(), any(), any(), any(), any());
        verify(documentRepository).save(any());
    }

    @Test
    @DisplayName("createDocument - Échec : Formation introuvable")
    void shouldThrowWhenFormationNotFoundForCreate() {
        MockMultipartFile file = new MockMultipartFile("file", "test.pdf", "application/pdf", "Contenu".getBytes());
        when(formationRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> documentService.createDocument(99L, "SUPPORT", "Support Cours", true, file))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("getById - Succès")
    void shouldGetById() {
        when(documentRepository.findById(1L)).thenReturn(Optional.of(document));

        Document result = documentService.getById(1L);

        assertThat(result).isNotNull();
        assertThat(result.getIdDocument()).isEqualTo(1L);
    }

    @Test
    @DisplayName("getAll - Succès")
    void shouldGetAll() {
        when(documentRepository.findAll()).thenReturn(List.of(document));

        List<Document> result = documentService.getAll();

        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("updateDocument - Avec nouveau fichier")
    void shouldUpdateDocumentWithFile() throws IOException {
        MockMultipartFile file = new MockMultipartFile("file", "test_v2.pdf", "application/pdf", "Contenu".getBytes());

        when(documentRepository.findById(1L)).thenReturn(Optional.of(document));
        when(oneDriveService.uploadDocumentToFormationFolder(any(), any(), any(), any(), any()))
                .thenReturn("https://onedrive.live.com/test_v2.pdf");
        when(documentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Document result = documentService.updateDocument(1L, "SUPPORT", "Support Cours", true, file);

        assertThat(result.getFilePath()).isEqualTo("https://onedrive.live.com/test_v2.pdf");
        verify(oneDriveService).uploadDocumentToFormationFolder(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("updateDocument - Sans fichier, changement de nom")
    void shouldUpdateDocumentWithoutFile() throws IOException {
        when(documentRepository.findById(1L)).thenReturn(Optional.of(document));
        doNothing().when(oneDriveService).renameDocumentFolder(any(), any(), any(), any());
        when(documentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Document result = documentService.updateDocument(1L, "SUPPORT", "Nouveau Nom", true, null);

        assertThat(result.getNomDocument()).isEqualTo("Nouveau Nom");
        verify(oneDriveService).renameDocumentFolder(any(), any(), any(), any());
    }
}
