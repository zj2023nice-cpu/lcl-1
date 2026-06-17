package com.podcast.collab.repository;

import com.podcast.collab.entity.AnnotationReply;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnnotationReplyRepository extends JpaRepository<AnnotationReply, Long> {

    @Query("SELECT r FROM AnnotationReply r WHERE r.annotation.id = :annotationId AND r.parent IS NULL ORDER BY r.createdAt ASC")
    Page<AnnotationReply> findRootRepliesByAnnotationId(@Param("annotationId") Long annotationId, Pageable pageable);

    @Query("SELECT r FROM AnnotationReply r WHERE r.annotation.id = :annotationId ORDER BY r.createdAt ASC")
    Page<AnnotationReply> findByAnnotationId(@Param("annotationId") Long annotationId, Pageable pageable);

    @Query("SELECT r FROM AnnotationReply r WHERE r.parent.id = :parentId ORDER BY r.createdAt ASC")
    List<AnnotationReply> findRepliesByParentId(@Param("parentId") Long parentId);

    @Query("SELECT COUNT(r) FROM AnnotationReply r WHERE r.annotation.id = :annotationId")
    long countByAnnotationId(@Param("annotationId") Long annotationId);

    @Query("SELECT COUNT(r) FROM AnnotationReply r WHERE r.parent.id = :parentId")
    long countByParentId(@Param("parentId") Long parentId);

    @Query("SELECT r FROM AnnotationReply r WHERE r.annotation.id = :annotationId AND r.annotation.episode.program.team.id = :teamId")
    List<AnnotationReply> findByAnnotationIdAndTeamId(@Param("annotationId") Long annotationId, @Param("teamId") Long teamId);
}
