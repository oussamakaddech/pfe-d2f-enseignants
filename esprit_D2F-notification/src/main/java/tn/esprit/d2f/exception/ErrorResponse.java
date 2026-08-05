package tn.esprit.d2f.exception;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class ErrorResponse {
    private Instant timestamp;
    private int status;
    private String errorCode;
    private String message;
    private String path;
    private String traceId;
}