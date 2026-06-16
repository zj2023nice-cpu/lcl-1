package com.podcast.collab.repository;

import com.podcast.collab.entity.Episode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EpisodeRepository extends JpaRepository<Episode, Long> {
    
    @Query("SELECT DISTINCT e FROM Episode e LEFT JOIN FETCH e.program p LEFT JOIN FETCH p.team LEFT JOIN FETCH e.annotations WHERE e.program.team.id = :teamId")
    List<Episode> findByTeamId(@Param("teamId") Long teamId);
    
    @Query("SELECT DISTINCT e FROM Episode e LEFT JOIN FETCH e.program p LEFT JOIN FETCH p.team LEFT JOIN FETCH e.annotations WHERE e.program.id = :programId AND e.program.team.id = :teamId")
    List<Episode> findByProgramIdAndTeamId(@Param("programId") Long programId, @Param("teamId") Long teamId);
    
    @Query("SELECT DISTINCT e FROM Episode e LEFT JOIN FETCH e.program p LEFT JOIN FETCH p.team LEFT JOIN FETCH e.annotations WHERE e.id = :id AND e.program.team.id = :teamId")
    Optional<Episode> findByIdAndTeamId(@Param("id") Long id, @Param("teamId") Long teamId);
    
    @Query("SELECT DISTINCT e FROM Episode e LEFT JOIN FETCH e.program p LEFT JOIN FETCH p.team LEFT JOIN FETCH e.annotations WHERE e.status = :status AND e.program.team.id = :teamId")
    List<Episode> findByStatusAndTeamId(@Param("status") Episode.Status status, @Param("teamId") Long teamId);
    
    @Query("SELECT COUNT(e) FROM Episode e WHERE e.program.team.id = :teamId")
    long countByTeamId(@Param("teamId") Long teamId);
}
