package com.rbu.backend;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CouponRepository extends JpaRepository<Coupon, Long> {
    Coupon findByOrderId(Long orderId);
    Coupon findByCode(String code);
}
