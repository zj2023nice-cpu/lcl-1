package com.podcast.collab.controller;

import com.podcast.collab.dto.ApiResponse;
import com.podcast.collab.dto.EmailPreviewRequest;
import com.podcast.collab.dto.EmailPreviewResponse;
import com.podcast.collab.dto.EmailTemplateDTO;
import com.podcast.collab.dto.TestEmailRequest;
import com.podcast.collab.service.EmailService;
import com.podcast.collab.service.EmailTemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/email/templates")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class EmailTemplateController {

    private final EmailTemplateService emailTemplateService;
    private final EmailService emailService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<EmailTemplateDTO>>> getTemplates() {
        try {
            List<EmailTemplateDTO> templates = emailTemplateService.getTemplates();
            return ResponseEntity.ok(ApiResponse.success(templates));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EmailTemplateDTO>> getTemplate(@PathVariable Long id) {
        try {
            EmailTemplateDTO template = emailTemplateService.getTemplate(id);
            return ResponseEntity.ok(ApiResponse.success(template));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<ApiResponse<EmailTemplateDTO>> createTemplate(
            @Valid @RequestBody EmailTemplateDTO dto) {
        try {
            EmailTemplateDTO template = emailTemplateService.createTemplate(dto);
            return ResponseEntity.ok(ApiResponse.success(template));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<EmailTemplateDTO>> updateTemplate(
            @PathVariable Long id,
            @Valid @RequestBody EmailTemplateDTO dto) {
        try {
            EmailTemplateDTO template = emailTemplateService.updateTemplate(id, dto);
            return ResponseEntity.ok(ApiResponse.success(template));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTemplate(@PathVariable Long id) {
        try {
            emailTemplateService.deleteTemplate(id);
            return ResponseEntity.ok(ApiResponse.success(null, "删除成功"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/preview")
    public ResponseEntity<ApiResponse<EmailPreviewResponse>> previewTemplate(
            @Valid @RequestBody EmailPreviewRequest request) {
        try {
            EmailPreviewResponse preview = emailService.previewEmail(
                    request.getSubject(),
                    request.getContent(),
                    request.getVariables()
            );
            return ResponseEntity.ok(ApiResponse.success(preview));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/{id}/test")
    public ResponseEntity<ApiResponse<Void>> sendTestEmail(
            @PathVariable Long id,
            @Valid @RequestBody TestEmailRequest request) {
        try {
            emailService.sendTestEmail(id, request.getToEmail(), request.getToName());
            return ResponseEntity.ok(ApiResponse.success(null, "测试邮件已发送"));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
