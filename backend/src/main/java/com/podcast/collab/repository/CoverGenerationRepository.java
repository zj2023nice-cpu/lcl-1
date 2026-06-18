package com.podcast.collab.repository;

import com.podcast.collab.entity.CoverGeneration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CoverGenerationRepository extends JpaRepository<CoverGeneration, Long> {

    @Query("SELECT cg FROM CoverGeneration cg LEFT JOIN FETCH cg.style WHERE cg.teamId = :teamId AND cg.episode.id = :episodeId ORDER BY cg.createdAt DESC")
    List<CoverGeneration> findByTeamIdAndEpisodeId(@Param("teamId") Long teamId, @Param("episodeId") Long episodeId);

    @Query("SELECT cg FROM CoverGeneration cg LEFT JOIN FETCH cg.style WHERE cg.teamId = :teamId AND cg.program.id = :programId ORDER BY cg.createdAt DESC")
    List<CoverGeneration> findByTeamIdAndProgramId(@Param("teamId") Long teamId, @Param("programId") Long programId);

    @Query("SELECT cg FROM CoverGeneration cg LEFT JOIN FETCH cg.style WHERE cg.id = :id AND cg.teamId = :teamId")
    Optional<CoverGeneration> findByIdAndTeamId(@Param("id") Long id, @Param("teamId") Long teamId);

    @Query("SELECT cg FROM CoverGeneration cg LEFT JOIN FETCH cg.style WHERE cg.teamId = :teamId ORDER BY cg.createdAt DESC")
    List<CoverGeneration> findByTeamId(@Param("teamId") Long teamId);

    @Query("SELECT cg FROM CoverGeneration cg WHERE cg.teamId = :teamId AND cg.episode.id = :episodeId AND cg.isSelected = true")
    List<CoverGeneration> findSelectedByEpisodeId(@Param("teamId") Long teamId, @Param("episodeId") Long episodeId);

    @Query("SELECT cg FROM CoverGeneration cg WHERE cg.teamId = :teamId AND cg.program.id = :programId AND cg.isSelected = true")
    List<CoverGeneration> findSelectedByProgramId(@Param("teamId") Long teamId, @Param("programId") Long programId);

    @Modifying
    @Query("UPDATE CoverGeneration cg SET cg.isSelected = false WHERE cg.teamId = :teamId AND cg.episode.id = :episodeId AND cg.id <> :excludeId")
    void unselectOtherEpisodeCovers(@Param("teamId") Long teamId, @Param("episodeId") Long episodeId, @Param("excludeId") Long excludeId);

    @Modifying
    @Query("UPDATE CoverGeneration cg SET cg.isSelected = false WHERE cg.teamId = :teamId AND cg.program.id = :programId AND cg.id <> :excludeId")
    void unselectOtherProgramCovers(@Param("teamId") Long teamId, @Param("programId") Long programId, @Param("excludeId") Long excludeId);
}
