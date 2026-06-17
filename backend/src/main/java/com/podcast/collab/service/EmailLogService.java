package com.podcast.collab.service;

import com.podcast.collab.dto.EmailLogDTO;
import com.podcast.collab.entity.EmailLog;
import com.podcast.collab.repository.EmailLogRepository;
import com.podcast.collab.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EmailLogService {

    private final EmailLogRepository emailLogRepository;
    private final SecurityUtil securityUtil;

    @Transactional(readOnly = true)
    public Page<EmailLogDTO> getEmailLogs(int page, int size, String status, String templateKey) {
        Long teamId = securityUtil.getCurrentTeamId();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<EmailLog> logs;

        if (status != null && !status.isEmpty()) {
            EmailLog.EmailStatus emailStatus = EmailLog.EmailStatus.valueOf(status.toUpperCase());
            logs = emailLogRepository.findByTeamIdAndStatus(teamId, emailStatus, pageable);
        } else if (templateKey != null && !templateKey.isEmpty()) {
            logs = emailLogRepository.findByTeamIdAndTemplateKey(teamId, templateKey, pageable);
        } else {
            logs = emailLogRepository.findByTeamId(teamId, pageable);
        }

        return logs.map(EmailLogDTO::fromEntity);
    }

    @Transactional(readOnly = true)
    public EmailLogDTO getEmailLog(Long id) {
        Long teamId = securityUtil.getCurrentTeamId();
        EmailLog log = emailLogRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("邮件记录不存在"));

        if (!log.getTeamId().equals(teamId)) {
            throw new IllegalArgumentException("无权查看其他团队的邮件记录");
        }

        return EmailLogDTO.fromEntity(log);
    }

    @Transactional(readOnly = true)
    public long getEmailCountByStatus(EmailLog.EmailStatus status) {
        Long teamId = securityUtil.getCurrentTeamId();
        return emailLogRepository.countByTeamIdAndStatus(teamId, status);
    }
}
