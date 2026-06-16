package com.podcast.collab.repository;

import com.podcast.collab.entity.AuditLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    
    @Query("SELECT al FROM AuditLog al JOIN FETCH al.user WHERE al.team.id = :teamId ORDER BY al.createdAt DESC")
    List<AuditLog> findByTeamId(@Param("teamId") Long teamId);
    
    @Query("SELECT al FROM AuditLog al WHERE al.user.id = :userId AND al.team.id = :teamId ORDER BY al.createdAt DESC")
    List<AuditLog> findByUserIdAndTeamId(@Param("userId") Long userId, @Param("teamId") Long teamId);
    
    @Query("SELECT al FROM AuditLog al WHERE al.entityType = :entityType AND al.entityId = :entityId AND al.team.id = :teamId ORDER BY al.createdAt DESC")
    List<AuditLog> findByEntityTypeAndEntityIdAndTeamId(@Param("entityType") String entityType, @Param("entityId") Long entityId, @Param("teamId") Long teamId);
    
    @Query("SELECT al FROM AuditLog al WHERE al.team.id = :teamId AND al.createdAt BETWEEN :start AND :end ORDER BY al.createdAt DESC")
    List<AuditLog> findByTeamIdAndCreatedAtBetween(@Param("teamId") Long teamId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
    
    @Query("SELECT al FROM AuditLog al WHERE al.team.id = :teamId AND al.action = :action ORDER BY al.createdAt DESC")
    List<AuditLog> findByTeamIdAndAction(@Param("teamId") Long teamId, @Param("action") String action);
    
    @Query("SELECT al FROM AuditLog al JOIN FETCH al.user WHERE al.team.id = :teamId ORDER BY al.createdAt DESC")
    List<AuditLog> findRecentByTeamId(@Param("teamId") Long teamId, Pageable pageable);
    
    @Query("SELECT al FROM AuditLog al JOIN FETCH al.user WHERE al.team.id = :teamId " +
           "AND (:action IS NULL OR al.action = :action) " +
           "AND (:userId IS NULL OR al.user.id = :userId) " +
           "AND (:start IS NULL OR al.createdAt >= :start) " +
           "AND (:end IS NULL OR al.createdAt <= :end) " +
           "ORDER BY al.createdAt DESC")
    List<AuditLog> findByTeamIdWithFilters(@Param("teamId") Long teamId,
                                            @Param("action") String action,
                                            @Param("userId") Long userId,
                                            @Param("start") LocalDateTime start,
                                            @Param("end") LocalDateTime end);
}
