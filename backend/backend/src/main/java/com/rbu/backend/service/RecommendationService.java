package com.rbu.backend.service;

import com.rbu.backend.Entities.FoodItem;
import com.rbu.backend.Entities.Order;
import com.rbu.backend.Repository.FoodItemRepository;
import com.rbu.backend.Repository.OrderRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class RecommendationService {
    @Autowired
    private OrderRepository orderRepository;
    @Autowired
    private FoodItemRepository foodItemRepository;

    public List<FoodItem> getMostOrderedToday(int limit) {
        LocalDate today = LocalDate.now();
        List<Order> todaysOrders = orderRepository.findAll().stream()
                .filter(o -> o.getOrderTime() != null && o.getOrderTime().toLocalDate().equals(today))
                .collect(Collectors.toList());
        Map<FoodItem, Long> counts = todaysOrders.stream()
                .flatMap(o -> o.getItems().stream())
                .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));
        return counts.entrySet().stream()
                .sorted(Map.Entry.<FoodItem, Long>comparingByValue().reversed())
                .limit(limit)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
    }

    public List<FoodItem> getFrequentlyOrderedWith(Long foodItemId, int limit) {
        List<Order> allOrders = orderRepository.findAll();
        Map<Long, Long> coCounts = new HashMap<>();
        for (Order order : allOrders) {
            if (order.getItems() == null || order.getItems().isEmpty()) continue;
            Set<Long> ids = order.getItems().stream().map(FoodItem::getId).collect(Collectors.toSet());
            if (!ids.contains(foodItemId)) continue;
            for (Long id : ids) {
                if (Objects.equals(id, foodItemId)) continue;
                coCounts.merge(id, 1L, Long::sum);
            }
        }
        return coCounts.entrySet().stream()
                .sorted(Map.Entry.<Long, Long>comparingByValue().reversed())
                .limit(limit)
                .map(e -> foodItemRepository.findById(e.getKey()).orElse(null))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }
}