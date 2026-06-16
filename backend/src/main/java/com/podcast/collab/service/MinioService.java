package com.podcast.collab.service;

import io.minio.*;
import io.minio.http.Method;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.InputStream;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class MinioService {
    
    @Value("${minio.endpoint}")
    private String endpoint;
    
    @Value("${minio.access-key}")
    private String accessKey;
    
    @Value("${minio.secret-key}")
    private String secretKey;
    
    @Value("${minio.bucket:podcast-audio}")
    private String bucketName;

    @Value("${minio.public-bucket:podcast-public}")
    private String publicBucketName;
    
    private MinioClient minioClient;
    
    @PostConstruct
    public void init() {
        int maxRetries = 5;
        int retryDelayMs = 5000;
        
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                log.info("MinIO初始化尝试 [{}/{}]，端点: {}", attempt, maxRetries, endpoint);
                
                minioClient = MinioClient.builder()
                        .endpoint(endpoint)
                        .credentials(accessKey, secretKey)
                        .build();
                
                boolean exists = minioClient.bucketExists(BucketExistsArgs.builder()
                        .bucket(bucketName)
                        .build());
                
                if (!exists) {
                    minioClient.makeBucket(MakeBucketArgs.builder()
                            .bucket(bucketName)
                            .build());
                    
                    minioClient.setBucketPolicy(SetBucketPolicyArgs.builder()
                            .bucket(bucketName)
                            .config(getPublicReadPolicy(bucketName))
                            .build());
                    
                    log.info("创建MinIO私有存储桶: {}", bucketName);
                }
                
                boolean publicExists = minioClient.bucketExists(BucketExistsArgs.builder()
                        .bucket(publicBucketName)
                        .build());
                
                if (!publicExists) {
                    minioClient.makeBucket(MakeBucketArgs.builder()
                            .bucket(publicBucketName)
                            .build());
                    
                    minioClient.setBucketPolicy(SetBucketPolicyArgs.builder()
                            .bucket(publicBucketName)
                            .config(getPublicReadPolicy(publicBucketName))
                            .build());
                    
                    log.info("创建MinIO公开存储桶: {}", publicBucketName);
                }
                
                log.info("MinIO初始化成功！存储桶: {}, {}", bucketName, publicBucketName);
                return;
                
            } catch (Exception e) {
                log.warn("MinIO初始化尝试 [{}/{}] 失败: {}", attempt, maxRetries, e.getMessage());
                
                if (attempt == maxRetries) {
                    log.error("MinIO服务初始化失败，已达到最大重试次数。应用将以降级模式运行（文件功能不可用）。");
                    minioClient = null;
                    return;
                }
                
                try {
                    Thread.sleep(retryDelayMs);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
        }
    }
    
    public String uploadFile(String objectName, File file, String contentType) throws Exception {
        checkMinioAvailable();
        minioClient.uploadObject(
                UploadObjectArgs.builder()
                        .bucket(bucketName)
                        .object(objectName)
                        .filename(file.getAbsolutePath())
                        .contentType(contentType)
                        .build()
        );
        
        return endpoint + "/" + bucketName + "/" + objectName;
    }
    
    public String uploadFile(String objectName, InputStream inputStream, long size, String contentType) throws Exception {
        checkMinioAvailable();
        minioClient.putObject(
                PutObjectArgs.builder()
                        .bucket(bucketName)
                        .object(objectName)
                        .stream(inputStream, size, -1)
                        .contentType(contentType)
                        .build()
        );
        
        return endpoint + "/" + bucketName + "/" + objectName;
    }
    
    public InputStream downloadFile(String objectName) throws Exception {
        checkMinioAvailable();
        return minioClient.getObject(
                GetObjectArgs.builder()
                        .bucket(bucketName)
                        .object(objectName)
                        .build()
        );
    }
    
    public String getPresignedUrl(String objectName, int expiresInSeconds) {
        try {
            checkMinioAvailable();
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(bucketName)
                            .object(objectName)
                            .expiry(expiresInSeconds, TimeUnit.SECONDS)
                            .build()
            );
        } catch (Exception e) {
            log.error("生成预签名URL失败: {}", e.getMessage());
            return endpoint + "/" + bucketName + "/" + objectName;
        }
    }
    
    public void deleteFile(String objectName) throws Exception {
        checkMinioAvailable();
        minioClient.removeObject(
                RemoveObjectArgs.builder()
                        .bucket(bucketName)
                        .object(objectName)
                        .build()
        );
    }
    
    public boolean fileExists(String objectName) {
        try {
            checkMinioAvailable();
            minioClient.statObject(
                    StatObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .build()
            );
            return true;
        } catch (Exception e) {
            return false;
        }
    }
    
    public long getFileSize(String objectName) throws Exception {
        checkMinioAvailable();
        StatObjectResponse stat = minioClient.statObject(
                StatObjectArgs.builder()
                        .bucket(bucketName)
                        .object(objectName)
                        .build()
        );
        return stat.size();
    }
    
    private void checkMinioAvailable() throws IllegalStateException {
        if (minioClient == null) {
            throw new IllegalStateException("MinIO服务不可用，请检查服务是否正常启动");
        }
    }
    
    public boolean isMinioAvailable() {
        return minioClient != null;
    }
    
    private String getPublicReadPolicy(String bucketName) {
        return "{\n" +
                "  \"Version\": \"2012-10-17\",\n" +
                "  \"Statement\": [\n" +
                "    {\n" +
                "      \"Effect\": \"Allow\",\n" +
                "      \"Principal\": {\n" +
                "        \"AWS\": [\"*\"]\n" +
                "      },\n" +
                "      \"Action\": [\"s3:GetObject\"],\n" +
                "      \"Resource\": [\"arn:aws:s3:::" + bucketName + "/*\"]\n" +
                "    }\n" +
                "  ]\n" +
                "}";
    }
}
