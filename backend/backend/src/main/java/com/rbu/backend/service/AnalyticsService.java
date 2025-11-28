package com.rbu.backend.service;

import com.rbu.backend.Entities.FoodItem;
import com.rbu.backend.Entities.Order;
import com.rbu.backend.Entities.AnalyticsSettings;
import com.rbu.backend.Repository.FoodItemRepository;
import com.rbu.backend.Repository.OrderRepository;
import com.rbu.backend.Repository.AnalyticsSettingsRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {
    @Autowired
    private FoodItemRepository foodItemRepository;
    @Autowired
    private OrderRepository orderRepository;
    @Autowired
    private AnalyticsSettingsRepository analyticsSettingsRepository;

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

    public List<FoodItem> getBestsellers(int limit) {
        // Compute real-time counts based on actual orders (exclude CANCELLED)
        Map<Long, Long> counts = new HashMap<>();
        orderRepository.findAll().stream()
                .filter(o -> o.getItems() != null && !"CANCELLED".equals(o.getStatus()))
                .forEach(o -> o.getItems().forEach(item ->
                        counts.merge(item.getId(), 1L, (a, b) -> a + b)));

        if (counts.isEmpty()) {
            return foodItemRepository.findAll().stream()
                    .sorted(Comparator.comparingInt(FoodItem::getTotalOrders).reversed())
                    .limit(limit)
                    .collect(Collectors.toList());
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
        LocalDateTime cutoff = analyticsSettingsRepository.findById(1L)
                .map(AnalyticsSettings::getAvgResetAfter)
                .orElse(null);
        List<Order> completedOrders = orderRepository.findAll().stream()
                .filter(o -> o.getStatus().equals("COMPLETED") && o.getCompletedTime() != null)
                .filter(o -> cutoff == null || !o.getCompletedTime().isBefore(cutoff))
                .collect(Collectors.toList());
        if (completedOrders.isEmpty()) return 0;
        double totalMinutes = completedOrders.stream()
                .mapToLong(o -> java.time.Duration.between(o.getOrderTime(), o.getCompletedTime()).toMinutes())
                .sum();
        return totalMinutes / completedOrders.size();
    }

    private String formatHourLabel(int hour) {
        int display = hour % 12;
        if (display == 0) display = 12;
        String ampm = hour < 12 ? "AM" : "PM";
        return display + " " + ampm;
    }

    public void resetAveragePreparation() {
        AnalyticsSettings s = analyticsSettingsRepository.findById(1L).orElseGet(() -> {
            AnalyticsSettings ns = new AnalyticsSettings();
            ns.setId(1L);
            return ns;
        });
        s.setAvgResetAfter(LocalDateTime.now(IST));
        analyticsSettingsRepository.save(s);
    }

    public Map<String, Long> getPeakHours() {
        // Aggregate all non-cancelled orders by 2-hour buckets (IST) in the last 7 days for real-time view
        LocalDate threshold = LocalDate.now(IST).minusDays(6);
        List<Order> considered = orderRepository.findAll().stream()
                .filter(o -> o.getOrderTime() != null)
                .filter(o -> !"CANCELLED".equals(o.getStatus()))
                .filter(o -> {
                    ZonedDateTime zdt = o.getOrderTime()
                            .atZone(ZoneId.systemDefault())
                            .withZoneSameInstant(IST);
                    return !zdt.toLocalDate().isBefore(threshold);
                })
                .toList();
        Map<String, Long> hourCounts = considered.stream()
                .collect(Collectors.groupingBy(
                        o -> {
                            ZonedDateTime zdt = o.getOrderTime()
                                    .atZone(ZoneId.systemDefault())
                                    .withZoneSameInstant(IST);
                            int start = (zdt.getHour() / 2) * 2;
                            int end = (start + 2) % 24;
                            return formatHourLabel(start) + " - " + formatHourLabel(end);
                        },
                        Collectors.counting()
                ));
        return hourCounts;
    }

    public Map<String, Long> getDailyOrders(int days) {
        LocalDate today = LocalDate.now(IST);
        Map<String, Long> result = new LinkedHashMap<>();
        for (int i = days - 1; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            result.put(d.toString(), 0L);
        }
        orderRepository.findAll().stream()
                .filter(o -> o.getOrderTime() != null)
                .forEach(o -> {
                    ZonedDateTime zdt = o.getOrderTime()
                            .atZone(ZoneId.systemDefault())
                            .withZoneSameInstant(IST);
                    String key = zdt.toLocalDate().toString();
                    if (result.containsKey(key)) {
                        result.put(key, result.get(key) + 1);
                    }
                });
        return result;
    }

    public Map<String, Double> getRevenueTrend(int days) {
        LocalDate today = LocalDate.now(IST);
        Map<String, Double> result = new LinkedHashMap<>();
        for (int i = days - 1; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            result.put(d.toString(), 0.0);
        }
        orderRepository.findAll().stream()
                .filter(o -> o.getCompletedTime() != null && "COMPLETED".equals(o.getStatus()))
                .forEach(o -> {
                    ZonedDateTime zdt = o.getCompletedTime()
                            .atZone(ZoneId.systemDefault())
                            .withZoneSameInstant(IST);
                    String key = zdt.toLocalDate().toString();
                    if (result.containsKey(key)) {
                        result.put(key, result.get(key) + o.getTotalAmount());
                    }
                });
        return result;
    }
}