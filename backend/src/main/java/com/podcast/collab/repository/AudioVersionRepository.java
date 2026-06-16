package com.podcast.collab.repository;

import com.podcast.collab.entity.AudioVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AudioVersionRepository extends JpaRepository<AudioVersion, Long> {

    // 根据集数ID和团队ID查询所有版本（按版本号降序）
    @Query("SELECT av FROM AudioVersion av WHERE av.episode.id = :episodeId AND av.episode.program.team.id = :teamId ORDER BY av.version DESC")
    List<AudioVersion> findByEpisodeIdAndTeamId(@Param("episodeId") Long episodeId, @Param("teamId") Long teamId);

    // 根据版本ID和团队ID查询
    @Query("SELECT av FROM AudioVersion av WHERE av.id = :id AND av.episode.program.team.id = :teamId")
    Optional<AudioVersion> findByIdAndTeamId(@Param("id") Long id, @Param("teamId") Long teamId);

    // 根据集数ID、版本号和团队ID查询
    @Query("SELECT av FROM AudioVersion av WHERE av.episode.id = :episodeId AND av.version = :version AND av.episode.program.team.id = :teamId")
    Optional<AudioVersion> findByEpisodeIdAndVersionAndTeamId(@Param("episodeId") Long episodeId, @Param("version") Integer version, @Param("teamId") Long teamId);

    // 根据集数ID查询最大版本号
    @Query("SELECT MAX(av.version) FROM AudioVersion av WHERE av.episode.id = :episodeId")
    Integer findMaxVersionByEpisodeId(@Param("episodeId") Long episodeId);

    // 根据集数ID查询所有版本，按版本号降序排列
    @Query("SELECT av FROM AudioVersion av WHERE av.episode.id = :episodeId ORDER BY av.version DESC")
    List<AudioVersion> findByEpisodeIdOrderByVersionDesc(@Param("episodeId") Long episodeId);

    // 统计指定集数的版本数量
    long countByEpisodeId(Long episodeId);
}
