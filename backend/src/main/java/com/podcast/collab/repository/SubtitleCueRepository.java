package com.podcast.collab.repository;

import com.podcast.collab.entity.SubtitleCue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface SubtitleCueRepository extends JpaRepository<SubtitleCue, Long> {

    @Query("SELECT sc FROM SubtitleCue sc WHERE sc.subtitle.id = :subtitleId ORDER BY sc.order ASC")
    List<SubtitleCue> findBySubtitleIdOrderByOrderAsc(@Param("subtitleId") Long subtitleId);

    @Query("SELECT sc FROM SubtitleCue sc WHERE sc.id = :id AND sc.subtitle.audioVersion.episode.program.team.id = :teamId")
    Optional<SubtitleCue> findByIdAndTeamId(@Param("id") Long id, @Param("teamId") Long teamId);

    @Query("SELECT sc FROM SubtitleCue sc WHERE sc.subtitle.id = :subtitleId AND sc.startTime <= :time AND sc.endTime >= :time ORDER BY sc.order ASC")
    List<SubtitleCue> findBySubtitleIdAndTimeRange(@Param("subtitleId") Long subtitleId, @Param("time") BigDecimal time);

    @Query("SELECT MAX(sc.order) FROM SubtitleCue sc WHERE sc.subtitle.id = :subtitleId")
    Integer findMaxOrderBySubtitleId(@Param("subtitleId") Long subtitleId);

    void deleteBySubtitleId(Long subtitleId);
}
