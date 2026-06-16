package com.podcast.collab.repository;

import com.podcast.collab.entity.ShareAccessLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShareAccessLogRepository extends JpaRepository<ShareAccessLog, Long> {

    @Query("SELECT sal FROM ShareAccessLog sal WHERE sal.shareLink.id = :shareLinkId ORDER BY sal.accessedAt DESC")
    List<ShareAccessLog> findByShareLinkId(@Param("shareLinkId") Long shareLinkId);

    @Query("SELECT COUNT(sal) FROM ShareAccessLog sal WHERE sal.shareLink.id = :shareLinkId")
    long countByShareLinkId(@Param("shareLinkId") Long shareLinkId);
}
