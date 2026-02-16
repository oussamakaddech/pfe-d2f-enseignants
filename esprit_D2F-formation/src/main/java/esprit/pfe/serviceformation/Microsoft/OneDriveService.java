package esprit.pfe.serviceformation.Microsoft;

import com.microsoft.graph.models.DriveItem;
import com.microsoft.graph.models.DriveItemCreateLinkParameterSet;
import com.microsoft.graph.models.Folder;
import com.microsoft.graph.models.Permission;
import com.microsoft.graph.requests.GraphServiceClient;
import esprit.pfe.serviceformation.DTO.OneDriveItemDTO;
import okhttp3.Request;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class OneDriveService {

    @Autowired
    private MicrosoftGraphClientProvider graphProvider;

    private static final String ROOT_FOLDER_NAME = "d2F";
    private static final String USER_EMAIL       = "Application.Formationdesformateurs@Esprit.tn";

    /**
     * Upload vers : d2F/{formation}/{pathType}/{nomDocument}/{originalFileName}
     */
    public String uploadDocumentToFormationFolder(
            String formation,
            String pathType,
            String nomDocument,
            byte[] fileContent,
            String originalFileName
    ) {
        GraphServiceClient<Request> client = graphProvider.getGraphClient();

        // 1) Crée / récupère d2F
        DriveItem root = ensureFolder(client, null, ROOT_FOLDER_NAME, USER_EMAIL);
        // 2) Crée / récupère formation
        DriveItem lvl1 = ensureFolder(client, root.id, formation, USER_EMAIL);
        // 3) Crée / récupère pathType (PAYEMENT|CNFCPP|DOCUMENT)
        DriveItem lvl2 = ensureFolder(client, lvl1.id, pathType, USER_EMAIL);
        // 4) Crée / récupère nomDocument
        DriveItem lvl3 = ensureFolder(client, lvl2.id, nomDocument, USER_EMAIL);
        // 5) Upload du fichier
        // 2) Nettoyage du nom de fichier
        String safeFileName = originalFileName == null
                ? "file"
                : originalFileName.trim();

        DriveItem uploaded = client.users(USER_EMAIL)
                .drive()
                .items(lvl3.id)
                .itemWithPath(safeFileName)
                .content()
                .buildRequest()
                .put(fileContent);


        return uploaded.webUrl;
    }

    /**
     * Télécharge le fichier depuis : d2F/{formation}/{pathType}/{nomDocument}/{originalFileName}
     */
    public byte[] downloadDocument(
            String formation,
            String pathType,
            String nomDocument,
            String originalFileName
    ) {
        GraphServiceClient<Request> client = graphProvider.getGraphClient();
        String path = String.join("/",
                ROOT_FOLDER_NAME,
                formation,
                pathType,
                nomDocument,
                originalFileName
        );

        try (InputStream in = client.users(USER_EMAIL)
                .drive()
                .root()
                .itemWithPath(path)
                .content()
                .buildRequest()
                .get();
             ByteArrayOutputStream buf = new ByteArrayOutputStream()
        ) {
            in.transferTo(buf);
            return buf.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Erreur download OneDrive", e);
        }
    }

    /**
     * Supprime le fichier sur : d2F/{formation}/{pathType}/{nomDocument}/{originalFileName}
     */
    public void deleteDocument(
            String formation,
            String pathType,
            String nomDocument,
            String originalFileName
    ) {
        GraphServiceClient<Request> client = graphProvider.getGraphClient();
        String path = String.join("/",
                ROOT_FOLDER_NAME,
                formation,
                pathType,
                nomDocument,
                originalFileName
        );
        try {
            client.users(USER_EMAIL)
                    .drive()
                    .root()
                    .itemWithPath(path)
                    .buildRequest()
                    .delete();
        } catch (Exception e) {
            System.err.println("Erreur delete OneDrive: " + e.getMessage());
        }
    }

    /**
     * Renomme le dossier d2F/{formation}/{pathType}/{oldNom} → newNom
     */
    public void renameDocumentFolder(
            String formation,
            String pathType,
            String oldNom,
            String newNom
    ) {
        GraphServiceClient<Request> client = graphProvider.getGraphClient();
        String folderPath = String.join("/",
                ROOT_FOLDER_NAME,
                formation,
                pathType,
                oldNom
        );

        // Récupère l’item du dossier
        DriveItem folder = client.users(USER_EMAIL)
                .drive()
                .root()
                .itemWithPath(folderPath)
                .buildRequest()
                .get();

        // Patch du nom
        DriveItem update = new DriveItem();
        update.name = newNom;
        client.users(USER_EMAIL)
                .drive()
                .items(folder.id)
                .buildRequest()
                .patch(update);
    }

    /**
     * Arborescence complète à partir de d2F
     */
    public List<OneDriveItemDTO> getDriveHierarchy() {
        GraphServiceClient<Request> client = graphProvider.getGraphClient();
        DriveItem root = ensureFolder(client, null, ROOT_FOLDER_NAME, USER_EMAIL);
        return listChildrenRecursively(root.id, USER_EMAIL, ROOT_FOLDER_NAME);
    }

    /**
     * Arborescence sous d2F/{formation}
     */
    public List<OneDriveItemDTO> getFormationHierarchy(String formation) {
        GraphServiceClient<Request> client = graphProvider.getGraphClient();
        DriveItem root  = ensureFolder(client, null, ROOT_FOLDER_NAME, USER_EMAIL);
        DriveItem promo = ensureFolder(client, root.id, formation, USER_EMAIL);
        return listChildrenRecursively(promo.id, USER_EMAIL, formation);
    }

    // ====================
    // Internals
    // ====================

    private DriveItem ensureFolder(
            GraphServiceClient<Request> client,
            String parentId,
            String folderName,
            String userEmail
    ) {
        // 1) Nettoyage du nom (supprime espaces début/fin)
        String safeName = folderName == null
                ? ""
                : folderName.trim();   // ou .strip() en Java 11+

        DriveItem folder = new DriveItem();
        folder.name   = safeName;
        folder.folder = new Folder();
        folder.additionalDataManager()
                .put("@microsoft.graph.conflictBehavior",
                        new com.google.gson.JsonPrimitive("replace"));

        if (parentId == null) {
            return client.users(userEmail)
                    .drive()
                    .root()
                    .children()
                    .buildRequest()
                    .post(folder);
        } else {
            return client.users(userEmail)
                    .drive()
                    .items(parentId)
                    .children()
                    .buildRequest()
                    .post(folder);
        }
    }

    private List<OneDriveItemDTO> listChildrenRecursively(
            String folderId,
            String userEmail,
            String currentFolderName
    ) {
        GraphServiceClient<Request> client = graphProvider.getGraphClient();
        List<DriveItem> items = client.users(userEmail)
                .drive()
                .items(folderId)
                .children()
                .buildRequest()
                .get()
                .getCurrentPage();

        List<OneDriveItemDTO> list = new ArrayList<>();
        for (DriveItem item : items) {
            OneDriveItemDTO dto = new OneDriveItemDTO();
            dto.setId(item.id);
            dto.setName(item.name);
            dto.setParentName(currentFolderName);
            boolean isFolder = item.folder != null;
            dto.setFolder(isFolder);

            if (isFolder) {
                dto.setChildren(
                        listChildrenRecursively(item.id, userEmail, item.name)
                );
            } else {
                dto.setDownloadUrl(item.webUrl);
                dto.setFileSize(item.size);
            }
            list.add(dto);
        }
        return list;
    }

    /**
     * Génère un lien “view” anonyme pour le premier fichier
     * dans d2F/{formation}/{pathType}/{nomDocument}
     */
    public String getEmbedLink(String formation, String pathType, String nomDocument) {
        GraphServiceClient<Request> client = graphProvider.getGraphClient();
        String folderPath = String.join("/",
                ROOT_FOLDER_NAME,
                formation,
                pathType,
                nomDocument
        );
        List<DriveItem> files = client.users(USER_EMAIL)
                .drive()
                .root()
                .itemWithPath(folderPath)
                .children()
                .buildRequest()
                .get()
                .getCurrentPage();

        if (files.isEmpty()) {
            throw new RuntimeException("Aucun fichier dans " + folderPath);
        }

        DriveItem fichier = files.get(0);
        Permission perm = client.users(USER_EMAIL)
                .drive()
                .items(fichier.id)
                .createLink(DriveItemCreateLinkParameterSet
                        .newBuilder()
                        .withType("view")
                        .withScope("anonymous")
                        .build())
                .buildRequest()
                .post();

        return perm.link.webUrl;
    }
}
