package com.wbm.dashboard.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "omie")
@Getter
@Setter
public class OmieConfig {
    private String appKey;
    private String appSecret;
    private String baseUrl;
}
