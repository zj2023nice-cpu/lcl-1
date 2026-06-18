package com.podcast.collab.repository;

import com.podcast.collab.entity.AdPlacementRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AdPlacementRuleRepository extends JpaRepository<AdPlacementRule, Long> {

    @Query("SELECT r FROM AdPlacementRule r WHERE r.teamId = :teamId")
    List<AdPlacementRule> findByTeamId(@Param("teamId") Long teamId);

    @Query("SELECT r FROM AdPlacementRule r WHERE r.id = :id AND r.teamId = :teamId")
    Optional<AdPlacementRule> findByIdAndTeamId(@Param("id") Long id, @Param("teamId") Long teamId);

    @Query("SELECT r FROM AdPlacementRule r WHERE r.teamId = :teamId AND r.isEnabled = true")
    List<AdPlacementRule> findEnabledByTeamId(@Param("teamId") Long teamId);

    @Query("SELECT r FROM AdPlacementRule r WHERE r.teamId = :teamId AND r.isEnabled = true " +
            "AND r.positionType = :positionType")
    List<AdPlacementRule> findEnabledByTeamIdAndPositionType(
            @Param("teamId") Long teamId,
            @Param("positionType") AdPlacementRule.PositionType positionType);

    @Query("SELECT r FROM AdPlacementRule r WHERE r.advertisement.id = :adId AND r.teamId = :teamId")
    List<AdPlacementRule> findByAdIdAndTeamId(@Param("adId") Long adId, @Param("teamId") Long teamId);

    boolean existsByIdAndTeamId(Long id, Long teamId);
}
