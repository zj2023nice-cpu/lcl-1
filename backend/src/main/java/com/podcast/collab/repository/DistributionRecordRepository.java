package com.podcast.collab.repository;

import com.podcast.collab.entity.DistributionRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DistributionRecordRepository extends JpaRepository<DistributionRecord, Long> {
    
    @Query("SELECT dr FROM DistributionRecord dr WHERE dr.episode.program.team.id = :teamId")
    List<DistributionRecord> findByTeamId(@Param("teamId") Long teamId);
    
    @Query("SELECT dr FROM DistributionRecord dr WHERE dr.episode.id = :episodeId AND dr.episode.program.team.id = :teamId")
    List<DistributionRecord> findByEpisodeIdAndTeamId(@Param("episodeId") Long episodeId, @Param("teamId") Long teamId);
    
    @Query("SELECT dr FROM DistributionRecord dr WHERE dr.platform.id = :platformId AND dr.episode.program.team.id = :teamId")
    List<DistributionRecord> findByPlatformIdAndTeamId(@Param("platformId") Long platformId, @Param("teamId") Long teamId);
    
    @Query("SELECT dr FROM DistributionRecord dr WHERE dr.id = :id AND dr.episode.program.team.id = :teamId")
    Optional<DistributionRecord> findByIdAndTeamId(@Param("id") Long id, @Param("teamId") Long teamId);
    
    @Query("SELECT dr FROM DistributionRecord dr WHERE dr.status = :status AND dr.episode.program.team.id = :teamId")
    List<DistributionRecord> findByStatusAndTeamId(@Param("status") DistributionRecord.Status status, @Param("teamId") Long teamId);
}
