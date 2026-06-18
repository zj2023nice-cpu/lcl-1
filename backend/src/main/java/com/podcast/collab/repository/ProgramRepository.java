package com.podcast.collab.repository;

import com.podcast.collab.entity.Program;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProgramRepository extends JpaRepository<Program, Long> {
    
    @Query("SELECT p FROM Program p LEFT JOIN FETCH p.team LEFT JOIN FETCH p.episodes WHERE p.team.id = :teamId")
    List<Program> findByTeamId(@Param("teamId") Long teamId);
    
    @Query("SELECT p FROM Program p LEFT JOIN FETCH p.team LEFT JOIN FETCH p.episodes WHERE p.id = :id AND p.team.id = :teamId")
    Optional<Program> findByIdAndTeamId(@Param("id") Long id, @Param("teamId") Long teamId);
    
    boolean existsByNameAndTeamId(String name, Long teamId);
    
    @Query("SELECT COUNT(p) FROM Program p WHERE p.team.id = :teamId")
    long countByTeamId(@Param("teamId") Long teamId);

    @Query("SELECT COUNT(p) > 0 FROM Program p WHERE p.id = :id AND p.team.id = :teamId")
    boolean existsByIdAndTeamId(@Param("id") Long id, @Param("teamId") Long teamId);
}
