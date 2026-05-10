package esprit.pfe.serviceformation.exception;

import esprit.pfe.serviceformation.entities.Enseignant;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ExceptionCoverageTest {

    @Test
    void testEnseignantConflictException() {
        Enseignant e = new Enseignant();
        e.setNom("Nom");
        e.setPrenom("Prenom");
        e.setMail("mail@test.com");
        
        EnseignantConflictException ex = new EnseignantConflictException("FORMATEUR", e, "2026-05-10", "09:00", "12:00", "Formation 1");
        
        assertEquals("FORMATEUR", ex.getRole());
        assertEquals("Nom", ex.getEnseignantNom());
        assertEquals("Prenom", ex.getEnseignantPrenom());
        assertEquals("mail@test.com", ex.getEnseignantMail());
        assertEquals("2026-05-10", ex.getDateSeance());
        assertEquals("09:00", ex.getHeureDebut());
        assertEquals("12:00", ex.getHeureFin());
        assertEquals("Formation 1", ex.getFormationTitre());
        assertTrue(ex.getMessage().contains("Conflit FORMATEUR"));
    }

    @Test
    void testExcelImportException() {
        ExcelImportException ex = new ExcelImportException("Error message");
        assertEquals("Error message", ex.getMessage());
        
        ExcelImportException ex2 = new ExcelImportException("Error message", new RuntimeException("cause"));
        assertEquals("Error message", ex2.getMessage());
        assertEquals("cause", ex2.getCause().getMessage());
    }

    @Test
    void testResourceNotFoundException() {
        ResourceNotFoundException ex = new ResourceNotFoundException("Not found");
        assertEquals("Not found", ex.getMessage());
    }

    @Test
    void testSalleConflictException() {
        SalleConflictException ex = new SalleConflictException("Salle 1", "2026-05-10", "09:00", "12:00");
        assertEquals("Salle 1", ex.getSalle());
        assertEquals("2026-05-10", ex.getDate());
        assertEquals("09:00", ex.getHeureDebut());
        assertEquals("12:00", ex.getHeureFin());
    }
}
