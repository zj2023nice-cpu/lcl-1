package com.podcast.collab.service;

import com.podcast.collab.dto.*;
import com.podcast.collab.entity.EmailLog;
import com.podcast.collab.entity.Episode;
import com.podcast.collab.entity.Guest;
import com.podcast.collab.entity.GuestCollaborationHistory;
import com.podcast.collab.entity.User;
import com.podcast.collab.exception.ResourceNotFoundException;
import com.podcast.collab.repository.EpisodeRepository;
import com.podcast.collab.repository.GuestCollaborationHistoryRepository;
import com.podcast.collab.repository.GuestRepository;
import com.podcast.collab.repository.UserRepository;
import com.podcast.collab.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class GuestService {

    private final GuestRepository guestRepository;
    private final GuestCollaborationHistoryRepository historyRepository;
    private final UserRepository userRepository;
    private final EpisodeRepository episodeRepository;
    private final EmailService emailService;
    private final MinioService minioService;
    private final SecurityUtil securityUtil;
    private final AuditService auditService;

    private static final String GUEST_INVITATION_TEMPLATE = "GUEST_INVITATION";
    private static final String GUEST_THANK_YOU_TEMPLATE = "GUEST_THANK_YOU";

    @Transactional(readOnly = true)
    public Page<GuestDTO> getAllGuests(Long teamId, String keyword, Pageable pageable) {
        Page<Guest> guests;
        if (keyword != null && !keyword.trim().isEmpty()) {
            guests = guestRepository.searchByTeamId(teamId, keyword.trim(), pageable);
        } else {
            guests = guestRepository.findByTeamId(teamId, pageable);
        }
        return guests.map(this::convertToDTO);
    }

    @Transactional(readOnly = true)
    public List<GuestDTO> getAllActiveGuests(Long teamId) {
        return guestRepository.findByTeamIdAndIsActive(teamId, true).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public GuestDTO getGuestById(Long teamId, Long id) {
        Guest guest = guestRepository.findByTeamIdAndId(teamId, id)
                .orElseThrow(() -> new ResourceNotFoundException("嘉宾不存在"));
        GuestDTO dto = convertToDTO(guest);
        dto.setCollaborationHistory(getCollaborationHistory(teamId, id));
        return dto;
    }

    @Transactional
    public GuestDTO createGuest(Long teamId, Long creatorId, CreateGuestRequest request) {
        if (guestRepository.existsByTeamIdAndEmail(teamId, request.getEmail())) {
            throw new IllegalArgumentException("该邮箱已存在嘉宾记录");
        }

        Guest guest = Guest.builder()
                .teamId(teamId)
                .name(request.getName())
                .email(request.getEmail())
                .phoneNumber(request.getPhoneNumber())
                .topicAreas(request.getTopicAreas())
                .weiboUrl(request.getWeiboUrl())
                .wechatId(request.getWechatId())
                .zhihuUrl(request.getZhihuUrl())
                .bilibiliUrl(request.getBilibiliUrl())
                .otherLinks(request.getOtherLinks())
                .bio(request.getBio())
                .participationCount(0)
                .isActive(true)
                .createdBy(creatorId)
                .build();

        guest = guestRepository.save(guest);

        User creator = userRepository.findById(creatorId).orElse(null);
        auditService.logAction(teamId, creator, "CREATE_GUEST", "GUEST", guest.getId(), null);

        return convertToDTO(guest);
    }

    @Transactional
    public GuestDTO updateGuest(Long teamId, Long id, Long operatorId, UpdateGuestRequest request) {
        Guest guest = guestRepository.findByTeamIdAndId(teamId, id)
                .orElseThrow(() -> new ResourceNotFoundException("嘉宾不存在"));

        if (request.getEmail() != null && !request.getEmail().equals(guest.getEmail())) {
            if (guestRepository.existsByTeamIdAndEmail(teamId, request.getEmail())) {
                throw new IllegalArgumentException("该邮箱已存在嘉宾记录");
            }
            guest.setEmail(request.getEmail());
        }

        if (request.getName() != null) guest.setName(request.getName());
        if (request.getPhoneNumber() != null) guest.setPhoneNumber(request.getPhoneNumber());
        if (request.getTopicAreas() != null) guest.setTopicAreas(request.getTopicAreas());
        if (request.getWeiboUrl() != null) guest.setWeiboUrl(request.getWeiboUrl());
        if (request.getWechatId() != null) guest.setWechatId(request.getWechatId());
        if (request.getZhihuUrl() != null) guest.setZhihuUrl(request.getZhihuUrl());
        if (request.getBilibiliUrl() != null) guest.setBilibiliUrl(request.getBilibiliUrl());
        if (request.getOtherLinks() != null) guest.setOtherLinks(request.getOtherLinks());
        if (request.getBio() != null) guest.setBio(request.getBio());
        if (request.getIsActive() != null) guest.setIsActive(request.getIsActive());

        guest = guestRepository.save(guest);

        User operator = userRepository.findById(operatorId).orElse(null);
        auditService.logAction(teamId, operator, "UPDATE_GUEST", "GUEST", guest.getId(), null);

        return convertToDTO(guest);
    }

    @Transactional
    public void deleteGuest(Long teamId, Long id, Long operatorId) {
        Guest guest = guestRepository.findByTeamIdAndId(teamId, id)
                .orElseThrow(() -> new ResourceNotFoundException("嘉宾不存在"));

        String oldAvatarUrl = guest.getAvatarUrl();

        guestRepository.delete(guest);

        if (oldAvatarUrl != null) {
            try {
                String objectName = minioService.extractObjectNameFromUrl(oldAvatarUrl);
                if (objectName != null) {
                    minioService.deletePublicFile(objectName);
                }
            } catch (Exception e) {
                log.warn("删除嘉宾头像失败: {}", e.getMessage());
            }
        }

        User operator = userRepository.findById(operatorId).orElse(null);
        auditService.logAction(teamId, operator, "DELETE_GUEST", "GUEST", id, null);
    }

    @Transactional
    public String uploadAvatar(Long teamId, Long guestId, MultipartFile file) throws Exception {
        Guest guest = guestRepository.findByTeamIdAndId(teamId, guestId)
                .orElseThrow(() -> new ResourceNotFoundException("嘉宾不存在"));

        String oldAvatarUrl = guest.getAvatarUrl();

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("请上传图片文件");
        }

        long maxSize = 5 * 1024 * 1024;
        if (file.getSize() > maxSize) {
            throw new IllegalArgumentException("图片大小不能超过5MB");
        }

        String extension = getFileExtension(Objects.requireNonNull(file.getOriginalFilename()));
        String objectName = "guests/" + teamId + "/" + guestId + "/avatar-" + System.currentTimeMillis() + extension;

        String avatarUrl = minioService.uploadPublicFile(
                objectName,
                file.getInputStream(),
                file.getSize(),
                contentType
        );

        guest.setAvatarUrl(avatarUrl);
        guestRepository.save(guest);

        if (oldAvatarUrl != null && !oldAvatarUrl.equals(avatarUrl)) {
            try {
                String oldObjectName = minioService.extractObjectNameFromUrl(oldAvatarUrl);
                if (oldObjectName != null) {
                    minioService.deletePublicFile(oldObjectName);
                }
            } catch (Exception e) {
                log.warn("删除旧头像失败: {}", e.getMessage());
            }
        }

        return avatarUrl;
    }

    @Transactional
    public void deleteAvatar(Long teamId, Long guestId) {
        Guest guest = guestRepository.findByTeamIdAndId(teamId, guestId)
                .orElseThrow(() -> new ResourceNotFoundException("嘉宾不存在"));

        String avatarUrl = guest.getAvatarUrl();
        if (avatarUrl != null) {
            try {
                String objectName = minioService.extractObjectNameFromUrl(avatarUrl);
                if (objectName != null) {
                    minioService.deletePublicFile(objectName);
                }
            } catch (Exception e) {
                log.warn("删除头像失败: {}", e.getMessage());
            }
        }

        guest.setAvatarUrl(null);
        guestRepository.save(guest);
    }

    @Transactional
    public GuestEmailResponse sendEmail(Long teamId, Long guestId, SendGuestEmailRequest request, Long operatorId) {
        Guest guest = guestRepository.findByTeamIdAndId(teamId, guestId)
                .orElseThrow(() -> new ResourceNotFoundException("嘉宾不存在"));

        String templateKey = request.getEmailType() == SendGuestEmailRequest.EmailType.INVITATION
                ? GUEST_INVITATION_TEMPLATE
                : GUEST_THANK_YOU_TEMPLATE;

        Map<String, Object> variables = new HashMap<>();
        variables.put("guestName", guest.getName());
        variables.put("guestEmail", guest.getEmail());

        if (request.getVariables() != null) {
            variables.putAll(request.getVariables());
        }

        if (request.getEpisodeId() != null) {
            Episode episode = episodeRepository.findById(request.getEpisodeId()).orElse(null);
            if (episode != null) {
                variables.put("episodeTitle", episode.getTitle());
                variables.put("episodeDescription", episode.getDescription());
            }
        }

        EmailLog emailLog = emailService.queueEmail(
                teamId,
                templateKey,
                guest.getEmail(),
                guest.getName(),
                variables,
                "GUEST",
                guestId
        );

        User operator = userRepository.findById(operatorId).orElse(null);
        String action = request.getEmailType() == SendGuestEmailRequest.EmailType.INVITATION
                ? "SEND_GUEST_INVITATION"
                : "SEND_GUEST_THANK_YOU";
        auditService.logAction(teamId, operator, action, "GUEST", guestId, null);

        return GuestEmailResponse.builder()
                .emailLogId(emailLog.getId())
                .recipientEmail(emailLog.getRecipientEmail())
                .recipientName(emailLog.getRecipientName())
                .subject(emailLog.getSubject())
                .status(emailLog.getStatus().name())
                .createdAt(emailLog.getCreatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public List<GuestCollaborationHistoryDTO> getCollaborationHistory(Long teamId, Long guestId) {
        guestRepository.findByTeamIdAndId(teamId, guestId)
                .orElseThrow(() -> new ResourceNotFoundException("嘉宾不存在"));

        return historyRepository.findByTeamIdAndGuestId(teamId, guestId).stream()
                .map(this::convertHistoryToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public GuestCollaborationHistoryDTO addCollaborationHistory(
            Long teamId, Long guestId, Long creatorId, CreateCollaborationHistoryRequest request) {

        Guest guest = guestRepository.findByTeamIdAndId(teamId, guestId)
                .orElseThrow(() -> new ResourceNotFoundException("嘉宾不存在"));

        Episode episode = null;
        if (request.getEpisodeId() != null) {
            episode = episodeRepository.findById(request.getEpisodeId())
                    .orElseThrow(() -> new ResourceNotFoundException("节目不存在"));
        }

        GuestCollaborationHistory history = GuestCollaborationHistory.builder()
                .teamId(teamId)
                .guest(guest)
                .episode(episode)
                .collaborationType(request.getCollaborationType())
                .topic(request.getTopic())
                .recordingDate(request.getRecordingDate())
                .publishDate(request.getPublishDate())
                .feedback(request.getFeedback())
                .rating(request.getRating())
                .notes(request.getNotes())
                .createdBy(creatorId)
                .build();

        history = historyRepository.save(history);

        long participationCount = historyRepository.countByTeamIdAndGuestId(teamId, guestId);
        guest.setParticipationCount((int) participationCount);
        guestRepository.save(guest);

        User creator = userRepository.findById(creatorId).orElse(null);
        auditService.logAction(teamId, creator, "ADD_COLLABORATION_HISTORY",
                "GUEST_COLLABORATION_HISTORY", history.getId(), null);

        return convertHistoryToDTO(history);
    }

    @Transactional
    public void deleteCollaborationHistory(Long teamId, Long historyId, Long operatorId) {
        GuestCollaborationHistory history = historyRepository.findByTeamIdAndId(teamId, historyId)
                .orElseThrow(() -> new ResourceNotFoundException("合作记录不存在"));

        Long guestId = history.getGuest().getId();
        historyRepository.delete(history);

        Guest guest = guestRepository.findById(guestId).orElse(null);
        if (guest != null) {
            long participationCount = historyRepository.countByTeamIdAndGuestId(teamId, guestId);
            guest.setParticipationCount((int) participationCount);
            guestRepository.save(guest);
        }

        User operator = userRepository.findById(operatorId).orElse(null);
        auditService.logAction(teamId, operator, "DELETE_COLLABORATION_HISTORY",
                "GUEST_COLLABORATION_HISTORY", historyId, null);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getGuestStats(Long teamId) {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalGuests", guestRepository.count());
        stats.put("activeGuests", guestRepository.countActiveGuestsByTeamId(teamId));

        List<GuestCollaborationHistory> allHistory = historyRepository.findByTeamId(teamId);
        stats.put("totalCollaborations", allHistory.size());

        double avgRating = allHistory.stream()
                .filter(h -> h.getRating() != null)
                .mapToInt(GuestCollaborationHistory::getRating)
                .average()
                .orElse(0.0);
        stats.put("averageRating", Math.round(avgRating * 10) / 10.0);

        return stats;
    }

    private GuestDTO convertToDTO(Guest guest) {
        GuestDTO dto = GuestDTO.builder()
                .id(guest.getId())
                .teamId(guest.getTeamId())
                .name(guest.getName())
                .email(guest.getEmail())
                .phoneNumber(guest.getPhoneNumber())
                .avatarUrl(guest.getAvatarUrl())
                .topicAreas(guest.getTopicAreas())
                .weiboUrl(guest.getWeiboUrl())
                .wechatId(guest.getWechatId())
                .zhihuUrl(guest.getZhihuUrl())
                .bilibiliUrl(guest.getBilibiliUrl())
                .otherLinks(guest.getOtherLinks())
                .bio(guest.getBio())
                .participationCount(guest.getParticipationCount())
                .isActive(guest.getIsActive())
                .createdBy(guest.getCreatedBy())
                .createdAt(guest.getCreatedAt())
                .updatedAt(guest.getUpdatedAt())
                .build();

        userRepository.findById(guest.getCreatedBy()).ifPresent(user ->
                dto.setCreatedByName(user.getName()));

        return dto;
    }

    private GuestCollaborationHistoryDTO convertHistoryToDTO(GuestCollaborationHistory history) {
        GuestCollaborationHistoryDTO dto = GuestCollaborationHistoryDTO.builder()
                .id(history.getId())
                .teamId(history.getTeamId())
                .guestId(history.getGuest().getId())
                .collaborationType(history.getCollaborationType())
                .topic(history.getTopic())
                .recordingDate(history.getRecordingDate())
                .publishDate(history.getPublishDate())
                .feedback(history.getFeedback())
                .rating(history.getRating())
                .notes(history.getNotes())
                .createdBy(history.getCreatedBy())
                .createdAt(history.getCreatedAt())
                .updatedAt(history.getUpdatedAt())
                .build();

        if (history.getEpisode() != null) {
            dto.setEpisodeId(history.getEpisode().getId());
            dto.setEpisodeTitle(history.getEpisode().getTitle());
        }

        userRepository.findById(history.getCreatedBy()).ifPresent(user ->
                dto.setCreatedByName(user.getName()));

        return dto;
    }

    private String getFileExtension(String filename) {
        int lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex == -1) {
            return ".jpg";
        }
        return filename.substring(lastDotIndex).toLowerCase();
    }
}
