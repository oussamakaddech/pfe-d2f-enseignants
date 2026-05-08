package esprit.pfe.serviceformation.Examples; // NOSONAR - project-wide convention

import esprit.pfe.serviceformation.Utils.ValidationUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Exemple de refactoring utilisant les nouvelles classes utilitaires.
 * Ce fichier montre comment réduire le code boilerplate et améliorer la qualité.
 * 
 * À utiliser comme template pour migrer les services existants.
 */
@Component
public class RefactoringExample {

    private final ValidationUtils validation;

    @Autowired
    public RefactoringExample(ValidationUtils validation) {
        this.validation = validation;
    }

    /**
     * EXEMPLE 1: Simplification avec ValidationUtils
     * 
     * AVANT:
     * public void processUser(Long userId, String email) {
     *     if (userId == null || userId <= 0) {
     *         throw new IllegalArgumentException("userId doit être positif");
     *     }
     *     if (email == null || email.trim().isEmpty()) {
     *         throw new IllegalArgumentException("email ne peut pas être vide");
     *     }
     * }
     * 
     * APRÈS:
     */
    public void processUserExample(Long userId, String email) {
        validation.validId(userId, "userId");
        validation.notBlank(email, "email");
        // ... suite du code
    }

    /**
     * EXEMPLE 2: Standardisation des exceptions avec ExceptionUtils
     * 
     * AVANT:
     * public void deleteUser(Long userId) {
     *     User user = userRepository.findById(userId)
     *             .orElseThrow(() -> new RuntimeException("User not found"));
     *     try {
     *         userRepository.delete(user);
     *     } catch (Exception e) {
     *         throw new RuntimeException("Erreur lors de la suppression");
     *     }
     * }
     * 
     * APRÈS:
     */
    // See Javadoc above for usage examples of ExceptionUtils.orElseThrow()

    /**
     * EXEMPLE 3: Consolidation d'imports Excel
     * 
     * AVANT (45 lignes):
     * public List<Department> importFromExcel(MultipartFile file) {
     *     if (file == null || file.isEmpty()) {
     *         throw new IllegalArgumentException("Fichier vide");
     *     }
     *     if (!file.getOriginalFilename().endsWith(".xlsx")) {
     *         throw new IllegalArgumentException("Format invalide");
     *     }
     *     try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
     *         Sheet sheet = workbook.getSheetAt(0);
     *         List<Department> depts = new ArrayList<>();
     *         for (int i = 1; i <= sheet.getLastRowNum(); i++) {
     *             Row row = sheet.getRow(i);
     *             Department dept = new Department();
     *             dept.setName(row.getCell(0).getStringCellValue());
     *             depts.add(dept);
     *         }
     *         return depts;
     *     } catch (IOException e) {
     *         throw new IllegalStateException("Erreur lecture", e);
     *     }
     * }
     * 
     * APRÈS (10 lignes):
     * public class DepartmentExcelService extends AbstractExcelImportService<Department> {
     *     @Override
     *     protected Department mapRowToEntity(Row row) {
     *         Department dept = new Department();
     *         dept.setName(getCellStringValue(row, 0));
     *         return dept;
     *     }
     * }
     */

    /**
     * Checklist pour refactoring:
     * 
     * ✅ 1. Ajouter @Autowired ValidationUtils dans le service
     * ✅ 2. Remplacer tous les null checks par validation.notNull()
     * ✅ 3. Remplacer tous les isEmpty checks par validation.notEmpty()
     * ✅ 4. Remplacer tous les orElseThrow par ExceptionUtils.orElseThrow()
     * ✅ 5. Remplacer les try-catch générique par spécifique
     * ✅ 6. Supprimer le code commenté
     * ✅ 7. Ajouter @Transactional aux méthodes multi-étapes
     * ✅ 8. Tester le service refactorisé
     * ✅ 9. Vérifier SonarQube
     * ✅ 10. Documenter les changements
     */
}
