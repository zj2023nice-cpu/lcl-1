package com.podcast.collab.repository;

import com.podcast.collab.entity.ShareLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ShareLinkRepository extends JpaRepository<ShareLink, Long> {

    Optional<ShareLink> findByToken(String token);

    @Query("SELECT sl FROM ShareLink sl WHERE sl.team.id = :teamId ORDER BY sl.createdAt DESC")
    List<ShareLink> findByTeamId(@Param("teamId") Long teamId);

    @Query("SELECT sl FROM ShareLink sl WHERE sl.episode.id = :episodeId ORDER BY sl.createdAt DESC")
    List<ShareLink> findByEpisodeId(@Param("episodeId") Long episodeId);

    @Query("SELECT sl FROM ShareLink sl WHERE sl.team.id = :teamId AND sl.episode.id = :episodeId ORDER BY sl.createdAt DESC")
    List<ShareLink> findByTeamIdAndEpisodeId(@Param("teamId") Long teamId, @Param("episodeId") Long episodeId);

    @Query("SELECT sl FROM ShareLink sl WHERE sl.id = :id AND sl.team.id = :teamId")
    Optional<ShareLink> findByIdAndTeamId(@Param("id") Long id, @Param("teamId") Long teamId);

    @Modifying
    @Query("DELETE FROM ShareLink sl WHERE sl.expiresAt < :date")
    int deleteByExpiresAtBefore(@Param("date") LocalDateTime date);
}
