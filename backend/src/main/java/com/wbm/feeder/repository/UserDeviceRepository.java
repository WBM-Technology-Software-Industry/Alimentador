package com.wbm.feeder.repository;

import com.wbm.feeder.model.UserDevice;
import com.wbm.feeder.model.UserDeviceId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserDeviceRepository extends JpaRepository<UserDevice, UserDeviceId>{
    List<UserDevice> findByIdUserId(Long userId);
}