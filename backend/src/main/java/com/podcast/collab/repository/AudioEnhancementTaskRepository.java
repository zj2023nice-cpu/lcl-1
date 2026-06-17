package com.podcast.collab.repository;

import com.podcast.collab.entity.AudioEnhancementTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AudioEnhancementTaskRepository extends JpaRepository<AudioEnhancementTask, Long> {

    @Query("SELECT t FROM AudioEnhancementTask t WHERE t.teamId = :teamId ORDER BY t.createdAt DESC")
    List<AudioEnhancementTask> findByTeamId(@Param("teamId") Long teamId);

    @Query("SELECT t FROM AudioEnhancementTask t WHERE t.episodeId = :episodeId ORDER BY t.createdAt DESC")
    List<AudioEnhancementTask> findByEpisodeId(@Param("episodeId") Long episodeId);

    @Query("SELECT t FROM AudioEnhancementTask t WHERE t.id = :id AND t.teamId = :teamId")
    Optional<AudioEnhancementTask> findByIdAndTeamId(@Param("id") Long id, @Param("teamId") Long teamId);

    @Query("SELECT t FROM AudioEnhancementTask t WHERE t.createdBy = :userId ORDER BY t.createdAt DESC")
    List<AudioEnhancementTask> findByCreatedBy(@Param("userId") Long userId);

    @Query("SELECT t FROM AudioEnhancementTask t WHERE t.status IN (:statuses) ORDER BY t.createdAt ASC")
    List<AudioEnhancementTask> findByStatusIn(@Param("statuses") List<AudioEnhancementTask.TaskStatus> statuses);
}
