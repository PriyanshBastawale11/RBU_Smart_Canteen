package com.rbu.backend.Entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "analytics_settings")
public class AnalyticsSettings {
    @Id
    private Long id; // singleton row, use id=1

    @Column(name = "avg_reset_after")
    private LocalDateTime avgResetAfter;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LocalDateTime getAvgResetAfter() { return avgResetAfter; }
    public void setAvgResetAfter(LocalDateTime avgResetAfter) { this.avgResetAfter = avgResetAfter; }
}
