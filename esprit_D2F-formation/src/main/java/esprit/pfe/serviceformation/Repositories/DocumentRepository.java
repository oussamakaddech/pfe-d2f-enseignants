package esprit.pfe.serviceformation.Repositories;

import esprit.pfe.serviceformation.Entities.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByFormation_IdFormation(Long formationId);
}
