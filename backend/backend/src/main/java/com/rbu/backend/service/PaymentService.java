package com.rbu.backend.service;

import com.rbu.backend.Entities.Order;
import com.rbu.backend.Entities.Payment;
import com.rbu.backend.Repository.OrderRepository;
import com.rbu.backend.Repository.PaymentRepository;
import com.rbu.backend.service.CouponService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import com.razorpay.RazorpayClient;
import com.razorpay.Utils;
import org.json.JSONObject;
import java.util.HashMap;
import java.util.Map;

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

    @Value("${razorpay.keyId:}")
    private String razorpayKeyId;

    @Value("${razorpay.keySecret:}")
    private String razorpayKeySecret;

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

    public Map<String, Object> createRazorpayOrder(Long orderId) throws Exception {
        Order order = orderRepository.findById(orderId).orElseThrow();
        if (razorpayKeyId == null || razorpayKeyId.isBlank() || razorpayKeySecret == null || razorpayKeySecret.isBlank()) {
            throw new IllegalStateException("Razorpay keys are not configured");
        }
        RazorpayClient client = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
        JSONObject options = new JSONObject();
        options.put("amount", (int) Math.round(order.getTotalAmount() * 100)); // in paise
        options.put("currency", "INR");
        options.put("receipt", "rcpt_" + orderId);
        options.put("payment_capture", 1);
        com.razorpay.Order rpOrder = client.orders.create(options);

        Payment payment = paymentRepository.findByOrderId(orderId);
        if (payment == null) {
            payment = new Payment();
            payment.setOrder(order);
        }
        payment.setPaymentMethod("RAZORPAY");
        payment.setPaymentStatus("PENDING");
        payment.setTransactionId(rpOrder.get("id")); // store Razorpay order id initially
        payment.setPaymentTime(LocalDateTime.now());
        paymentRepository.save(payment);

        Map<String, Object> resp = new HashMap<>();
        resp.put("razorpayOrderId", rpOrder.get("id"));
        resp.put("amount", rpOrder.get("amount"));
        resp.put("currency", rpOrder.get("currency"));
        resp.put("keyId", razorpayKeyId);
        resp.put("orderId", orderId);
        return resp;
    }

    public Map<String, Object> verifyRazorpayPayment(Long orderId, String razorpayOrderId, String razorpayPaymentId, String razorpaySignature) throws Exception {
        if (razorpayKeySecret == null || razorpayKeySecret.isBlank()) {
            throw new IllegalStateException("Razorpay secret is not configured");
        }
        JSONObject attributes = new JSONObject();
        attributes.put("razorpay_order_id", razorpayOrderId);
        attributes.put("razorpay_payment_id", razorpayPaymentId);
        attributes.put("razorpay_signature", razorpaySignature);

        boolean valid = Utils.verifyPaymentSignature(attributes, razorpayKeySecret);
        Map<String, Object> resp = new HashMap<>();
        if (valid) {
            Order order = orderRepository.findById(orderId).orElseThrow();
            Payment payment = paymentRepository.findByOrderId(orderId);
            if (payment == null) {
                payment = new Payment();
                payment.setOrder(order);
            }
            payment.setPaymentMethod("RAZORPAY");
            payment.setPaymentStatus("SUCCESS");
            payment.setTransactionId(razorpayPaymentId);
            payment.setPaymentTime(LocalDateTime.now());
            paymentRepository.save(payment);

            // Move order to PREPARING and generate a coupon
            order.setStatus("PREPARING");
            orderRepository.save(order);
            couponService.generateForOrder(orderId);

            resp.put("paymentStatus", payment.getPaymentStatus());
            resp.put("transactionId", payment.getTransactionId());
            resp.put("orderId", orderId);
            Map<String, Object> summary = new HashMap<>();
            summary.put("totalAmount", order.getTotalAmount());
            summary.put("status", order.getStatus());
            resp.put("orderSummary", summary);
        } else {
            resp.put("paymentStatus", "FAILED");
        }
        return resp;
    }

    public Optional<Payment> getPaymentByOrderId(Long orderId) {
        return Optional.ofNullable(paymentRepository.findByOrderId(orderId));
    }
}