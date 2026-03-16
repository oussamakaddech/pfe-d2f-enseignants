package esprit.pfe.auth.error;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
public class CustomErrorResponse {
    private Integer status;
    private String error;
    private String errorCode;
    private String message;
    private String path;
    private String traceId;
    private String timestamp;
}
