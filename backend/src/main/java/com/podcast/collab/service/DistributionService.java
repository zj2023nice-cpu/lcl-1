package com.podcast.collab.service;

import com.podcast.collab.dto.DistributionDTO;
import com.podcast.collab.entity.DistributionPlatform;
import com.podcast.collab.entity.DistributionRecord;
import com.podcast.collab.entity.Episode;
import com.podcast.collab.entity.User;
import com.podcast.collab.repository.DistributionPlatformRepository;
import com.podcast.collab.repository.DistributionRecordRepository;
import com.podcast.collab.repository.EpisodeRepository;
import com.podcast.collab.repository.UserRepository;
import com.podcast.collab.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DistributionService {
    
    private final DistributionRecordRepository recordRepository;
    private final DistributionPlatformRepository platformRepository;
    private final EpisodeRepository episodeRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final SecurityUtil securityUtil;
    private final AuditService auditService;
    
    private final Map<Long, Boolean> cancelledTasks = new ConcurrentHashMap<>();
    
    @Transactional
    public List<DistributionDTO> createBatchDistribution(
            Long teamId,
            Long episodeId,
            List<Long> platformIds,
            Map<String, Object> metadata) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            throw new IllegalArgumentException("无权操作其他团队数据");
        }
        
        Episode episode = episodeRepository.findByIdAndTeamId(episodeId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("节目不存在"));
        
        List<DistributionPlatform> platforms = platformRepository.findAllById(platformIds);
        if (platforms.size() != platformIds.size()) {
            throw new IllegalArgumentException("部分平台不存在");
        }
        
        for (DistributionPlatform platform : platforms) {
            if (!platform.getTeam().getId().equals(teamId)) {
                throw new IllegalArgumentException("平台不属于当前团队");
            }
        }
        
        User currentUser = securityUtil.getCurrentUser();
        List<DistributionRecord> records = new ArrayList<>();
        
        for (DistributionPlatform platform : platforms) {
            DistributionRecord record = DistributionRecord.builder()
                    .episode(episode)
                    .platform(platform)
                    .status(DistributionRecord.Status.PENDING)
                    .progress(0)
                    .retryCount(0)
                    .metadata(metadata)
                    .build();
            
            record = recordRepository.save(record);
            records.add(record);
            
            auditService.logAction(teamId, currentUser.getId(), "CREATE_DISTRIBUTION_RECORD",
                    "DISTRIBUTION_RECORD", record.getId(),
                    Map.of("episodeId", episodeId, "platformId", platform.getId()));
        }
        
        List<Long> recipientIds = getDistributionRecipients(teamId);
        for (DistributionRecord record : records) {
            notificationService.notifyDistributionStarted(teamId, record, recipientIds);
            executeDistributionAsync(teamId, record.getId());
        }
        
        return records.stream()
                .map(DistributionDTO::fromRecord)
                .collect(Collectors.toList());
    }
    
    @Async
    @Transactional
    public void executeDistributionAsync(Long teamId, Long recordId) {
        try {
            DistributionRecord record = recordRepository.findByIdAndTeamId(recordId, teamId)
                    .orElseThrow(() -> new IllegalArgumentException("分发记录不存在"));
            
            if (cancelledTasks.getOrDefault(recordId, false)) {
                log.info("分发任务已取消: {}", recordId);
                return;
            }
            
            record.setStatus(DistributionRecord.Status.PUBLISHING);
            record.setProgress(0);
            recordRepository.save(record);
            
            for (int i = 1; i <= 10; i++) {
                Thread.sleep(200);
                
                if (cancelledTasks.getOrDefault(recordId, false)) {
                    handleCancellation(teamId, record);
                    return;
                }
                
                record.setProgress(i * 10);
                recordRepository.save(record);
            }
            
            if (cancelledTasks.getOrDefault(recordId, false)) {
                handleCancellation(teamId, record);
                return;
            }
            
            boolean success = simulatePlatformPublish(record);
            
            if (success) {
                record.setStatus(DistributionRecord.Status.PUBLISHED);
                record.setProgress(100);
                record.setPublishedAt(LocalDateTime.now());
                record.setPublishUrl(generatePublishUrl(record));
                recordRepository.save(record);
                
                List<Long> recipientIds = getDistributionRecipients(teamId);
                notificationService.notifyDistributionCompleted(teamId, record, recipientIds);
                
                auditService.logAction(teamId, securityUtil.getCurrentUser().getId(), 
                        "DISTRIBUTION_COMPLETED", "DISTRIBUTION_RECORD", recordId,
                        Map.of("platform", record.getPlatform().getName()));
            } else {
                throw new RuntimeException("平台发布失败");
            }
            
        } catch (Exception e) {
            log.error("分发失败: {}", recordId, e);
            handleDistributionFailure(teamId, recordId, e.getMessage());
        } finally {
            cancelledTasks.remove(recordId);
        }
    }
    
    @Transactional
    public DistributionDTO retryDistribution(Long teamId, Long recordId) {
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            throw new IllegalArgumentException("无权操作其他团队数据");
        }
        
        DistributionRecord record = recordRepository.findByIdAndTeamId(recordId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("分发记录不存在"));
        
        if (record.getStatus() != DistributionRecord.Status.FAILED 
                && record.getStatus() != DistributionRecord.Status.CANCELLED) {
            throw new IllegalArgumentException("只有失败或已取消的分发可以重试");
        }
        
        record.setStatus(DistributionRecord.Status.PENDING);
        record.setProgress(0);
        record.setErrorMessage(null);
        record.setRetryCount(record.getRetryCount() + 1);
        record = recordRepository.save(record);
        
        User currentUser = securityUtil.getCurrentUser();
        auditService.logAction(teamId, currentUser.getId(), "RETRY_DISTRIBUTION",
                "DISTRIBUTION_RECORD", recordId,
                Map.of("retryCount", record.getRetryCount()));
        
        List<Long> recipientIds = getDistributionRecipients(teamId);
        notificationService.notifyDistributionStarted(teamId, record, recipientIds);
        
        executeDistributionAsync(teamId, recordId);
        
        return DistributionDTO.fromRecord(record);
    }
    
    @Transactional
    public List<DistributionDTO> retryFailedDistributions(Long teamId, List<Long> recordIds) {
        List<DistributionDTO> results = new ArrayList<>();
        for (Long recordId : recordIds) {
            try {
                results.add(retryDistribution(teamId, recordId));
            } catch (Exception e) {
                log.warn("重试分发失败: {}, 原因: {}", recordId, e.getMessage());
            }
        }
        return results;
    }
    
    @Transactional
    public DistributionDTO cancelDistribution(Long teamId, Long recordId) {
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            throw new IllegalArgumentException("无权操作其他团队数据");
        }
        
        DistributionRecord record = recordRepository.findByIdAndTeamId(recordId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("分发记录不存在"));
        
        if (record.getStatus() == DistributionRecord.Status.PUBLISHED) {
            throw new IllegalArgumentException("已发布的分发无法取消");
        }
        
        cancelledTasks.put(recordId, true);
        
        record.setStatus(DistributionRecord.Status.CANCELLED);
        record = recordRepository.save(record);
        
        User currentUser = securityUtil.getCurrentUser();
        auditService.logAction(teamId, currentUser.getId(), "CANCEL_DISTRIBUTION",
                "DISTRIBUTION_RECORD", recordId, null);
        
        List<Long> recipientIds = getDistributionRecipients(teamId);
        notificationService.notifyDistributionCancelled(teamId, record, recipientIds);
        
        return DistributionDTO.fromRecord(record);
    }
    
    @Transactional
    public List<DistributionDTO> cancelBatchDistributions(Long teamId, List<Long> recordIds) {
        List<DistributionDTO> results = new ArrayList<>();
        for (Long recordId : recordIds) {
            try {
                results.add(cancelDistribution(teamId, recordId));
            } catch (Exception e) {
                log.warn("取消分发失败: {}, 原因: {}", recordId, e.getMessage());
            }
        }
        return results;
    }
    
    @Transactional(readOnly = true)
    public List<DistributionDTO> getDistributionStatus(Long teamId, Long episodeId) {
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            throw new IllegalArgumentException("无权访问其他团队数据");
        }
        
        List<DistributionRecord> records = recordRepository.findByEpisodeIdAndTeamId(episodeId, teamId);
        return records.stream()
                .map(DistributionDTO::fromRecord)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public DistributionDTO getDistributionProgress(Long teamId, Long recordId) {
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            throw new IllegalArgumentException("无权访问其他团队数据");
        }
        
        DistributionRecord record = recordRepository.findByIdAndTeamId(recordId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("分发记录不存在"));
        
        return DistributionDTO.fromRecord(record);
    }
    
    private void handleDistributionFailure(Long teamId, Long recordId, String errorMessage) {
        try {
            DistributionRecord record = recordRepository.findByIdAndTeamId(recordId, teamId)
                    .orElseThrow(() -> new IllegalArgumentException("分发记录不存在"));
            
            record.setStatus(DistributionRecord.Status.FAILED);
            record.setErrorMessage(errorMessage);
            recordRepository.save(record);
            
            List<Long> recipientIds = getDistributionRecipients(teamId);
            notificationService.notifyDistributionFailed(teamId, record, recipientIds);
            
            auditService.logAction(teamId, securityUtil.getCurrentUser().getId(),
                    "DISTRIBUTION_FAILED", "DISTRIBUTION_RECORD", recordId,
                    Map.of("error", errorMessage));
        } catch (Exception e) {
            log.error("处理分发失败异常: {}", recordId, e);
        }
    }
    
    private void handleCancellation(Long teamId, DistributionRecord record) {
        record.setStatus(DistributionRecord.Status.CANCELLED);
        recordRepository.save(record);
        
        List<Long> recipientIds = getDistributionRecipients(teamId);
        notificationService.notifyDistributionCancelled(teamId, record, recipientIds);
    }
    
    private List<Long> getDistributionRecipients(Long teamId) {
        List<User> admins = userRepository.findByTeamIdAndRole(teamId, User.Role.ADMIN);
        List<User> producers = userRepository.findByTeamIdAndRole(teamId, User.Role.PRODUCER);
        List<User> operators = userRepository.findByTeamIdAndRole(teamId, User.Role.OPERATOR);
        
        List<Long> recipientIds = new ArrayList<>();
        recipientIds.addAll(admins.stream().map(User::getId).toList());
        recipientIds.addAll(producers.stream().map(User::getId).toList());
        recipientIds.addAll(operators.stream().map(User::getId).toList());
        
        return recipientIds;
    }
    
    private boolean simulatePlatformPublish(DistributionRecord record) {
        DistributionPlatform.PlatformType type = record.getPlatform().getType();
        double failureRate = switch (type) {
            case XIAOYUZHOU, XIMALAYA, APPLE, SPOTIFY -> 0.1;
            case RSS -> 0.05;
            case OTHER -> 0.15;
        };
        return Math.random() > failureRate;
    }
    
    private String generatePublishUrl(DistributionRecord record) {
        DistributionPlatform.PlatformType type = record.getPlatform().getType();
        String baseUrl = switch (type) {
            case XIAOYUZHOU -> "https://xiaoyuzhoufm.com/episode/";
            case XIMALAYA -> "https://ximalaya.com/album/";
            case APPLE -> "https://podcasts.apple.com/podcast/";
            case SPOTIFY -> "https://open.spotify.com/episode/";
            case RSS -> "https://rss.example.com/feed/";
            case OTHER -> "https://example.com/podcast/";
        };
        return baseUrl + record.getId() + "?t=" + System.currentTimeMillis();
    }
}
