package esprit.pfe.serviceformation.common;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Standardized paginated response wrapper.
 * Follows DSI standard format for API responses.
 * 
 * @param <T> Type of content items
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageResponse<T> {
    
    private List<T> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean first;
    private boolean last;
    private boolean empty;
    
    /**
     * Creates a PageResponse from a Spring Data Page.
     * 
     * @param page Spring Data Page
     * @param <T> Type of content
     * @return PageResponse wrapper
     */
    public static <T> PageResponse<T> from(Page<T> page) {
        return PageResponse.<T>builder()
                .content(page.getContent())
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .first(page.isFirst())
                .last(page.isLast())
                .empty(page.isEmpty())
                .build();
    }
    
    /**
     * Creates a PageResponse with custom content but page metadata.
     * Useful when content needs to be transformed before returning.
     * 
     * @param content Transformed content list
     * @param page Original page metadata
     * @param <T> Type of content
     * @return PageResponse wrapper
     */
    public static <T> PageResponse<T> of(List<T> content, Page<?> page) {
        return PageResponse.<T>builder()
                .content(content)
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .first(page.isFirst())
                .last(page.isLast())
                .empty(page.isEmpty())
                .build();
    }
}