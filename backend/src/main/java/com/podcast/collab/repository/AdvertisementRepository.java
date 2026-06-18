package com.podcast.collab.repository;

import com.podcast.collab.entity.Advertisement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AdvertisementRepository extends JpaRepository<Advertisement, Long> {

    @Query("SELECT a FROM Advertisement a WHERE a.teamId = :teamId")
    List<Advertisement> findByTeamId(@Param("teamId") Long teamId);

    @Query("SELECT a FROM Advertisement a WHERE a.id = :id AND a.teamId = :teamId")
    Optional<Advertisement> findByIdAndTeamId(@Param("id") Long id, @Param("teamId") Long teamId);

    @Query("SELECT a FROM Advertisement a WHERE a.teamId = :teamId AND a.status = :status")
    List<Advertisement> findByTeamIdAndStatus(@Param("teamId") Long teamId, @Param("status") Advertisement.AdStatus status);

    @Query("SELECT a FROM Advertisement a WHERE a.teamId = :teamId AND a.status = 'ACTIVE' " +
            "AND (a.startDate IS NULL OR a.startDate <= :today) " +
            "AND (a.endDate IS NULL OR a.endDate >= :today) " +
            "AND (a.maxImpressions = 0 OR a.currentImpressions < a.maxImpressions)")
    List<Advertisement> findActiveAdsByTeamId(@Param("teamId") Long teamId, @Param("today") LocalDate today);

    boolean existsByIdAndTeamId(Long id, Long teamId);
}
