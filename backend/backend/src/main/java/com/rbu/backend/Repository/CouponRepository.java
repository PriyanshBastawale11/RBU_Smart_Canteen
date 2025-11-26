package com.rbu.backend.Repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.rbu.backend.Entities.Coupon;

public interface CouponRepository extends JpaRepository<Coupon, Long> {
    Coupon findByOrderId(Long orderId);
    Coupon findByCode(String code);
}