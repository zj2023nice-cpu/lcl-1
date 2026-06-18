package com.podcast.collab.repository;

import com.podcast.collab.entity.AdImpressionStat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AdImpressionStatRepository extends JpaRepository<AdImpressionStat, Long> {

    @Query("SELECT s FROM AdImpressionStat s WHERE s.advertisement.id = :adId")
    List<AdImpressionStat> findByAdId(@Param("adId") Long adId);

    @Query("SELECT s FROM AdImpressionStat s WHERE s.advertisement.id = :adId AND s.statDate BETWEEN :startDate AND :endDate")
    List<AdImpressionStat> findByAdIdAndDateRange(
            @Param("adId") Long adId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT s FROM AdImpressionStat s WHERE s.episode.id = :episodeId AND s.statDate BETWEEN :startDate AND :endDate")
    List<AdImpressionStat> findByEpisodeIdAndDateRange(
            @Param("episodeId") Long episodeId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT s FROM AdImpressionStat s WHERE s.advertisement.id = :adId " +
            "AND s.episode.id = :episodeId AND s.platform = :platform " +
            "AND s.region = :region AND s.audienceType = :audienceType AND s.statDate = :statDate")
    Optional<AdImpressionStat> findByUniqueKey(
            @Param("adId") Long adId,
            @Param("episodeId") Long episodeId,
            @Param("platform") String platform,
            @Param("region") String region,
            @Param("audienceType") String audienceType,
            @Param("statDate") LocalDate statDate);

    @Query("SELECT COALESCE(SUM(s.impressionCount), 0) FROM AdImpressionStat s WHERE s.advertisement.id = :adId")
    Long sumImpressionsByAdId(@Param("adId") Long adId);

    @Query("SELECT COALESCE(SUM(s.clickCount), 0) FROM AdImpressionStat s WHERE s.advertisement.id = :adId")
    Long sumClicksByAdId(@Param("adId") Long adId);
}
