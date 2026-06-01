package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.Dept;
import esprit.pfe.serviceformation.repositories.DeptRepository;
import org.apache.poi.ss.usermodel.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import lombok.RequiredArgsConstructor;

import jakarta.persistence.EntityNotFoundException;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DeptService {
    private final DeptRepository deptRepository;

    public Page<Dept> findAll(Pageable pageable) {
        return deptRepository.findAll(pageable);
    }

    public List<Dept> findAll() {
        return deptRepository.findAll();
    }

    public Dept findById(String id) {
        return deptRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Département introuvable : " + id));
    }

    public Dept create(Dept dept) {
        return deptRepository.save(dept);
    }

    public Dept update(String id, Dept dept) {
        Dept existing = findById(id);
        existing.setLibelle(dept.getLibelle());
        return deptRepository.save(existing);
    }

    public void delete(String id) {
        deptRepository.deleteById(id);
    }

    @Transactional
    public void importDeptsFromExcel(MultipartFile file) throws IOException {
        try (Workbook wb = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);
            DataFormatter formatter = new DataFormatter();
            List<Dept> list = new ArrayList<>();

            for (Row row : sheet) {
                if (row.getRowNum() > 0) {
                    Cell idCell = row.getCell(0);
                    Cell nomCell = row.getCell(1);

                    if (idCell != null && nomCell != null) {
                        String id = formatter.formatCellValue(idCell).trim();
                        String nom = nomCell.getStringCellValue().trim();

                        if (!id.isEmpty() && !nom.isEmpty()) {
                            Dept dept = new Dept();
                            dept.setId(id);
                            dept.setLibelle(nom);
                            list.add(dept);
                        }
                    }
                }
            }

            if (!list.isEmpty()) {
                deptRepository.saveAll(list);
            }
        }
    }
}