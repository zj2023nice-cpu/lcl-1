package com.podcast.collab.repository;

import com.podcast.collab.entity.EmailTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmailTemplateRepository extends JpaRepository<EmailTemplate, Long> {

    List<EmailTemplate> findByTeamId(Long teamId);

    Optional<EmailTemplate> findByTeamIdAndTemplateKey(Long teamId, String templateKey);

    Optional<EmailTemplate> findByIdAndTeamId(Long id, Long teamId);

    boolean existsByTeamIdAndTemplateKey(Long teamId, String templateKey);

    List<EmailTemplate> findByTeamIdIsNull();

    Optional<EmailTemplate> findByTeamIdIsNullAndTemplateKey(String templateKey);

    boolean existsByTeamIdIsNullAndTemplateKey(String templateKey);
}
