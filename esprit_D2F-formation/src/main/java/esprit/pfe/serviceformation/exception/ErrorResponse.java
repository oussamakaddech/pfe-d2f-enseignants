package esprit.pfe.serviceformation.exception;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ErrorResponse {
    private String timestamp;
    private int status;
    private String errorCode;
    private String message;
    private String path;
    private String traceId;
}
