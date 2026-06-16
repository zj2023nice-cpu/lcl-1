package com.podcast.collab.repository;

import com.podcast.collab.entity.Invitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvitationRepository extends JpaRepository<Invitation, Long> {
    
    Optional<Invitation> findByToken(String token);
    
    @Query("SELECT i FROM Invitation i WHERE i.team.id = :teamId")
    List<Invitation> findByTeamId(@Param("teamId") Long teamId);
    
    @Query("SELECT i FROM Invitation i WHERE i.email = :email AND i.team.id = :teamId AND i.accepted = false")
    Optional<Invitation> findPendingByEmailAndTeamId(@Param("email") String email, @Param("teamId") Long teamId);
    
    @Query("SELECT i FROM Invitation i WHERE i.inviter.id = :inviterId AND i.team.id = :teamId")
    List<Invitation> findByInviterIdAndTeamId(@Param("inviterId") Long inviterId, @Param("teamId") Long teamId);
    
    @Query("DELETE FROM Invitation i WHERE i.expiresAt < :now AND i.accepted = false")
    void deleteExpiredInvitations(@Param("now") LocalDateTime now);
    
    boolean existsByToken(String token);
}
