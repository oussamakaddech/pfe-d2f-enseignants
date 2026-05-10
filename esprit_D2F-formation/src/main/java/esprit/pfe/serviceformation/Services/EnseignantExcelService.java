package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.repositories.DeptRepository;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import esprit.pfe.serviceformation.repositories.UpRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.security.SecureRandom;
import java.util.Iterator;

@Service
public class EnseignantExcelService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final EnseignantRepository enseignantRepository;
    private final DeptRepository deptRepository;
    private final UpRepository upRepository;

    public EnseignantExcelService(EnseignantRepository enseignantRepository, DeptRepository deptRepository, UpRepository upRepository) {
        this.enseignantRepository = enseignantRepository;
        this.deptRepository = deptRepository;
        this.upRepository = upRepository;
    }

    private String generateRandomId() {
        int number = RANDOM.nextInt(900_000_000) + 100_000_000;
        return "E" + number;
    }

    public void importEnseignantsFromExcel(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Le fichier est vide ou n'existe pas !");
        }
        try (InputStream is = file.getInputStream();
             Workbook wb = new XSSFWorkbook(is)) {

            Sheet sheet = wb.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            if (!rows.hasNext()) {
                throw new IllegalArgumentException("Le fichier est vide !");
            }
            // saute l'en-tête
            rows.next();

            DataFormatter formatter = new DataFormatter();

            while (rows.hasNext()) {
                Row row = rows.next();
                String firstCell = formatter.formatCellValue(row.getCell(0));
                if (firstCell.isBlank()) {
                    continue;  // ignore ligne vide
                }

                Enseignant e = new Enseignant();
                // ← on génère et assigne l'ID aléatoire
                e.setId(generateRandomId());

                // on remplit ensuite les autres champs
                e.setNom(    formatter.formatCellValue(row.getCell(0)).trim());
                e.setPrenom( formatter.formatCellValue(row.getCell(1)).trim());
                e.setMail(   formatter.formatCellValue(row.getCell(2)).trim());
                e.setType(   formatter.formatCellValue(row.getCell(3)).trim());
                e.setEtat(   formatter.formatCellValue(row.getCell(4)).trim());
                e.setCup(    formatter.formatCellValue(row.getCell(5)).trim());

                String deptId = formatter.formatCellValue(row.getCell(6)).trim();
                String upId   = formatter.formatCellValue(row.getCell(7)).trim();
                String chef   = formatter.formatCellValue(row.getCell(8)).trim();

                // association Département
                deptRepository.findById(deptId)
                        .ifPresentOrElse(e::setDept,
                                () -> { throw new IllegalArgumentException("Département introuvable : " + deptId); });

                // association UP
                upRepository.findById(upId)
                        .ifPresentOrElse(e::setUp,
                                () -> { throw new IllegalArgumentException("UP introuvable : " + upId); });

                e.setChefDepartement(chef);

                // enfin on sauvegarde
                enseignantRepository.save(e);
            }
        }
    }
}
