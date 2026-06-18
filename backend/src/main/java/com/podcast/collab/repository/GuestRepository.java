package com.podcast.collab.repository;

import com.podcast.collab.entity.Guest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GuestRepository extends JpaRepository<Guest, Long> {

    @Query("SELECT g FROM Guest g WHERE g.teamId = :teamId ORDER BY g.createdAt DESC")
    List<Guest> findByTeamId(@Param("teamId") Long teamId);

    @Query("SELECT g FROM Guest g WHERE g.teamId = :teamId ORDER BY g.createdAt DESC")
    Page<Guest> findByTeamId(@Param("teamId") Long teamId, Pageable pageable);

    @Query("SELECT g FROM Guest g WHERE g.teamId = :teamId AND g.id = :id")
    Optional<Guest> findByTeamIdAndId(@Param("teamId") Long teamId, @Param("id") Long id);

    @Query("SELECT g FROM Guest g WHERE g.teamId = :teamId AND g.email = :email")
    Optional<Guest> findByTeamIdAndEmail(@Param("teamId") Long teamId, @Param("email") String email);

    boolean existsByTeamIdAndEmail(Long teamId, String email);

    @Query("SELECT g FROM Guest g WHERE g.teamId = :teamId AND g.isActive = :isActive ORDER BY g.createdAt DESC")
    List<Guest> findByTeamIdAndIsActive(@Param("teamId") Long teamId, @Param("isActive") Boolean isActive);

    @Query("SELECT g FROM Guest g WHERE g.teamId = :teamId AND " +
           "(LOWER(g.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(g.email) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(g.topicAreas) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY g.createdAt DESC")
    Page<Guest> searchByTeamId(@Param("teamId") Long teamId, @Param("keyword") String keyword, Pageable pageable);

    @Query("SELECT COUNT(g) FROM Guest g WHERE g.teamId = :teamId AND g.isActive = true")
    long countActiveGuestsByTeamId(@Param("teamId") Long teamId);

    @Query("SELECT COUNT(g) FROM Guest g WHERE g.teamId = :teamId")
    long countByTeamId(@Param("teamId") Long teamId);
}
