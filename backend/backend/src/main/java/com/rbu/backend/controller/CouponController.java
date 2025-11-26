package com.rbu.backend.controller;

import com.rbu.backend.Entities.Coupon;
import com.rbu.backend.service.CouponService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/coupons")
public class CouponController {
    @Autowired
    private CouponService couponService;

    @GetMapping("/order/{orderId}")
    public ResponseEntity<Coupon> getByOrder(@PathVariable Long orderId) {
        Coupon c = couponService.getByOrderId(orderId);
        if (c == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(c);
    }

    @GetMapping("/{code}")
    public ResponseEntity<Coupon> getByCode(@PathVariable String code) {
        Coupon c = couponService.getByCode(code);
        if (c == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(c);
    }
}
