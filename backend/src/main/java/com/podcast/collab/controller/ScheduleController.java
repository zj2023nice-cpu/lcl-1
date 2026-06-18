package com.podcast.collab.controller;

import com.podcast.collab.dto.ApiResponse;
import com.podcast.collab.dto.EpisodeDTO;
import com.podcast.collab.dto.ScheduleConflictDTO;
import com.podcast.collab.dto.ScheduleItemDTO;
import com.podcast.collab.entity.Episode;
import com.podcast.collab.entity.Notification;
import com.podcast.collab.entity.Task;
import com.podcast.collab.entity.Team;
import com.podcast.collab.entity.User;
import com.podcast.collab.repository.EpisodeRepository;
import com.podcast.collab.repository.NotificationRepository;
import com.podcast.collab.repository.TaskRepository;
import com.podcast.collab.repository.TeamRepository;
import com.podcast.collab.security.SecurityUtil;
import com.podcast.collab.service.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api/schedule")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class ScheduleController {
    
    private final EpisodeRepository episodeRepository;
    private final TaskRepository taskRepository;
    private final NotificationRepository notificationRepository;
    private final TeamRepository teamRepository;
    private final SecurityUtil securityUtil;
    private final AuditService auditService;
    
    @GetMapping
    public ResponseEntity<ApiResponse<List<ScheduleItemDTO>>> getSchedule(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "true") boolean includeEpisodes,
            @RequestParam(required = false, defaultValue = "true") boolean includeTasks) {
        
        Long teamId = securityUtil.getCurrentTeamId();
        List<ScheduleItemDTO> items = new ArrayList<>();
        
        if (includeEpisodes) {
            List<Episode> episodes = episodeRepository.findByTeamIdAndPublishDateBetween(teamId, startDate, endDate);
            items.addAll(episodes.stream()
                    .map(ScheduleItemDTO::fromEpisode)
                    .collect(Collectors.toList()));
        }
        
        if (includeTasks) {
            List<Task> tasks = taskRepository.findByTeamIdAndDueDateBetween(teamId, startDate, endDate);
            items.addAll(tasks.stream()
                    .map(ScheduleItemDTO::fromTask)
                    .collect(Collectors.toList()));
        }
        
        return ResponseEntity.ok(ApiResponse.success(items));
    }
    
    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<ScheduleItemDTO>>> getAllScheduled() {
        Long teamId = securityUtil.getCurrentTeamId();
        List<ScheduleItemDTO> items = new ArrayList<>();
        
        List<Episode> episodes = episodeRepository.findScheduledByTeamId(teamId);
        items.addAll(episodes.stream()
                .map(ScheduleItemDTO::fromEpisode)
                .collect(Collectors.toList()));
        
        List<Task> tasks = taskRepository.findPendingWithDueDateByTeamId(teamId);
        items.addAll(tasks.stream()
                .map(ScheduleItemDTO::fromTask)
                .collect(Collectors.toList()));
        
        return ResponseEntity.ok(ApiResponse.success(items));
    }
    
    @GetMapping("/conflicts")
    public ResponseEntity<ApiResponse<List<ScheduleConflictDTO>>> getConflicts(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        Long teamId = securityUtil.getCurrentTeamId();
        List<ScheduleConflictDTO> conflicts = new ArrayList<>();
        
        List<Episode> episodes = episodeRepository.findByTeamIdAndPublishDateBetween(teamId, startDate, endDate);
        List<Task> tasks = taskRepository.findByTeamIdAndDueDateBetween(teamId, startDate, endDate);
        
        Map<LocalDate, List<ScheduleItemDTO>> itemsByDate = new HashMap<>();
        
        for (Episode episode : episodes) {
            itemsByDate.computeIfAbsent(episode.getPublishDate(), k -> new ArrayList<>())
                    .add(ScheduleItemDTO.fromEpisode(episode));
        }
        
        for (Task task : tasks) {
            itemsByDate.computeIfAbsent(task.getDueDate(), k -> new ArrayList<>())
                    .add(ScheduleItemDTO.fromTask(task));
        }
        
        for (Map.Entry<LocalDate, List<ScheduleItemDTO>> entry : itemsByDate.entrySet()) {
            LocalDate date = entry.getKey();
            List<ScheduleItemDTO> items = entry.getValue();
            
            long episodeCount = items.stream().filter(i -> "EPISODE".equals(i.getItemType())).count();
            boolean hasConflict = episodeCount > 1;
            
            if (hasConflict || items.size() >= 3) {
                ScheduleConflictDTO conflict = ScheduleConflictDTO.builder()
                        .date(date)
                        .hasConflict(true)
                        .conflictCount(items.size())
                        .conflictingItems(items)
                        .message(episodeCount > 1 
                                ? "同一天有 " + episodeCount + " 个节目计划发布" 
                                : "当天有 " + items.size() + " 个排期事项")
                        .build();
                conflicts.add(conflict);
            }
        }
        
        return ResponseEntity.ok(ApiResponse.success(conflicts));
    }
    
    @GetMapping("/conflicts/check")
    public ResponseEntity<ApiResponse<ScheduleConflictDTO>> checkDateConflict(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long excludeEpisodeId) {
        
        Long teamId = securityUtil.getCurrentTeamId();
        List<ScheduleItemDTO> conflictingItems = new ArrayList<>();
        
        List<Episode> episodes;
        if (excludeEpisodeId != null) {
            episodes = episodeRepository.findByTeamIdAndPublishDateBetween(teamId, date, date).stream()
                    .filter(e -> !e.getId().equals(excludeEpisodeId))
                    .collect(Collectors.toList());
        } else {
            episodes = episodeRepository.findByTeamIdAndPublishDateBetween(teamId, date, date);
        }
        
        List<Task> tasks = taskRepository.findByTeamIdAndDueDateBetween(teamId, date, date);
        
        conflictingItems.addAll(episodes.stream().map(ScheduleItemDTO::fromEpisode).collect(Collectors.toList()));
        conflictingItems.addAll(tasks.stream().map(ScheduleItemDTO::fromTask).collect(Collectors.toList()));
        
        long episodeCount = conflictingItems.stream().filter(i -> "EPISODE".equals(i.getItemType())).count();
        boolean hasConflict = episodeCount >= 1 && excludeEpisodeId != null && episodeCount >= 1;
        if (excludeEpisodeId == null) {
            hasConflict = episodeCount > 1;
        }
        
        ScheduleConflictDTO result = ScheduleConflictDTO.builder()
                .date(date)
                .hasConflict(hasConflict)
                .conflictCount(conflictingItems.size())
                .conflictingItems(conflictingItems)
                .message(hasConflict 
                        ? (episodeCount > 0 ? "该日期已有节目排期" : "该日期已有多个排期事项")
                        : "该日期暂无冲突")
                .build();
        
        return ResponseEntity.ok(ApiResponse.success(result));
    }
    
    @PutMapping("/episodes/{episodeId}/publish-date")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'EDITOR', 'HOST')")
    @Transactional
    public ResponseEntity<ApiResponse<EpisodeDTO>> updateEpisodePublishDate(
            @PathVariable Long episodeId,
            @RequestBody Map<String, Object> request) {
        
        Long teamId = securityUtil.getCurrentTeamId();
        User currentUser = securityUtil.getCurrentUser();
        
        Episode episode = episodeRepository.findByIdAndTeamId(episodeId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("集数不存在"));
        
        LocalDate oldDate = episode.getPublishDate();
        LocalDate newDate = null;
        
        if (request.get("publishDate") != null) {
            String dateStr = request.get("publishDate").toString();
            if (!dateStr.isEmpty() && !"null".equalsIgnoreCase(dateStr)) {
                newDate = LocalDate.parse(dateStr);
            }
        }
        
        episode.setPublishDate(newDate);
        episode = episodeRepository.save(episode);
        
        if (newDate != null) {
            long conflictCount = episodeRepository.countByTeamIdAndPublishDateAndIdNot(teamId, newDate, episodeId);
            if (conflictCount > 0) {
                Team team = teamRepository.findById(teamId).orElse(null);
                if (team != null) {
                    Notification conflictNotification = Notification.builder()
                            .team(team)
                            .user(currentUser)
                            .type(Notification.NotificationType.EPISODE_SCHEDULE_CONFLICT)
                            .title("节目排期冲突提醒")
                            .content("节目《" + episode.getTitle() + "》的发布日期 " + newDate + " 与其他 " + conflictCount + " 个节目存在日期冲突")
                            .relatedEntityType("EPISODE")
                            .relatedEntityId(episode.getId())
                            .isRead(false)
                            .build();
                    notificationRepository.save(conflictNotification);
                }
            }
        }
        
        auditService.logAction(teamId, currentUser.getId(), "UPDATE_EPISODE_PUBLISH_DATE",
                "EPISODE", episodeId, Map.of(
                        "oldDate", oldDate != null ? oldDate.toString() : null,
                        "newDate", newDate != null ? newDate.toString() : null,
                        "title", episode.getTitle()
                ));
        
        return ResponseEntity.ok(ApiResponse.success(EpisodeDTO.fromEntity(episode), "发布日期更新成功"));
    }
    
    @GetMapping("/upcoming")
    public ResponseEntity<ApiResponse<List<ScheduleItemDTO>>> getUpcomingReminders(
            @RequestParam(required = false, defaultValue = "7") int daysAhead) {
        
        Long teamId = securityUtil.getCurrentTeamId();
        LocalDate today = LocalDate.now();
        LocalDate endDate = today.plusDays(daysAhead);
        
        List<ScheduleItemDTO> reminders = new ArrayList<>();
        
        List<Episode> episodes = episodeRepository.findByTeamIdAndPublishDateBetween(teamId, today, endDate);
        List<Task> tasks = taskRepository.findByTeamIdAndDueDateBetween(teamId, today, endDate)
                .stream()
                .filter(t -> t.getStatus() != Task.Status.DONE)
                .collect(Collectors.toList());
        
        reminders.addAll(episodes.stream()
                .map(ScheduleItemDTO::fromEpisode)
                .collect(Collectors.toList()));
        reminders.addAll(tasks.stream()
                .map(ScheduleItemDTO::fromTask)
                .collect(Collectors.toList()));
        
        reminders.sort((a, b) -> {
            if (a.getDate() == null && b.getDate() == null) return 0;
            if (a.getDate() == null) return 1;
            if (b.getDate() == null) return -1;
            return a.getDate().compareTo(b.getDate());
        });
        
        return ResponseEntity.ok(ApiResponse.success(reminders));
    }
    
    @PatchMapping("/tasks/{taskId}/due-date")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'EDITOR', 'HOST')")
    @Transactional
    public ResponseEntity<ApiResponse<ScheduleItemDTO>> updateTaskDueDate(
            @PathVariable Long taskId,
            @RequestBody Map<String, Object> request) {
        
        Long teamId = securityUtil.getCurrentTeamId();
        User currentUser = securityUtil.getCurrentUser();
        
        Task task = taskRepository.findByIdAndTeamId(taskId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在"));
        
        LocalDate oldDate = task.getDueDate();
        LocalDate newDate = null;
        
        if (request.get("dueDate") != null) {
            String dateStr = request.get("dueDate").toString();
            if (!dateStr.isEmpty() && !"null".equalsIgnoreCase(dateStr)) {
                newDate = LocalDate.parse(dateStr);
            }
        }
        
        task.setDueDate(newDate);
        task = taskRepository.save(task);
        
        auditService.logAction(teamId, currentUser.getId(), "UPDATE_TASK_DUE_DATE",
                "TASK", taskId, Map.of(
                        "oldDate", oldDate != null ? oldDate.toString() : null,
                        "newDate", newDate != null ? newDate.toString() : null,
                        "title", task.getTitle()
                ));
        
        return ResponseEntity.ok(ApiResponse.success(ScheduleItemDTO.fromTask(task), "任务截止日期更新成功"));
    }
}
