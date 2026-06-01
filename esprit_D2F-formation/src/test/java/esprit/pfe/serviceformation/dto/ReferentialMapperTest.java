package esprit.pfe.serviceformation.dto;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import esprit.pfe.serviceformation.entities.Bureau;
import esprit.pfe.serviceformation.entities.Dept;
import esprit.pfe.serviceformation.entities.Up;

/**
 * Blocker DSI #7 : garantit que les données de référence sont exposées via DTO
 * (pas d'entité JPA brute) et que le mapping copie bien les champs publics.
 */
class ReferentialMapperTest {

    @Test
    void toBureauDTO_copiesFields() {
        Bureau b = new Bureau();
        b.setId(1L);
        b.setNom("Bureau A");
        b.setEmail("a@esprit.tn");
        b.setNumeroTelephone("123");

        BureauDTO dto = ReferentialMapper.toBureauDTO(b);

        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getNom()).isEqualTo("Bureau A");
        assertThat(dto.getEmail()).isEqualTo("a@esprit.tn");
        assertThat(dto.getNumeroTelephone()).isEqualTo("123");
    }

    @Test
    void toDeptDTO_copiesFields() {
        Dept d = new Dept();
        d.setId("D1");
        d.setLibelle("Génie Info");

        DeptDTO dto = ReferentialMapper.toDeptDTO(d);

        assertThat(dto.getId()).isEqualTo("D1");
        assertThat(dto.getLibelle()).isEqualTo("Génie Info");
    }

    @Test
    void toUpDTO_copiesFields() {
        Up u = new Up();
        u.setId("U1");
        u.setLibelle("UP Réseaux");

        UpDTO dto = ReferentialMapper.toUpDTO(u);

        assertThat(dto.getId()).isEqualTo("U1");
        assertThat(dto.getLibelle()).isEqualTo("UP Réseaux");
    }

    @Test
    void mappers_returnNull_forNullInput() {
        assertThat(ReferentialMapper.toBureauDTO(null)).isNull();
        assertThat(ReferentialMapper.toDeptDTO(null)).isNull();
        assertThat(ReferentialMapper.toUpDTO(null)).isNull();
    }
}
