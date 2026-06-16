package com.podcast.collab.controller;

import com.podcast.collab.dto.ApiResponse;
import com.podcast.collab.dto.LoginRequest;
import com.podcast.collab.dto.LoginResponse;
import com.podcast.collab.dto.RefreshTokenRequest;
import com.podcast.collab.dto.RegisterRequest;
import com.podcast.collab.dto.UserDTO;
import com.podcast.collab.entity.User;
import com.podcast.collab.security.SecurityUtil;
import com.podcast.collab.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    
    private final AuthService authService;
    private final SecurityUtil securityUtil;
    
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success(response, "登录成功"));
    }
    
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<LoginResponse>> register(@Valid @RequestBody RegisterRequest request) {
        LoginResponse response = authService.register(request);
        return ResponseEntity.ok(ApiResponse.success(response, "注册成功"));
    }
    
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<LoginResponse>> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        LoginResponse response = authService.refreshToken(request.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.success(response, "令牌刷新成功"));
    }
    
    @PostMapping("/logout")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> logout(@RequestBody(required = false) Map<String, String> body) {
        String refreshToken = body != null ? body.get("refreshToken") : null;
        if (refreshToken != null) {
            authService.logout(refreshToken);
        }
        return ResponseEntity.ok(ApiResponse.success(null, "登出成功"));
    }
    
    @PostMapping("/logout-all")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> logoutAll() {
        Long userId = securityUtil.getCurrentUserId();
        authService.logoutAll(userId);
        return ResponseEntity.ok(ApiResponse.success(null, "所有设备已登出"));
    }
    
    @PostMapping("/send-verification-code")
    public ResponseEntity<ApiResponse<Void>> sendVerificationCode(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("邮箱不能为空"));
        }
        authService.sendVerificationCode(email);
        return ResponseEntity.ok(ApiResponse.success(null, "验证码已发送"));
    }
    
    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String code = body.get("code");
        String newPassword = body.get("newPassword");
        
        if (email == null || code == null || newPassword == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("参数不完整"));
        }
        
        if (newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(ApiResponse.error("密码长度不能少于6位"));
        }
        
        authService.resetPassword(email, code, newPassword);
        return ResponseEntity.ok(ApiResponse.success(null, "密码重置成功"));
    }
    
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UserDTO>> getCurrentUser() {
        Long userId = securityUtil.getCurrentUserId();
        User user = authService.getCurrentUser(userId);
        return ResponseEntity.ok(ApiResponse.success(UserDTO.fromEntity(user)));
    }
}
