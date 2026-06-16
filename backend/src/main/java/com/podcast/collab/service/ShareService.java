package com.podcast.collab.service;

import com.podcast.collab.entity.*;
import com.podcast.collab.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ShareService {

    private final ShareLinkRepository shareLinkRepository;
    private final ShareAccessLogRepository shareAccessLogRepository;
    private final EpisodeRepository episodeRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final AudioVersionRepository audioVersionRepository;
    private final AuditService auditService;

    private static final int TOKEN_LENGTH = 32;
    private static final SecureRandom secureRandom = new SecureRandom();
    private static final Base64.Encoder base64Encoder = Base64.getUrlEncoder().withoutPadding();

    @Transactional
    public ShareLink createShareLink(Long teamId, Long episodeId, Long userId, Integer daysValid) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("团队不存在"));

        Episode episode = episodeRepository.findByIdAndTeamId(episodeId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("集数不存在或不属于当前团队"));

        User creator = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("用户不存在"));

        int validDays = (daysValid != null && daysValid > 0) ? daysValid : 7;
        String token = generateUniqueToken();
        LocalDateTime expiresAt = LocalDateTime.now().plusDays(validDays);

        ShareLink shareLink = ShareLink.builder()
                .team(team)
                .episode(episode)
                .token(token)
                .createdBy(creator)
                .expiresAt(expiresAt)
                .accessCount(0)
                .build();

        shareLink = shareLinkRepository.save(shareLink);

        auditService.logAction(team, creator, "CREATE_SHARE_LINK",
                "SHARE_LINK", shareLink.getId(),
                Map.of(
                        "episodeId", episodeId,
                        "episodeTitle", episode.getTitle(),
                        "daysValid", validDays,
                        "expiresAt", expiresAt.toString()
                ));

        log.info("创建分享链接: token={}, teamId={}, episodeId={}, userId={}",
                token.substring(0, 8) + "...", teamId, episodeId, userId);

        return shareLink;
    }

    @Transactional
    public ShareLink validateAndAccess(String token, String ip, String userAgent) {
        ShareLink shareLink = shareLinkRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("分享链接不存在"));

        if (shareLink.isExpired()) {
            throw new IllegalStateException("分享链接已过期");
        }

        shareLink.setAccessCount(shareLink.getAccessCount() + 1);
        shareLinkRepository.save(shareLink);

        ShareAccessLog accessLog = ShareAccessLog.builder()
                .shareLink(shareLink)
                .ipAddress(ip)
                .userAgent(userAgent)
                .build();
        shareAccessLogRepository.save(accessLog);

        log.debug("分享链接访问: token={}, ip={}, accessCount={}",
                token.substring(0, 8) + "...", ip, shareLink.getAccessCount());

        return shareLink;
    }

    @Transactional(readOnly = true)
    public List<ShareLink> getShareLinks(Long teamId, Long episodeId) {
        if (episodeId != null) {
            return shareLinkRepository.findByTeamIdAndEpisodeId(teamId, episodeId);
        }
        return shareLinkRepository.findByTeamId(teamId);
    }

    @Transactional
    public void revokeShareLink(Long teamId, Long id, Long userId) {
        ShareLink shareLink = shareLinkRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("分享链接不存在或不属于当前团队"));

        User user = userRepository.findById(userId).orElse(null);
        Team team = shareLink.getTeam();

        shareLinkRepository.delete(shareLink);

        auditService.logAction(team, user, "REVOKE_SHARE_LINK",
                "SHARE_LINK", id,
                Map.of(
                        "episodeId", shareLink.getEpisode().getId(),
                        "episodeTitle", shareLink.getEpisode().getTitle(),
                        "originalAccessCount", shareLink.getAccessCount()
                ));

        log.info("撤销分享链接: id={}, teamId={}, userId={}", id, teamId, userId);
    }

    @Transactional(readOnly = true)
    public AudioVersion getCurrentAudioVersionForShare(ShareLink shareLink) {
        Episode episode = shareLink.getEpisode();
        return audioVersionRepository
                .findByEpisodeIdAndVersionAndTeamId(
                        episode.getId(),
                        episode.getCurrentVersion(),
                        shareLink.getTeam().getId()
                )
                .orElse(null);
    }

    @Transactional
    public int cleanupExpiredShareLinks() {
        LocalDateTime now = LocalDateTime.now();
        int deleted = shareLinkRepository.deleteByExpiresAtBefore(now);
        if (deleted > 0) {
            log.info("清理过期分享链接: 删除{}条记录", deleted);
        }
        return deleted;
    }

    private String generateUniqueToken() {
        String token;
        do {
            byte[] randomBytes = new byte[TOKEN_LENGTH];
            secureRandom.nextBytes(randomBytes);
            token = base64Encoder.encodeToString(randomBytes);
        } while (shareLinkRepository.findByToken(token).isPresent());
        return token;
    }
}
