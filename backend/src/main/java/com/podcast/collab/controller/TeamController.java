package com.podcast.collab.controller;

import com.podcast.collab.dto.ApiResponse;
import com.podcast.collab.dto.InviteRequest;
import com.podcast.collab.dto.TeamMemberDTO;
import com.podcast.collab.entity.Invitation;
import com.podcast.collab.entity.Team;
import com.podcast.collab.entity.User;
import com.podcast.collab.repository.TeamRepository;
import com.podcast.collab.security.SecurityUtil;
import com.podcast.collab.service.AuditService;
import com.podcast.collab.service.TeamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class TeamController {
    
    private final TeamService teamService;
    private final TeamRepository teamRepository;
    private final SecurityUtil securityUtil;
    private final AuditService auditService;
    
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTeam(@PathVariable Long id) {
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(id)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权访问其他团队数据"));
        }
        
        Team team = teamService.getTeamById(id);
        List<TeamMemberDTO> members = teamService.getTeamMembers(id);
        
        Map<String, Object> result = new HashMap<>();
        result.put("id", team.getId());
        result.put("name", team.getName());
        result.put("logoUrl", team.getLogoUrl());
        result.put("ownerId", team.getOwnerId());
        result.put("memberCount", members.size());
        result.put("members", members);
        result.put("createdAt", team.getCreatedAt());
        
        return ResponseEntity.ok(ApiResponse.success(result));
    }
    
    @GetMapping("/{id}/members")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<TeamMemberDTO>>> getTeamMembers(
            @PathVariable Long id) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(id)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权访问其他团队数据"));
        }
        
        List<TeamMemberDTO> members = teamService.getTeamMembers(id);
        return ResponseEntity.ok(ApiResponse.success(members));
    }
    
    @PostMapping("/{id}/invite")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> inviteMember(
            @PathVariable Long id,
            @Valid @RequestBody InviteRequest request) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(id)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权操作其他团队数据"));
        }
        
        Long inviterId = securityUtil.getCurrentUserId();
        Invitation invitation = teamService.inviteMember(id, inviterId, request);
        
        Map<String, Object> result = new HashMap<>();
        result.put("id", invitation.getId());
        result.put("email", invitation.getEmail());
        result.put("role", invitation.getRole());
        result.put("expiresAt", invitation.getExpiresAt());
        
        return ResponseEntity.ok(ApiResponse.success(result, "邀请发送成功"));
    }
    
    @PutMapping("/{teamId}/members/{userId}/role")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER')")
    public ResponseEntity<ApiResponse<TeamMemberDTO>> updateMemberRole(
            @PathVariable Long teamId,
            @PathVariable Long userId,
            @RequestBody Map<String, String> request) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权操作其他团队数据"));
        }
        
        User.Role newRole = User.Role.valueOf(request.get("role"));
        Long operatorId = securityUtil.getCurrentUserId();
        
        TeamMemberDTO member = teamService.updateMemberRole(teamId, userId, newRole, operatorId);
        return ResponseEntity.ok(ApiResponse.success(member, "角色更新成功"));
    }
    
    @DeleteMapping("/{teamId}/members/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER')")
    public ResponseEntity<ApiResponse<Void>> removeMember(
            @PathVariable Long teamId,
            @PathVariable Long userId) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权操作其他团队数据"));
        }
        
        Long operatorId = securityUtil.getCurrentUserId();
        teamService.removeMember(teamId, userId, operatorId);
        
        return ResponseEntity.ok(ApiResponse.success(null, "成员移除成功"));
    }
    
    @GetMapping("/{id}/invitations")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getPendingInvitations(
            @PathVariable Long id) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(id)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权访问其他团队数据"));
        }
        
        List<Invitation> invitations = teamService.getPendingInvitations(id);
        List<Map<String, Object>> result = invitations.stream()
                .map(inv -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", inv.getId());
                    map.put("email", inv.getEmail());
                    map.put("role", inv.getRole());
                    map.put("inviterName", inv.getInviter() != null ? inv.getInviter().getName() : null);
                    map.put("expiresAt", inv.getExpiresAt());
                    map.put("createdAt", inv.getCreatedAt());
                    return map;
                })
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(ApiResponse.success(result));
    }
    
    @DeleteMapping("/{teamId}/invitations/{invitationId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER')")
    public ResponseEntity<ApiResponse<Void>> cancelInvitation(
            @PathVariable Long teamId,
            @PathVariable Long invitationId) {
        
        Long currentTeamId = securityUtil.getCurrentTeamId();
        if (!currentTeamId.equals(teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("无权操作其他团队数据"));
        }
        
        Long operatorId = securityUtil.getCurrentUserId();
        teamService.cancelInvitation(teamId, invitationId, operatorId);
        
        return ResponseEntity.ok(ApiResponse.success(null, "邀请已取消"));
    }
    
    @PostMapping("/invite/accept")
    public ResponseEntity<ApiResponse<Map<String, Object>>> acceptInvitation(
            @RequestBody Map<String, String> request) {
        
        String token = request.get("token");
        String password = request.get("password");
        
        if (token == null || password == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("参数不完整"));
        }
        
        if (password.length() < 6) {
            return ResponseEntity.badRequest().body(ApiResponse.error("密码长度不能少于6位"));
        }
        
        User user = teamService.acceptInvitation(token, password);
        
        Map<String, Object> result = new HashMap<>();
        result.put("id", user.getId());
        result.put("email", user.getEmail());
        result.put("name", user.getName());
        result.put("role", user.getRole());
        
        return ResponseEntity.ok(ApiResponse.success(result, "邀请接受成功"));
    }
}
