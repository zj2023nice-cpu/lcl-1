package com.podcast.collab.repository;

import com.podcast.collab.entity.EpisodeAdInsertion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EpisodeAdInsertionRepository extends JpaRepository<EpisodeAdInsertion, Long> {

    @Query("SELECT i FROM EpisodeAdInsertion i WHERE i.episode.id = :episodeId")
    List<EpisodeAdInsertion> findByEpisodeId(@Param("episodeId") Long episodeId);

    @Query("SELECT i FROM EpisodeAdInsertion i WHERE i.episode.id = :episodeId AND i.platform = :platform")
    List<EpisodeAdInsertion> findByEpisodeIdAndPlatform(@Param("episodeId") Long episodeId, @Param("platform") String platform);

    @Query("SELECT i FROM EpisodeAdInsertion i WHERE i.episode.id = :episodeId AND i.platform = :platform AND i.versionNumber = :versionNumber")
    List<EpisodeAdInsertion> findByEpisodeIdAndPlatformAndVersionNumber(
            @Param("episodeId") Long episodeId,
            @Param("platform") String platform,
            @Param("versionNumber") Integer versionNumber);

    @Query("SELECT MAX(i.versionNumber) FROM EpisodeAdInsertion i WHERE i.episode.id = :episodeId AND i.platform = :platform")
    Integer findMaxVersionNumberByEpisodeIdAndPlatform(@Param("episodeId") Long episodeId, @Param("platform") String platform);

    @Query("SELECT DISTINCT i.platform FROM EpisodeAdInsertion i WHERE i.episode.id = :episodeId")
    List<String> findDistinctPlatformsByEpisodeId(@Param("episodeId") Long episodeId);

    @Query("SELECT DISTINCT i.versionNumber FROM EpisodeAdInsertion i WHERE i.episode.id = :episodeId AND i.platform = :platform ORDER BY i.versionNumber DESC")
    List<Integer> findDistinctVersionsByEpisodeIdAndPlatform(@Param("episodeId") Long episodeId, @Param("platform") String platform);
}
