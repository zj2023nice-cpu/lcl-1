package com.podcast.collab.controller;

import com.podcast.collab.dto.ApiResponse;
import com.podcast.collab.dto.UserDTO;
import com.podcast.collab.entity.User;
import com.podcast.collab.repository.UserRepository;
import com.podcast.collab.security.SecurityUtil;
import com.podcast.collab.service.AuditService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class UserController {
    
    private final UserRepository userRepository;
    private final SecurityUtil securityUtil;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<UserDTO>> getCurrentUser() {
        User user = securityUtil.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.success(UserDTO.fromEntity(user)));
    }
    
    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<ApiResponse<UserDTO>> updateProfile(
            @Valid @RequestBody Map<String, Object> request) {
        
        User user = securityUtil.getCurrentUser();
        
        if (request.get("name") != null) {
            user.setName(request.get("name").toString());
        }
        if (request.get("avatarUrl") != null) {
            user.setAvatarUrl(request.get("avatarUrl").toString());
        }
        
        user = userRepository.save(user);
        
        auditService.logAction(user.getTeam(), user, "UPDATE_PROFILE", 
                "USER", user.getId(), null);
        
        return ResponseEntity.ok(ApiResponse.success(UserDTO.fromEntity(user), "资料更新成功"));
    }
    
    @PutMapping("/me/password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @RequestBody Map<String, String> request) {
        
        String currentPassword = request.get("currentPassword");
        String newPassword = request.get("newPassword");
        
        if (currentPassword == null || newPassword == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("参数不完整"));
        }
        
        if (newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(ApiResponse.error("新密码长度不能少于6位"));
        }
        
        User user = securityUtil.getCurrentUser();
        
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            return ResponseEntity.badRequest().body(ApiResponse.error("当前密码不正确"));
        }
        
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        
        auditService.logAction(user.getTeam(), user, "CHANGE_PASSWORD", 
                "USER", user.getId(), null);
        
        return ResponseEntity.ok(ApiResponse.success(null, "密码修改成功"));
    }
    
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UserDTO>> getUserById(
            @PathVariable Long id,
            @RequestParam Long teamId) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权访问其他团队数据"));
        }
        
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("用户不存在"));
        
        if (!teamId.equals(user.getTeam() != null ? user.getTeam().getId() : null)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("该用户不属于当前团队"));
        }
        
        return ResponseEntity.ok(ApiResponse.success(UserDTO.fromEntity(user)));
    }
}
