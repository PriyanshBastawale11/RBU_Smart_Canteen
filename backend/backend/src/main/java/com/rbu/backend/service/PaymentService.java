package com.rbu.backend.service;

import com.rbu.backend.Payment;
import com.rbu.backend.PaymentRepository;
import com.rbu.backend.Order;
import com.rbu.backend.OrderRepository;
import com.rbu.backend.service.CouponService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class PaymentService {
    @Autowired
    private PaymentRepository paymentRepository;
    @Autowired
    private OrderRepository orderRepository;
    @Autowired
    private CouponService couponService;

    public Payment createPayment(Long orderId, String method) {
        Order order = orderRepository.findById(orderId).orElseThrow();
        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setPaymentMethod(method);
        payment.setPaymentStatus("PENDING");
        payment.setPaymentTime(LocalDateTime.now());
        // Simulate Razorpay/mock payment
        if ("RAZORPAY".equalsIgnoreCase(method) || "MOCK".equalsIgnoreCase(method)) {
            payment.setPaymentStatus("SUCCESS");
            payment.setTransactionId("TXN-" + System.currentTimeMillis());
            // After successful payment, move order to PREPARING and generate coupon
            order.setStatus("PREPARING");
            orderRepository.save(order);
            couponService.generateForOrder(orderId);
        } else {
            payment.setPaymentStatus("FAILED");
        }
        return paymentRepository.save(payment);
    }

    public Optional<Payment> getPaymentByOrderId(Long orderId) {
        return Optional.ofNullable(paymentRepository.findByOrderId(orderId));
    }
}
