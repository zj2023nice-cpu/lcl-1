package com.podcast.collab.service;

import com.podcast.collab.entity.AudioVersion;
import com.podcast.collab.entity.Episode;
import com.podcast.collab.entity.User;
import com.podcast.collab.repository.AudioVersionRepository;
import com.podcast.collab.repository.EpisodeRepository;
import com.podcast.collab.repository.UserRepository;
import com.podcast.collab.validation.FileValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AudioService {

    /** 保留的最大版本数量，超过后旧版本将被归档 */
    private static final int MAX_VERSIONS_TO_KEEP = 10;

    private final AudioVersionRepository audioVersionRepository;
    private final EpisodeRepository episodeRepository;
    private final UserRepository userRepository;
    private final MinioService minioService;
    private final AuditService auditService;
    
    @Value("${audio.temp.directory:/tmp/podcast-audio}")
    private String tempDirectory;
    
    @Value("${audio.waveform.samples:1000}")
    private Integer waveformSamples;

    private boolean ffmpegAvailable = true;

    @jakarta.annotation.PostConstruct
    public void checkFfmpeg() {
        try {
            Process pb = new ProcessBuilder("ffmpeg", "-version").start();
            int exitCode = pb.waitFor();
            ffmpegAvailable = (exitCode == 0);
            log.info("FFmpeg 可用性检查: {}", ffmpegAvailable ? "可用" : "不可用");
        } catch (Exception e) {
            log.warn("FFmpeg 不可用，波形生成将使用模拟数据: {}", e.getMessage());
            ffmpegAvailable = false;
        }
    }
    
    @Transactional
    public AudioVersion uploadAudio(Long teamId, Long episodeId, Long userId, MultipartFile file, String note) throws Exception {
        // 文件安全校验
        FileValidator.ValidationResult validationResult = FileValidator.validateAudioFile(file);
        if (!validationResult.isValid()) {
            throw new IllegalArgumentException("音频文件校验失败：" + String.join("；", validationResult.getErrors()));
        }

        Episode episode = episodeRepository.findByIdAndTeamId(episodeId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("节目不存在或不属于当前团队"));

        User uploader = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("用户不存在"));

        Files.createDirectories(Paths.get(tempDirectory));

        String originalFilename = file.getOriginalFilename();
        String fileExtension = originalFilename != null ?
                originalFilename.substring(originalFilename.lastIndexOf(".")) : ".mp3";

        Integer nextVersion = audioVersionRepository.findMaxVersionByEpisodeId(episodeId);
        if (nextVersion == null) {
            nextVersion = 1;
        } else {
            nextVersion += 1;
        }

        String uniqueFileName = "episode_" + episodeId + "_v" + nextVersion + "_" +
                UUID.randomUUID().toString().substring(0, 8) + fileExtension;

        Path tempPath = Paths.get(tempDirectory, uniqueFileName);
        file.transferTo(tempPath.toFile());

        try {
            int duration = getAudioDuration(tempPath);

            String objectName = "teams/" + teamId + "/episodes/" + episodeId + "/audio/" + uniqueFileName;
            String fileUrl = minioService.uploadFile(objectName, tempPath.toFile(), file.getContentType());

            Map<String, Object> waveformData = generateWaveform(tempPath, waveformSamples);

            AudioVersion audioVersion = AudioVersion.builder()
                    .episode(episode)
                    .version(nextVersion)
                    .fileName(originalFilename)
                    .filePath(objectName)
                    .fileSize(file.getSize())
                    .duration(duration)
                    .mimeType(file.getContentType())
                    .waveformData(waveformData)
                    .createdBy(uploader)
                    .note(note)
                    .isArchived(false)
                    .build();

            audioVersion = audioVersionRepository.save(audioVersion);

            // 版本自动归档逻辑：保留最新的 MAX_VERSIONS_TO_KEEP 个版本，其余归档
            archiveOldVersions(episodeId);

            episode.setCurrentVersion(nextVersion);
            episode.setDuration(duration);
            episodeRepository.save(episode);

            auditService.logAction(episode.getProgram().getTeam(), uploader, "UPLOAD_AUDIO",
                    "AUDIO_VERSION", audioVersion.getId(),
                    Map.of("episodeId", episodeId, "version", nextVersion));

            return audioVersion;

        } finally {
            Files.deleteIfExists(tempPath);
        }
    }

    /**
     * 版本自动归档逻辑
     * 保留最新的 MAX_VERSIONS_TO_KEEP 个版本，其余的设置为已归档状态
     *
     * @param episodeId 集数ID
     */
    private void archiveOldVersions(Long episodeId) {
        List<AudioVersion> allVersions = audioVersionRepository.findByEpisodeIdOrderByVersionDesc(episodeId);

        if (allVersions.size() <= MAX_VERSIONS_TO_KEEP) {
            return;
        }

        // 版本已按降序排列，取超过阈值的旧版本进行归档
        List<AudioVersion> versionsToArchive = allVersions.subList(MAX_VERSIONS_TO_KEEP, allVersions.size());
        int archivedCount = 0;

        for (AudioVersion version : versionsToArchive) {
            if (!Boolean.TRUE.equals(version.getIsArchived())) {
                version.setIsArchived(true);
                audioVersionRepository.save(version);
                archivedCount++;
            }
        }

        if (archivedCount > 0) {
            log.info("集数 {} 自动归档了 {} 个旧版本", episodeId, archivedCount);
        }
    }
    
    @Transactional(readOnly = true)
    public Map<String, Object> getWaveformData(Long teamId, Long audioVersionId) {
        AudioVersion audioVersion = audioVersionRepository.findByIdAndTeamId(audioVersionId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("音频版本不存在或不属于当前团队"));
        
        return audioVersion.getWaveformData();
    }
    
    @Transactional(readOnly = true)
    public String getAudioDownloadUrl(Long teamId, Long audioVersionId) {
        AudioVersion audioVersion = audioVersionRepository.findByIdAndTeamId(audioVersionId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("音频版本不存在或不属于当前团队"));
        
        return minioService.getPresignedUrl(audioVersion.getFilePath(), 3600);
    }
    
    @Transactional(readOnly = true)
    public List<AudioVersion> getAudioVersionsByEpisode(Long teamId, Long episodeId) {
        return audioVersionRepository.findByEpisodeIdAndTeamId(episodeId, teamId);
    }
    
    @Transactional
    public AudioVersion getAudioVersionById(Long teamId, Long audioVersionId) {
        return audioVersionRepository.findByIdAndTeamId(audioVersionId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("音频版本不存在或不属于当前团队"));
    }
    
    @Transactional
    public void deleteAudioVersion(Long teamId, Long audioVersionId, Long userId) {
        AudioVersion audioVersion = audioVersionRepository.findByIdAndTeamId(audioVersionId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("音频版本不存在或不属于当前团队"));
        
        Episode episode = audioVersion.getEpisode();
        if (episode.getCurrentVersion().equals(audioVersion.getVersion()) && 
                audioVersionRepository.count() > 1) {
            throw new IllegalArgumentException("不能删除当前版本的音频");
        }
        
        try {
            minioService.deleteFile(audioVersion.getFilePath());
        } catch (Exception e) {
            log.error("删除文件失败: {}", e.getMessage());
        }
        
        User user = userRepository.findById(userId).orElse(null);
        auditService.logAction(episode.getProgram().getTeam(), user, "DELETE_AUDIO", 
                "AUDIO_VERSION", audioVersionId, null);
        
        audioVersionRepository.delete(audioVersion);
    }
    
    private int getAudioDuration(Path filePath) throws Exception {
        if (!ffmpegAvailable) {
            log.warn("FFmpeg不可用，返回模拟时长（开发模式）");
            return 1800;
        }
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
            log.error("获取音频时长失败，使用默认值: {}", e.getMessage());
        }

        return 0;
    }
    
    private Map<String, Object> generateWaveform(Path filePath, int samples) throws Exception {
        if (!ffmpegAvailable) {
            log.warn("FFmpeg不可用，生成模拟波形数据（开发模式）");
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
            int exitCode = process.waitFor();

            if (exitCode != 0) {
                log.warn("FFmpeg波形生成退出码异常: {}，使用模拟数据", exitCode);
            }

            List<Double> peaks = new ArrayList<>();
            List<Double> rms = new ArrayList<>();

            if (exitCode == 0 && Files.exists(tempJson)) {
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

        } catch (Exception e) {
            log.error("波形生成失败，使用模拟数据: {}", e.getMessage());
            List<Double> peaks = generateMockWaveform(samples);
            List<Double> rms = generateMockWaveform(samples);

            Map<String, Object> result = new HashMap<>();
            result.put("peaks", peaks);
            result.put("rms", rms);
            result.put("sampleRate", 44100);
            result.put("samples", peaks.size());
            result.put("mock", true);

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
}
