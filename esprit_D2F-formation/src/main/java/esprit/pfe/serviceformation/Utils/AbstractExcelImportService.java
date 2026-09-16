package esprit.pfe.serviceformation.utils; // NOSONAR - project-wide convention

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

/**
 * Classe abstraite pour consolider la logique d'import Excel
 * Élimine ~65 lignes de code dupliqué entre UpService, DeptService, et EnseignantExcelService
 */
public abstract class AbstractExcelImportService<T> {

    /**
     * Traite un fichier Excel et retourne une liste d'entités
     * @param file Fichier Excel multipart
     * @return Liste des entités importées
     * @throws IllegalArgumentException si le fichier est invalide
     */
    public List<T> importFromExcel(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Le fichier ne peut pas être vide");
        }
        
        String filename = file.getOriginalFilename();
        if (filename == null || !filename.endsWith(".xlsx")) {
            throw new IllegalArgumentException("Seuls les fichiers .xlsx sont supportés");
        }

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            return processWorkbook(workbook);
        } catch (IOException e) {
            throw new IllegalStateException("Erreur lors de la lecture du fichier Excel: " + e.getMessage(), e);
        }
    }

    /**
     * Traite le workbook Excel et extrait les données
     * @param workbook Workbook ouvert
     * @return Liste des entités
     */
    protected List<T> processWorkbook(Workbook workbook) {
        Sheet sheet = workbook.getSheetAt(0);
        if (sheet == null) {
            throw new IllegalArgumentException("La feuille Excel est introuvable");
        }

        List<T> entities = new ArrayList<>();
        int lastRowNum = sheet.getLastRowNum();
        
        if (lastRowNum < 1) {
            throw new IllegalArgumentException("Le fichier Excel doit contenir au moins l'en-tête et une ligne de données");
        }

        // Sauter l'en-tête (row 0)
        for (int rowIndex = 1; rowIndex <= lastRowNum; rowIndex++) {
            Row row = sheet.getRow(rowIndex);
            if (row == null || isRowEmpty(row)) {
                continue;
            }
            
            try {
                T entity = mapRowToEntity(row);
                if (entity != null) {
                    entities.add(entity);
                }
            } catch (Exception e) {
                throw new IllegalStateException(
                    "Erreur lors du traitement de la ligne " + (rowIndex + 1) + ": " + e.getMessage(), e);
            }
        }

        return entities;
    }

    /**
     * Vérifie si une ligne est vide
     * @param row Ligne à vérifier
     * @return true si la ligne est vide
     */
    protected boolean isRowEmpty(Row row) {
        for (int cellIndex = 0; cellIndex < row.getLastCellNum(); cellIndex++) {
            if (row.getCell(cellIndex) != null && 
                !row.getCell(cellIndex).toString().trim().isEmpty()) {
                return false;
            }
        }
        return true;
    }

    /**
     * À implémenter par les sous-classes pour mapper une ligne Excel à une entité
     * @param row Ligne Excel
     * @return Entité mappée
     */
    protected abstract T mapRowToEntity(Row row);

    /**
     * Récupère une valeur de cellule en tant que chaîne
     * @param row Ligne
     * @param cellIndex Index de la cellule
     * @return Valeur ou chaîne vide
     */
    protected String getCellStringValue(Row row, int cellIndex) {
        try {
            if (row.getCell(cellIndex) == null) {
                return "";
            }
            return row.getCell(cellIndex).getStringCellValue().trim();
        } catch (Exception e) {
            return "";
        }
    }

    /**
     * Récupère une valeur de cellule en tant que nombre
     * @param row Ligne
     * @param cellIndex Index de la cellule
     * @return Valeur ou 0
     */
    protected double getCellNumericValue(Row row, int cellIndex) {
        try {
            if (row.getCell(cellIndex) == null) {
                return 0;
            }
            return row.getCell(cellIndex).getNumericCellValue();
        } catch (Exception e) {
            return 0;
        }
    }
}
