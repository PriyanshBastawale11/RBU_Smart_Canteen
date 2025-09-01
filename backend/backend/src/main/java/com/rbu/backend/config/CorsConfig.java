package com.rbu.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
public class CorsConfig {

    @Value("${app.cors.allowed-origins:https://rbu-smart-canteen.netlify.app}")
    private String allowedOrigins;

    // e.g. "https://*.netlify.app"
    @Value("${app.cors.allowed-origin-patterns:}")
    private String allowedOriginPatterns;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();

        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.toList());
        List<String> patterns = Arrays.stream(allowedOriginPatterns.split(","))
                .map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.toList());

        // Use exact origins if provided
        if (!origins.isEmpty()) {
            cfg.setAllowedOrigins(origins);
        }
        // And optionally allow wildcard patterns (for Netlify previews, etc.)
        if (!patterns.isEmpty()) {
            cfg.setAllowedOriginPatterns(patterns);
        }

        // Let the browser negotiate whatever it needs for preflight
        cfg.setAllowedMethods(List.of("*"));            // allow GET/POST/PUT/PATCH/DELETE/OPTIONS
        cfg.setAllowedHeaders(List.of("*"));            // allow all requested headers
        cfg.setExposedHeaders(List.of("Authorization","Content-Disposition"));
        cfg.setAllowCredentials(false);                 // keep false if you use Bearer tokens (no cookies)
        cfg.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }
}
