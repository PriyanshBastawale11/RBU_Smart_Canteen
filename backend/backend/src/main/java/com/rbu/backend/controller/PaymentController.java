package com.rbu.backend.controller;

import com.rbu.backend.Entities.Coupon;
import com.rbu.backend.Entities.Order;
import com.rbu.backend.Entities.Payment;
import com.rbu.backend.Repository.OrderRepository;
import com.rbu.backend.service.PaymentService;
import com.rbu.backend.service.CouponService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {
    @Autowired
    private PaymentService paymentService;
    @Autowired
    private CouponService couponService;
    @Autowired
    private OrderRepository orderRepository;

    @PostMapping
    public Map<String, Object> createPayment(@RequestBody Map<String, Object> payload) {
        Long orderId = Long.valueOf(payload.get("orderId").toString());
        String method = payload.get("method").toString();
        Payment payment = paymentService.createPayment(orderId, method);
        Coupon coupon = couponService.getByOrderId(orderId);
        Order order = orderRepository.findById(orderId).orElse(null);
        Map<String, Object> resp = new HashMap<>();
        resp.put("paymentStatus", payment.getPaymentStatus());
        resp.put("transactionId", payment.getTransactionId());
        resp.put("orderId", orderId);
        resp.put("couponCode", coupon != null ? coupon.getCode() : null);
        if (order != null) {
            Map<String, Object> summary = new HashMap<>();
            summary.put("totalAmount", order.getTotalAmount());
            summary.put("status", order.getStatus());
            resp.put("orderSummary", summary);
        }
        return resp;
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<Payment> getPaymentByOrderId(@PathVariable Long orderId) {
        return paymentService.getPaymentByOrderId(orderId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/razorpay/order")
    public ResponseEntity<Map<String, Object>> createRazorpayOrder(@RequestBody Map<String, Object> payload) {
        try {
            Long orderId = Long.valueOf(payload.get("orderId").toString());
            System.out.println("[PAY] createRazorpayOrder orderId=" + orderId);
            Map<String, Object> data = paymentService.createRazorpayOrder(orderId);
            return ResponseEntity.ok(data);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/razorpay/verify")
    public ResponseEntity<Map<String, Object>> verifyRazorpay(@RequestBody Map<String, Object> payload) {
        try {
            Long orderId = Long.valueOf(payload.get("orderId").toString());
            String razorpayOrderId = payload.get("razorpayOrderId").toString();
            String razorpayPaymentId = payload.get("razorpayPaymentId").toString();
            String razorpaySignature = payload.get("razorpaySignature").toString();

            System.out.println("[PAY] verifyRazorpay orderId=" + orderId + " rzpOrderId=" + razorpayOrderId);
            Map<String, Object> resp = paymentService.verifyRazorpayPayment(orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature);
            Coupon coupon = couponService.getByOrderId(orderId);
            resp.put("couponCode", coupon != null ? coupon.getCode() : null);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
