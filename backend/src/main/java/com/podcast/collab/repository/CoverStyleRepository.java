package com.podcast.collab.repository;

import com.podcast.collab.entity.CoverStyle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CoverStyleRepository extends JpaRepository<CoverStyle, Long> {

    @Query("SELECT cs FROM CoverStyle cs WHERE (cs.isSystem = true OR cs.teamId = :teamId) ORDER BY cs.sortOrder ASC, cs.id ASC")
    List<CoverStyle> findAvailableStyles(@Param("teamId") Long teamId);

    @Query("SELECT cs FROM CoverStyle cs WHERE cs.styleKey = :styleKey AND (cs.isSystem = true OR cs.teamId = :teamId)")
    Optional<CoverStyle> findByStyleKeyAndTeam(@Param("styleKey") String styleKey, @Param("teamId") Long teamId);

    @Query("SELECT cs FROM CoverStyle cs WHERE cs.id = :id AND (cs.isSystem = true OR cs.teamId = :teamId)")
    Optional<CoverStyle> findByIdAndTeam(@Param("id") Long id, @Param("teamId") Long teamId);

    List<CoverStyle> findByTeamId(Long teamId);

    Optional<CoverStyle> findByStyleKey(String styleKey);
}
