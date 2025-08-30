package com.rbu.backend.controller;

import com.rbu.backend.User;
import com.rbu.backend.UserRepository;
import com.rbu.backend.util.JwtUtil;
import com.rbu.backend.OtpToken;
import com.rbu.backend.OtpTokenRepository;
import com.rbu.backend.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.time.LocalDateTime;
import java.util.Random;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @Autowired
    private AuthenticationManager authenticationManager; // retained for future use if switching back
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private JwtUtil jwtUtil;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private OtpTokenRepository otpTokenRepository;
    @Autowired
    private EmailService emailService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload) {
        String identifier = payload.get("username"); // frontend sends 'username' field; treat as username or email
        String password = payload.get("password");
        if (identifier == null || password == null) {
            return ResponseEntity.badRequest().body("Missing username/email or password");
        }
        final String idValue = identifier.trim();

        User user = userRepository.findByUsernameIgnoreCase(idValue)
                .orElseGet(() -> userRepository.findByEmailIgnoreCase(idValue).orElse(null));
        if (user == null) {
            return ResponseEntity.status(401).body("Invalid username or password");
        }

        // Prefer direct password check with configured PasswordEncoder to avoid provider misconfig
        if (!passwordEncoder.matches(password, user.getPassword())) {
            return ResponseEntity.status(401).body("Invalid username or password");
        }
        if (!user.isEnabled()) {
            throw new BadCredentialsException("Account is not verified");
        }
        String token = jwtUtil.generateToken(user.getUsername());
        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("roles", user.getRoles());
        response.put("email", user.getEmail());
        response.put("username", user.getUsername());
        response.put("id", user.getId());
        return ResponseEntity.ok(response);
    }

    // Step 1: Request OTP with email only
    @PostMapping("/request-otp")
    @Transactional
    public ResponseEntity<?> requestOtp(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        if (email == null) {
            return ResponseEntity.badRequest().body("Missing email");
        }
        if (!email.toLowerCase().endsWith("@rknec.edu")) {
            return ResponseEntity.badRequest().body("Email must be an @rknec.edu address");
        }
        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.badRequest().body("Email already registered");
        }
        // Generate OTP and store
        String otp = String.format("%06d", new Random().nextInt(1_000_000));
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(10);
        otpTokenRepository.findByEmail(email).ifPresent(t -> otpTokenRepository.deleteByEmail(email));
        OtpToken token = new OtpToken();
        token.setEmail(email);
        token.setOtp(otp);
        token.setCreatedAt(LocalDateTime.now());
        token.setExpiresAt(expiresAt);
        otpTokenRepository.save(token);
        Map<String, Object> resp = new HashMap<>();
        try {
            emailService.sendOtp(email, otp);
            resp.put("message", "OTP sent to email. Expires in 10 minutes.");
            resp.put("emailSent", true);
        } catch (Exception ex) {
            // In dev environments without SMTP, allow flow to proceed.
            // The OTP is stored in DB; you can inspect logs/DB to retrieve if needed.
            System.err.println("Failed to send OTP email: " + ex.getMessage());
            resp.put("message", "OTP generated. Email sending failed (dev). Please check mail config.");
            resp.put("emailSent", false);
        }
        return ResponseEntity.ok(resp);
    }

    // Step 2: Verify OTP; issue a verificationId
    @PostMapping("/verify-otp")
    @Transactional
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String otp = payload.get("otp");
        if (email == null || otp == null) {
            return ResponseEntity.badRequest().body("Missing email or otp");
        }
        OtpToken token = otpTokenRepository.findByEmail(email).orElse(null);
        if (token == null) {
            return ResponseEntity.badRequest().body("No OTP requested for this email");
        }
        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            otpTokenRepository.deleteByEmail(email);
            return ResponseEntity.badRequest().body("OTP expired. Please request again.");
        }
        if (!token.getOtp().equals(otp)) {
            return ResponseEntity.badRequest().body("Invalid OTP");
        }
        // Mark verified and issue verificationId
        token.setVerificationId(UUID.randomUUID().toString());
        token.setVerifiedAt(LocalDateTime.now());
        otpTokenRepository.save(token);
        Map<String, Object> resp = new HashMap<>();
        resp.put("verificationId", token.getVerificationId());
        resp.put("message", "Email verified. Complete registration.");
        return ResponseEntity.ok(resp);
    }

    // Step 3: Complete registration with username/password using verificationId
    @PostMapping("/complete-registration")
    @Transactional
    public ResponseEntity<?> completeRegistration(@RequestBody Map<String, String> payload) {
        try {
            System.out.println("Complete registration payload: " + payload);
            String verificationId = payload.get("verificationId");
            String username = payload.get("username");
            String password = payload.get("password");
            
            if (verificationId == null || username == null || password == null) {
                String error = "Missing required fields. verificationId: " + (verificationId != null ? "present" : "null") + 
                             ", username: " + (username != null ? "present" : "null") + 
                             ", password: " + (password != null ? "present" : "null");
                System.err.println(error);
                return ResponseEntity.badRequest().body(error);
            }
            
            if (userRepository.findByUsername(username).isPresent()) {
                System.err.println("Username already exists: " + username);
                return ResponseEntity.badRequest().body("Username already exists");
            }
            
            OtpToken token = otpTokenRepository.findByVerificationId(verificationId).orElse(null);
            if (token == null || token.getVerifiedAt() == null) {
                System.err.println("Invalid or unverified token. Token exists: " + (token != null));
                return ResponseEntity.badRequest().body("Invalid or expired verification. Please try the OTP process again.");
            }
            
            try {
                // Create user
                User user = new User();
                user.setUsername(username);
                user.setEmail(token.getEmail());
                user.setPassword(passwordEncoder.encode(password));
                user.setFullName(username);
                user.setRoles(Set.of("STUDENT"));
                user.setEnabled(true);
                
                System.out.println("Saving user: " + user.getUsername() + ", email: " + user.getEmail());
                userRepository.save(user);
                System.out.println("User saved successfully");
                
                // Cleanup token
                otpTokenRepository.deleteByEmail(token.getEmail());
                System.out.println("OTP token cleaned up");
                
                Map<String, Object> resp = new HashMap<>();
                resp.put("message", "Account created. You can now login.");
                return ResponseEntity.ok(resp);
                
            } catch (Exception e) {
                System.err.println("Error during user creation: " + e.getMessage());
                e.printStackTrace();
                return ResponseEntity.status(500).body("Error creating user: " + e.getMessage());
            }
            
        } catch (Exception e) {
            System.err.println("Unexpected error in completeRegistration: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("An unexpected error occurred. Please try again.");
        }
    }
}
