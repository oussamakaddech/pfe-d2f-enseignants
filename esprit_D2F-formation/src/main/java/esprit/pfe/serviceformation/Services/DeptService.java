package esprit.pfe.serviceformation.Services;

import esprit.pfe.serviceformation.Entities.Dept;
import esprit.pfe.serviceformation.Repositories.DeptRepository;
import org.apache.poi.ss.usermodel.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
public class DeptService {
    @Autowired
    private DeptRepository deptRepository;



    @Transactional
    public void importDeptsFromExcel(MultipartFile file) throws IOException {
        Workbook wb = WorkbookFactory.create(file.getInputStream());
        Sheet sheet = wb.getSheetAt(0);
        DataFormatter formatter = new DataFormatter();

        List<Dept> list = new ArrayList<>();
        for (Row row : sheet) {
            if (row.getRowNum() == 0) continue;

            Cell idCell  = row.getCell(0);
            Cell nomCell = row.getCell(1);
            if (idCell == null || nomCell == null) continue;

            String id  = formatter.formatCellValue(idCell).trim();
            String nom = nomCell.getStringCellValue().trim();
            if (id.isEmpty() || nom.isEmpty()) continue;

            Dept dept = new Dept();
            dept.setId(id);   // String aussi ici
            dept.setLibelle(nom);
            list.add(dept);
        }
        wb.close();

        if (!list.isEmpty()) {
            deptRepository.saveAll(list);
        }
    }
}
