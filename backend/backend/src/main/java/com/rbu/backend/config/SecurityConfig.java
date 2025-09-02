package com.rbu.backend.config;

import com.rbu.backend.service.CustomUserDetailsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import java.util.Arrays;

@Configuration
public class SecurityConfig {
    @Autowired
    private CustomUserDetailsService userDetailsService;
    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        // Supports encoded passwords with prefixes like {bcrypt}, {noop}, etc.
        // Also add a fallback so legacy bcrypt hashes without a prefix still match.
        DelegatingPasswordEncoder encoder = (DelegatingPasswordEncoder) PasswordEncoderFactories.createDelegatingPasswordEncoder();
        encoder.setDefaultPasswordEncoderForMatches(new BCryptPasswordEncoder());
        return encoder;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(request -> {
                CorsConfiguration config = new CorsConfiguration();
                config.setAllowedOrigins(Arrays.asList(
                    "https://rbu-smart-canteen.vercel.app",
                    "http://localhost:3000"
                ));
                config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"));
                config.setAllowedHeaders(Arrays.asList(
                    "Origin", "Content-Type", "Accept", "Authorization",
                    "X-Requested-With", "Access-Control-Allow-Origin",
                    "Access-Control-Allow-Headers", "Access-Control-Allow-Credentials"
                ));
                config.setExposedHeaders(Arrays.asList(
                    "Authorization", "Content-Type", "Access-Control-Allow-Origin",
                    "Access-Control-Allow-Headers", "Access-Control-Allow-Credentials"
                ));
                config.setAllowCredentials(true);
                config.setMaxAge(3600L);
                return config;
            }))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Public (no auth) endpoints
                .requestMatchers("/api/auth/**", "/swagger-ui/**", "/v3/api-docs/**").permitAll()

                // Menu endpoints: GET for any authenticated user; write operations for ADMIN/STAFF
                .requestMatchers(HttpMethod.GET, "/api/menu/**").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/menu/**").hasAnyRole("ADMIN", "STAFF")
                .requestMatchers(HttpMethod.PUT, "/api/menu/**").hasAnyRole("ADMIN", "STAFF")
                .requestMatchers(HttpMethod.PATCH, "/api/menu/**").hasAnyRole("ADMIN", "STAFF")
                .requestMatchers(HttpMethod.DELETE, "/api/menu/**").hasAnyRole("ADMIN", "STAFF")

                // Orders: students place and view their orders; staff/admin manage statuses and list all
                .requestMatchers(HttpMethod.POST, "/api/orders").hasRole("STUDENT")
                .requestMatchers(HttpMethod.GET, "/api/orders/user/**").hasRole("STUDENT")
                .requestMatchers(HttpMethod.PUT, "/api/orders/*/status").hasAnyRole("ADMIN", "STAFF")
                .requestMatchers(HttpMethod.GET, "/api/orders").hasAnyRole("ADMIN", "STAFF")
                .requestMatchers(HttpMethod.GET, "/api/orders/queue-size").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/orders/*/wait-time").authenticated()

                // Recommendations, analytics, payments, coupons accessible to any authenticated user
                .requestMatchers("/api/recommendations/**").authenticated()
                .requestMatchers("/api/analytics/**").authenticated()
                .requestMatchers("/api/payments/**").authenticated()
                .requestMatchers("/api/coupons/**").authenticated()

                // Role-scoped namespaces if used elsewhere
                .requestMatchers("/api/admin/**").hasAnyRole("ADMIN", "STAFF")
                .requestMatchers("/api/student/**").hasRole("STUDENT")

                // Everything else requires authentication
                .anyRequest().authenticated()
            )
            .userDetailsService(userDetailsService)
            .authenticationProvider(authenticationProvider());
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
