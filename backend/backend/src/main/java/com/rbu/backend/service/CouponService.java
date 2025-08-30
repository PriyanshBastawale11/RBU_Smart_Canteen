package com.rbu.backend.service;

import com.rbu.backend.Coupon;
import com.rbu.backend.CouponRepository;
import com.rbu.backend.Order;
import com.rbu.backend.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;

@Service
public class CouponService {
    @Autowired
    private CouponRepository couponRepository;

    @Autowired
    private OrderRepository orderRepository;

    private static final String ALPHANUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing chars
    private static final SecureRandom RAND = new SecureRandom();

    public Coupon generateForOrder(Long orderId) {
        Coupon existing = couponRepository.findByOrderId(orderId);
        if (existing != null) return existing;
        Order order = orderRepository.findById(orderId).orElseThrow();
        Coupon coupon = new Coupon();
        coupon.setOrder(order);
        coupon.setCode(generateCode(orderId));
        coupon.setCreatedAt(LocalDateTime.now());
        return couponRepository.save(coupon);
    }

    public Coupon getByOrderId(Long orderId) {
        return couponRepository.findByOrderId(orderId);
    }

    public Coupon getByCode(String code) { return couponRepository.findByCode(code); }

    private String generateCode(Long orderId) {
        StringBuilder sb = new StringBuilder("RBU");
        sb.append("-").append(orderId);
        sb.append("-");
        for (int i = 0; i < 6; i++) {
            sb.append(ALPHANUM.charAt(RAND.nextInt(ALPHANUM.length())));
        }
        return sb.toString().toUpperCase(Locale.ROOT);
    }
}
