package com.podcast.collab.service;

import com.podcast.collab.dto.AdImpressionRecordRequest;
import com.podcast.collab.dto.AdImpressionStatDTO;
import com.podcast.collab.entity.AdImpressionStat;
import com.podcast.collab.entity.Advertisement;
import com.podcast.collab.entity.Episode;
import com.podcast.collab.repository.AdImpressionStatRepository;
import com.podcast.collab.repository.AdvertisementRepository;
import com.podcast.collab.repository.EpisodeRepository;
import com.podcast.collab.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdImpressionService {

    private final AdImpressionStatRepository statRepository;
    private final AdvertisementRepository advertisementRepository;
    private final EpisodeRepository episodeRepository;
    private final AdvertisementService advertisementService;
    private final SecurityUtil securityUtil;

    @Transactional
    public void recordImpression(AdImpressionRecordRequest request) {
        Long teamId = securityUtil.getCurrentTeamId();

        Advertisement ad = advertisementRepository.findByIdAndTeamId(request.getAdId(), teamId)
                .orElseThrow(() -> new IllegalArgumentException("广告不存在"));
        Episode episode = episodeRepository.findByIdAndTeamId(request.getEpisodeId(), teamId)
                .orElseThrow(() -> new IllegalArgumentException("节目不存在"));

        LocalDate statDate = request.getStatDate() != null ? request.getStatDate() : LocalDate.now();
        String platform = (request.getPlatform() != null && !request.getPlatform().isEmpty()) ? request.getPlatform() : null;
        String region = (request.getRegion() != null && !request.getRegion().isEmpty()) ? request.getRegion() : null;
        String audienceType = (request.getAudienceType() != null && !request.getAudienceType().isEmpty()) ? request.getAudienceType() : null;

        AdImpressionStat stat = statRepository.findByUniqueKey(
                request.getAdId(), request.getEpisodeId(), platform, region, audienceType, statDate
        ).orElseGet(() -> {
            AdImpressionStat newStat = AdImpressionStat.builder()
                    .advertisement(ad)
                    .episode(episode)
                    .platform(platform)
                    .region(region)
                    .audienceType(audienceType)
                    .statDate(statDate)
                    .build();
            return newStat;
        });

        int impressionInc = request.getImpressionIncrement() != null ? request.getImpressionIncrement() : 1;
        int clickInc = request.getClickIncrement() != null ? request.getClickIncrement() : 0;

        stat.setImpressionCount(stat.getImpressionCount() + impressionInc);
        stat.setClickCount(stat.getClickCount() + clickInc);

        statRepository.save(stat);

        if (impressionInc > 0) {
            advertisementService.incrementImpressions(request.getAdId(), impressionInc);
        }
    }

    @Transactional(readOnly = true)
    public List<AdImpressionStatDTO> getStatsByAd(Long adId, LocalDate startDate, LocalDate endDate) {
        Long teamId = securityUtil.getCurrentTeamId();
        if (!advertisementRepository.existsByIdAndTeamId(adId, teamId)) {
            throw new IllegalArgumentException("广告不存在");
        }

        LocalDate start = startDate != null ? startDate : LocalDate.now().minusDays(30);
        LocalDate end = endDate != null ? endDate : LocalDate.now();

        return statRepository.findByAdIdAndDateRange(adId, start, end).stream()
                .map(AdImpressionStatDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AdImpressionStatDTO> getStatsByEpisode(Long episodeId, LocalDate startDate, LocalDate endDate) {
        Long teamId = securityUtil.getCurrentTeamId();
        if (!episodeRepository.existsByIdAndTeamId(episodeId, teamId)) {
            throw new IllegalArgumentException("节目不存在");
        }

        LocalDate start = startDate != null ? startDate : LocalDate.now().minusDays(30);
        LocalDate end = endDate != null ? endDate : LocalDate.now();

        return statRepository.findByEpisodeIdAndDateRange(episodeId, start, end).stream()
                .map(AdImpressionStatDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getAdSummary(Long adId) {
        Long teamId = securityUtil.getCurrentTeamId();
        Advertisement ad = advertisementRepository.findByIdAndTeamId(adId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("广告不存在"));

        Map<String, Object> summary = new HashMap<>();
        summary.put("ad", ad);

        Long totalImpressions = statRepository.sumImpressionsByAdId(adId);
        Long totalClicks = statRepository.sumClicksByAdId(adId);
        Double clickRate = totalImpressions > 0
                ? Math.round(totalClicks * 10000.0 / totalImpressions) / 100.0
                : 0.0;

        summary.put("totalImpressions", totalImpressions);
        summary.put("totalClicks", totalClicks);
        summary.put("clickRate", clickRate);
        summary.put("maxImpressions", ad.getMaxImpressions());
        summary.put("remainingImpressions",
                ad.getMaxImpressions() > 0 ? Math.max(0, ad.getMaxImpressions() - totalImpressions) : -1);

        return summary;
    }
}
