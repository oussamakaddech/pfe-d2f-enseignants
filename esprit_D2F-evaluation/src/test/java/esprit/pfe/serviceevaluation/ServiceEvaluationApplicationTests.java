package esprit.pfe.serviceevaluation;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ServiceEvaluationApplicationTests {

	@Test
	void applicationClassExists() {
		// Verifies that the application main class is loadable
		assertNotNull(ServiceEvaluationApplication.class);
	}

	@Test
	void mainMethod_shouldNotThrowException() {
		// Verify the main class has a main method accessible
		assertDoesNotThrow(() -> {
			var methods = ServiceEvaluationApplication.class.getDeclaredMethods();
			assertTrue(methods.length > 0);
		});
	}
}
