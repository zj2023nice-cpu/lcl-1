package com.podcast.collab.controller;

import com.podcast.collab.dto.ActivityDTO;
import com.podcast.collab.dto.ApiResponse;
import com.podcast.collab.dto.DashboardStatsDTO;
import com.podcast.collab.entity.AuditLog;
import com.podcast.collab.entity.Task;
import com.podcast.collab.repository.AuditLogRepository;
import com.podcast.collab.repository.EpisodeRepository;
import com.podcast.collab.repository.ProgramRepository;
import com.podcast.collab.repository.TaskRepository;
import com.podcast.collab.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class DashboardController {
    
    private final ProgramRepository programRepository;
    private final EpisodeRepository episodeRepository;
    private final TaskRepository taskRepository;
    private final AuditLogRepository auditLogRepository;
    private final SecurityUtil securityUtil;
    
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<DashboardStatsDTO>> getStats() {
        Long teamId = securityUtil.getCurrentTeamId();
        
        long programCount = programRepository.countByTeamId(teamId);
        long episodeCount = episodeRepository.countByTeamId(teamId);
        long pendingTaskCount = taskRepository.countByTeamIdAndStatusNot(teamId, Task.Status.DONE);
        
        List<AuditLog> recentLogs = auditLogRepository.findRecentByTeamId(teamId, PageRequest.of(0, 10));
        List<ActivityDTO> recentActivities = recentLogs.stream()
                .map(ActivityDTO::fromEntity)
                .collect(Collectors.toList());
        
        DashboardStatsDTO stats = DashboardStatsDTO.builder()
                .programCount(programCount)
                .episodeCount(episodeCount)
                .pendingTaskCount(pendingTaskCount)
                .recentActivities(recentActivities)
                .build();
        
        return ResponseEntity.ok(ApiResponse.success(stats));
    }
}
