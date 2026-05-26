package com.wbm.feeder.repository;

import com.wbm.feeder.model.DeviceTelemetry;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DeviceTelemetryRepository extends JpaRepository<DeviceTelemetry, Long> {
    List<DeviceTelemetry> findByDeviceIdOrderByTimestampDesc(String deviceId, Pageable pageable);
    Optional<DeviceTelemetry> findTopByDeviceIdOrderByTimestampDesc(String deviceId);
}
