package com.podcast.collab.repository;

import com.podcast.collab.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    
    @Query("SELECT DISTINCT t FROM Task t LEFT JOIN FETCH t.team LEFT JOIN FETCH t.assignee LEFT JOIN FETCH t.createdBy LEFT JOIN FETCH t.annotations WHERE t.team.id = :teamId")
    List<Task> findByTeamId(@Param("teamId") Long teamId);
    
    @Query("SELECT DISTINCT t FROM Task t LEFT JOIN FETCH t.team LEFT JOIN FETCH t.assignee LEFT JOIN FETCH t.createdBy LEFT JOIN FETCH t.annotations WHERE t.id = :id AND t.team.id = :teamId")
    Optional<Task> findByIdAndTeamId(@Param("id") Long id, @Param("teamId") Long teamId);
    
    @Query("SELECT DISTINCT t FROM Task t LEFT JOIN FETCH t.team LEFT JOIN FETCH t.assignee LEFT JOIN FETCH t.createdBy LEFT JOIN FETCH t.annotations WHERE t.assignee.id = :userId AND t.team.id = :teamId")
    List<Task> findByAssigneeIdAndTeamId(@Param("userId") Long userId, @Param("teamId") Long teamId);
    
    @Query("SELECT DISTINCT t FROM Task t LEFT JOIN FETCH t.team LEFT JOIN FETCH t.assignee LEFT JOIN FETCH t.createdBy LEFT JOIN FETCH t.annotations WHERE t.status = :status AND t.team.id = :teamId")
    List<Task> findByStatusAndTeamId(@Param("status") Task.Status status, @Param("teamId") Long teamId);
    
    @Query("SELECT DISTINCT t FROM Task t LEFT JOIN FETCH t.team LEFT JOIN FETCH t.assignee LEFT JOIN FETCH t.createdBy LEFT JOIN FETCH t.annotations WHERE t.createdBy.id = :userId AND t.team.id = :teamId")
    List<Task> findByCreatedByIdAndTeamId(@Param("userId") Long userId, @Param("teamId") Long teamId);
    
    @Query("SELECT DISTINCT t FROM Task t LEFT JOIN FETCH t.team LEFT JOIN FETCH t.assignee LEFT JOIN FETCH t.createdBy LEFT JOIN FETCH t.annotations WHERE t.team.id = :teamId " +
           "AND (:status IS NULL OR t.status = :status) " +
           "AND (:priority IS NULL OR t.priority = :priority) " +
           "AND (:assigneeId IS NULL OR t.assignee.id = :assigneeId)")
    List<Task> findByTeamIdWithFilters(@Param("teamId") Long teamId,
                                        @Param("status") Task.Status status,
                                        @Param("priority") Task.Priority priority,
                                        @Param("assigneeId") Long assigneeId);
    
    @Query("SELECT COUNT(t) FROM Task t WHERE t.team.id = :teamId AND t.status <> :status")
    long countByTeamIdAndStatusNot(@Param("teamId") Long teamId, @Param("status") Task.Status status);
}
