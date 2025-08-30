package com.rbu.backend.service;

import com.rbu.backend.FoodItem;
import com.rbu.backend.FoodItemRepository;
import com.rbu.backend.Order;
import com.rbu.backend.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {
    @Autowired
    private FoodItemRepository foodItemRepository;
    @Autowired
    private OrderRepository orderRepository;

    public List<FoodItem> getBestsellers(int limit) {
        // Compute real-time counts based on actual orders (exclude CANCELLED)
        Map<Long, Long> counts = new HashMap<>();
        orderRepository.findAll().stream()
                .filter(o -> o.getItems() != null && !"CANCELLED".equals(o.getStatus()))
                .forEach(o -> o.getItems().forEach(item ->
                        counts.merge(item.getId(), 1L, (a, b) -> a + b)));

        if (counts.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> topIds = counts.entrySet().stream()
                .sorted(Map.Entry.<Long, Long>comparingByValue().reversed())
                .limit(limit)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());

        // Fetch items and preserve ranking order
        Map<Long, FoodItem> byId = foodItemRepository.findAllById(topIds).stream()
                .collect(Collectors.toMap(FoodItem::getId, fi -> fi));
        return topIds.stream()
                .map(byId::get)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    public double getAveragePreparationTime() {
        List<Order> completedOrders = orderRepository.findAll().stream()
                .filter(o -> o.getStatus().equals("COMPLETED") && o.getCompletedTime() != null)
                .collect(Collectors.toList());
        if (completedOrders.isEmpty()) return 0;
        double totalMinutes = completedOrders.stream()
                .mapToLong(o -> java.time.Duration.between(o.getOrderTime(), o.getCompletedTime()).toMinutes())
                .sum();
        return totalMinutes / completedOrders.size();
    }

    public Map<String, Long> getPeakHours() {
        // Group completed orders by hour
        List<Order> completedOrders = orderRepository.findAll().stream()
                .filter(o -> o.getStatus().equals("COMPLETED") && o.getCompletedTime() != null)
                .collect(Collectors.toList());
        Map<String, Long> hourCounts = completedOrders.stream()
                .collect(Collectors.groupingBy(
                        o -> String.format("%02d:00", o.getOrderTime().getHour()),
                        Collectors.counting()
                ));
        return hourCounts;
    }

    public Map<String, Long> getDailyOrders(int days) {
        LocalDate today = LocalDate.now();
        Map<String, Long> result = new LinkedHashMap<>();
        for (int i = days - 1; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            result.put(d.toString(), 0L);
        }
        orderRepository.findAll().stream()
                .filter(o -> o.getOrderTime() != null)
                .forEach(o -> {
                    String key = o.getOrderTime().toLocalDate().toString();
                    if (result.containsKey(key)) {
                        result.put(key, result.get(key) + 1);
                    }
                });
        return result;
    }

    public Map<String, Double> getRevenueTrend(int days) {
        LocalDate today = LocalDate.now();
        Map<String, Double> result = new LinkedHashMap<>();
        for (int i = days - 1; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            result.put(d.toString(), 0.0);
        }
        orderRepository.findAll().stream()
                .filter(o -> o.getCompletedTime() != null && "COMPLETED".equals(o.getStatus()))
                .forEach(o -> {
                    String key = o.getCompletedTime().toLocalDate().toString();
                    if (result.containsKey(key)) {
                        result.put(key, result.get(key) + o.getTotalAmount());
                    }
                });
        return result;
    }
}
