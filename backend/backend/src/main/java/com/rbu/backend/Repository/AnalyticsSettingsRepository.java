package com.rbu.backend.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.rbu.backend.Entities.AnalyticsSettings;

public interface AnalyticsSettingsRepository extends JpaRepository<AnalyticsSettings, Long> {
}
