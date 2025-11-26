package com.rbu.backend.controller;

import com.rbu.backend.Entities.Order;
import com.rbu.backend.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
public class OrderController {
    @Autowired
    private OrderService orderService;

    @GetMapping("/user/{userId}")
    public List<Order> getOrdersByUser(@PathVariable Long userId) {
        return orderService.getOrdersByUser(userId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Order> getOrderById(@PathVariable Long id) {
        return orderService.getOrderById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Order placeOrder(@RequestBody Map<String, Object> payload) {
        Long userId = Long.valueOf(payload.get("userId").toString());
        List<Integer> foodItemIds = (List<Integer>) payload.get("foodItemIds");
        List<Long> ids = foodItemIds.stream().map(Integer::longValue).toList();
        return orderService.placeOrder(userId, ids);
    }

    @PutMapping("/{orderId}/status")
    public Order updateOrderStatus(@PathVariable Long orderId, @RequestParam String status) {
        return orderService.updateOrderStatus(orderId, status);
    }

    @GetMapping
    public List<Order> getAllOrders() {
        return orderService.getAllOrders();
    }

    @GetMapping("/{orderId}/wait-time")
    public long getEstimatedWaitTime(@PathVariable Long orderId) {
        return orderService.getEstimatedWaitTime(orderId);
    }

    @GetMapping("/queue-size")
    public long getQueueSize() {
        return orderService.getQueueSize();
    }
}
