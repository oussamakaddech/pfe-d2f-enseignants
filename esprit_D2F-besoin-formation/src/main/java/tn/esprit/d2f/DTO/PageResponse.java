package tn.esprit.d2f.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Enveloppe paginée canonique (Fix 7 — DSI §API).
 *
 * <p>Remplace le format Spring {@code Page<T>} brut qui expose une structure
 * {@code "pageable"} verbeuse non conforme au contrat API DSI.</p>
 *
 * <p>Format de réponse :</p>
 * <pre>
 * {
 *   "content": [...],
 *   "page": 0,
 *   "size": 10,
 *   "totalElements": 150,
 *   "totalPages": 15,
 *   "first": true,
 *   "last": false
 * }
 * </pre>
 *
 * @param <T> type des éléments de la page
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Réponse paginée canonique conforme au contrat DSI")
public class PageResponse<T> {

    @Schema(description = "Éléments de la page courante")
    private List<T> content;

    @Schema(description = "Index de la page (base 0)", example = "0")
    private int page;

    @Schema(description = "Taille demandée de la page", example = "10")
    private int size;

    @Schema(description = "Nombre total d'éléments toutes pages confondues", example = "150")
    private long totalElements;

    @Schema(description = "Nombre total de pages", example = "15")
    private int totalPages;

    @Schema(description = "Indique si c'est la première page", example = "true")
    private boolean first;

    @Schema(description = "Indique si c'est la dernière page", example = "false")
    private boolean last;

    /**
     * Factory method — convertit un {@link Page} Spring Data en {@link PageResponse}.
     *
     * @param springPage la page Spring à convertir
     * @param <T>        type des éléments
     * @return l'enveloppe canonique
     */
    public static <T> PageResponse<T> of(Page<T> springPage) {
        return PageResponse.<T>builder()
                .content(springPage.getContent())
                .page(springPage.getNumber())
                .size(springPage.getSize())
                .totalElements(springPage.getTotalElements())
                .totalPages(springPage.getTotalPages())
                .first(springPage.isFirst())
                .last(springPage.isLast())
                .build();
    }
}
