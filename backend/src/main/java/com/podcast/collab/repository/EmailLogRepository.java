package com.podcast.collab.repository;

import com.podcast.collab.entity.EmailLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EmailLogRepository extends JpaRepository<EmailLog, Long> {

    Page<EmailLog> findByTeamId(Long teamId, Pageable pageable);

    Page<EmailLog> findByTeamIdAndTemplateKey(Long teamId, String templateKey, Pageable pageable);

    Page<EmailLog> findByTeamIdAndStatus(Long teamId, EmailLog.EmailStatus status, Pageable pageable);

    @Query("SELECT e FROM EmailLog e WHERE e.status IN :statuses AND e.nextRetryAt <= :now AND e.retryCount < e.maxRetries ORDER BY e.nextRetryAt ASC")
    List<EmailLog> findEmailsToRetry(@Param("statuses") List<EmailLog.EmailStatus> statuses, @Param("now") LocalDateTime now, Pageable pageable);

    long countByTeamIdAndStatus(Long teamId, EmailLog.EmailStatus status);

    List<EmailLog> findByTeamIdAndRelatedEntityTypeAndRelatedEntityId(Long teamId, String relatedEntityType, Long relatedEntityId);
}
