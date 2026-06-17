package com.podcast.collab.service;

import com.podcast.collab.config.AudioEnhancementWebSocketHandler;
import com.podcast.collab.dto.AudioEnhancementRequest;
import com.podcast.collab.entity.*;
import com.podcast.collab.repository.*;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AudioEnhancementService {

    private final AudioEnhancementTaskRepository taskRepository;
    private final AudioEnhancementItemRepository itemRepository;
    private final AudioVersionRepository audioVersionRepository;
    private final EpisodeRepository episodeRepository;
    private final UserRepository userRepository;
    private final MinioService minioService;
    private final AuditService auditService;
    private final AudioEnhancementWebSocketHandler webSocketHandler;

    @Value("${audio.temp.directory:/tmp/podcast-audio}")
    private String tempDirectory;

    @Value("${audio.enhancement.max-concurrent:2}")
    private int maxConcurrent;

    @Value("${audio.waveform.samples:1000}")
    private Integer waveformSamples;

    private boolean ffmpegAvailable = true;
    private ExecutorService processingExecutor;

    @PostConstruct
    public void init() {
        checkFfmpeg();
        processingExecutor = Executors.newFixedThreadPool(maxConcurrent);
        log.info("音频增强服务初始化完成，最大并发处理数: {}", maxConcurrent);
    }

    private void checkFfmpeg() {
        try {
            Process pb = new ProcessBuilder("ffmpeg", "-version").start();
            int exitCode = pb.waitFor();
            ffmpegAvailable = (exitCode == 0);
            log.info("FFmpeg 可用性检查: {}", ffmpegAvailable ? "可用" : "不可用");
        } catch (Exception e) {
            log.warn("FFmpeg 不可用，音频增强功能将受限: {}", e.getMessage());
            ffmpegAvailable = false;
        }
    }

    @Transactional
    public AudioEnhancementTask createEnhancementTask(AudioEnhancementRequest request, Long userId) throws Exception {
        if (!ffmpegAvailable) {
            throw new IllegalStateException("FFmpeg 不可用，无法执行音频增强");
        }

        Episode episode = episodeRepository.findByIdAndTeamId(request.getEpisodeId(), request.getTeamId())
                .orElseThrow(() -> new IllegalArgumentException("节目不存在或不属于当前团队"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("用户不存在"));

        List<Long> audioVersionIds = request.getAudioVersionIds();
        if (audioVersionIds == null || audioVersionIds.isEmpty()) {
            audioVersionIds = Collections.singletonList(episode.getCurrentVersion() != null ?
                    audioVersionRepository.findByEpisodeIdAndVersionAndTeamId(
                            request.getEpisodeId(), episode.getCurrentVersion(), request.getTeamId())
                            .map(AudioVersion::getId)
                            .orElse(null) : null);
        }

        audioVersionIds = audioVersionIds.stream().filter(Objects::nonNull).toList();
        if (audioVersionIds.isEmpty()) {
            throw new IllegalArgumentException("没有有效的音频版本可供处理");
        }

        for (Long audioVersionId : audioVersionIds) {
            AudioVersion av = audioVersionRepository.findByIdAndTeamId(audioVersionId, request.getTeamId())
                    .orElseThrow(() -> new IllegalArgumentException("音频版本不存在或不属于当前团队: " + audioVersionId));
            if (!av.getEpisode().getId().equals(request.getEpisodeId())) {
                throw new IllegalArgumentException("音频版本不属于指定的节目: " + audioVersionId));
            }
        }

        Map<String, Object> defaultSettings = getDefaultSettings(request.getTaskType());
        if (request.getSettings() != null) {
            defaultSettings.putAll(request.getSettings());
        }

        AudioEnhancementTask task = AudioEnhancementTask.builder()
                .teamId(request.getTeamId())
                .episodeId(request.getEpisodeId())
                .createdBy(userId)
                .taskType(request.getTaskType())
                .status(AudioEnhancementTask.TaskStatus.PENDING)
                .progress(0)
                .totalAudioCount(audioVersionIds.size())
                .completedAudioCount(0)
                .audioVersionIds(audioVersionIds)
                .settings(defaultSettings)
                .build();

        task = taskRepository.save(task);

        List<AudioEnhancementItem> items = new ArrayList<>();
        for (Long audioVersionId : audioVersionIds) {
            AudioEnhancementItem item = AudioEnhancementItem.builder()
                    .task(task)
                    .sourceAudioVersionId(audioVersionId)
                    .status(AudioEnhancementItem.ItemStatus.PENDING)
                    .progress(0)
                    .build();
            items.add(item);
        }
        itemRepository.saveAll(items);
        task.setItems(items);

        auditService.logAction(episode.getProgram().getTeam(), user, "CREATE_ENHANCEMENT_TASK",
                "AUDIO_ENHANCEMENT_TASK", task.getId(),
                Map.of("taskType", request.getTaskType().name(),
                        "audioCount", audioVersionIds.size()));

        startProcessing(task.getId());

        return task;
    }

    private Map<String, Object> getDefaultSettings(AudioEnhancementTask.TaskType taskType) {
        Map<String, Object> settings = new HashMap<>();
        switch (taskType) {
            case NOISE_REDUCTION:
                settings.put("noiseReductionStrength", 0.7);
                settings.put("noiseFloor", -50);
                settings.put("frequencySmoothing", 0.5);
                break;
            case VOLUME_BALANCE:
                settings.put("targetLoudness", -16);
                settings.put("truePeak", -1);
                settings.put("loudnessRange", 11);
                break;
            case VOICE_ENHANCE:
                settings.put("lowCutFreq", 80);
                settings.put("highCutFreq", 12000);
                settings.put("presenceGain", 3);
                break;
            case FULL_ENHANCE:
                settings.put("noiseReductionStrength", 0.7);
                settings.put("noiseFloor", -50);
                settings.put("targetLoudness", -16);
                settings.put("truePeak", -1);
                settings.put("lowCutFreq", 80);
                settings.put("highCutFreq", 12000);
                settings.put("presenceGain", 3);
                break;
        }
        return settings;
    }

    @Async
    public void startProcessing(Long taskId) {
        processingExecutor.submit(() -> {
            try {
                processTask(taskId);
            } catch (Exception e) {
                log.error("处理音频增强任务失败: taskId={}", taskId, e);
                markTaskFailed(taskId, e.getMessage());
            }
        });
    }

    @Transactional
    protected void processTask(Long taskId) throws Exception {
        AudioEnhancementTask task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在: " + taskId));

        if (task.getStatus() != AudioEnhancementTask.TaskStatus.PENDING) {
            log.warn("任务状态不是待处理，跳过: taskId={}, status={}", taskId, task.getStatus());
            return;
        }

        task.setStatus(AudioEnhancementTask.TaskStatus.PROCESSING);
        task.setUpdatedAt(LocalDateTime.now());
        taskRepository.save(task);

        broadcastProgress(task);

        List<AudioEnhancementItem> items = itemRepository.findByTaskId(taskId);
        List<Long> resultVersionIds = new ArrayList<>();

        for (int i = 0; i < items.size(); i++) {
            AudioEnhancementItem item = items.get(i);
            try {
                item.setStatus(AudioEnhancementItem.ItemStatus.PROCESSING);
                item.setStartedAt(LocalDateTime.now());
                itemRepository.save(item);

                broadcastProgress(task);

                Long resultVersionId = processAudio(task, item);
                resultVersionIds.add(resultVersionId);

                item.setResultAudioVersionId(resultVersionId);
                item.setStatus(AudioEnhancementItem.ItemStatus.COMPLETED);
                item.setProgress(100);
                item.setCompletedAt(LocalDateTime.now());
                itemRepository.save(item);

                task.setCompletedAudioCount(task.getCompletedAudioCount() + 1);
                updateTaskProgress(task);
                taskRepository.save(task);

                broadcastProgress(task);

            } catch (Exception e) {
                log.error("处理音频增强子项失败: itemId={}", item.getId(), e);
                item.setStatus(AudioEnhancementItem.ItemStatus.FAILED);
                item.setErrorMessage(e.getMessage());
                item.setCompletedAt(LocalDateTime.now());
                itemRepository.save(item);
            }
        }

        long successCount = itemRepository.countByTaskIdAndStatus(taskId, AudioEnhancementItem.ItemStatus.COMPLETED);
        long failedCount = itemRepository.countByTaskIdAndStatus(taskId, AudioEnhancementItem.ItemStatus.FAILED);

        task.setResultAudioVersionIds(resultVersionIds);

        if (failedCount > 0 && successCount == 0) {
            task.setStatus(AudioEnhancementTask.TaskStatus.FAILED);
            task.setErrorMessage("所有音频处理失败");
        } else if (failedCount > 0) {
            task.setStatus(AudioEnhancementTask.TaskStatus.COMPLETED);
            task.setErrorMessage("部分音频处理失败，失败数量: " + failedCount);
        } else {
            task.setStatus(AudioEnhancementTask.TaskStatus.COMPLETED);
        }

        task.setProgress(100);
        task.setCompletedAt(LocalDateTime.now());
        task.setUpdatedAt(LocalDateTime.now());
        taskRepository.save(task);

        broadcastCompleted(task);
    }

    private Long processAudio(AudioEnhancementTask task, AudioEnhancementItem item) throws Exception {
        AudioVersion sourceVersion = audioVersionRepository.findById(item.getSourceAudioVersionId())
                .orElseThrow(() -> new IllegalArgumentException("源音频版本不存在"));

        Files.createDirectories(Paths.get(tempDirectory));

        String sourceUrl = minioService.getPresignedUrl(sourceVersion.getFilePath(), 3600);
        String originalFilename = sourceVersion.getFileName();
        String fileExtension = originalFilename != null && originalFilename.contains(".") ?
                originalFilename.substring(originalFilename.lastIndexOf(".")) : ".mp3";

        Integer nextVersion = audioVersionRepository.findMaxVersionByEpisodeId(task.getEpisodeId());
        if (nextVersion == null) {
            nextVersion = 1;
        } else {
            nextVersion += 1;
        }

        String uniqueFileName = "episode_" + task.getEpisodeId() + "_v" + nextVersion + "_enhanced_" +
                UUID.randomUUID().toString().substring(0, 8) + fileExtension;

        Path tempInputPath = Paths.get(tempDirectory, "input_" + uniqueFileName);
        Path tempOutputPath = Paths.get(tempDirectory, "output_" + uniqueFileName);
        Path progressPath = Paths.get(tempDirectory, "progress_" + item.getId() + ".log");

        try {
            downloadFile(sourceUrl, tempInputPath);

            String filterComplex = buildFilterComplex(task.getTaskType(), task.getSettings());

            Process process = executeFfmpeg(tempInputPath, tempOutputPath, progressPath, filterComplex);

            monitorProgress(process, progressPath, item, task);

            int exitCode = process.waitFor();
            if (exitCode != 0) {
                throw new RuntimeException("FFmpeg处理失败，退出码: " + exitCode);
            }

            int duration = getAudioDuration(tempOutputPath);
            Map<String, Object> waveformData = generateWaveform(tempOutputPath, waveformSamples);

            String objectName = "teams/" + task.getTeamId() + "/episodes/" + task.getEpisodeId() + "/audio/" + uniqueFileName;
            String fileUrl = minioService.uploadFile(objectName, tempOutputPath.toFile(), "audio/mpeg");

            Episode episode = episodeRepository.findById(task.getEpisodeId()).orElseThrow();
            User creator = userRepository.findById(task.getCreatedBy()).orElseThrow();

            String enhancedNote = buildEnhancedNote(task.getTaskType(), sourceVersion.getNote());

            AudioVersion newVersion = AudioVersion.builder()
                    .episode(episode)
                    .version(nextVersion)
                    .fileName(buildEnhancedFileName(originalFilename, task.getTaskType()))
                    .filePath(objectName)
                    .fileSize(Files.size(tempOutputPath))
                    .duration(duration)
                    .mimeType("audio/mpeg")
                    .waveformData(waveformData)
                    .createdBy(creator)
                    .note(enhancedNote)
                    .isArchived(false)
                    .enhancementType(task.getTaskType())
                    .sourceVersionId(sourceVersion.getId())
                    .enhancementSettings(task.getSettings())
                    .build();

            newVersion = audioVersionRepository.save(newVersion);

            episode.setCurrentVersion(nextVersion);
            episode.setDuration(duration);
            episodeRepository.save(episode);

            auditService.logAction(episode.getProgram().getTeam(), creator, "AUDIO_ENHANCED",
                    "AUDIO_VERSION", newVersion.getId(),
                    Map.of("sourceVersionId", sourceVersion.getId(),
                            "taskType", task.getTaskType().name(),
                            "newVersion", nextVersion));

            return newVersion.getId();

        } finally {
            Files.deleteIfExists(tempInputPath);
            Files.deleteIfExists(tempOutputPath);
            Files.deleteIfExists(progressPath);
        }
    }

    private String buildFilterComplex(AudioEnhancementTask.TaskType taskType, Map<String, Object> settings) {
        StringBuilder filter = new StringBuilder();

        switch (taskType) {
            case NOISE_REDUCTION:
                filter.append(buildNoiseReductionFilter(settings));
                break;
            case VOLUME_BALANCE:
                filter.append(buildVolumeBalanceFilter(settings));
                break;
            case VOICE_ENHANCE:
                filter.append(buildVoiceEnhanceFilter(settings));
                break;
            case FULL_ENHANCE:
                filter.append(buildNoiseReductionFilter(settings));
                filter.append(",");
                filter.append(buildVoiceEnhanceFilter(settings));
                filter.append(",");
                filter.append(buildVolumeBalanceFilter(settings));
                break;
        }

        return filter.toString();
    }

    private String buildNoiseReductionFilter(Map<String, Object> settings) {
        double strength = ((Number) settings.getOrDefault("noiseReductionStrength", 0.7)).doubleValue();
        int noiseFloor = ((Number) settings.getOrDefault("noiseFloor", -50)).intValue();
        double smoothing = ((Number) settings.getOrDefault("frequencySmoothing", 0.5)).doubleValue();

        return String.format("afftdn=nf=%d:tn=%d:tnf=%d:ph=1:tnr=%.2f",
                noiseFloor,
                noiseFloor + (int) (strength * 30),
                noiseFloor + (int) (strength * 20),
                smoothing);
    }

    private String buildVolumeBalanceFilter(Map<String, Object> settings) {
        int targetLoudness = ((Number) settings.getOrDefault("targetLoudness", -16)).intValue();
        int truePeak = ((Number) settings.getOrDefault("truePeak", -1)).intValue();
        int loudnessRange = ((Number) settings.getOrDefault("loudnessRange", 11)).intValue();

        return String.format("loudnorm=I=%d:TP=%d:LRA=%d",
                targetLoudness, truePeak, loudnessRange);
    }

    private String buildVoiceEnhanceFilter(Map<String, Object> settings) {
        int lowCut = ((Number) settings.getOrDefault("lowCutFreq", 80)).intValue();
        int highCut = ((Number) settings.getOrDefault("highCutFreq", 12000)).intValue();
        double presenceGain = ((Number) settings.getOrDefault("presenceGain", 3)).doubleValue();

        return String.format("highpass=f=%d,lowpass=f=%d,equalizer=f=2000:t=q:w=1:g=%.1f,equalizer=f=4000:t=q:w=1:g=%.1f",
                lowCut, highCut, presenceGain, presenceGain * 0.5);
    }

    private Process executeFfmpeg(Path input, Path output, Path progressPath, String filterComplex) throws IOException {
        List<String> command = new ArrayList<>();
        command.add("ffmpeg");
        command.add("-y");
        command.add("-i");
        command.add(input.toString());
        command.add("-filter_complex");
        command.add(filterComplex);
        command.add("-progress");
        command.add(progressPath.toString());
        command.add("-ac");
        command.add("2");
        command.add("-ar");
        command.add("44100");
        command.add("-b:a");
        command.add("192k");
        command.add(output.toString());

        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true);
        return pb.start();
    }

    private void monitorProgress(Process process, Path progressPath, AudioEnhancementItem item, AudioEnhancementTask task) throws Exception {
        long totalDuration = -1;

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.startsWith("Duration:")) {
                    totalDuration = parseDuration(line);
                }
            }
        }

        while (process.isAlive()) {
            if (Files.exists(progressPath)) {
                String content = Files.readString(progressPath);
                long currentTime = parseProgressTime(content);
                if (totalDuration > 0 && currentTime > 0) {
                    int progress = (int) ((currentTime * 100) / totalDuration);
                    progress = Math.min(99, Math.max(0, progress));
                    item.setProgress(progress);
                    itemRepository.save(item);
                    updateTaskProgress(task);
                    broadcastProgress(task);
                }
            }
            Thread.sleep(500);
        }
    }

    private long parseDuration(String line) {
        try {
            String timeStr = line.split(",")[0].replace("Duration:", "").trim();
            return parseTimeToMillis(timeStr);
        } catch (Exception e) {
            return -1;
        }
    }

    private long parseProgressTime(String content) {
        try {
            for (String line : content.split("\n")) {
                if (line.startsWith("out_time_ms=")) {
                    return Long.parseLong(line.split("=")[1].trim()) / 1000;
                }
                if (line.startsWith("out_time=")) {
                    return parseTimeToMillis(line.split("=")[1].trim());
                }
            }
            return -1;
        } catch (Exception e) {
            return -1;
        }
    }

    private long parseTimeToMillis(String timeStr) {
        String[] parts = timeStr.split(":");
        if (parts.length == 3) {
            int hours = Integer.parseInt(parts[0]);
            int minutes = Integer.parseInt(parts[1]);
            double seconds = Double.parseDouble(parts[2]);
            return (long) ((hours * 3600 + minutes * 60 + seconds) * 1000);
        }
        return 0;
    }

    private void updateTaskProgress(AudioEnhancementTask task) {
        List<AudioEnhancementItem> items = itemRepository.findByTaskId(task.getId());
        if (items.isEmpty()) return;

        int totalProgress = 0;
        for (AudioEnhancementItem item : items) {
            totalProgress += item.getProgress();
        }

        int overallProgress = totalProgress / items.size();
        task.setProgress(overallProgress);
        task.setUpdatedAt(LocalDateTime.now());
    }

    private void broadcastProgress(AudioEnhancementTask task) {
        Map<String, Object> progressData = new HashMap<>();
        progressData.put("taskId", task.getId());
        progressData.put("status", task.getStatus().name());
        progressData.put("progress", task.getProgress());
        progressData.put("totalAudioCount", task.getTotalAudioCount());
        progressData.put("completedAudioCount", task.getCompletedAudioCount());

        List<Map<String, Object>> itemsData = new ArrayList<>();
        List<AudioEnhancementItem> items = itemRepository.findByTaskId(task.getId());
        for (AudioEnhancementItem item : items) {
            Map<String, Object> itemData = new HashMap<>();
            itemData.put("itemId", item.getId());
            itemData.put("sourceAudioVersionId", item.getSourceAudioVersionId());
            itemData.put("status", item.getStatus().name());
            itemData.put("progress", item.getProgress());
            itemsData.add(itemData);
        }
        progressData.put("items", itemsData);

        webSocketHandler.broadcastTaskProgress(task.getTeamId(), progressData);
    }

    private void broadcastCompleted(AudioEnhancementTask task) {
        Map<String, Object> resultData = new HashMap<>();
        resultData.put("taskId", task.getId());
        resultData.put("status", task.getStatus().name());
        resultData.put("progress", 100);
        resultData.put("totalAudioCount", task.getTotalAudioCount());
        resultData.put("completedAudioCount", task.getCompletedAudioCount());
        resultData.put("resultAudioVersionIds", task.getResultAudioVersionIds());
        resultData.put("errorMessage", task.getErrorMessage());
        resultData.put("completedAt", task.getCompletedAt());

        webSocketHandler.broadcastTaskCompleted(task.getTeamId(), resultData);
    }

    private void markTaskFailed(Long taskId, String errorMessage) {
        try {
            AudioEnhancementTask task = taskRepository.findById(taskId).orElseThrow();
            task.setStatus(AudioEnhancementTask.TaskStatus.FAILED);
            task.setErrorMessage(errorMessage);
            task.setProgress(0);
            task.setUpdatedAt(LocalDateTime.now());
            task.setCompletedAt(LocalDateTime.now());
            taskRepository.save(task);

            List<AudioEnhancementItem> items = itemRepository.findByTaskId(taskId);
            for (AudioEnhancementItem item : items) {
                if (item.getStatus() == AudioEnhancementItem.ItemStatus.PENDING ||
                        item.getStatus() == AudioEnhancementItem.ItemStatus.PROCESSING) {
                    item.setStatus(AudioEnhancementItem.ItemStatus.FAILED);
                    item.setErrorMessage("任务失败");
                    item.setCompletedAt(LocalDateTime.now());
                }
            }
            itemRepository.saveAll(items);

            Map<String, Object> errorData = new HashMap<>();
            errorData.put("taskId", task.getId());
            errorData.put("status", "FAILED");
            errorData.put("errorMessage", errorMessage);

            webSocketHandler.broadcastTaskFailed(task.getTeamId(), errorData);

        } catch (Exception e) {
            log.error("标记任务失败时出错", e);
        }
    }

    private void downloadFile(String urlStr, Path destination) throws Exception {
        java.net.URL url = new java.net.URL(urlStr);
        try (InputStream in = url.openStream();
             OutputStream out = Files.newOutputStream(destination)) {
            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = in.read(buffer)) != -1) {
                out.write(buffer, 0, bytesRead);
            }
        }
    }

    private int getAudioDuration(Path filePath) throws Exception {
        if (!ffmpegAvailable) return 1800;
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "ffprobe",
                    "-v", "error",
                    "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1",
                    filePath.toString()
            );

            Process process = pb.start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String output = reader.readLine();
                process.waitFor();

                if (output != null && !output.isEmpty()) {
                    return (int) Math.round(Double.parseDouble(output));
                }
            }
        } catch (Exception e) {
            log.error("获取音频时长失败", e);
        }
        return 0;
    }

    private Map<String, Object> generateWaveform(Path filePath, int samples) throws Exception {
        if (!ffmpegAvailable) {
            List<Double> peaks = generateMockWaveform(samples);
            List<Double> rms = generateMockWaveform(samples);
            Map<String, Object> result = new HashMap<>();
            result.put("peaks", peaks);
            result.put("rms", rms);
            result.put("sampleRate", 44100);
            result.put("samples", peaks.size());
            result.put("mock", true);
            return result;
        }

        Path tempJson = Files.createTempFile("waveform_", ".json");

        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "ffmpeg",
                    "-i", filePath.toString(),
                    "-ac", "1",
                    "-ar", "44100",
                    "-filter_complex", "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=" + tempJson.toString(),
                    "-f", "null", "-"
            );

            Process process = pb.start();
            process.waitFor();

            List<Double> peaks = new ArrayList<>();
            List<Double> rms = new ArrayList<>();

            if (Files.exists(tempJson)) {
                String content = Files.readString(tempJson);
                String[] lines = content.split("\n");

                for (String line : lines) {
                    if (line.contains("RMS_level")) {
                        try {
                            double value = Double.parseDouble(line.split("=")[1].trim());
                            double normalized = Math.pow(10, value / 20);
                            peaks.add(normalized);
                            rms.add(normalized * 0.7);
                        } catch (Exception ignored) {
                        }
                    }
                }
            }

            if (peaks.isEmpty()) {
                peaks = generateMockWaveform(samples);
                rms = generateMockWaveform(samples);
            }

            peaks = downsample(peaks, samples);
            rms = downsample(rms, samples);

            Map<String, Object> result = new HashMap<>();
            result.put("peaks", peaks);
            result.put("rms", rms);
            result.put("sampleRate", 44100);
            result.put("samples", peaks.size());

            return result;

        } finally {
            Files.deleteIfExists(tempJson);
        }
    }

    private List<Double> generateMockWaveform(int samples) {
        List<Double> data = new ArrayList<>();
        Random random = new Random();
        for (int i = 0; i < samples; i++) {
            double base = Math.sin(i * 0.1) * 0.3 + 0.5;
            double noise = random.nextDouble() * 0.2;
            data.add(Math.min(1.0, Math.max(0.0, base + noise)));
        }
        return data;
    }

    private List<Double> downsample(List<Double> data, int targetSize) {
        if (data.size() <= targetSize) {
            return data;
        }

        List<Double> result = new ArrayList<>();
        int bucketSize = data.size() / targetSize;

        for (int i = 0; i < targetSize; i++) {
            double sum = 0;
            int start = i * bucketSize;
            int end = Math.min(start + bucketSize, data.size());

            for (int j = start; j < end; j++) {
                sum += data.get(j);
            }

            result.add(sum / (end - start));
        }

        return result;
    }

    private String buildEnhancedFileName(String originalName, AudioEnhancementTask.TaskType taskType) {
        if (originalName == null) return "enhanced_audio.mp3";
        int dotIndex = originalName.lastIndexOf('.');
        String baseName = dotIndex > 0 ? originalName.substring(0, dotIndex) : originalName;
        String extension = dotIndex > 0 ? originalName.substring(dotIndex) : ".mp3";
        String suffix = switch (taskType) {
            case NOISE_REDUCTION -> "_降噪";
            case VOLUME_BALANCE -> "_音量平衡";
            case VOICE_ENHANCE -> "_人声增强";
            case FULL_ENHANCE -> "_完整增强";
        };
        return baseName + suffix + extension;
    }

    private String buildEnhancedNote(AudioEnhancementTask.TaskType taskType, String originalNote) {
        String prefix = switch (taskType) {
            case NOISE_REDUCTION -> "[降噪处理]";
            case VOLUME_BALANCE -> "[音量平衡]";
            case VOICE_ENHANCE -> "[人声增强]";
            case FULL_ENHANCE -> "[完整音频增强]";
        };
        return originalNote != null ? prefix + " " + originalNote : prefix;
    }

    @Transactional(readOnly = true)
    public AudioEnhancementTask getTaskById(Long teamId, Long taskId) {
        return taskRepository.findByIdAndTeamId(taskId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在或不属于当前团队"));
    }

    @Transactional(readOnly = true)
    public List<AudioEnhancementTask> getTasksByEpisode(Long teamId, Long episodeId) {
        List<AudioEnhancementTask> tasks = taskRepository.findByEpisodeId(episodeId);
        return tasks.stream()
                .filter(t -> t.getTeamId().equals(teamId))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AudioEnhancementTask> getTasksByTeam(Long teamId) {
        return taskRepository.findByTeamId(teamId);
    }

    @Transactional(readOnly = true)
    public List<AudioEnhancementItem> getTaskItems(Long teamId, Long taskId) {
        AudioEnhancementTask task = getTaskById(teamId, taskId);
        return itemRepository.findByTaskId(task.getId());
    }
}
