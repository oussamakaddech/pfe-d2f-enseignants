package esprit.pfe.serviceformation.microsoft;

import com.microsoft.graph.models.DriveItem;
import com.microsoft.graph.models.Permission;
import com.microsoft.graph.models.SharingLink;
import com.microsoft.graph.requests.DriveItemCollectionPage;
import com.microsoft.graph.requests.GraphServiceClient;
import esprit.pfe.serviceformation.dto.OneDriveItemDTO;
import okhttp3.Request;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Answers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("OneDriveService - Tests unitaires")
class OneDriveServiceTest {

    @Mock
    private MicrosoftGraphClientProvider graphProvider;

    @Mock(answer = Answers.RETURNS_DEEP_STUBS)
    private GraphServiceClient<Request> graphClient;

    @InjectMocks
    private OneDriveService oneDriveService;

    @BeforeEach
    void setUp() {
        lenient().when(graphProvider.getGraphClient()).thenReturn(graphClient);
    }

    @Test
    @DisplayName("uploadDocumentToFormationFolder - Devrait uploader un document")
    void shouldUploadDocument() {
        DriveItem mockRoot = new DriveItem();
        mockRoot.id = "ROOT";
        mockRoot.webUrl = "http://onedrive/file";
        
        lenient().when(graphClient.users(anyString()).drive().root().children().buildRequest().post(any()))
                .thenReturn(mockRoot);
                
        lenient().when(graphClient.users(anyString()).drive().items(anyString()).children().buildRequest().post(any()))
                .thenReturn(mockRoot);
                
        lenient().when(graphClient.users(anyString()).drive().items(anyString()).itemWithPath(anyString()).content().buildRequest().put(any()))
                .thenReturn(mockRoot);

        String url = oneDriveService.uploadDocumentToFormationFolder("form1", "PAYEMENT", "doc1", new byte[]{1,2}, "test.txt");
        assertThat(url).isEqualTo("http://onedrive/file");
    }

    @Test
    @DisplayName("downloadDocument - Devrait telecharger un document")
    void shouldDownloadDocument() throws Exception {
        InputStream is = new ByteArrayInputStream(new byte[]{1, 2, 3});
        lenient().when(graphClient.users(anyString()).drive().root().itemWithPath(anyString()).content().buildRequest().get())
                .thenReturn(is);

        byte[] result = oneDriveService.downloadDocument("form1", "PAYEMENT", "doc1", "test.txt");
        assertThat(result).hasSize(3);
    }

    @Test
    @DisplayName("deleteDocument - Devrait supprimer un document")
    void shouldDeleteDocument() {
        oneDriveService.deleteDocument("form1", "PAYEMENT", "doc1", "test.txt");
        verify(graphClient.users(anyString()).drive().root().itemWithPath(anyString()).buildRequest()).delete();
    }

    @Test
    @DisplayName("renameDocumentFolder - Devrait renommer un dossier")
    void shouldRenameFolder() {
        DriveItem mockItem = new DriveItem();
        mockItem.id = "FOLDER_ID";
        lenient().when(graphClient.users(anyString()).drive().root().itemWithPath(anyString()).buildRequest().get())
                .thenReturn(mockItem);

        oneDriveService.renameDocumentFolder("form1", "PAYEMENT", "oldName", "newName");
        verify(graphClient.users(anyString()).drive().items("FOLDER_ID").buildRequest()).patch(any());
    }

    @Test
    @DisplayName("getDriveHierarchy - Devrait lister la hierarchie")
    void shouldGetDriveHierarchy() {
        DriveItem mockRoot = new DriveItem();
        mockRoot.id = "ROOT";
        mockRoot.name = "d2F";
        mockRoot.folder = new com.microsoft.graph.models.Folder();
        
        lenient().when(graphClient.users(anyString()).drive().root().children().buildRequest().post(any()))
                .thenReturn(mockRoot);

        DriveItem childItem = new DriveItem();
        childItem.id = "FILE1";
        childItem.name = "test.txt";
        childItem.size = 100L;
        childItem.webUrl = "http://link";

        com.microsoft.graph.requests.DriveItemCollectionRequest req = mock(com.microsoft.graph.requests.DriveItemCollectionRequest.class);
        com.microsoft.graph.requests.DriveItemCollectionRequestBuilder builder = mock(com.microsoft.graph.requests.DriveItemCollectionRequestBuilder.class);
        DriveItemCollectionPage page = mock(DriveItemCollectionPage.class);
        
        lenient().when(page.getCurrentPage()).thenReturn(List.of(childItem));
        lenient().when(req.get()).thenReturn(page);
        lenient().when(builder.buildRequest()).thenReturn(req);
        lenient().when(graphClient.users(anyString()).drive().items(anyString()).children()).thenReturn(builder);

        List<OneDriveItemDTO> items = oneDriveService.getDriveHierarchy();
        assertThat(items).isNotEmpty();
    }

    @Test
    @DisplayName("getEmbedLink - Devrait generer un lien view")
    void shouldGetEmbedLink() {
        DriveItem fileItem = new DriveItem();
        fileItem.id = "FILE_ID";
        
        com.microsoft.graph.requests.DriveItemCollectionRequest req = mock(com.microsoft.graph.requests.DriveItemCollectionRequest.class);
        com.microsoft.graph.requests.DriveItemCollectionRequestBuilder builder = mock(com.microsoft.graph.requests.DriveItemCollectionRequestBuilder.class);
        DriveItemCollectionPage page = mock(DriveItemCollectionPage.class);
        
        lenient().when(page.getCurrentPage()).thenReturn(List.of(fileItem));
        lenient().when(req.get()).thenReturn(page);
        lenient().when(builder.buildRequest()).thenReturn(req);
        lenient().when(graphClient.users(anyString()).drive().root().itemWithPath(anyString()).children()).thenReturn(builder);

        Permission perm = new Permission();
        SharingLink link = new SharingLink();
        link.webUrl = "http://embed/link";
        perm.link = link;
        
        lenient().when(graphClient.users(anyString()).drive().items("FILE_ID").createLink(any()).buildRequest().post())
                .thenReturn(perm);

        String embed = oneDriveService.getEmbedLink("form1", "PAYEMENT", "doc1");
        assertThat(embed).isEqualTo("http://embed/link");
    }
}
