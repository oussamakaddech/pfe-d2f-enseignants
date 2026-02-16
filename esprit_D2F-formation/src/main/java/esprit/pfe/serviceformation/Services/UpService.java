package esprit.pfe.serviceformation.Services;

import esprit.pfe.serviceformation.Entities.Up;
import esprit.pfe.serviceformation.Repositories.UpRepository;
import org.apache.poi.ss.usermodel.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
public class UpService {
@Autowired
    private  UpRepository upRepository;

    @Transactional
    public void importUpsFromExcel(MultipartFile file) throws IOException {
        Workbook wb = WorkbookFactory.create(file.getInputStream());
        Sheet sheet = wb.getSheetAt(0);
        DataFormatter formatter = new DataFormatter();  // <-- pour tout formater en String

        List<Up> list = new ArrayList<>();
        for (Row row : sheet) {
            if (row.getRowNum() == 0) continue;  // en-tête

            Cell idCell  = row.getCell(0);
            Cell libCell = row.getCell(1);
            if (idCell == null || libCell == null) continue;

            String id       = formatter.formatCellValue(idCell).trim();
            String libelle  = libCell.getStringCellValue().trim();
            if (id.isEmpty() || libelle.isEmpty()) continue;

            Up up = new Up();
            up.setId(id);          // maintenant String
            up.setLibelle(libelle);
            list.add(up);
        }
        wb.close();

        if (!list.isEmpty()) {
            upRepository.saveAll(list);
        }
    }
}
