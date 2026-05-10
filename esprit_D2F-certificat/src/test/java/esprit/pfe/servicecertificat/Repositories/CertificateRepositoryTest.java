package esprit.pfe.servicecertificat.repositories;

import esprit.pfe.servicecertificat.entities.Certificate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CertificateRepository - Tests unitaires")
class CertificateRepositoryTest {

    @Mock
    private CertificateRepository certificateRepository;

    private Certificate buildCertificate(Long id, Long formationId, String mail) {
        Certificate c = new Certificate();
        c.setIdCertificate(id);
        c.setFormationId(formationId);
        c.setTitreFormation("Formation Test");
        c.setTypeCertif("ATTESTATION");
        c.setDateDebutFormation(LocalDate.now());
        c.setDateFinFormation(LocalDate.now());
        c.setChargeHoraireGlobal(20);
        c.setEnseignantId("ENS001");
        c.setNomEnseignant("Dupont");
        c.setPrenomEnseignant("Jean");
        c.setMailEnseignant(mail);
        c.setRoleEnFormation("ANIMATEUR");
        c.setDelivered(false);
        return c;
    }

    @Test
    @DisplayName("findByFormationId retourne les certificats d'une formation")
    void shouldFindByFormationId() {
        Certificate c1 = buildCertificate(1L, 10L, "a@esprit.tn");
        Certificate c2 = buildCertificate(2L, 10L, "b@esprit.tn");
        when(certificateRepository.findByFormationId(10L)).thenReturn(List.of(c1, c2));

        List<Certificate> result = certificateRepository.findByFormationId(10L);

        assertThat(result)
                .hasSize(2)
                .allMatch(c -> c.getFormationId().equals(10L));
    }

    @Test
    @DisplayName("findByMailEnseignant retourne les certificats d'un enseignant")
    void shouldFindByMail() {
        Certificate c1 = buildCertificate(1L, 10L, "jean@esprit.tn");
        when(certificateRepository.findByMailEnseignant("jean@esprit.tn")).thenReturn(List.of(c1));

        List<Certificate> result = certificateRepository.findByMailEnseignant("jean@esprit.tn");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getMailEnseignant()).isEqualTo("jean@esprit.tn");
    }

    @Test
    @DisplayName("findById retourne un Optional vide si non trouvé")
    void shouldReturnEmptyWhenNotFound() {
        when(certificateRepository.findById(999L)).thenReturn(Optional.empty());

        Optional<Certificate> result = certificateRepository.findById(999L);

        assertThat(result).isEmpty();
    }
}
