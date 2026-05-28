package com.wbm.feeder.repository;

import com.wbm.feeder.model.FeedHistory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface FeedHistoryRepository extends JpaRepository<FeedHistory, Long> {
    List<FeedHistory> findByDeviceIdOrderByTimestampDesc(String deviceId, Pageable pageable);

    boolean existsByDeviceIdAndGramsAndTimestampAfter(String deviceId, Integer grams, java.time.Instant after);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("DELETE FROM FeedHistory f WHERE f.deviceId = :deviceId")
    void deleteByDeviceId(String deviceId);
}
