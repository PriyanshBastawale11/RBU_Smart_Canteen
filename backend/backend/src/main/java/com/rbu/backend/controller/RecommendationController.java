package com.rbu.backend.controller;

import com.rbu.backend.Entities.FoodItem;
import com.rbu.backend.service.RecommendationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recommendations")
public class RecommendationController {
    @Autowired
    private RecommendationService recommendationService;

    @GetMapping("/most-ordered-today")
    public List<FoodItem> getMostOrderedToday(@RequestParam(defaultValue = "5") int limit) {
        return recommendationService.getMostOrderedToday(limit);
    }

    @GetMapping("/frequently-with/{foodItemId}")
    public List<FoodItem> getFrequentlyWith(@PathVariable Long foodItemId, @RequestParam(defaultValue = "5") int limit) {
        return recommendationService.getFrequentlyOrderedWith(foodItemId, limit);
    }
}
