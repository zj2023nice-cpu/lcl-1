package com.podcast.collab.controller;

import com.podcast.collab.dto.*;
import com.podcast.collab.service.CoverGenerationService;
import com.podcast.collab.service.ImageProcessingService;
import com.podcast.collab.service.MinioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URL;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/covers")
@PreAuthorize("isAuthenticated()")
public class CoverController {

    private final CoverGenerationService coverGenerationService;
    private final ImageProcessingService imageProcessingService;
    private final MinioService minioService;

    @GetMapping("/styles")
    public ResponseEntity<ApiResponse<List<CoverStyleDTO>>> getAvailableStyles() {
        List<CoverStyleDTO> styles = coverGenerationService.getAvailableStyles();
        return ResponseEntity.ok(ApiResponse.success(styles));
    }

    @GetMapping("/styles/{styleId}")
    public ResponseEntity<ApiResponse<CoverStyleDTO>> getStyleById(@PathVariable Long styleId) {
        CoverStyleDTO style = coverGenerationService.getStyleById(styleId);
        return ResponseEntity.ok(ApiResponse.success(style));
    }

    @PostMapping("/generate")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'EDITOR', 'HOST')")
    public ResponseEntity<ApiResponse<List<CoverGenerationDTO>>> generateCovers(
            @Valid @RequestBody CoverGenerateRequest request) {
        List<CoverGenerationDTO> results = coverGenerationService.generateCovers(request);
        return ResponseEntity.ok(ApiResponse.success(results, "封面生成任务已提交"));
    }

    @PostMapping("/adjust")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'EDITOR', 'HOST')")
    public ResponseEntity<ApiResponse<CoverGenerationDTO>> adjustCover(
            @Valid @RequestBody CoverAdjustRequest request) {
        CoverGenerationDTO result = coverGenerationService.adjustCover(request);
        return ResponseEntity.ok(ApiResponse.success(result, "封面调整任务已提交"));
    }

    @PostMapping("/{generationId}/select")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'EDITOR', 'HOST')")
    @Transactional
    public ResponseEntity<ApiResponse<CoverGenerationDTO>> selectCover(@PathVariable Long generationId) {
        CoverGenerationDTO result = coverGenerationService.selectCover(generationId);
        return ResponseEntity.ok(ApiResponse.success(result, "封面已选中"));
    }

    @GetMapping("/episode/{episodeId}")
    public ResponseEntity<ApiResponse<List<CoverGenerationDTO>>> getCoversByEpisode(
            @PathVariable Long episodeId) {
        List<CoverGenerationDTO> covers = coverGenerationService.getCoversByEpisode(episodeId);
        return ResponseEntity.ok(ApiResponse.success(covers));
    }

    @GetMapping("/program/{programId}")
    public ResponseEntity<ApiResponse<List<CoverGenerationDTO>>> getCoversByProgram(
            @PathVariable Long programId) {
        List<CoverGenerationDTO> covers = coverGenerationService.getCoversByProgram(programId);
        return ResponseEntity.ok(ApiResponse.success(covers));
    }

    @GetMapping("/{generationId}")
    public ResponseEntity<ApiResponse<CoverGenerationDTO>> getCoverById(@PathVariable Long generationId) {
        CoverGenerationDTO cover = coverGenerationService.getCoverById(generationId);
        return ResponseEntity.ok(ApiResponse.success(cover));
    }

    @DeleteMapping("/{generationId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER')")
    public ResponseEntity<ApiResponse<Void>> deleteCover(@PathVariable Long generationId) {
        coverGenerationService.deleteCover(generationId);
        return ResponseEntity.ok(ApiResponse.success(null, "封面已删除"));
    }

    @GetMapping("/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getGenerationStatus(
            @RequestParam List<Long> ids) {
        Map<String, Object> status = coverGenerationService.getGenerationStatus(ids);
        return ResponseEntity.ok(ApiResponse.success(status));
    }

    @PostMapping("/upload-reference")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'EDITOR', 'HOST')")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadReferenceImage(
            @RequestParam("file") MultipartFile file) throws Exception {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("上传文件不能为空");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("只能上传图片文件");
        }

        long maxSize = 10 * 1024 * 1024;
        if (file.getSize() > maxSize) {
            throw new IllegalArgumentException("图片大小不能超过10MB");
        }

        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String objectName = String.format("covers/references/%s_%d_%s",
                timestamp,
                System.currentTimeMillis(),
                file.getOriginalFilename());

        InputStream inputStream = file.getInputStream();
        String url = minioService.uploadPublicFile(objectName, inputStream, file.getSize(), contentType);

        Map<String, String> result = new HashMap<>();
        result.put("url", url);
        result.put("objectName", objectName);
        result.put("originalName", file.getOriginalFilename());

        return ResponseEntity.ok(ApiResponse.success(result, "参考图上传成功"));
    }

    @GetMapping("/{generationId}/download")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'EDITOR', 'HOST')")
    public ResponseEntity<byte[]> downloadCover(
            @PathVariable Long generationId,
            @RequestParam(defaultValue = "hd") String size) throws Exception {

        CoverGenerationDTO cover = coverGenerationService.getCoverById(generationId);
        String imageUrl = "hd".equalsIgnoreCase(size) ? cover.getHdImageUrl() : cover.getThumbnailUrl();

        if (imageUrl == null || imageUrl.isEmpty()) {
            throw new IllegalArgumentException("图片尚未生成完成");
        }

        byte[] imageBytes;
        if (imageUrl.startsWith("http")) {
            URL url = new URL(imageUrl);
            try (InputStream is = url.openStream();
                 ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[4096];
                int bytesRead;
                while ((bytesRead = is.read(buffer)) != -1) {
                    baos.write(buffer, 0, bytesRead);
                }
                imageBytes = baos.toByteArray();
            }
        } else {
            try (InputStream is = minioService.downloadFile(imageUrl);
                 ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[4096];
                int bytesRead;
                while ((bytesRead = is.read(buffer)) != -1) {
                    baos.write(buffer, 0, bytesRead);
                }
                imageBytes = baos.toByteArray();
            }
        }

        if ("custom".equalsIgnoreCase(size)) {
            return ResponseEntity.ok(imageBytes);
        }

        String filename = String.format("cover_%d_%s.png", generationId, size);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.IMAGE_PNG);
        headers.setContentDispositionFormData("attachment", filename);
        headers.setContentLength(imageBytes.length);

        return ResponseEntity.ok()
                .headers(headers)
                .body(imageBytes);
    }

    @PostMapping("/{generationId}/export")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'EDITOR', 'HOST')")
    public ResponseEntity<ApiResponse<Map<String, String>>> exportCover(
            @PathVariable Long generationId,
            @RequestParam(defaultValue = "3000") Integer width,
            @RequestParam(defaultValue = "3000") Integer height) throws Exception {

        CoverGenerationDTO cover = coverGenerationService.getCoverById(generationId);
        if (cover.getHdImageUrl() == null || cover.getHdImageUrl().isEmpty()) {
            throw new IllegalArgumentException("高清图尚未生成完成");
        }

        byte[] hdBytes;
        URL url = new URL(cover.getHdImageUrl());
        try (InputStream is = url.openStream();
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int bytesRead;
            while ((bytesRead = is.read(buffer)) != -1) {
                baos.write(buffer, 0, bytesRead);
            }
            hdBytes = baos.toByteArray();
        }

        byte[] resizedBytes = imageProcessingService.resizeImage(hdBytes, width, height);

        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String objectName = String.format("covers/exports/cover_%d_%s_%dx%d.png",
                generationId, timestamp, width, height);

        java.io.ByteArrayInputStream inputStream = new java.io.ByteArrayInputStream(resizedBytes);
        String exportUrl = minioService.uploadPublicFile(objectName, inputStream, resizedBytes.length, "image/png");

        Map<String, String> result = new HashMap<>();
        result.put("exportUrl", exportUrl);
        result.put("width", String.valueOf(width));
        result.put("height", String.valueOf(height));
        result.put("objectName", objectName);

        return ResponseEntity.ok(ApiResponse.success(result, "封面导出成功"));
    }

    @GetMapping("/sizes/info")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSizeInfo() {
        Map<String, Object> info = new HashMap<>();

        List<Map<String, Object>> presets = List.of(
                Map.of(
                        "name", "高清 (HD)",
                        "key", "hd",
                        "width", ImageProcessingService.HD_WIDTH,
                        "height", ImageProcessingService.HD_HEIGHT,
                        "description", "3000x3000 像素，适合打印和高质量展示"
                ),
                Map.of(
                        "name", "缩略图 (Thumbnail)",
                        "key", "thumbnail",
                        "width", ImageProcessingService.THUMBNAIL_WIDTH,
                        "height", ImageProcessingService.THUMBNAIL_HEIGHT,
                        "description", "400x400 像素，适合列表预览和移动端"
                ),
                Map.of(
                        "name", "播客平台标准",
                        "key", "podcast",
                        "width", 3000,
                        "height", 3000,
                        "description", "Apple Podcasts / Spotify 标准尺寸"
                ),
                Map.of(
                        "name", "社交媒体正方形",
                        "key", "social_square",
                        "width", 1080,
                        "height", 1080,
                        "description", "适合 Instagram、微信朋友圈等"
                ),
                Map.of(
                        "name", "社交媒体横版",
                        "key", "social_landscape",
                        "width", 1200,
                        "height", 630,
                        "description", "适合 Twitter/X、Facebook 分享"
                )
        );

        info.put("presets", presets);
        info.put("defaultHd", Map.of("width", ImageProcessingService.HD_WIDTH, "height", ImageProcessingService.HD_HEIGHT));
        info.put("defaultThumbnail", Map.of("width", ImageProcessingService.THUMBNAIL_WIDTH, "height", ImageProcessingService.THUMBNAIL_HEIGHT));

        return ResponseEntity.ok(ApiResponse.success(info));
    }
}
