package com.podcast.collab.repository;

import com.podcast.collab.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    
    @Query("SELECT n FROM Notification n WHERE n.user.id = :userId AND n.team.id = :teamId ORDER BY n.createdAt DESC")
    List<Notification> findByUserIdAndTeamId(@Param("userId") Long userId, @Param("teamId") Long teamId);
    
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.user.id = :userId AND n.team.id = :teamId AND n.isRead = false")
    Long countUnreadByUserIdAndTeamId(@Param("userId") Long userId, @Param("teamId") Long teamId);
    
    @Query("SELECT n FROM Notification n WHERE n.user.id = :userId AND n.team.id = :teamId AND n.isRead = false ORDER BY n.createdAt DESC")
    List<Notification> findUnreadByUserIdAndTeamId(@Param("userId") Long userId, @Param("teamId") Long teamId);
}
