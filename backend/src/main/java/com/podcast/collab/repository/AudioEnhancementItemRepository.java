package com.podcast.collab.repository;

import com.podcast.collab.entity.AudioEnhancementItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AudioEnhancementItemRepository extends JpaRepository<AudioEnhancementItem, Long> {

    @Query("SELECT i FROM AudioEnhancementItem i WHERE i.task.id = :taskId ORDER BY i.id ASC")
    List<AudioEnhancementItem> findByTaskId(@Param("taskId") Long taskId);

    @Query("SELECT i FROM AudioEnhancementItem i WHERE i.task.id = :taskId AND i.status = :status")
    List<AudioEnhancementItem> findByTaskIdAndStatus(@Param("taskId") Long taskId, @Param("status") AudioEnhancementItem.ItemStatus status);

    @Query("SELECT i FROM AudioEnhancementItem i WHERE i.sourceAudioVersionId = :sourceAudioVersionId ORDER BY i.id DESC")
    List<AudioEnhancementItem> findBySourceAudioVersionId(@Param("sourceAudioVersionId") Long sourceAudioVersionId);

    @Query("SELECT i FROM AudioEnhancementItem i WHERE i.id = :id AND i.task.teamId = :teamId")
    Optional<AudioEnhancementItem> findByIdAndTeamId(@Param("id") Long id, @Param("teamId") Long teamId);

    @Query("SELECT COUNT(i) FROM AudioEnhancementItem i WHERE i.task.id = :taskId AND i.status = :status")
    long countByTaskIdAndStatus(@Param("taskId") Long taskId, @Param("status") AudioEnhancementItem.ItemStatus status);
}
