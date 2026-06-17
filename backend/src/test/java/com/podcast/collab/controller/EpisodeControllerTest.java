package com.podcast.collab.controller;

import com.podcast.collab.dto.EpisodeSortRequest;
import com.podcast.collab.dto.EpisodeSortResultDTO;
import com.podcast.collab.dto.EpisodeSortUndoRequest;
import com.podcast.collab.service.EpisodeSortService;
import com.podcast.collab.security.SecurityUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(
        controllers = EpisodeController.class,
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.REGEX,
                pattern = "com.podcast.collab.config.*"
        )
)
class EpisodeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EpisodeSortService episodeSortService;

    @MockBean
    private SecurityUtil securityUtil;

    @BeforeEach
    void setUp() {
        when(securityUtil.getCurrentTeamId()).thenReturn(1L);
    }

    @Test
    @DisplayName("更新排序 - 数据库乐观锁冲突时返回409冲突响应")
    @WithMockUser(roles = "EDITOR")
    void updateEpisodeSortOrder_OptimisticLock_ReturnsConflict() throws Exception {
        when(episodeSortService.updateSortOrder(eq(100L), any(EpisodeSortRequest.class)))
                .thenThrow(new OptimisticLockingFailureException("乐观锁冲突"));

        EpisodeSortResultDTO conflictResult = EpisodeSortResultDTO.builder()
                .success(false)
                .conflict(true)
                .message("排序已被其他人修改，请刷新后重试")
                .sortVersion(10L)
                .build();

        when(episodeSortService.getCurrentSortState(eq(100L), anyString()))
                .thenReturn(conflictResult);

        String requestJson = """
                {
                    "episodeIds": ["3", "2", "1"],
                    "baseSortVersion": 5
                }
                """;

        mockMvc.perform(put("/api/programs/100/episodes/sort")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value(409))
                .andExpect(jsonPath("$.message").value("排序已被其他人修改，请刷新后重试"))
                .andExpect(jsonPath("$.data.conflict").value(true))
                .andExpect(jsonPath("$.data.sortVersion").value(10));

        verify(episodeSortService).updateSortOrder(eq(100L), any(EpisodeSortRequest.class));
        verify(episodeSortService).getCurrentSortState(eq(100L), anyString());
    }

    @Test
    @DisplayName("更新排序 - 应用层冲突时返回409响应")
    @WithMockUser(roles = "EDITOR")
    void updateEpisodeSortOrder_ApplicationConflict_ReturnsConflict() throws Exception {
        EpisodeSortResultDTO conflictResult = EpisodeSortResultDTO.builder()
                .success(false)
                .conflict(true)
                .message("排序已被其他人修改，请刷新后重试")
                .sortVersion(8L)
                .build();

        when(episodeSortService.updateSortOrder(eq(100L), any(EpisodeSortRequest.class)))
                .thenReturn(conflictResult);

        String requestJson = """
                {
                    "episodeIds": ["3", "2", "1"],
                    "baseSortVersion": 5
                }
                """;

        mockMvc.perform(put("/api/programs/100/episodes/sort")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value(409))
                .andExpect(jsonPath("$.data.conflict").value(true))
                .andExpect(jsonPath("$.data.sortVersion").value(8));

        verify(episodeSortService).updateSortOrder(eq(100L), any(EpisodeSortRequest.class));
        verify(episodeSortService, never()).getCurrentSortState(anyLong(), anyString());
    }

    @Test
    @DisplayName("撤销排序 - 数据库乐观锁冲突时返回409响应")
    @WithMockUser(roles = "EDITOR")
    void undoEpisodeSort_OptimisticLock_ReturnsConflict() throws Exception {
        when(episodeSortService.undoLastSort(eq(100L), any(EpisodeSortUndoRequest.class)))
                .thenThrow(new OptimisticLockingFailureException("乐观锁冲突"));

        EpisodeSortResultDTO conflictResult = EpisodeSortResultDTO.builder()
                .success(false)
                .conflict(true)
                .message("排序已被其他人修改，无法撤销，请刷新后重试")
                .sortVersion(10L)
                .build();

        when(episodeSortService.getCurrentSortState(eq(100L), anyString()))
                .thenReturn(conflictResult);

        String requestJson = """
                {
                    "baseSortVersion": 5
                }
                """;

        mockMvc.perform(post("/api/programs/100/episodes/sort/undo")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value(409))
                .andExpect(jsonPath("$.data.conflict").value(true))
                .andExpect(jsonPath("$.data.sortVersion").value(10));

        verify(episodeSortService).undoLastSort(eq(100L), any(EpisodeSortUndoRequest.class));
        verify(episodeSortService).getCurrentSortState(eq(100L), anyString());
    }

    @Test
    @DisplayName("撤销排序 - 应用层冲突时返回409响应")
    @WithMockUser(roles = "EDITOR")
    void undoEpisodeSort_ApplicationConflict_ReturnsConflict() throws Exception {
        EpisodeSortResultDTO conflictResult = EpisodeSortResultDTO.builder()
                .success(false)
                .conflict(true)
                .message("排序已被其他人修改，无法撤销，请刷新后重试")
                .sortVersion(7L)
                .build();

        when(episodeSortService.undoLastSort(eq(100L), any(EpisodeSortUndoRequest.class)))
                .thenReturn(conflictResult);

        String requestJson = """
                {
                    "baseSortVersion": 5
                }
                """;

        mockMvc.perform(post("/api/programs/100/episodes/sort/undo")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value(409))
                .andExpect(jsonPath("$.data.conflict").value(true));

        verify(episodeSortService).undoLastSort(eq(100L), any(EpisodeSortUndoRequest.class));
        verify(episodeSortService, never()).getCurrentSortState(anyLong(), anyString());
    }

    @Test
    @DisplayName("查询是否可撤销 - 返回成功响应")
    @WithMockUser
    void canUndoSort_ReturnsSuccess() throws Exception {
        when(episodeSortService.canUndo(100L)).thenReturn(true);

        mockMvc.perform(get("/api/programs/100/episodes/sort/can-undo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value(true));

        verify(episodeSortService).canUndo(100L);
    }

    @Test
    @DisplayName("更新排序 - 成功时返回200和成功响应")
    @WithMockUser(roles = "EDITOR")
    void updateEpisodeSortOrder_Success() throws Exception {
        EpisodeSortResultDTO successResult = EpisodeSortResultDTO.builder()
                .success(true)
                .conflict(false)
                .message("排序保存成功")
                .sortVersion(6L)
                .historyId(1000L)
                .build();

        when(episodeSortService.updateSortOrder(eq(100L), any(EpisodeSortRequest.class)))
                .thenReturn(successResult);

        String requestJson = """
                {
                    "episodeIds": ["3", "2", "1"],
                    "baseSortVersion": 5
                }
                """;

        mockMvc.perform(put("/api/programs/100/episodes/sort")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.success").value(true))
                .andExpect(jsonPath("$.data.conflict").value(false))
                .andExpect(jsonPath("$.data.sortVersion").value(6));

        verify(episodeSortService).updateSortOrder(eq(100L), any(EpisodeSortRequest.class));
    }
}
