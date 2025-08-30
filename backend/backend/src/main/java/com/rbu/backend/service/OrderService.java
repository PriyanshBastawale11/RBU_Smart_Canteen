package com.rbu.backend.service;

import com.rbu.backend.Order;
import com.rbu.backend.OrderRepository;
import com.rbu.backend.FoodItem;
import com.rbu.backend.FoodItemRepository;
import com.rbu.backend.User;
import com.rbu.backend.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class OrderService {
    @Autowired
    private OrderRepository orderRepository;
    @Autowired
    private FoodItemRepository foodItemRepository;
    @Autowired
    private UserRepository userRepository;

    public List<Order> getOrdersByUser(Long userId) {
        return orderRepository.findByUserId(userId);
    }

    public Optional<Order> getOrderById(Long id) {
        return orderRepository.findById(id);
    }

    public Order placeOrder(Long userId, List<Long> foodItemIds) {
        User user = userRepository.findById(userId).orElseThrow();
        List<FoodItem> items = foodItemRepository.findAllById(foodItemIds);
        double total = items.stream().mapToDouble(FoodItem::getPrice).sum();
        Order order = new Order();
        order.setUser(user);
        order.setItems(items);
        order.setTotalAmount(total);
        order.setStatus("PLACED");
        order.setOrderTime(LocalDateTime.now());
        return orderRepository.save(order);
    }

    public Order updateOrderStatus(Long orderId, String status) {
        return orderRepository.findById(orderId).map(order -> {
            order.setStatus(status);
            if (status.equals("COMPLETED") || status.equals("CANCELLED")) {
                order.setCompletedTime(LocalDateTime.now());
            }
            return orderRepository.save(order);
        }).orElseThrow();
    }

    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    public long getEstimatedWaitTime(Long orderId) {
        Optional<Order> targetOpt = orderRepository.findById(orderId);
        if (targetOpt.isEmpty()) return 0L;
        Order target = targetOpt.get();

        // If order is not active anymore, no wait time
        if (!("PLACED".equals(target.getStatus()) || "PREPARING".equals(target.getStatus()))) {
            return 0L;
        }

        // Consider only active orders up to and including the target order, ordered by time
        LocalDateTime targetTime = target.getOrderTime();
        List<Order> activeOrders = orderRepository.findAll().stream()
            .filter(o -> "PLACED".equals(o.getStatus()) || "PREPARING".equals(o.getStatus()))
            .sorted(Comparator.comparing(Order::getOrderTime))
            .toList();

        return activeOrders.stream()
            .filter(o -> o.getOrderTime() != null && !o.getOrderTime().isAfter(targetTime))
            .mapToInt(o -> o.getItems().stream().mapToInt(FoodItem::getEstimatedPrepTime).sum())
            .sum();
    }

    public long getQueueSize() {
        return orderRepository.findAll().stream()
            .filter(o -> o.getStatus().equals("PLACED") || o.getStatus().equals("PREPARING"))
            .count();
    }
}
