package com.podcast.collab.repository;

import com.podcast.collab.entity.EpisodeSortHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EpisodeSortHistoryRepository extends JpaRepository<EpisodeSortHistory, Long> {
    
    @Query("SELECT h FROM EpisodeSortHistory h WHERE h.programId = :programId ORDER BY h.createdAt DESC, h.id DESC")
    java.util.List<EpisodeSortHistory> findByProgramIdOrderByCreatedAtDesc(@Param("programId") Long programId);
    
    default Optional<EpisodeSortHistory> findLatestByProgramId(Long programId) {
        java.util.List<EpisodeSortHistory> list = findByProgramIdOrderByCreatedAtDesc(programId);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }
}
