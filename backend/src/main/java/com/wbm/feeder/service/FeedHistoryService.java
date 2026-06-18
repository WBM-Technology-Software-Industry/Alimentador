package com.wbm.feeder.service;

import com.wbm.feeder.model.FeedHistory;
import com.wbm.feeder.repository.FeedHistoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class FeedHistoryService {

    private static final Logger log = LoggerFactory.getLogger(FeedHistoryService.class);

    private final FeedHistoryRepository feedHistoryRepo;

    public FeedHistoryService(FeedHistoryRepository feedHistoryRepo) {
        this.feedHistoryRepo = feedHistoryRepo;
    }

    @Transactional
    public void saveIfNew(String deviceId, int grams, String source) {
        Instant twoMinAgo = Instant.now().minusSeconds(120);
        if (!feedHistoryRepo.existsByDeviceIdAndGramsAndSourceAndTimestampAfter(deviceId, grams, source, twoMinAgo)) {
            feedHistoryRepo.save(new FeedHistory(deviceId, Instant.now(), grams, source, null));
            log.info("Feed history saved: device={} grams={} source={}", deviceId, grams, source);
        } else {
            log.debug("Feed history deduped: device={} grams={} source={}", deviceId, grams, source);
        }
    }
}
