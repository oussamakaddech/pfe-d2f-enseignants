package esprit.pfe.serviceformation.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * P3 - F4 : corps de la requête de traitement en lot d'inscriptions.
 * {@code motif} n'est interprété que lorsque {@code approuver=false}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TraiterDemandeBulkRequest {
    private List<Long> ids;
    private boolean approuver;
    private String motif;
}
