package com.podcast.collab.repository;

import com.podcast.collab.entity.Annotation;
import com.podcast.collab.entity.Episode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AnnotationRepository extends JpaRepository<Annotation, Long> {
    
    @Query("SELECT a FROM Annotation a WHERE a.episode.program.team.id = :teamId")
    List<Annotation> findByTeamId(@Param("teamId") Long teamId);
    
    @Query("SELECT a FROM Annotation a WHERE a.episode.id = :episodeId AND a.episode.program.team.id = :teamId")
    List<Annotation> findByEpisodeIdAndTeamId(@Param("episodeId") Long episodeId, @Param("teamId") Long teamId);
    
    @Query("SELECT a FROM Annotation a WHERE a.assignee.id = :userId AND a.episode.program.team.id = :teamId")
    List<Annotation> findByAssigneeIdAndTeamId(@Param("userId") Long userId, @Param("teamId") Long teamId);
    
    @Query("SELECT a FROM Annotation a WHERE a.id = :id AND a.episode.program.team.id = :teamId")
    Optional<Annotation> findByIdAndTeamId(@Param("id") Long id, @Param("teamId") Long teamId);
    
    @Query("SELECT a FROM Annotation a WHERE a.status = :status AND a.episode.program.team.id = :teamId")
    List<Annotation> findByStatusAndTeamId(@Param("status") Annotation.Status status, @Param("teamId") Long teamId);
    
    long countByEpisode(Episode episode);
}
