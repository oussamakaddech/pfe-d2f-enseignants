package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.Up;
import esprit.pfe.serviceformation.repositories.UpRepository;
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
public class UpService {
    private final UpRepository upRepository;

    public Page<Up> findAll(Pageable pageable) {
        return upRepository.findAll(pageable);
    }

    public List<Up> findAll() {
        return upRepository.findAll();
    }

    public Up findById(String id) {
        return upRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("UP introuvable : " + id));
    }

    public Up create(Up up) {
        return upRepository.save(up);
    }

    public Up update(String id, Up up) {
        Up existing = findById(id);
        existing.setLibelle(up.getLibelle());
        return upRepository.save(existing);
    }

    public void delete(String id) {
        upRepository.deleteById(id);
    }

    @Transactional
    public void importUpsFromExcel(MultipartFile file) throws IOException {
        Workbook wb = WorkbookFactory.create(file.getInputStream());
        Sheet sheet = wb.getSheetAt(0);
        DataFormatter formatter = new DataFormatter();  // <-- pour tout formater en String

        List<Up> list = new ArrayList<>();
        for (Row row : sheet) {
            if (row.getRowNum() > 0) {
                Cell idCell = row.getCell(0);
                Cell libCell = row.getCell(1);

                if (idCell != null && libCell != null) {
                    String id = formatter.formatCellValue(idCell).trim();
                    String libelle = libCell.getStringCellValue().trim();

                    if (!id.isEmpty() && !libelle.isEmpty()) {
                        Up up = new Up();
                        up.setId(id);
                        up.setLibelle(libelle);
                        list.add(up);
                    }
                }
            }
        }
        wb.close();

        if (!list.isEmpty()) {
            upRepository.saveAll(list);
        }
    }
}
