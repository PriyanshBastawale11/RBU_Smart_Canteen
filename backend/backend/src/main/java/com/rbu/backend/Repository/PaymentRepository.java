package com.rbu.backend.Repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.rbu.backend.Entities.Payment;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Payment findByOrderId(Long orderId);
}