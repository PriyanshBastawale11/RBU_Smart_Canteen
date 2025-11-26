package com.rbu.backend.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import com.rbu.backend.Entities.OtpToken;

import java.util.Optional;

public interface OtpTokenRepository extends JpaRepository<OtpToken, Long> {
    Optional<OtpToken> findByEmail(String email);
    Optional<OtpToken> findByVerificationId(String verificationId);
    @Transactional
    @Modifying
    void deleteByEmail(String email);
}
