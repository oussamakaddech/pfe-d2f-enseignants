package esprit.pfe.serviceformation.Services;

import esprit.pfe.serviceformation.Entities.Document;
import esprit.pfe.serviceformation.Entities.Formation;
import esprit.pfe.serviceformation.Microsoft.OneDriveService;
import esprit.pfe.serviceformation.Repositories.DocumentRepository;
import esprit.pfe.serviceformation.Repositories.FormationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentServiceExtendedTest {

    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private FormationRepository formationRepository;
    @Mock
    private OneDriveService oneDriveService;
    @InjectMocks
    private DocumentService service;

    private Document doc;
    private Formation formation;

    @BeforeEach
    void setUp() {
        formation = new Formation();
        formation.setIdFormation(1L);
        formation.setTitreFormation("Java Avancé");

        doc = new Document();
        doc.setIdDocument(1L);
        doc.setNomDocument("Test Doc");
        doc.setFormation(formation);
        doc.setFilePath("https://onedrive.com/d2F/Java Avancé/supports/Test Doc/file.pdf");
    }

    @Test
    void getById_existing_shouldReturn() {
        when(documentRepository.findById(1L)).thenReturn(Optional.of(doc));
        Document result = service.getById(1L);
        assertNotNull(result);
        assertEquals("Test Doc", result.getNomDocument());
    }

    @Test
    void getById_notFound_shouldThrow() {
        when(documentRepository.findById(999L)).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> service.getById(999L));
    }

    @Test
    void getAll_shouldReturnList() {
        when(documentRepository.findAll()).thenReturn(List.of(doc));
        List<Document> result = service.getAll();
        assertEquals(1, result.size());
    }

    @Test
    void deleteDocument_shouldCallOneDriveAndRepo() {
        when(documentRepository.findById(1L)).thenReturn(Optional.of(doc));
        doNothing().when(documentRepository).delete(any());

        service.deleteDocument(1L);

        verify(documentRepository).delete(doc);
    }
}
