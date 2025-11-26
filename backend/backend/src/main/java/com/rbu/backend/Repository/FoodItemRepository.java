package com.rbu.backend.Repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.rbu.backend.Entities.FoodItem;

import java.util.List;

public interface FoodItemRepository extends JpaRepository<FoodItem, Long> {
    List<FoodItem> findByCategory(String category);
    List<FoodItem> findByAvailableTrue();
}