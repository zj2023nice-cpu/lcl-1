package com.podcast.collab.controller;

import com.podcast.collab.entity.*;
import com.podcast.collab.security.SecurityUtil;
import com.podcast.collab.service.AuditService;
import com.podcast.collab.service.MinioService;
import com.podcast.collab.service.ShareService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(
        controllers = ShareController.class,
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.REGEX,
                pattern = "com.podcast.collab.config.*"
        )
)
class ShareControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ShareService shareService;

    @MockBean
    private SecurityUtil securityUtil;

    @MockBean
    private AuditService auditService;

    @MockBean
    private MinioService minioService;

    @Value("${app.share.base-url:http://localhost:8080}")
    private String shareBaseUrl;

    private Team testTeam;
    private Program testProgram;
    private Episode testEpisode;
    private User testProducer;
    private User testEditor;
    private ShareLink testShareLink;
    private AudioVersion testAudioVersion;

    @BeforeEach
    void setUp() {
        testTeam = Team.builder()
                .id(1L)
                .name("Test Team")
                .ownerId(1L)
                .build();

        testProgram = Program.builder()
                .id(1L)
                .team(testTeam)
                .name("Test Program")
                .build();

        testEpisode = Episode.builder()
                .id(1L)
                .program(testProgram)
                .title("Test Episode")
                .description("Test Description")
                .status(Episode.Status.DRAFT)
                .currentVersion(1)
                .duration(3600)
                .build();

        testProducer = User.builder()
                .id(1L)
                .email("producer@example.com")
                .passwordHash("hashed")
                .name("Test Producer")
                .role(User.Role.PRODUCER)
                .team(testTeam)
                .build();

        testEditor = User.builder()
                .id(2L)
                .email("editor@example.com")
                .passwordHash("hashed")
                .name("Test Editor")
                .role(User.Role.EDITOR)
                .team(testTeam)
                .build();

        testShareLink = ShareLink.builder()
                .id(100L)
                .team(testTeam)
                .episode(testEpisode)
                .token("test-token-abc123xyz")
                .createdBy(testProducer)
                .expiresAt(LocalDateTime.now().plusDays(7))
                .accessCount(0)
                .createdAt(LocalDateTime.now())
                .build();

        testAudioVersion = AudioVersion.builder()
                .id(1L)
                .episode(testEpisode)
                .version(1)
                .fileName("episode-audio.mp3")
                .filePath("/audio/episode-audio.mp3")
                .fileSize(10485760L)
                .duration(3600)
                .mimeType("audio/mpeg")
                .note("Final version")
                .createdBy(testProducer)
                .createdAt(LocalDateTime.now())
                .build();

        when(securityUtil.getCurrentTeamId()).thenReturn(1L);
    }

    @AfterEach
    void tearDown() {
        reset(shareService, securityUtil, auditService, minioService);
    }

    @Test
    @DisplayName("正常创建分享链接 - PRODUCER 角色成功")
    @WithMockUser(roles = "PRODUCER")
    void createShareLink_ProducerRole_Success() throws Exception {
        when(securityUtil.getCurrentUser()).thenReturn(testProducer);
        when(shareService.createShareLink(eq(1L), eq(1L), eq(1L), eq(7)))
                .thenReturn(testShareLink);

        mockMvc.perform(post("/api/share/create")
                        .with(csrf())
                        .param("teamId", "1")
                        .param("episodeId", "1")
                        .param("daysValid", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("分享链接创建成功"))
                .andExpect(jsonPath("$.data.id").value(100))
                .andExpect(jsonPath("$.data.token").value("test-token-abc123xyz"))
                .andExpect(jsonPath("$.data.url").value(shareBaseUrl + "/share/test-token-abc123xyz"))
                .andExpect(jsonPath("$.data.teamId").value(1))
                .andExpect(jsonPath("$.data.episodeId").value(1))
                .andExpect(jsonPath("$.data.expiresAt").exists());

        verify(shareService).createShareLink(eq(1L), eq(1L), eq(1L), eq(7));
    }

    @Test
    @DisplayName("正常创建分享链接 - ADMIN 角色成功")
    @WithMockUser(roles = "ADMIN")
    void createShareLink_AdminRole_Success() throws Exception {
        when(securityUtil.getCurrentUser()).thenReturn(testProducer);
        when(shareService.createShareLink(eq(1L), eq(1L), eq(1L), eq(30)))
                .thenReturn(testShareLink);

        mockMvc.perform(post("/api/share/create")
                        .with(csrf())
                        .param("teamId", "1")
                        .param("episodeId", "1")
                        .param("daysValid", "30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(shareService).createShareLink(eq(1L), eq(1L), eq(1L), eq(30));
    }

    @Test
    @DisplayName("没权限创建分享链接 - EDITOR 角色被拒绝")
    @WithMockUser(roles = "EDITOR")
    void createShareLink_EditorRole_Forbidden() throws Exception {
        mockMvc.perform(post("/api/share/create")
                        .with(csrf())
                        .param("teamId", "1")
                        .param("episodeId", "1")
                        .param("daysValid", "7"))
                .andExpect(status().isForbidden());

        verify(shareService, never()).createShareLink(anyLong(), anyLong(), anyLong(), anyInt());
    }

    @Test
    @DisplayName("没权限创建分享链接 - HOST 角色被拒绝")
    @WithMockUser(roles = "HOST")
    void createShareLink_HostRole_Forbidden() throws Exception {
        mockMvc.perform(post("/api/share/create")
                        .with(csrf())
                        .param("teamId", "1")
                        .param("episodeId", "1")
                        .param("daysValid", "7"))
                .andExpect(status().isForbidden());

        verify(shareService, never()).createShareLink(anyLong(), anyLong(), anyLong(), anyInt());
    }

    @Test
    @DisplayName("没权限创建分享链接 - 未登录用户被拒绝")
    void createShareLink_Unauthenticated_Forbidden() throws Exception {
        mockMvc.perform(post("/api/share/create")
                        .with(csrf())
                        .param("teamId", "1")
                        .param("episodeId", "1")
                        .param("daysValid", "7"))
                .andExpect(status().isForbidden());

        verify(shareService, never()).createShareLink(anyLong(), anyLong(), anyLong(), anyInt());
    }

    @Test
    @DisplayName("创建分享链接 - 操作其他团队数据被拒绝")
    @WithMockUser(roles = "PRODUCER")
    void createShareLink_WrongTeam_BadRequest() throws Exception {
        when(securityUtil.getCurrentTeamId()).thenReturn(2L);

        mockMvc.perform(post("/api/share/create")
                        .with(csrf())
                        .param("teamId", "1")
                        .param("episodeId", "1")
                        .param("daysValid", "7"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("无权操作其他团队数据"));

        verify(shareService, never()).createShareLink(anyLong(), anyLong(), anyLong(), anyInt());
    }

    @Test
    @DisplayName("正常打开分享链接 - 获取分享信息成功")
    void getShareInfo_Success() throws Exception {
        when(shareService.validateAndAccess(eq("test-token-abc123xyz"), anyString(), anyString()))
                .thenReturn(testShareLink);
        when(shareService.getCurrentAudioVersionForShare(testShareLink))
                .thenReturn(testAudioVersion);

        mockMvc.perform(get("/api/share/test-token-abc123xyz")
                        .header("User-Agent", "TestBrowser/1.0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.episode.id").value(1))
                .andExpect(jsonPath("$.data.episode.title").value("Test Episode"))
                .andExpect(jsonPath("$.data.episode.description").value("Test Description"))
                .andExpect(jsonPath("$.data.episode.duration").value(3600))
                .andExpect(jsonPath("$.data.episode.currentVersion").value(1))
                .andExpect(jsonPath("$.data.episode.status").value("DRAFT"))
                .andExpect(jsonPath("$.data.audioVersion.id").value(1))
                .andExpect(jsonPath("$.data.audioVersion.version").value(1))
                .andExpect(jsonPath("$.data.audioVersion.fileName").value("episode-audio.mp3"))
                .andExpect(jsonPath("$.data.audioVersion.fileSize").value(10485760))
                .andExpect(jsonPath("$.data.audioVersion.duration").value(3600))
                .andExpect(jsonPath("$.data.audioVersion.mimeType").value("audio/mpeg"))
                .andExpect(jsonPath("$.data.audioVersion.note").value("Final version"))
                .andExpect(jsonPath("$.data.share.accessCount").value(0))
                .andExpect(jsonPath("$.data.share.expiresAt").exists())
                .andExpect(jsonPath("$.data.share.createdAt").exists());

        verify(shareService).validateAndAccess(eq("test-token-abc123xyz"), anyString(), eq("TestBrowser/1.0"));
    }

    @Test
    @DisplayName("打开分享链接 - 链接不存在返回 404")
    void getShareInfo_TokenNotFound_Returns404() throws Exception {
        when(shareService.validateAndAccess(eq("invalid-token"), anyString(), anyString()))
                .thenThrow(new IllegalArgumentException("分享链接不存在"));

        mockMvc.perform(get("/api/share/invalid-token"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("分享链接不存在"));
    }

    @Test
    @DisplayName("过期分享链接 - 打不开返回 410 GONE")
    void getShareInfo_ExpiredLink_Returns410() throws Exception {
        when(shareService.validateAndAccess(eq("expired-token"), anyString(), anyString()))
                .thenThrow(new IllegalStateException("分享链接已过期"));

        mockMvc.perform(get("/api/share/expired-token"))
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("分享链接已过期"));
    }

    @Test
    @DisplayName("获取波形数据 - 成功")
    void getWaveform_Success() throws Exception {
        Map<String, Object> waveformData = new HashMap<>();
        waveformData.put("peaks", Arrays.asList(0.1, 0.2, 0.3));
        waveformData.put("rms", Arrays.asList(0.05, 0.1, 0.15));
        waveformData.put("samples", 3);

        testAudioVersion.setWaveformData(waveformData);

        when(shareService.validateAndAccess(eq("test-token-abc123xyz"), anyString(), anyString()))
                .thenReturn(testShareLink);
        when(shareService.getCurrentAudioVersionForShare(testShareLink))
                .thenReturn(testAudioVersion);

        mockMvc.perform(get("/api/share/test-token-abc123xyz/waveform"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.peaks").isArray())
                .andExpect(jsonPath("$.data.peaks[0]").value(0.1))
                .andExpect(jsonPath("$.data.rms").isArray())
                .andExpect(jsonPath("$.data.samples").value(3));
    }

    @Test
    @DisplayName("获取波形数据 - 没有波形数据返回空")
    void getWaveform_NoData_ReturnsEmpty() throws Exception {
        when(shareService.validateAndAccess(eq("test-token-abc123xyz"), anyString(), anyString()))
                .thenReturn(testShareLink);
        when(shareService.getCurrentAudioVersionForShare(testShareLink))
                .thenReturn(null);

        mockMvc.perform(get("/api/share/test-token-abc123xyz/waveform"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.peaks").isArray())
                .andExpect(jsonPath("$.data.peaks").isEmpty())
                .andExpect(jsonPath("$.data.samples").value(0));
    }

    @Test
    @DisplayName("获取音频流 - 成功重定向")
    void getAudioStream_Success_Redirects() throws Exception {
        when(shareService.validateAndAccess(eq("test-token-abc123xyz"), anyString(), anyString()))
                .thenReturn(testShareLink);
        when(shareService.getCurrentAudioVersionForShare(testShareLink))
                .thenReturn(testAudioVersion);
        when(minioService.getPresignedUrl(eq("/audio/episode-audio.mp3"), eq(3600)))
                .thenReturn("https://minio.example.com/presigned-url");

        mockMvc.perform(get("/api/share/test-token-abc123xyz/audio"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "https://minio.example.com/presigned-url"));
    }

    @Test
    @DisplayName("获取音频流 - 音频文件不存在返回 404")
    void getAudioStream_NoAudio_Returns404() throws Exception {
        when(shareService.validateAndAccess(eq("test-token-abc123xyz"), anyString(), anyString()))
                .thenReturn(testShareLink);
        when(shareService.getCurrentAudioVersionForShare(testShareLink))
                .thenReturn(null);

        mockMvc.perform(get("/api/share/test-token-abc123xyz/audio"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("音频文件不存在"));
    }

    @Test
    @DisplayName("获取分享链接列表 - 已认证用户成功")
    @WithMockUser
    void getShareLinks_Authenticated_Success() throws Exception {
        ShareLink link2 = ShareLink.builder()
                .id(101L)
                .team(testTeam)
                .episode(testEpisode)
                .token("another-token")
                .createdBy(testProducer)
                .expiresAt(LocalDateTime.now().plusDays(3))
                .accessCount(5)
                .createdAt(LocalDateTime.now().minusDays(1))
                .build();

        List<ShareLink> links = Arrays.asList(testShareLink, link2);
        when(shareService.getShareLinks(1L, null)).thenReturn(links);

        mockMvc.perform(get("/api/share/list")
                        .param("teamId", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].id").value(100))
                .andExpect(jsonPath("$.data[0].token").value("test-token-abc123xyz"))
                .andExpect(jsonPath("$.data[0].accessCount").value(0))
                .andExpect(jsonPath("$.data[0].isExpired").value(false))
                .andExpect(jsonPath("$.data[0].episodeId").value(1))
                .andExpect(jsonPath("$.data[0].episodeTitle").value("Test Episode"))
                .andExpect(jsonPath("$.data[0].createdBy.id").value(1))
                .andExpect(jsonPath("$.data[0].createdBy.name").value("Test Producer"))
                .andExpect(jsonPath("$.data[0].createdBy.email").value("producer@example.com"));
    }

    @Test
    @DisplayName("获取分享链接列表 - 其他团队被拒绝")
    @WithMockUser
    void getShareLinks_WrongTeam_BadRequest() throws Exception {
        when(securityUtil.getCurrentTeamId()).thenReturn(2L);

        mockMvc.perform(get("/api/share/list")
                        .param("teamId", "1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("无权访问其他团队数据"));
    }

    @Test
    @DisplayName("撤销分享链接 - PRODUCER 角色成功")
    @WithMockUser(roles = "PRODUCER")
    void revokeShareLink_ProducerRole_Success() throws Exception {
        when(securityUtil.getCurrentUser()).thenReturn(testProducer);
        doNothing().when(shareService).revokeShareLink(1L, 100L, 1L);

        mockMvc.perform(delete("/api/share/100")
                        .with(csrf())
                        .param("teamId", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("分享链接已撤销"));

        verify(shareService).revokeShareLink(1L, 100L, 1L);
    }

    @Test
    @DisplayName("撤销分享链接 - ADMIN 角色成功")
    @WithMockUser(roles = "ADMIN")
    void revokeShareLink_AdminRole_Success() throws Exception {
        when(securityUtil.getCurrentUser()).thenReturn(testProducer);
        doNothing().when(shareService).revokeShareLink(1L, 100L, 1L);

        mockMvc.perform(delete("/api/share/100")
                        .with(csrf())
                        .param("teamId", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("撤销分享链接 - EDITOR 角色被拒绝")
    @WithMockUser(roles = "EDITOR")
    void revokeShareLink_EditorRole_Forbidden() throws Exception {
        mockMvc.perform(delete("/api/share/100")
                        .with(csrf())
                        .param("teamId", "1"))
                .andExpect(status().isForbidden());

        verify(shareService, never()).revokeShareLink(anyLong(), anyLong(), anyLong());
    }

    @Test
    @DisplayName("撤销分享链接 - 不存在返回 404")
    @WithMockUser(roles = "PRODUCER")
    void revokeShareLink_NotFound_Returns404() throws Exception {
        when(securityUtil.getCurrentUser()).thenReturn(testProducer);
        doThrow(new IllegalArgumentException("分享链接不存在或不属于当前团队"))
                .when(shareService).revokeShareLink(1L, 999L, 1L);

        mockMvc.perform(delete("/api/share/999")
                        .with(csrf())
                        .param("teamId", "1"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("分享链接不存在或不属于当前团队"));
    }

    @Test
    @DisplayName("多人同时访问分享链接 - 并发请求")
    void getShareInfo_ConcurrentRequests() throws Exception {
        AtomicInteger accessCount = new AtomicInteger(0);

        when(shareService.validateAndAccess(eq("concurrent-token"), anyString(), anyString()))
                .thenAnswer(invocation -> {
                    ShareLink link = ShareLink.builder()
                            .id(200L)
                            .team(testTeam)
                            .episode(testEpisode)
                            .token("concurrent-token")
                            .createdBy(testProducer)
                            .expiresAt(LocalDateTime.now().plusDays(7))
                            .accessCount(accessCount.incrementAndGet())
                            .build();
                    return link;
                });
        when(shareService.getCurrentAudioVersionForShare(any()))
                .thenReturn(testAudioVersion);

        int threadCount = 20;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        List<Callable<Void>> tasks = new ArrayList<>();

        for (int i = 0; i < threadCount; i++) {
            final int idx = i;
            tasks.add(() -> {
                mockMvc.perform(get("/api/share/concurrent-token")
                                .header("User-Agent", "Browser-" + idx)
                                .header("X-Forwarded-For", "192.168.1." + (idx % 255)))
                        .andExpect(status().isOk());
                return null;
            });
        }

        List<Future<Void>> futures = executor.invokeAll(tasks);
        executor.shutdown();
        executor.awaitTermination(30, TimeUnit.SECONDS);

        for (Future<Void> future : futures) {
            future.get();
        }

        assertEquals(threadCount, accessCount.get());
        verify(shareService, times(threadCount))
                .validateAndAccess(eq("concurrent-token"), anyString(), anyString());
    }

    @Test
    @DisplayName("多个人同时访问 - 不同 IP 和 User-Agent 都被记录")
    void getShareInfo_DifferentIpAndUserAgents() throws Exception {
        when(shareService.validateAndAccess(anyString(), anyString(), anyString()))
                .thenReturn(testShareLink);
        when(shareService.getCurrentAudioVersionForShare(any()))
                .thenReturn(testAudioVersion);

        mockMvc.perform(get("/api/share/test-token-abc123xyz")
                        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
                        .header("X-Forwarded-For", "203.0.113.1"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/share/test-token-abc123xyz")
                        .header("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)")
                        .header("X-Real-IP", "198.51.100.42"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/share/test-token-abc123xyz")
                        .header("User-Agent", "curl/7.88.1"))
                .andExpect(status().isOk());

        verify(shareService, times(3))
                .validateAndAccess(eq("test-token-abc123xyz"), anyString(), anyString());
    }
}
