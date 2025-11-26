package com.rbu.backend.controller;

import com.rbu.backend.Entities.FoodItem;
import com.rbu.backend.service.AnalyticsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {
    @Autowired
    private AnalyticsService analyticsService;

    @GetMapping("/bestsellers")
    public List<FoodItem> getBestsellers(@RequestParam(defaultValue = "5") int limit) {
        return analyticsService.getBestsellers(limit);
    }

    @GetMapping("/average-prep-time")
    public double getAveragePreparationTime() {
        return analyticsService.getAveragePreparationTime();
    }

    @GetMapping("/peak-hours")
    public Map<String, Long> getPeakHours() {
        return analyticsService.getPeakHours();
    }

    @GetMapping("/daily-orders")
    public Map<String, Long> getDailyOrders(@RequestParam(defaultValue = "7") int days) {
        return analyticsService.getDailyOrders(days);
    }

    @GetMapping("/revenue-trend")
    public Map<String, Double> getRevenueTrend(@RequestParam(defaultValue = "7") int days) {
        return analyticsService.getRevenueTrend(days);
    }
}
