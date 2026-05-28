package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.Document;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.microsoft.OneDriveService;
import esprit.pfe.serviceformation.repositories.DocumentRepository;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentServiceTest {

    @Mock private DocumentRepository documentRepo;
    @Mock private FormationRepository formationRepo;
    @Mock private OneDriveService oneDriveService;

    @InjectMocks
    private DocumentService documentService;

    private Formation testFormation;
    private Document testDoc;

    @BeforeEach
    void setUp() {
        testFormation = new Formation();
        testFormation.setIdFormation(1L);
        testFormation.setTitreFormation("Formation Test");

        testDoc = new Document();
        testDoc.setIdDocument(100L);
        testDoc.setNomDocument("Doc Old");
        testDoc.setFormation(testFormation);
        testDoc.setFilePath("http://onedrive/d2f/Formation Test/Type/Doc Old/file.pdf");
    }

    @Test
    void shouldCreateDocument() throws IOException {
        MockMultipartFile file = new MockMultipartFile("file", "test.pdf", "application/pdf", "content".getBytes());
        
        when(formationRepo.findById(1L)).thenReturn(Optional.of(testFormation));
        when(oneDriveService.uploadDocumentToFormationFolder(anyString(), anyString(), anyString(), any(), anyString()))
                .thenReturn("http://new-url");
        when(documentRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Document result = documentService.createDocument(1L, "Type", "Doc Name", true, file);

        assertThat(result).isNotNull();
        assertThat(result.getFilePath()).isEqualTo("http://new-url");
        verify(documentRepo).save(any());
    }

    @Test
    void shouldUpdateDocumentWithNewFile() throws IOException {
        MockMultipartFile file = new MockMultipartFile("file", "new.pdf", "application/pdf", "new content".getBytes());
        
        when(documentRepo.findById(100L)).thenReturn(Optional.of(testDoc));
        when(oneDriveService.uploadDocumentToFormationFolder(anyString(), anyString(), anyString(), any(), anyString()))
                .thenReturn("http://updated-url");
        when(documentRepo.save(any())).thenReturn(testDoc);

        Document result = documentService.updateDocument(100L, "Type", "Doc New", true, file);

        assertThat(result.getFilePath()).isEqualTo("http://updated-url");
        verify(oneDriveService).uploadDocumentToFormationFolder(anyString(), anyString(), anyString(), any(), anyString());
    }

    @Test
    void shouldUpdateDocumentRenameOnly() throws IOException {
        when(documentRepo.findById(100L)).thenReturn(Optional.of(testDoc));
        when(documentRepo.save(any())).thenReturn(testDoc);

        Document result = documentService.updateDocument(100L, "Type", "Doc New", true, null);

        assertThat(result.getNomDocument()).isEqualTo("Doc New");
        verify(oneDriveService).renameDocumentFolder(anyString(), anyString(), eq("Doc Old"), eq("Doc New"));
        verify(oneDriveService, never()).uploadDocumentToFormationFolder(any(), any(), any(), any(), any());
    }

    @Test
    void shouldDeleteDocument() {
        when(documentRepo.findById(100L)).thenReturn(Optional.of(testDoc));
        
        documentService.deleteDocument(100L);

        verify(oneDriveService).deleteDocument(eq("Formation Test"), anyString(), eq("Doc Old"), eq("file.pdf"));
        verify(documentRepo).delete(testDoc);
    }
}
