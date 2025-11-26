package com.rbu.backend.service;

import com.rbu.backend.Entities.FoodItem;
import com.rbu.backend.Repository.FoodItemRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class FoodItemService {
    @Autowired
    private FoodItemRepository foodItemRepository;

    public List<FoodItem> getAllFoodItems() {
        return foodItemRepository.findAll();
    }

    public List<FoodItem> getAvailableFoodItems() {
        return foodItemRepository.findByAvailableTrue();
    }

    public List<FoodItem> getFoodItemsByCategory(String category) {
        return foodItemRepository.findByCategory(category);
    }

    public Optional<FoodItem> getFoodItemById(Long id) {
        return foodItemRepository.findById(id);
    }

    public FoodItem createFoodItem(FoodItem foodItem) {
        return foodItemRepository.save(foodItem);
    }

    public FoodItem updateFoodItem(Long id, FoodItem updated) {
        return foodItemRepository.findById(id).map(item -> {
            item.setName(updated.getName());
            item.setCategory(updated.getCategory());
            item.setPrice(updated.getPrice());
            item.setAvailable(updated.isAvailable());
            item.setEstimatedPrepTime(updated.getEstimatedPrepTime());
            return foodItemRepository.save(item);
        }).orElseThrow();
    }

    public void deleteFoodItem(Long id) {
        foodItemRepository.deleteById(id);
    }

    public FoodItem setAvailability(Long id, boolean available) {
        return foodItemRepository.findById(id).map(item -> {
            item.setAvailable(available);
            return foodItemRepository.save(item);
        }).orElseThrow();
    }
}
