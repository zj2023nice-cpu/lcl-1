package com.podcast.collab.service;

import com.podcast.collab.config.EpisodeSortWebSocketHandler;
import com.podcast.collab.dto.EpisodeDTO;
import com.podcast.collab.dto.EpisodeSortRequest;
import com.podcast.collab.dto.EpisodeSortResultDTO;
import com.podcast.collab.dto.EpisodeSortUndoRequest;
import com.podcast.collab.entity.Episode;
import com.podcast.collab.entity.EpisodeSortHistory;
import com.podcast.collab.entity.Program;
import com.podcast.collab.entity.User;
import com.podcast.collab.repository.EpisodeRepository;
import com.podcast.collab.repository.EpisodeSortHistoryRepository;
import com.podcast.collab.repository.ProgramRepository;
import com.podcast.collab.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EpisodeSortService {
    
    private final EpisodeRepository episodeRepository;
    private final ProgramRepository programRepository;
    private final EpisodeSortHistoryRepository sortHistoryRepository;
    private final SecurityUtil securityUtil;
    private final AuditService auditService;
    private final EpisodeSortWebSocketHandler webSocketHandler;
    
    @Transactional
    public EpisodeSortResultDTO updateSortOrder(Long programId, EpisodeSortRequest request) {
        Long teamId = securityUtil.getCurrentTeamId();
        User currentUser = securityUtil.getCurrentUser();
        
        Program program = programRepository.findByIdAndTeamId(programId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("节目不存在"));
        
        List<Long> newOrder = request.getEpisodeIds();
        Long baseVersion = request.getBaseSortVersion();
        
        if (baseVersion != null && !program.getSortVersion().equals(baseVersion)) {
            List<Episode> currentEpisodes = episodeRepository.findByProgramIdAndTeamId(programId, teamId);
            return EpisodeSortResultDTO.builder()
                    .success(false)
                    .conflict(true)
                    .message("排序已被其他人修改，请刷新后重试")
                    .sortVersion(program.getSortVersion())
                    .episodes(currentEpisodes.stream()
                            .map(EpisodeDTO::fromEntity)
                            .collect(Collectors.toList()))
                    .build();
        }
        
        List<Episode> episodes = episodeRepository.findByProgramIdAndTeamId(programId, teamId);
        Map<Long, Episode> episodeMap = episodes.stream()
                .collect(Collectors.toMap(Episode::getId, e -> e));
        
        if (newOrder.size() != episodes.size()) {
            throw new IllegalArgumentException("排序数据不完整");
        }
        
        for (Long id : newOrder) {
            if (!episodeMap.containsKey(id)) {
                throw new IllegalArgumentException("无效的集数ID: " + id);
            }
        }
        
        List<Long> beforeOrder = episodes.stream()
                .sorted(Comparator.comparingInt(Episode::getSortOrder))
                .map(Episode::getId)
                .collect(Collectors.toList());
        
        for (int i = 0; i < newOrder.size(); i++) {
            Episode episode = episodeMap.get(newOrder.get(i));
            episode.setSortOrder(i);
        }
        
        episodeRepository.saveAll(episodes);
        program = programRepository.save(program);
        
        EpisodeSortHistory history = EpisodeSortHistory.builder()
                .programId(programId)
                .userId(currentUser.getId())
                .beforeOrder(beforeOrder)
                .afterOrder(new ArrayList<>(newOrder))
                .sortVersion(program.getSortVersion())
                .build();
        history = sortHistoryRepository.save(history);
        
        auditService.logAction(teamId, currentUser.getId(), "REORDER_EPISODES",
                "PROGRAM", programId, Map.of("sortVersion", program.getSortVersion()));
        
        List<Episode> updatedEpisodes = episodeRepository.findByProgramIdAndTeamId(programId, teamId);
        
        webSocketHandler.broadcastSortUpdate(programId, program.getSortVersion(), 
                currentUser.getId(), currentUser.getName());
        
        return EpisodeSortResultDTO.builder()
                .success(true)
                .conflict(false)
                .message("排序保存成功")
                .sortVersion(program.getSortVersion())
                .episodes(updatedEpisodes.stream()
                        .map(EpisodeDTO::fromEntity)
                        .collect(Collectors.toList()))
                .historyId(history.getId())
                .build();
    }
    
    @Transactional
    public EpisodeSortResultDTO undoLastSort(Long programId, EpisodeSortUndoRequest request) {
        Long teamId = securityUtil.getCurrentTeamId();
        User currentUser = securityUtil.getCurrentUser();
        
        Program program = programRepository.findByIdAndTeamId(programId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("节目不存在"));
        
        Long baseVersion = request != null ? request.getBaseSortVersion() : null;
        if (baseVersion != null && !program.getSortVersion().equals(baseVersion)) {
            List<Episode> currentEpisodes = episodeRepository.findByProgramIdAndTeamId(programId, teamId);
            return EpisodeSortResultDTO.builder()
                    .success(false)
                    .conflict(true)
                    .message("排序已被其他人修改，无法撤销，请刷新后重试")
                    .sortVersion(program.getSortVersion())
                    .episodes(currentEpisodes.stream()
                            .map(EpisodeDTO::fromEntity)
                            .collect(Collectors.toList()))
                    .build();
        }
        
        Optional<EpisodeSortHistory> lastHistoryOpt = sortHistoryRepository.findLatestByProgramId(programId);
        
        if (lastHistoryOpt.isEmpty()) {
            return EpisodeSortResultDTO.builder()
                    .success(false)
                    .conflict(false)
                    .message("没有可撤销的排序操作")
                    .sortVersion(program.getSortVersion())
                    .build();
        }
        
        EpisodeSortHistory lastHistory = lastHistoryOpt.get();
        
        List<Long> previousOrder = lastHistory.getBeforeOrder();
        
        List<Episode> episodes = episodeRepository.findByProgramIdAndTeamId(programId, teamId);
        Map<Long, Episode> episodeMap = episodes.stream()
                .collect(Collectors.toMap(Episode::getId, e -> e));
        
        List<Long> currentOrder = episodes.stream()
                .sorted(Comparator.comparingInt(Episode::getSortOrder))
                .map(Episode::getId)
                .collect(Collectors.toList());
        
        for (int i = 0; i < previousOrder.size(); i++) {
            Episode episode = episodeMap.get(previousOrder.get(i));
            if (episode != null) {
                episode.setSortOrder(i);
            }
        }
        
        episodeRepository.saveAll(episodes);
        program = programRepository.save(program);
        
        EpisodeSortHistory undoHistory = EpisodeSortHistory.builder()
                .programId(programId)
                .userId(currentUser.getId())
                .beforeOrder(currentOrder)
                .afterOrder(previousOrder)
                .sortVersion(program.getSortVersion())
                .build();
        undoHistory = sortHistoryRepository.save(undoHistory);
        
        sortHistoryRepository.delete(lastHistory);
        
        auditService.logAction(teamId, currentUser.getId(), "UNDO_EPISODE_ORDER",
                "PROGRAM", programId, Map.of("sortVersion", program.getSortVersion()));
        
        List<Episode> updatedEpisodes = episodeRepository.findByProgramIdAndTeamId(programId, teamId);
        
        webSocketHandler.broadcastSortUpdate(programId, program.getSortVersion(), 
                currentUser.getId(), currentUser.getName());
        
        return EpisodeSortResultDTO.builder()
                .success(true)
                .conflict(false)
                .message("已撤销排序操作")
                .sortVersion(program.getSortVersion())
                .episodes(updatedEpisodes.stream()
                        .map(EpisodeDTO::fromEntity)
                        .collect(Collectors.toList()))
                .historyId(undoHistory.getId())
                .build();
    }
    
    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public EpisodeSortResultDTO getCurrentSortState(Long programId, String conflictMessage) {
        Long teamId = securityUtil.getCurrentTeamId();
        
        Program program = programRepository.findByIdAndTeamId(programId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("节目不存在"));
        
        List<Episode> currentEpisodes = episodeRepository.findByProgramIdAndTeamId(programId, teamId);
        
        return EpisodeSortResultDTO.builder()
                .success(false)
                .conflict(true)
                .message(conflictMessage)
                .sortVersion(program.getSortVersion())
                .episodes(currentEpisodes.stream()
                        .map(EpisodeDTO::fromEntity)
                        .collect(Collectors.toList()))
                .build();
    }
    
    @Transactional(readOnly = true)
    public boolean canUndo(Long programId) {
        Long teamId = securityUtil.getCurrentTeamId();
        programRepository.findByIdAndTeamId(programId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("节目不存在"));
        
        return sortHistoryRepository.findLatestByProgramId(programId).isPresent();
    }
}
