
package com.example.servicegateway;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ServiceGatewayApplicationMainTest {

    @Test
    void mainShouldNotThrowWhenCalledWithArgs() {
        // Calling main in a test context will attempt to start Spring,
        // so we test that the class can be instantiated and the main method exists.
        assertDoesNotThrow(() -> {
            ServiceGatewayApplication.main(new String[]{"--spring.main.allow-bean-definition-overriding=true"});
        });
    }
}
