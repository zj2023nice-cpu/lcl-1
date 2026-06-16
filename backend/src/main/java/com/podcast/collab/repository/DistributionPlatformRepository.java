package com.podcast.collab.repository;

import com.podcast.collab.entity.DistributionPlatform;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DistributionPlatformRepository extends JpaRepository<DistributionPlatform, Long> {
    
    @Query("SELECT dp FROM DistributionPlatform dp WHERE dp.team.id = :teamId")
    List<DistributionPlatform> findByTeamId(@Param("teamId") Long teamId);
    
    @Query("SELECT dp FROM DistributionPlatform dp WHERE dp.id = :id AND dp.team.id = :teamId")
    Optional<DistributionPlatform> findByIdAndTeamId(@Param("id") Long id, @Param("teamId") Long teamId);
    
    @Query("SELECT dp FROM DistributionPlatform dp WHERE dp.type = :type AND dp.team.id = :teamId")
    List<DistributionPlatform> findByTypeAndTeamId(@Param("type") DistributionPlatform.PlatformType type, @Param("teamId") Long teamId);
}
