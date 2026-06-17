package com.podcast.collab.service;

import com.podcast.collab.config.EpisodeSortWebSocketHandler;
import com.podcast.collab.dto.EpisodeSortRequest;
import com.podcast.collab.dto.EpisodeSortResultDTO;
import com.podcast.collab.dto.EpisodeSortUndoRequest;
import com.podcast.collab.entity.Episode;
import com.podcast.collab.entity.EpisodeSortHistory;
import com.podcast.collab.entity.Program;
import com.podcast.collab.entity.Team;
import com.podcast.collab.entity.User;
import com.podcast.collab.repository.EpisodeRepository;
import com.podcast.collab.repository.EpisodeSortHistoryRepository;
import com.podcast.collab.repository.ProgramRepository;
import com.podcast.collab.security.SecurityUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.OptimisticLockingFailureException;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EpisodeSortServiceTest {

    @Mock
    private EpisodeRepository episodeRepository;

    @Mock
    private ProgramRepository programRepository;

    @Mock
    private EpisodeSortHistoryRepository sortHistoryRepository;

    @Mock
    private SecurityUtil securityUtil;

    @Mock
    private AuditService auditService;

    @Mock
    private EpisodeSortWebSocketHandler webSocketHandler;

    @InjectMocks
    private EpisodeSortService episodeSortService;

    private Program program;
    private List<Episode> episodes;
    private User currentUser;

    @BeforeEach
    void setUp() {
        Team team = Team.builder().id(1L).build();
        program = Program.builder()
                .id(100L)
                .team(team)
                .name("Test Program")
                .sortVersion(5L)
                .build();

        currentUser = User.builder()
                .id(10L)
                .name("Test User")
                .build();

        Episode ep1 = Episode.builder().id(1L).program(program).title("Episode 1").sortOrder(0).build();
        Episode ep2 = Episode.builder().id(2L).program(program).title("Episode 2").sortOrder(1).build();
        Episode ep3 = Episode.builder().id(3L).program(program).title("Episode 3").sortOrder(2).build();
        episodes = Arrays.asList(ep1, ep2, ep3);

        when(securityUtil.getCurrentTeamId()).thenReturn(1L);
        when(securityUtil.getCurrentUser()).thenReturn(currentUser);
        when(programRepository.findByIdAndTeamId(100L, 1L)).thenReturn(Optional.of(program));
        when(episodeRepository.findByProgramIdAndTeamId(100L, 1L)).thenReturn(episodes);
    }

    @Test
    @DisplayName("更新排序 - 成功")
    void updateSortOrder_Success() {
        EpisodeSortRequest request = EpisodeSortRequest.builder()
                .episodeIds(Arrays.asList(3L, 2L, 1L))
                .baseSortVersion(5L)
                .build();

        when(programRepository.save(any(Program.class))).thenAnswer(invocation -> {
            Program p = invocation.getArgument(0);
            p.setSortVersion(p.getSortVersion() + 1);
            return p;
        });
        when(episodeRepository.saveAll(anyList())).thenReturn(episodes);
        when(sortHistoryRepository.save(any(EpisodeSortHistory.class)))
                .thenAnswer(invocation -> {
                    EpisodeSortHistory h = invocation.getArgument(0);
                    h.setId(1000L);
                    return h;
                });

        EpisodeSortResultDTO result = episodeSortService.updateSortOrder(100L, request);

        assertTrue(result.isSuccess());
        assertFalse(result.isConflict());
        assertEquals(6L, result.getSortVersion());
        assertNotNull(result.getHistoryId());

        verify(episodeRepository).saveAll(anyList());
        verify(programRepository).save(any(Program.class));
        verify(sortHistoryRepository).save(any(EpisodeSortHistory.class));
        verify(auditService).logAction(anyLong(), anyLong(), eq("REORDER_EPISODES"),
                eq("PROGRAM"), eq(100L), anyMap());
        verify(webSocketHandler).broadcastSortUpdate(eq(100L), eq(6L), eq(10L), eq("Test User"));
    }

    @Test
    @DisplayName("更新排序 - 应用层版本冲突")
    void updateSortOrder_ApplicationLevelConflict() {
        program.setSortVersion(10L);

        EpisodeSortRequest request = EpisodeSortRequest.builder()
                .episodeIds(Arrays.asList(3L, 2L, 1L))
                .baseSortVersion(5L)
                .build();

        EpisodeSortResultDTO result = episodeSortService.updateSortOrder(100L, request);

        assertFalse(result.isSuccess());
        assertTrue(result.isConflict());
        assertEquals(10L, result.getSortVersion());
        assertEquals(3, result.getEpisodes().size());

        verify(episodeRepository, never()).saveAll(anyList());
        verify(programRepository, never()).save(any(Program.class));
        verify(sortHistoryRepository, never()).save(any(EpisodeSortHistory.class));
    }

    @Test
    @DisplayName("更新排序 - 数据库层乐观锁异常（事务回滚）")
    void updateSortOrder_OptimisticLockException() {
        EpisodeSortRequest request = EpisodeSortRequest.builder()
                .episodeIds(Arrays.asList(3L, 2L, 1L))
                .baseSortVersion(5L)
                .build();

        when(programRepository.save(any(Program.class)))
                .thenThrow(new OptimisticLockingFailureException("乐观锁冲突"));

        assertThrows(OptimisticLockingFailureException.class,
                () -> episodeSortService.updateSortOrder(100L, request));

        verify(episodeRepository).saveAll(anyList());
        verify(programRepository).save(any(Program.class));
        verify(sortHistoryRepository, never()).save(any(EpisodeSortHistory.class));
        verify(auditService, never()).logAction(anyLong(), anyLong(), anyString(),
                anyString(), anyLong(), anyMap());
        verify(webSocketHandler, never()).broadcastSortUpdate(anyLong(), anyLong(), anyLong(), anyString());
    }

    @Test
    @DisplayName("撤销排序 - 成功")
    void undoLastSort_Success() {
        EpisodeSortHistory history = EpisodeSortHistory.builder()
                .id(2000L)
                .programId(100L)
                .userId(10L)
                .beforeOrder(Arrays.asList(1L, 2L, 3L))
                .afterOrder(Arrays.asList(3L, 2L, 1L))
                .sortVersion(5L)
                .build();

        when(sortHistoryRepository.findLatestByProgramId(100L)).thenReturn(Optional.of(history));
        when(programRepository.save(any(Program.class))).thenAnswer(invocation -> {
            Program p = invocation.getArgument(0);
            p.setSortVersion(p.getSortVersion() + 1);
            return p;
        });
        when(episodeRepository.saveAll(anyList())).thenReturn(episodes);
        when(sortHistoryRepository.save(any(EpisodeSortHistory.class)))
                .thenAnswer(invocation -> {
                    EpisodeSortHistory h = invocation.getArgument(0);
                    h.setId(2001L);
                    return h;
                });

        EpisodeSortUndoRequest request = EpisodeSortUndoRequest.builder().baseSortVersion(5L).build();
        EpisodeSortResultDTO result = episodeSortService.undoLastSort(100L, request);

        assertTrue(result.isSuccess());
        assertFalse(result.isConflict());
        assertEquals(6L, result.getSortVersion());

        verify(episodeRepository).saveAll(anyList());
        verify(programRepository).save(any(Program.class));
        verify(sortHistoryRepository).save(any(EpisodeSortHistory.class));
        verify(sortHistoryRepository).delete(eq(history));
        verify(auditService).logAction(anyLong(), anyLong(), eq("UNDO_EPISODE_ORDER"),
                eq("PROGRAM"), eq(100L), anyMap());
        verify(webSocketHandler).broadcastSortUpdate(eq(100L), eq(6L), eq(10L), eq("Test User"));
    }

    @Test
    @DisplayName("撤销排序 - 应用层版本冲突")
    void undoLastSort_ApplicationLevelConflict() {
        program.setSortVersion(10L);

        EpisodeSortUndoRequest request = EpisodeSortUndoRequest.builder().baseSortVersion(5L).build();
        EpisodeSortResultDTO result = episodeSortService.undoLastSort(100L, request);

        assertFalse(result.isSuccess());
        assertTrue(result.isConflict());
        assertEquals(10L, result.getSortVersion());
        assertTrue(result.getMessage().contains("无法撤销"));

        verify(episodeRepository, never()).saveAll(anyList());
        verify(programRepository, never()).save(any(Program.class));
        verify(sortHistoryRepository, never()).save(any(EpisodeSortHistory.class));
        verify(sortHistoryRepository, never()).delete(any(EpisodeSortHistory.class));
    }

    @Test
    @DisplayName("撤销排序 - 数据库层乐观锁异常（事务回滚）")
    void undoLastSort_OptimisticLockException() {
        EpisodeSortHistory history = EpisodeSortHistory.builder()
                .id(2000L)
                .programId(100L)
                .beforeOrder(Arrays.asList(1L, 2L, 3L))
                .afterOrder(Arrays.asList(3L, 2L, 1L))
                .sortVersion(5L)
                .build();

        when(sortHistoryRepository.findLatestByProgramId(100L)).thenReturn(Optional.of(history));
        when(programRepository.save(any(Program.class)))
                .thenThrow(new OptimisticLockingFailureException("乐观锁冲突"));

        EpisodeSortUndoRequest request = EpisodeSortUndoRequest.builder().baseSortVersion(5L).build();

        assertThrows(OptimisticLockingFailureException.class,
                () -> episodeSortService.undoLastSort(100L, request));

        verify(episodeRepository).saveAll(anyList());
        verify(programRepository).save(any(Program.class));
        verify(sortHistoryRepository, never()).save(any(EpisodeSortHistory.class));
        verify(sortHistoryRepository, never()).delete(any(EpisodeSortHistory.class));
        verify(auditService, never()).logAction(anyLong(), anyLong(), anyString(),
                anyString(), anyLong(), anyMap());
        verify(webSocketHandler, never()).broadcastSortUpdate(anyLong(), anyLong(), anyLong(), anyString());
    }

    @Test
    @DisplayName("撤销排序 - 没有可撤销记录")
    void undoLastSort_NoHistory() {
        when(sortHistoryRepository.findLatestByProgramId(100L)).thenReturn(Optional.empty());

        EpisodeSortResultDTO result = episodeSortService.undoLastSort(100L, null);

        assertFalse(result.isSuccess());
        assertFalse(result.isConflict());
        assertEquals(5L, result.getSortVersion());
        assertEquals("没有可撤销的排序操作", result.getMessage());

        verify(episodeRepository, never()).saveAll(anyList());
        verify(programRepository, never()).save(any(Program.class));
    }

    @Test
    @DisplayName("查询是否可撤销 - 有历史记录")
    void canUndo_WithHistory() {
        EpisodeSortHistory history = EpisodeSortHistory.builder().id(1L).build();
        when(sortHistoryRepository.findLatestByProgramId(100L)).thenReturn(Optional.of(history));

        boolean canUndo = episodeSortService.canUndo(100L);

        assertTrue(canUndo);
    }

    @Test
    @DisplayName("查询是否可撤销 - 无历史记录")
    void canUndo_NoHistory() {
        when(sortHistoryRepository.findLatestByProgramId(100L)).thenReturn(Optional.empty());

        boolean canUndo = episodeSortService.canUndo(100L);

        assertFalse(canUndo);
    }

    @Test
    @DisplayName("获取当前排序状态（新事务）")
    void getCurrentSortState_ReturnsLatestState() {
        program.setSortVersion(15L);

        EpisodeSortResultDTO result = episodeSortService.getCurrentSortState(100L, "排序已被其他人修改");

        assertFalse(result.isSuccess());
        assertTrue(result.isConflict());
        assertEquals(15L, result.getSortVersion());
        assertEquals("排序已被其他人修改", result.getMessage());
        assertEquals(3, result.getEpisodes().size());
    }

    @Test
    @DisplayName("更新排序 - 版本号为null时跳过前置检查")
    void updateSortOrder_NullBaseVersion_SkipsCheck() {
        EpisodeSortRequest request = EpisodeSortRequest.builder()
                .episodeIds(Arrays.asList(3L, 2L, 1L))
                .build();

        when(programRepository.save(any(Program.class))).thenAnswer(invocation -> {
            Program p = invocation.getArgument(0);
            p.setSortVersion(p.getSortVersion() + 1);
            return p;
        });
        when(episodeRepository.saveAll(anyList())).thenReturn(episodes);
        when(sortHistoryRepository.save(any(EpisodeSortHistory.class)))
                .thenAnswer(invocation -> {
                    EpisodeSortHistory h = invocation.getArgument(0);
                    h.setId(1000L);
                    return h;
                });

        EpisodeSortResultDTO result = episodeSortService.updateSortOrder(100L, request);

        assertTrue(result.isSuccess());
        verify(programRepository).save(any(Program.class));
    }
}
