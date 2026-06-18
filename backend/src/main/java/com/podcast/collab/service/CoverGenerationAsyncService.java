package com.podcast.collab.service;

import com.podcast.collab.entity.CoverGeneration;
import com.podcast.collab.repository.CoverGenerationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class CoverGenerationAsyncService {

    private final CoverGenerationRepository coverGenerationRepository;
    private final ImageProcessingService imageProcessingService;

    @Async
    public void executeCoverGeneration(
            Long generationId,
            String title, String subtitle,
            String primaryColor, String secondaryColor, String accentColor,
            String fontFamily, String layoutType,
            String referenceImageUrl,
            String styleKey,
            String keywords,
            Long teamId
    ) {
        try {
            CoverGeneration generation = coverGenerationRepository.findById(generationId).orElse(null);
            if (generation == null) {
                return;
            }

            generation.setGenerationStatus(CoverGeneration.GenerationStatus.GENERATING);
            coverGenerationRepository.save(generation);

            byte[] hdImage = imageProcessingService.generateHdCover(
                    title, subtitle,
                    primaryColor, secondaryColor, accentColor,
                    fontFamily, layoutType,
                    referenceImageUrl,
                    styleKey,
                    keywords
            );

            byte[] thumbnail = imageProcessingService.generateThumbnail(hdImage);

            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
            String hdObjectName = String.format("covers/team_%d/%s_%d_hd.png", teamId, timestamp, generationId);
            String thumbObjectName = String.format("covers/team_%d/%s_%d_thumb.png", teamId, timestamp, generationId);

            String hdUrl = imageProcessingService.uploadCoverImage(hdObjectName, hdImage, true);
            String thumbUrl = imageProcessingService.uploadCoverImage(thumbObjectName, thumbnail, true);

            generation.setHdImageUrl(hdUrl);
            generation.setThumbnailUrl(thumbUrl);
            generation.setGenerationStatus(CoverGeneration.GenerationStatus.COMPLETED);
            coverGenerationRepository.save(generation);

            log.info("封面生成成功: generationId={}, hdUrl={}", generationId, hdUrl);

        } catch (Exception e) {
            log.error("封面生成失败: generationId={}, error={}", generationId, e.getMessage(), e);
            CoverGeneration generation = coverGenerationRepository.findById(generationId).orElse(null);
            if (generation != null) {
                generation.setGenerationStatus(CoverGeneration.GenerationStatus.FAILED);
                generation.setErrorMessage(e.getMessage());
                coverGenerationRepository.save(generation);
            }
        }
    }
}
