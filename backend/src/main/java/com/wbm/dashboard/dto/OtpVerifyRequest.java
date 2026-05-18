package com.wbm.dashboard.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OtpVerifyRequest {
    @NotBlank
    private String tempToken;

    @NotBlank
    private String code;
}
