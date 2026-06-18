package com.podcast.collab.service;

import com.podcast.collab.entity.*;
import com.podcast.collab.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShareServiceTest {

    @Mock
    private ShareLinkRepository shareLinkRepository;

    @Mock
    private ShareAccessLogRepository shareAccessLogRepository;

    @Mock
    private EpisodeRepository episodeRepository;

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AudioVersionRepository audioVersionRepository;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private ShareService shareService;

    private Team testTeam;
    private Program testProgram;
    private Episode testEpisode;
    private User testUser;
    private ShareLink testShareLink;
    private List<ShareLink> createdShareLinks;

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

        testUser = User.builder()
                .id(1L)
                .email("test@example.com")
                .passwordHash("hashed")
                .name("Test User")
                .role(User.Role.PRODUCER)
                .team(testTeam)
                .build();

        testShareLink = ShareLink.builder()
                .id(1L)
                .team(testTeam)
                .episode(testEpisode)
                .token("test-token-abc123")
                .createdBy(testUser)
                .expiresAt(LocalDateTime.now().plusDays(7))
                .accessCount(0)
                .build();

        createdShareLinks = Collections.synchronizedList(new ArrayList<>());
    }

    @AfterEach
    void tearDown() {
        createdShareLinks.clear();
        reset(shareLinkRepository, shareAccessLogRepository, episodeRepository,
                teamRepository, userRepository, audioVersionRepository, auditService);
    }

    private void trackCreatedShareLink(ShareLink link) {
        if (link != null) {
            createdShareLinks.add(link);
        }
    }

    @Test
    @DisplayName("正常创建分享链接 - 成功")
    void createShareLink_Success() {
        when(teamRepository.findById(1L)).thenReturn(Optional.of(testTeam));
        when(episodeRepository.findByIdAndTeamId(1L, 1L)).thenReturn(Optional.of(testEpisode));
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(shareLinkRepository.save(any(ShareLink.class))).thenAnswer(invocation -> {
            ShareLink saved = invocation.getArgument(0);
            saved.setId(100L);
            trackCreatedShareLink(saved);
            return saved;
        });
        when(shareLinkRepository.findByToken(anyString())).thenReturn(Optional.empty());

        ShareLink result = shareService.createShareLink(1L, 1L, 1L, 7);

        assertNotNull(result);
        assertNotNull(result.getToken());
        assertEquals(1L, result.getTeam().getId());
        assertEquals(1L, result.getEpisode().getId());
        assertEquals(1L, result.getCreatedBy().getId());
        assertEquals(0, result.getAccessCount());
        assertNotNull(result.getExpiresAt());
        assertTrue(result.getExpiresAt().isAfter(LocalDateTime.now()));
        assertTrue(result.getExpiresAt().isBefore(LocalDateTime.now().plusDays(8)));

        verify(shareLinkRepository).save(any(ShareLink.class));
        verify(auditService).logAction(eq(testTeam), eq(testUser), eq("CREATE_SHARE_LINK"),
                eq("SHARE_LINK"), anyLong(), anyMap());
    }

    @Test
    @DisplayName("创建分享链接 - 指定自定义有效期天数")
    void createShareLink_CustomValidDays() {
        when(teamRepository.findById(1L)).thenReturn(Optional.of(testTeam));
        when(episodeRepository.findByIdAndTeamId(1L, 1L)).thenReturn(Optional.of(testEpisode));
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(shareLinkRepository.save(any(ShareLink.class))).thenAnswer(invocation -> {
            ShareLink saved = invocation.getArgument(0);
            saved.setId(101L);
            trackCreatedShareLink(saved);
            return saved;
        });
        when(shareLinkRepository.findByToken(anyString())).thenReturn(Optional.empty());

        ShareLink result = shareService.createShareLink(1L, 1L, 1L, 30);

        assertNotNull(result);
        assertTrue(result.getExpiresAt().isAfter(LocalDateTime.now().plusDays(29)));
        assertTrue(result.getExpiresAt().isBefore(LocalDateTime.now().plusDays(31)));
    }

    @Test
    @DisplayName("创建分享链接 - 团队不存在时抛出异常")
    void createShareLink_TeamNotFound() {
        when(teamRepository.findById(999L)).thenReturn(Optional.empty());

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> shareService.createShareLink(999L, 1L, 1L, 7));

        assertEquals("团队不存在", exception.getMessage());
        verify(shareLinkRepository, never()).save(any(ShareLink.class));
    }

    @Test
    @DisplayName("创建分享链接 - 集数不存在或不属于团队时抛出异常")
    void createShareLink_EpisodeNotFound() {
        when(teamRepository.findById(1L)).thenReturn(Optional.of(testTeam));
        when(episodeRepository.findByIdAndTeamId(999L, 1L)).thenReturn(Optional.empty());

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> shareService.createShareLink(1L, 999L, 1L, 7));

        assertEquals("集数不存在或不属于当前团队", exception.getMessage());
        verify(shareLinkRepository, never()).save(any(ShareLink.class));
    }

    @Test
    @DisplayName("创建分享链接 - 用户不存在时抛出异常")
    void createShareLink_UserNotFound() {
        when(teamRepository.findById(1L)).thenReturn(Optional.of(testTeam));
        when(episodeRepository.findByIdAndTeamId(1L, 1L)).thenReturn(Optional.of(testEpisode));
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> shareService.createShareLink(1L, 1L, 999L, 7));

        assertEquals("用户不存在", exception.getMessage());
        verify(shareLinkRepository, never()).save(any(ShareLink.class));
    }

    @Test
    @DisplayName("正常打开分享链接 - 验证成功并增加访问计数")
    void validateAndAccess_Success() {
        when(shareLinkRepository.findByToken("test-token-abc123")).thenReturn(Optional.of(testShareLink));
        when(shareLinkRepository.save(any(ShareLink.class))).thenAnswer(invocation -> {
            ShareLink saved = invocation.getArgument(0);
            trackCreatedShareLink(saved);
            return saved;
        });
        when(shareAccessLogRepository.save(any(ShareAccessLog.class))).thenAnswer(invocation -> {
            ShareAccessLog log = invocation.getArgument(0);
            log.setId(1L);
            return log;
        });

        ShareLink result = shareService.validateAndAccess("test-token-abc123", "192.168.1.1", "TestBrowser/1.0");

        assertNotNull(result);
        assertEquals(1, result.getAccessCount());

        verify(shareLinkRepository).save(any(ShareLink.class));
        verify(shareAccessLogRepository).save(any(ShareAccessLog.class));
    }

    @Test
    @DisplayName("打开分享链接 - 链接不存在时抛出异常")
    void validateAndAccess_TokenNotFound() {
        when(shareLinkRepository.findByToken("invalid-token")).thenReturn(Optional.empty());

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> shareService.validateAndAccess("invalid-token", "192.168.1.1", "TestBrowser"));

        assertEquals("分享链接不存在", exception.getMessage());
        verify(shareLinkRepository, never()).save(any(ShareLink.class));
        verify(shareAccessLogRepository, never()).save(any(ShareAccessLog.class));
    }

    @Test
    @DisplayName("过期分享链接 - 打开时抛出异常")
    void validateAndAccess_ExpiredLink() {
        ShareLink expiredLink = ShareLink.builder()
                .id(2L)
                .team(testTeam)
                .episode(testEpisode)
                .token("expired-token")
                .createdBy(testUser)
                .expiresAt(LocalDateTime.now().minusDays(1))
                .accessCount(5)
                .build();

        when(shareLinkRepository.findByToken("expired-token")).thenReturn(Optional.of(expiredLink));

        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> shareService.validateAndAccess("expired-token", "192.168.1.1", "TestBrowser"));

        assertEquals("分享链接已过期", exception.getMessage());
        verify(shareLinkRepository, never()).save(any(ShareLink.class));
        verify(shareAccessLogRepository, never()).save(any(ShareAccessLog.class));
    }

    @Test
    @DisplayName("多人同时访问 - 验证并发访问计数正确")
    void validateAndAccess_ConcurrentAccess() throws InterruptedException, ExecutionException {
        ShareLink concurrentLink = ShareLink.builder()
                .id(3L)
                .team(testTeam)
                .episode(testEpisode)
                .token("concurrent-token")
                .createdBy(testUser)
                .expiresAt(LocalDateTime.now().plusDays(7))
                .accessCount(0)
                .build();

        AtomicInteger accessCounter = new AtomicInteger(0);
        when(shareLinkRepository.findByToken("concurrent-token")).thenAnswer(invocation -> {
            ShareLink link = ShareLink.builder()
                    .id(concurrentLink.getId())
                    .team(concurrentLink.getTeam())
                    .episode(concurrentLink.getEpisode())
                    .token(concurrentLink.getToken())
                    .createdBy(concurrentLink.getCreatedBy())
                    .expiresAt(concurrentLink.getExpiresAt())
                    .accessCount(accessCounter.get())
                    .build();
            return Optional.of(link);
        });

        when(shareLinkRepository.save(any(ShareLink.class))).thenAnswer(invocation -> {
            ShareLink saved = invocation.getArgument(0);
            accessCounter.set(saved.getAccessCount());
            trackCreatedShareLink(saved);
            return saved;
        });

        when(shareAccessLogRepository.save(any(ShareAccessLog.class))).thenAnswer(invocation -> {
            ShareAccessLog log = invocation.getArgument(0);
            log.setId((long) (Math.random() * 10000));
            return log;
        });

        int threadCount = 50;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        List<Callable<ShareLink>> tasks = new ArrayList<>();

        for (int i = 0; i < threadCount; i++) {
            final int idx = i;
            tasks.add(() -> shareService.validateAndAccess(
                    "concurrent-token",
                    "192.168.1." + (idx % 255),
                    "Browser-" + idx
            ));
        }

        List<Future<ShareLink>> futures = executor.invokeAll(tasks);
        executor.shutdown();
        executor.awaitTermination(30, TimeUnit.SECONDS);

        for (Future<ShareLink> future : futures) {
            assertNotNull(future.get());
        }

        assertEquals(threadCount, accessCounter.get(), "并发访问后访问计数应等于线程数");
    }

    @Test
    @DisplayName("并发创建分享链接 - 多个链接同时创建")
    void createShareLink_ConcurrentCreation() throws InterruptedException, ExecutionException {
        Set<String> generatedTokens = ConcurrentHashMap.newKeySet();

        when(teamRepository.findById(1L)).thenReturn(Optional.of(testTeam));
        when(episodeRepository.findByIdAndTeamId(1L, 1L)).thenReturn(Optional.of(testEpisode));
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        when(shareLinkRepository.findByToken(anyString())).thenAnswer(invocation -> {
            String token = invocation.getArgument(0);
            return generatedTokens.contains(token) ? Optional.of(testShareLink) : Optional.empty();
        });

        AtomicInteger idGenerator = new AtomicInteger(1000);
        when(shareLinkRepository.save(any(ShareLink.class))).thenAnswer(invocation -> {
            ShareLink saved = invocation.getArgument(0);
            saved.setId((long) idGenerator.incrementAndGet());
            generatedTokens.add(saved.getToken());
            trackCreatedShareLink(saved);
            return saved;
        });

        int threadCount = 20;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        List<Callable<ShareLink>> tasks = new ArrayList<>();

        for (int i = 0; i < threadCount; i++) {
            tasks.add(() -> shareService.createShareLink(1L, 1L, 1L, 7));
        }

        List<Future<ShareLink>> futures = executor.invokeAll(tasks);
        executor.shutdown();
        executor.awaitTermination(30, TimeUnit.SECONDS);

        List<ShareLink> results = new ArrayList<>();
        for (Future<ShareLink> future : futures) {
            ShareLink link = future.get();
            assertNotNull(link);
            results.add(link);
        }

        assertEquals(threadCount, results.size());
        assertEquals(threadCount, generatedTokens.size(), "所有生成的 token 应该唯一");
        assertEquals(threadCount, createdShareLinks.size());
    }

    @Test
    @DisplayName("撤销分享链接 - 成功")
    void revokeShareLink_Success() {
        when(shareLinkRepository.findByIdAndTeamId(1L, 1L)).thenReturn(Optional.of(testShareLink));
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        assertDoesNotThrow(() -> shareService.revokeShareLink(1L, 1L, 1L));

        verify(shareLinkRepository).delete(testShareLink);
        verify(auditService).logAction(eq(testTeam), eq(testUser), eq("REVOKE_SHARE_LINK"),
                eq("SHARE_LINK"), eq(1L), anyMap());
    }

    @Test
    @DisplayName("撤销分享链接 - 链接不存在时抛出异常")
    void revokeShareLink_NotFound() {
        when(shareLinkRepository.findByIdAndTeamId(999L, 1L)).thenReturn(Optional.empty());

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> shareService.revokeShareLink(1L, 999L, 1L));

        assertEquals("分享链接不存在或不属于当前团队", exception.getMessage());
        verify(shareLinkRepository, never()).delete(any(ShareLink.class));
    }

    @Test
    @DisplayName("获取分享链接列表 - 按团队查询")
    void getShareLinks_ByTeam() {
        ShareLink link1 = ShareLink.builder().id(1L).team(testTeam).episode(testEpisode).build();
        ShareLink link2 = ShareLink.builder().id(2L).team(testTeam).episode(testEpisode).build();
        List<ShareLink> links = Arrays.asList(link1, link2);

        when(shareLinkRepository.findByTeamId(1L)).thenReturn(links);

        List<ShareLink> result = shareService.getShareLinks(1L, null);

        assertEquals(2, result.size());
        verify(shareLinkRepository).findByTeamId(1L);
        verify(shareLinkRepository, never()).findByTeamIdAndEpisodeId(anyLong(), anyLong());
    }

    @Test
    @DisplayName("获取分享链接列表 - 按团队和集数查询")
    void getShareLinks_ByTeamAndEpisode() {
        ShareLink link1 = ShareLink.builder().id(1L).team(testTeam).episode(testEpisode).build();
        List<ShareLink> links = Collections.singletonList(link1);

        when(shareLinkRepository.findByTeamIdAndEpisodeId(1L, 1L)).thenReturn(links);

        List<ShareLink> result = shareService.getShareLinks(1L, 1L);

        assertEquals(1, result.size());
        verify(shareLinkRepository).findByTeamIdAndEpisodeId(1L, 1L);
        verify(shareLinkRepository, never()).findByTeamId(anyLong());
    }

    @Test
    @DisplayName("获取分享关联的音频版本 - 存在时返回")
    void getCurrentAudioVersionForShare_Exists() {
        AudioVersion audioVersion = AudioVersion.builder()
                .id(1L)
                .episode(testEpisode)
                .version(1)
                .fileName("audio.mp3")
                .filePath("/audio/audio.mp3")
                .fileSize(1024L)
                .duration(3600)
                .mimeType("audio/mpeg")
                .createdBy(testUser)
                .build();

        when(audioVersionRepository.findByEpisodeIdAndVersionAndTeamId(1L, 1, 1L))
                .thenReturn(Optional.of(audioVersion));

        AudioVersion result = shareService.getCurrentAudioVersionForShare(testShareLink);

        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals("audio.mp3", result.getFileName());
    }

    @Test
    @DisplayName("获取分享关联的音频版本 - 不存在时返回null")
    void getCurrentAudioVersionForShare_NotFound() {
        when(audioVersionRepository.findByEpisodeIdAndVersionAndTeamId(1L, 1, 1L))
                .thenReturn(Optional.empty());

        AudioVersion result = shareService.getCurrentAudioVersionForShare(testShareLink);

        assertNull(result);
    }

    @Test
    @DisplayName("清理过期分享链接")
    void cleanupExpiredShareLinks() {
        when(shareLinkRepository.deleteByExpiresAtBefore(any(LocalDateTime.class))).thenReturn(5);

        int deleted = shareService.cleanupExpiredShareLinks();

        assertEquals(5, deleted);
        verify(shareLinkRepository).deleteByExpiresAtBefore(any(LocalDateTime.class));
    }

    @Test
    @DisplayName("清理过期分享链接 - 没有过期链接")
    void cleanupExpiredShareLinks_NoExpired() {
        when(shareLinkRepository.deleteByExpiresAtBefore(any(LocalDateTime.class))).thenReturn(0);

        int deleted = shareService.cleanupExpiredShareLinks();

        assertEquals(0, deleted);
    }

    @Test
    @DisplayName("ShareLink 实体 - isExpired 方法正确判断过期状态")
    void shareLinkEntity_IsExpired() {
        ShareLink activeLink = ShareLink.builder()
                .expiresAt(LocalDateTime.now().plusDays(1))
                .build();
        assertFalse(activeLink.isExpired());

        ShareLink expiredLink = ShareLink.builder()
                .expiresAt(LocalDateTime.now().minusDays(1))
                .build();
        assertTrue(expiredLink.isExpired());

        ShareLink justExpiredLink = ShareLink.builder()
                .expiresAt(LocalDateTime.now().minusSeconds(1))
                .build();
        assertTrue(justExpiredLink.isExpired());
    }
}
