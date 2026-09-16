
package com.example.servicegateway.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class GatewayRefreshSchedulerTest {

    private final GatewayRefreshScheduler scheduler = new GatewayRefreshScheduler();

    @Test
    void refreshGatewayStateShouldNotThrow() {
        assertDoesNotThrow(scheduler::refreshGatewayState);
    }
}
