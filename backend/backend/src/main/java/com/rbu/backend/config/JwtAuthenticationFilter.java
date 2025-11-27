package com.rbu.backend.config;

import com.rbu.backend.service.CustomUserDetailsService;
import com.rbu.backend.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    @Autowired
    private JwtUtil jwtUtil;
    @Autowired
    private CustomUserDetailsService userDetailsService;

    // Helper to decide if this path should be skipped by the JWT filter
    private boolean shouldSkip(HttpServletRequest request) {
        String path = request.getRequestURI();
        // Skip authentication for Razorpay order/verify endpoints
        if (path.startsWith("/api/payments/razorpay/") || path.equals("/api/payments/razorpay/order") || path.equals("/api/payments/razorpay/verify")) {
            return true;
        }
        // Skip debug endpoints if you add any
        if (path.startsWith("/debug/")) {
            return true;
        }
        return false;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        try {
            // Basic request logging for debugging
            String reqPath = request.getRequestURI();
            String method = request.getMethod();
            String authHeaderPreview = request.getHeader("Authorization") != null ? "present" : "absent";
            System.out.println("[JWT-FILTER] Incoming request: method=" + method + " path=" + reqPath + " Authorization=" + authHeaderPreview);

            // If this endpoint should be skipped, just continue the chain
            if (shouldSkip(request)) {
                System.out.println("[JWT-FILTER] Skipping JWT processing for path=" + reqPath);
                filterChain.doFilter(request, response);
                return;
            }

            final String authHeader = request.getHeader("Authorization");
            String username = null;
            String jwt = null;

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                jwt = authHeader.substring(7);
                try {
                    username = jwtUtil.extractUsername(jwt);
                } catch (Exception ex) {
                    // Log extraction errors so we can see invalid token reasons in Render logs
                    System.out.println("[JWT-FILTER] Failed to extract username from JWT: " + ex.getMessage());
                    ex.printStackTrace(System.out);
                }
            } else {
                // No Authorization header: log this (useful for curl tests)
                System.out.println("[JWT-FILTER] No Authorization Bearer header present for path=" + reqPath);
            }

            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                try {
                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                    boolean valid = jwtUtil.validateToken(jwt, userDetails.getUsername());
                    if (valid) {
                        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities());
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                        System.out.println("[JWT-FILTER] Authentication set for user=" + username);
                    } else {
                        System.out.println("[JWT-FILTER] JWT validation failed for user=" + username);
                    }
                } catch (Exception ex) {
                    // If user lookup or validation throws, log it and continue the chain
                    System.out.println("[JWT-FILTER] Exception during authentication for username=" + username + " : " + ex.getMessage());
                    ex.printStackTrace(System.out);
                }
            }

        } catch (Exception ex) {
            // Catch-all to ensure filter never breaks the chain silently
            System.out.println("[JWT-FILTER] Unexpected error: " + ex.getMessage());
            ex.printStackTrace(System.out);
        }

        // always continue the filter chain
        filterChain.doFilter(request, response);
    }
}
