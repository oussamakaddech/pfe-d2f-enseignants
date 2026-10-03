package com.example.servicegateway.config;

import org.junit.jupiter.api.Test;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class HttpClientDnsConfigTest {

    @Test
    void remplaceLeResolveurParDefautParUnCacheDnsPlafonne() {
        HttpClient base = HttpClient.create();
        HttpClient customized = new HttpClientDnsConfig()
                .dnsCacheTtlCustomizer(Duration.ofSeconds(10))
                .customize(base);

        assertThat(customized.configuration().resolver())
                .isNotNull()
                .isNotSameAs(base.configuration().resolver());
    }
}
