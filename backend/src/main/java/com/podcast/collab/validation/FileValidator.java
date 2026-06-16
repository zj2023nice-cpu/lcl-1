package com.podcast.collab.validation;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Set;

/**
 * 文件上传安全校验工具类
 * 用于验证音频文件的合法性，包括大小、扩展名、MIME 类型和文件头
 */
public class FileValidator {

    /** 允许的音频 MIME 类型集合 */
    public static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "audio/wav",
            "audio/mpeg",
            "audio/mp3",
            "audio/mp4",
            "audio/x-m4a",
            "audio/m4a"
    );

    /** 允许的文件扩展名集合 */
    public static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            ".wav",
            ".mp3",
            ".m4a"
    );

    /** 最大文件大小：500MB */
    public static final long MAX_FILE_SIZE = 500L * 1024 * 1024;

    /**
     * 私有构造函数，防止实例化
     */
    private FileValidator() {
    }

    /**
     * 验证结果类
     */
    public static class ValidationResult {
        private final boolean isValid;
        private final List<String> errors;

        private ValidationResult(boolean isValid, List<String> errors) {
            this.isValid = isValid;
            this.errors = Collections.unmodifiableList(new ArrayList<>(errors));
        }

        /**
         * 创建验证成功的结果
         */
        public static ValidationResult success() {
            return new ValidationResult(true, new ArrayList<>());
        }

        /**
         * 创建验证失败的结果
         */
        public static ValidationResult failure(List<String> errors) {
            return new ValidationResult(false, errors);
        }

        public boolean isValid() {
            return isValid;
        }

        public List<String> getErrors() {
            return errors;
        }
    }

    /**
     * 校验音频文件的合法性
     * 依次检查：文件大小、扩展名、MIME 类型、文件头（魔数）
     *
     * @param file 待校验的上传文件
     * @return 验证结果，包含是否通过和错误信息列表
     */
    public static ValidationResult validateAudioFile(MultipartFile file) {
        List<String> errors = new ArrayList<>();

        // 检查文件是否为空
        if (file == null || file.isEmpty()) {
            errors.add("上传的文件为空");
            return ValidationResult.failure(errors);
        }

        // 1. 检查文件大小
        if (file.getSize() > MAX_FILE_SIZE) {
            errors.add(String.format("文件大小超过限制，最大允许 %d MB，当前 %.2f MB",
                    MAX_FILE_SIZE / (1024 * 1024),
                    file.getSize() / (1024.0 * 1024.0)));
        }

        // 2. 检查文件扩展名
        String filename = file.getOriginalFilename();
        if (filename == null || filename.isEmpty()) {
            errors.add("文件名为空");
        } else {
            String extension = getFileExtension(filename);
            if (!ALLOWED_EXTENSIONS.contains(extension.toLowerCase())) {
                errors.add(String.format("不支持的文件扩展名 %s，支持的扩展名：%s",
                        extension,
                        ALLOWED_EXTENSIONS));
            }
        }

        // 3. 检查 MIME 类型
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase())) {
            errors.add(String.format("不支持的文件类型 %s，支持的类型：%s",
                    contentType,
                    ALLOWED_MIME_TYPES));
        }

        // 4. 检查文件头（魔数）
        try {
            validateFileHeader(file);
        } catch (IOException e) {
            errors.add("读取文件内容失败：" + e.getMessage());
        } catch (IllegalArgumentException e) {
            errors.add(e.getMessage());
        }

        if (errors.isEmpty()) {
            return ValidationResult.success();
        }
        return ValidationResult.failure(errors);
    }

    /**
     * 获取文件扩展名（包含点号，如 ".mp3"）
     */
    private static String getFileExtension(String filename) {
        int lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex == -1) {
            return "";
        }
        return filename.substring(lastDotIndex);
    }

    /**
     * 根据文件扩展名和文件头（魔数）验证文件内容
     *
     * @param file 上传的文件
     * @throws IOException           读取文件失败时抛出
     * @throws IllegalArgumentException 文件头校验失败时抛出
     */
    private static void validateFileHeader(MultipartFile file) throws IOException {
        String filename = file.getOriginalFilename();
        if (filename == null) {
            return;
        }

        String extension = getFileExtension(filename).toLowerCase();

        try (InputStream inputStream = file.getInputStream()) {
            byte[] header = new byte[12];
            int bytesRead = inputStream.read(header);

            if (bytesRead < 4) {
                throw new IllegalArgumentException("文件内容不完整，无法验证文件类型");
            }

            switch (extension) {
                case ".wav" -> validateWavHeader(header);
                case ".mp3" -> validateMp3Header(header);
                case ".m4a" -> validateM4aHeader(header, bytesRead);
                default -> {
                    // 对于未知扩展名，尝试至少验证是否匹配任一格式
                    if (!isWavHeader(header) && !isMp3Header(header) && !isM4aHeader(header, bytesRead)) {
                        throw new IllegalArgumentException("文件内容与声明的类型不匹配");
                    }
                }
            }
        }
    }

    /**
     * 验证 WAV 文件头
     * WAV 文件格式：前4字节为 "RIFF"，8-11 字节为 "WAVE"
     */
    private static void validateWavHeader(byte[] header) {
        if (!isWavHeader(header)) {
            throw new IllegalArgumentException("WAV 文件头验证失败，文件可能已损坏或不是有效的 WAV 文件");
        }
    }

    private static boolean isWavHeader(byte[] header) {
        if (header.length < 12) {
            return false;
        }
        // 检查 "RIFF" (0-3字节)
        boolean riff = header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F';
        // 检查 "WAVE" (8-11字节)
        boolean wave = header[8] == 'W' && header[9] == 'A' && header[10] == 'V' && header[11] == 'E';
        return riff && wave;
    }

    /**
     * 验证 MP3 文件头
     * MP3 文件格式：前2字节为 0xFFFB，或者前3字节为 "ID3"（带ID3标签）
     */
    private static void validateMp3Header(byte[] header) {
        if (!isMp3Header(header)) {
            throw new IllegalArgumentException("MP3 文件头验证失败，文件可能已损坏或不是有效的 MP3 文件");
        }
    }

    private static boolean isMp3Header(byte[] header) {
        if (header.length < 3) {
            return false;
        }

        // 检查是否以 "ID3" 开头（带 ID3 标签的 MP3）
        boolean id3Tag = header[0] == 'I' && header[1] == 'D' && header[2] == '3';
        if (id3Tag) {
            return true;
        }

        // 检查是否以帧同步 0xFFFB 开头
        if (header.length >= 2) {
            // 0xFFFB 是常见的 MP3 帧同步字
            // 还有其他可能的帧同步如 0xFFF3, 0xFFF2 等，都以 0xFFFx 开头
            boolean frameSync = (header[0] & 0xFF) == 0xFF && (header[1] & 0xE0) == 0xE0;
            return frameSync;
        }

        return false;
    }

    /**
     * 验证 M4A 文件头
     * M4A 文件格式：前4字节为 box size，4-7字节为 "ftyp"
     */
    private static void validateM4aHeader(byte[] header, int bytesRead) {
        if (!isM4aHeader(header, bytesRead)) {
            throw new IllegalArgumentException("M4A 文件头验证失败，文件可能已损坏或不是有效的 M4A 文件");
        }
    }

    private static boolean isM4aHeader(byte[] header, int bytesRead) {
        if (bytesRead < 8) {
            return false;
        }
        // 检查 4-7 字节是否为 "ftyp"
        return header[4] == 'f' && header[5] == 't' && header[6] == 'y' && header[7] == 'p';
    }
}
