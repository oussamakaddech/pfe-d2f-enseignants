package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.DocumentDTO;
import esprit.pfe.serviceformation.entities.Document;
import esprit.pfe.serviceformation.entities.Formation;
import org.junit.jupiter.api.Test;
import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import static org.junit.jupiter.api.Assertions.*;

class DocumentMapperTest {

    @Test
    void testMapToDTO() {
        Document doc = new Document();
        doc.setIdDocument(1L);
        doc.setNomDocument("Doc");
        doc.setObligation(true);
        
        Formation f = new Formation();
        f.setIdFormation(10L);
        f.setTitreFormation("Formation 1");
        doc.setFormation(f);

        DocumentDTO dto = DocumentMapper.mapToDTO(doc);
        
        assertEquals(1L, dto.getIdDocument());
        assertEquals("Doc", dto.getNomDocument());
        assertTrue(dto.isObligation());
        assertEquals(10L, dto.getFormationId());
        assertEquals("Formation 1", dto.getFormationTitre());
    }

    @Test
    void testConstructor() throws Exception {
        Constructor<DocumentMapper> constructor = DocumentMapper.class.getDeclaredConstructor();
        assertTrue(java.lang.reflect.Modifier.isPrivate(constructor.getModifiers()));
        constructor.setAccessible(true);
        constructor.newInstance(); // Call private constructor
    }
}
