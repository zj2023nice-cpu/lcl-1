package com.podcast.collab.service;

import com.podcast.collab.dto.AdvertisementDTO;
import com.podcast.collab.entity.Advertisement;
import com.podcast.collab.repository.AdvertisementRepository;
import com.podcast.collab.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdvertisementService {

    private final AdvertisementRepository advertisementRepository;
    private final SecurityUtil securityUtil;

    @Transactional(readOnly = true)
    public List<AdvertisementDTO> getAllAdvertisements() {
        Long teamId = securityUtil.getCurrentTeamId();
        return advertisementRepository.findByTeamId(teamId).stream()
                .map(AdvertisementDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AdvertisementDTO> getActiveAdvertisements() {
        Long teamId = securityUtil.getCurrentTeamId();
        LocalDate today = LocalDate.now();
        return advertisementRepository.findActiveAdsByTeamId(teamId, today).stream()
                .map(AdvertisementDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AdvertisementDTO getAdvertisement(Long id) {
        Long teamId = securityUtil.getCurrentTeamId();
        Advertisement ad = advertisementRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("广告不存在"));
        return AdvertisementDTO.fromEntity(ad);
    }

    @Transactional
    public AdvertisementDTO createAdvertisement(AdvertisementDTO dto) {
        Long teamId = securityUtil.getCurrentTeamId();

        validateDuration(dto.getDurationSeconds());

        Advertisement ad = Advertisement.builder()
                .teamId(teamId)
                .name(dto.getName())
                .description(dto.getDescription())
                .audioUrl(dto.getAudioUrl())
                .durationSeconds(dto.getDurationSeconds() != null ? dto.getDurationSeconds() : 30)
                .advertiser(dto.getAdvertiser())
                .status(dto.getStatus() != null ? dto.getStatus() : Advertisement.AdStatus.ACTIVE)
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .maxImpressions(dto.getMaxImpressions() != null ? dto.getMaxImpressions() : 0)
                .currentImpressions(0)
                .build();

        ad = advertisementRepository.save(ad);
        return AdvertisementDTO.fromEntity(ad);
    }

    @Transactional
    public AdvertisementDTO updateAdvertisement(Long id, AdvertisementDTO dto) {
        Long teamId = securityUtil.getCurrentTeamId();
        Advertisement ad = advertisementRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("广告不存在"));

        if (dto.getName() != null) {
            ad.setName(dto.getName());
        }
        if (dto.getDescription() != null) {
            ad.setDescription(dto.getDescription());
        }
        if (dto.getAudioUrl() != null) {
            ad.setAudioUrl(dto.getAudioUrl());
        }
        if (dto.getDurationSeconds() != null) {
            validateDuration(dto.getDurationSeconds());
            ad.setDurationSeconds(dto.getDurationSeconds());
        }
        if (dto.getAdvertiser() != null) {
            ad.setAdvertiser(dto.getAdvertiser());
        }
        if (dto.getStatus() != null) {
            ad.setStatus(dto.getStatus());
        }
        if (dto.getStartDate() != null) {
            ad.setStartDate(dto.getStartDate());
        }
        if (dto.getEndDate() != null) {
            ad.setEndDate(dto.getEndDate());
        }
        if (dto.getMaxImpressions() != null) {
            ad.setMaxImpressions(dto.getMaxImpressions());
        }

        ad = advertisementRepository.save(ad);
        return AdvertisementDTO.fromEntity(ad);
    }

    @Transactional
    public void deleteAdvertisement(Long id) {
        Long teamId = securityUtil.getCurrentTeamId();
        Advertisement ad = advertisementRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("广告不存在"));
        advertisementRepository.delete(ad);
    }

    @Transactional
    public AdvertisementDTO updateStatus(Long id, Advertisement.AdStatus status) {
        Long teamId = securityUtil.getCurrentTeamId();
        Advertisement ad = advertisementRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("广告不存在"));
        ad.setStatus(status);
        ad = advertisementRepository.save(ad);
        return AdvertisementDTO.fromEntity(ad);
    }

    @Transactional
    public void incrementImpressions(Long adId, int count) {
        Advertisement ad = advertisementRepository.findById(adId).orElse(null);
        if (ad != null) {
            ad.setCurrentImpressions(ad.getCurrentImpressions() + count);
            if (ad.getMaxImpressions() > 0 && ad.getCurrentImpressions() >= ad.getMaxImpressions()) {
                ad.setStatus(Advertisement.AdStatus.EXHAUSTED);
            }
            advertisementRepository.save(ad);
        }
    }

    @Transactional(readOnly = true)
    public void checkAndUpdateExpiredStatus() {
        Long teamId = securityUtil.getCurrentTeamId();
        LocalDate today = LocalDate.now();
        List<Advertisement> ads = advertisementRepository.findByTeamIdAndStatus(teamId, Advertisement.AdStatus.ACTIVE);
        for (Advertisement ad : ads) {
            if (ad.getEndDate() != null && ad.getEndDate().isBefore(today)) {
                ad.setStatus(Advertisement.AdStatus.EXPIRED);
                advertisementRepository.save(ad);
            }
        }
    }

    private void validateDuration(Integer duration) {
        if (duration != null && (duration < 1 || duration > 3600)) {
            throw new IllegalArgumentException("广告时长必须在1秒到3600秒之间");
        }
    }
}
