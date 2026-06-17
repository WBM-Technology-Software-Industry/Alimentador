package com.wbm.feeder.repository;

import com.wbm.feeder.model.DeviceLastSeen;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeviceLastSeenRepository extends JpaRepository<DeviceLastSeen, String> {}
