package com.rbu.backend.Repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.rbu.backend.Entities.Order;

import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUserId(Long userId);
}
