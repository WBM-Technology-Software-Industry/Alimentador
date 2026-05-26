package com.wbm.feeder.repository;

import com.wbm.feeder.model.DeviceSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DeviceScheduleRepository extends JpaRepository<DeviceSchedule, Long> {
    List<DeviceSchedule> findByDeviceId(String deviceId);
    Optional<DeviceSchedule> findByDeviceIdAndScheduleType(String deviceId, String scheduleType);
}
