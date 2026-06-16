package com.podcast.collab.repository;

import com.podcast.collab.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    Optional<User> findByEmail(String email);
    
    boolean existsByEmail(String email);
    
    @Query("SELECT u FROM User u WHERE u.team.id = :teamId AND u.isActive = true")
    List<User> findByTeamId(@Param("teamId") Long teamId);
    
    @Query("SELECT u FROM User u WHERE u.team.id = :teamId AND u.role = :role AND u.isActive = true")
    List<User> findByTeamIdAndRole(@Param("teamId") Long teamId, @Param("role") User.Role role);
}
