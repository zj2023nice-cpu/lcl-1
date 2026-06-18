package com.podcast.collab.scheduler;

import com.podcast.collab.entity.Episode;
import com.podcast.collab.entity.Notification;
import com.podcast.collab.entity.Task;
import com.podcast.collab.entity.Team;
import com.podcast.collab.entity.User;
import com.podcast.collab.repository.EpisodeRepository;
import com.podcast.collab.repository.NotificationRepository;
import com.podcast.collab.repository.TaskRepository;
import com.podcast.collab.repository.TeamRepository;
import com.podcast.collab.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class ScheduleReminderScheduler {

    private final TaskRepository taskRepository;
    private final EpisodeRepository episodeRepository;
    private final NotificationRepository notificationRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;

    @Scheduled(cron = "0 0 8 * * ?")
    @Transactional
    public void sendDailyReminders() {
        log.info("开始执行每日排期提醒定时任务");
        try {
            LocalDate today = LocalDate.now();
            LocalDate threeDaysLater = today.plusDays(3);
            LocalDate oneDayLater = today.plusDays(1);
            
            sendTaskDueReminders(today, oneDayLater, threeDaysLater);
            sendEpisodePublishReminders(today, oneDayLater, threeDaysLater);
            sendOverdueTaskReminders(today);
            
            log.info("每日排期提醒定时任务执行完成");
        } catch (Exception e) {
            log.error("排期提醒定时任务执行失败", e);
        }
    }

    private void sendTaskDueReminders(LocalDate today, LocalDate oneDayLater, LocalDate threeDaysLater) {
        List<Task> dueSoonTasks = taskRepository.findByDueDateBetweenAndStatusNotDone(today, threeDaysLater);
        
        for (Task task : dueSoonTasks) {
            if (task.getDueDate() == null || task.getTeam() == null) continue;
            
            LocalDate dueDate = task.getDueDate();
            boolean isToday = dueDate.isEqual(today);
            boolean isTomorrow = dueDate.isEqual(oneDayLater);
            boolean isOverdue = dueDate.isBefore(today);
            
            String title;
            String content;
            
            if (isOverdue) {
                title = "任务已逾期";
                content = "任务「" + task.getTitle() + "」已于 " + dueDate + " 到期，请尽快处理";
            } else if (isToday) {
                title = "任务今日到期";
                content = "任务「" + task.getTitle() + "」将于今日到期，请及时完成";
            } else if (isTomorrow) {
                title = "任务明日到期";
                content = "任务「" + task.getTitle() + "」将于明日（" + dueDate + "）到期";
            } else {
                title = "任务即将到期";
                content = "任务「" + task.getTitle() + "」将于 " + dueDate + " 到期，还有 " + 
                        (dueDate.toEpochDay() - today.toEpochDay()) + " 天";
            }
            
            Set<User> recipients = new HashSet<>();
            if (task.getAssignee() != null) {
                recipients.add(task.getAssignee());
            }
            if (task.getCreatedBy() != null) {
                recipients.add(task.getCreatedBy());
            }
            
            for (User user : recipients) {
                createNotificationIfNotExists(
                        task.getTeam(),
                        user,
                        isOverdue ? Notification.NotificationType.TASK_OVERDUE : Notification.NotificationType.TASK_DUE_SOON,
                        title,
                        content,
                        "TASK",
                        task.getId()
                );
            }
        }
        
        log.info("已处理 {} 个即将到期的任务提醒", dueSoonTasks.size());
    }

    private void sendEpisodePublishReminders(LocalDate today, LocalDate oneDayLater, LocalDate threeDaysLater) {
        List<Team> teams = teamRepository.findAll();
        
        for (Team team : teams) {
            List<Episode> upcomingEpisodes = episodeRepository.findByTeamIdAndPublishDateBetween(
                    team.getId(), today, threeDaysLater);
            
            for (Episode episode : upcomingEpisodes) {
                if (episode.getPublishDate() == null || 
                        episode.getStatus() == Episode.Status.DISTRIBUTED) continue;
                
                LocalDate publishDate = episode.getPublishDate();
                boolean isToday = publishDate.isEqual(today);
                boolean isTomorrow = publishDate.isEqual(oneDayLater);
                
                String title;
                String content;
                
                if (isToday) {
                    title = "节目今日发布";
                    content = "节目《" + episode.getTitle() + "》计划于今日发布，当前状态：" + episode.getStatus();
                } else if (isTomorrow) {
                    title = "节目明日发布";
                    content = "节目《" + episode.getTitle() + "》计划于明日（" + publishDate + "）发布";
                } else {
                    title = "节目即将发布";
                    content = "节目《" + episode.getTitle() + "》计划于 " + publishDate + " 发布，还有 " + 
                            (publishDate.toEpochDay() - today.toEpochDay()) + " 天";
                }
                
                List<User> teamMembers = userRepository.findByTeamId(team.getId());
                for (User user : teamMembers) {
                    createNotificationIfNotExists(
                            team,
                            user,
                            Notification.NotificationType.EPISODE_PUBLISH_SOON,
                            title,
                            content,
                            "EPISODE",
                            episode.getId()
                    );
                }
            }
            
            log.info("团队 {} 已处理 {} 个即将发布的节目提醒", team.getName(), upcomingEpisodes.size());
        }
    }

    private void sendOverdueTaskReminders(LocalDate today) {
        LocalDate weekAgo = today.minusDays(7);
        List<Task> overdueTasks = taskRepository.findByDueDateBetweenAndStatusNotDone(weekAgo, today.minusDays(1));
        
        for (Task task : overdueTasks) {
            if (task.getDueDate() == null || task.getTeam() == null) continue;
            
            String title = "任务已逾期";
            String content = "任务「" + task.getTitle() + "」已于 " + task.getDueDate() + " 到期，已逾期 " + 
                    (today.toEpochDay() - task.getDueDate().toEpochDay()) + " 天";
            
            if (task.getAssignee() != null) {
                createNotificationIfNotExists(
                        task.getTeam(),
                        task.getAssignee(),
                        Notification.NotificationType.TASK_OVERDUE,
                        title,
                        content,
                        "TASK",
                        task.getId()
                );
            }
        }
        
        log.info("已处理 {} 个逾期任务提醒", overdueTasks.size());
    }

    private void createNotificationIfNotExists(Team team, User user, Notification.NotificationType type,
                                                String title, String content, String entityType, Long entityId) {
        if (team == null || user == null) return;
        
        List<Notification> existing = notificationRepository.findByUserIdAndTeamId(user.getId(), team.getId());
        
        boolean alreadyExists = existing.stream()
                .anyMatch(n -> n.getType() == type 
                        && entityType.equals(n.getRelatedEntityType())
                        && entityId.equals(n.getRelatedEntityId())
                        && !n.getIsRead()
                        && n.getCreatedAt().toLocalDate().isEqual(LocalDate.now()));
        
        if (!alreadyExists) {
            Notification notification = Notification.builder()
                    .team(team)
                    .user(user)
                    .type(type)
                    .title(title)
                    .content(content)
                    .relatedEntityType(entityType)
                    .relatedEntityId(entityId)
                    .isRead(false)
                    .build();
            notificationRepository.save(notification);
        }
    }
}
