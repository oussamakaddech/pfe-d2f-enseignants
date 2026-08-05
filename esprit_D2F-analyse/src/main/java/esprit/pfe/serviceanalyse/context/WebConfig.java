package esprit.pfe.serviceanalyse.context;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final JwtForwardingInterceptor jwtForwardingInterceptor;

    public WebConfig(JwtForwardingInterceptor jwtForwardingInterceptor) {
        this.jwtForwardingInterceptor = jwtForwardingInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(jwtForwardingInterceptor);
    }
}
