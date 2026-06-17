package com.podcast.collab.repository;

import com.podcast.collab.entity.Subtitle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubtitleRepository extends JpaRepository<Subtitle, Long> {

    @Query("SELECT s FROM Subtitle s WHERE s.audioVersion.id = :audioVersionId AND s.audioVersion.episode.program.team.id = :teamId")
    List<Subtitle> findByAudioVersionIdAndTeamId(@Param("audioVersionId") Long audioVersionId, @Param("teamId") Long teamId);

    @Query("SELECT s FROM Subtitle s WHERE s.id = :id AND s.audioVersion.episode.program.team.id = :teamId")
    Optional<Subtitle> findByIdAndTeamId(@Param("id") Long id, @Param("teamId") Long teamId);

    @Query("SELECT s FROM Subtitle s WHERE s.audioVersion.episode.id = :episodeId AND s.audioVersion.episode.program.team.id = :teamId")
    List<Subtitle> findByEpisodeIdAndTeamId(@Param("episodeId") Long episodeId, @Param("teamId") Long teamId);

    @Query("SELECT s FROM Subtitle s WHERE s.audioVersion.id = :audioVersionId AND s.language = :language")
    Optional<Subtitle> findByAudioVersionIdAndLanguage(@Param("audioVersionId") Long audioVersionId, @Param("language") String language);

    @Query("SELECT s FROM Subtitle s JOIN FETCH s.cues WHERE s.id = :id AND s.audioVersion.episode.program.team.id = :teamId")
    Optional<Subtitle> findByIdWithCuesAndTeamId(@Param("id") Long id, @Param("teamId") Long teamId);
}
