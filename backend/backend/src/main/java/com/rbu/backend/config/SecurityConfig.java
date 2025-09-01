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
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
public class SecurityConfig {

    @Autowired private CustomUserDetailsService userDetailsService;
    @Autowired private JwtAuthenticationFilter jwtAuthenticationFilter;
    @Autowired private CorsConfigurationSource corsConfigurationSource;

    @Bean
    public PasswordEncoder passwordEncoder() {
        DelegatingPasswordEncoder enc =
                (DelegatingPasswordEncoder) PasswordEncoderFactories.createDelegatingPasswordEncoder();
        enc.setDefaultPasswordEncoderForMatches(new BCryptPasswordEncoder());
        return enc;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration cfg) throws Exception {
        return cfg.getAuthenticationManager();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider p = new DaoAuthenticationProvider();
        p.setUserDetailsService(userDetailsService);
        p.setPasswordEncoder(passwordEncoder());
        return p;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            // IMPORTANT: wire the bean so Spring Security uses your CorsConfiguration
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()         // preflight
                .requestMatchers("/", "/health", "/api/health", "/error").permitAll
                ()
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                .requestMatchers("/api/auth/**").permitAll()                     // OTP/login endpoints

                // Menu: GET authenticated; writes restricted
                .requestMatchers(HttpMethod.GET, "/api/menu/**").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/menu/**").hasAnyRole("ADMIN","STAFF")
                .requestMatchers(HttpMethod.PUT, "/api/menu/**").hasAnyRole("ADMIN","STAFF")
                .requestMatchers(HttpMethod.PATCH, "/api/menu/**").hasAnyRole("ADMIN","STAFF")
                .requestMatchers(HttpMethod.DELETE, "/api/menu/**").hasAnyRole("ADMIN","STAFF")

                // Orders
                .requestMatchers(HttpMethod.POST, "/api/orders").hasRole("STUDENT")
                .requestMatchers(HttpMethod.GET, "/api/orders/user/**").hasRole("STUDENT")
                .requestMatchers(HttpMethod.PUT, "/api/orders/*/status").hasAnyRole("ADMIN","STAFF")
                .requestMatchers(HttpMethod.GET, "/api/orders").hasAnyRole("ADMIN","STAFF")
                .requestMatchers(HttpMethod.GET, "/api/orders/queue-size").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/orders/*/wait-time").authenticated()

                // Other namespaces
                .requestMatchers("/api/recommendations/**").authenticated()
                .requestMatchers("/api/analytics/**").authenticated()
                .requestMatchers("/api/payments/**").authenticated()
                .requestMatchers("/api/coupons/**").authenticated()
                .requestMatchers("/api/admin/**").hasAnyRole("ADMIN","STAFF")
                .requestMatchers("/api/student/**").hasRole("STUDENT")

                .anyRequest().authenticated()
            )
            .userDetailsService(userDetailsService)
            .authenticationProvider(authenticationProvider());

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}