package com.wbm.feeder.repository;

import com.wbm.feeder.model.ErrorLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ErrorLogRepository extends JpaRepository<ErrorLog, Long> {
    List<ErrorLog> findByDeviceIdOrderByTimestampDesc(String deviceId, Pageable pageable);
}
