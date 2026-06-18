package com.podcast.collab.repository;

import com.podcast.collab.entity.GuestCollaborationHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GuestCollaborationHistoryRepository extends JpaRepository<GuestCollaborationHistory, Long> {

    @Query("SELECT h FROM GuestCollaborationHistory h WHERE h.teamId = :teamId AND h.guest.id = :guestId ORDER BY h.createdAt DESC")
    List<GuestCollaborationHistory> findByTeamIdAndGuestId(@Param("teamId") Long teamId, @Param("guestId") Long guestId);

    @Query("SELECT h FROM GuestCollaborationHistory h WHERE h.teamId = :teamId AND h.id = :id")
    Optional<GuestCollaborationHistory> findByTeamIdAndId(@Param("teamId") Long teamId, @Param("id") Long id);

    @Query("SELECT h FROM GuestCollaborationHistory h WHERE h.teamId = :teamId AND h.episode.id = :episodeId ORDER BY h.createdAt DESC")
    List<GuestCollaborationHistory> findByTeamIdAndEpisodeId(@Param("teamId") Long teamId, @Param("episodeId") Long episodeId);

    @Query("SELECT COUNT(h) FROM GuestCollaborationHistory h WHERE h.teamId = :teamId AND h.guest.id = :guestId")
    long countByTeamIdAndGuestId(@Param("teamId") Long teamId, @Param("guestId") Long guestId);

    @Query("SELECT h FROM GuestCollaborationHistory h WHERE h.teamId = :teamId ORDER BY h.createdAt DESC")
    List<GuestCollaborationHistory> findByTeamId(@Param("teamId") Long teamId);
}
