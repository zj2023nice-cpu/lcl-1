package com.podcast.collab.service;

import com.podcast.collab.dto.InviteRequest;
import com.podcast.collab.dto.TeamMemberDTO;
import com.podcast.collab.entity.Invitation;
import com.podcast.collab.entity.Team;
import com.podcast.collab.entity.User;
import com.podcast.collab.repository.InvitationRepository;
import com.podcast.collab.repository.TeamRepository;
import com.podcast.collab.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeamService {
    
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final InvitationRepository invitationRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    
    @Value("${invitation.expiration.hours:48}")
    private Integer invitationExpirationHours;
    
    @Transactional(readOnly = true)
    public Team getTeamById(Long teamId) {
        return teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("团队不存在"));
    }
    
    @Transactional(readOnly = true)
    public List<TeamMemberDTO> getTeamMembers(Long teamId) {
        validateTeamExists(teamId);
        return userRepository.findByTeamId(teamId).stream()
                .map(TeamMemberDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    @Transactional
    public Invitation inviteMember(Long teamId, Long inviterId, InviteRequest request) {
        Team team = getTeamById(teamId);
        User inviter = userRepository.findById(inviterId)
                .orElseThrow(() -> new IllegalArgumentException("邀请人不存在"));
        
        if (invitationRepository.findPendingByEmailAndTeamId(request.getEmail(), teamId).isPresent()) {
            throw new IllegalArgumentException("该邮箱已存在待处理的邀请");
        }
        
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new IllegalArgumentException("该邮箱已注册");
        }
        
        String token = UUID.randomUUID().toString().replace("-", "");
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(invitationExpirationHours);
        
        Invitation invitation = Invitation.builder()
                .team(team)
                .inviter(inviter)
                .email(request.getEmail())
                .role(request.getRole())
                .token(token)
                .expiresAt(expiresAt)
                .build();
        
        invitation = invitationRepository.save(invitation);
        
        auditService.logAction(team, inviter, "INVITE_MEMBER", "INVITATION", invitation.getId(), null);
        
        sendInvitationEmail(request.getEmail(), token, team.getName());
        
        return invitation;
    }
    
    @Transactional
    public User acceptInvitation(String token, String password) {
        Invitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("邀请不存在或已过期"));
        
        if (invitation.getAccepted()) {
            throw new IllegalArgumentException("邀请已被接受");
        }
        
        if (invitation.isExpired()) {
            throw new IllegalArgumentException("邀请已过期");
        }
        
        if (userRepository.existsByEmail(invitation.getEmail())) {
            throw new IllegalArgumentException("该邮箱已注册");
        }
        
        User user = User.builder()
                .email(invitation.getEmail())
                .passwordHash(passwordEncoder.encode(password))
                .name(invitation.getEmail().split("@")[0])
                .role(invitation.getRole())
                .team(invitation.getTeam())
                .isActive(true)
                .build();
        
        user = userRepository.save(user);
        
        invitation.setAccepted(true);
        invitationRepository.save(invitation);
        
        auditService.logAction(invitation.getTeam(), user, "ACCEPT_INVITATION", "USER", user.getId(), null);
        
        return user;
    }
    
    @Transactional
    public TeamMemberDTO updateMemberRole(Long teamId, Long memberId, User.Role newRole, Long operatorId) {
        validateTeamExists(teamId);
        
        User member = userRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("成员不存在"));
        
        if (!teamId.equals(member.getTeam() != null ? member.getTeam().getId() : null)) {
            throw new IllegalArgumentException("该成员不属于当前团队");
        }
        
        User.Role oldRole = member.getRole();
        member.setRole(newRole);
        member = userRepository.save(member);
        
        User operator = userRepository.findById(operatorId).orElse(null);
        
        auditService.logAction(member.getTeam(), operator, "UPDATE_MEMBER_ROLE", "USER", memberId, 
                java.util.Map.of("oldRole", oldRole.name(), "newRole", newRole.name()));
        
        return TeamMemberDTO.fromEntity(member);
    }
    
    @Transactional
    public void removeMember(Long teamId, Long memberId, Long operatorId) {
        validateTeamExists(teamId);
        
        User member = userRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("成员不存在"));
        
        if (!teamId.equals(member.getTeam() != null ? member.getTeam().getId() : null)) {
            throw new IllegalArgumentException("该成员不属于当前团队");
        }
        
        Team team = member.getTeam();
        
        if (team != null && team.getOwnerId().equals(memberId)) {
            throw new IllegalArgumentException("不能移除团队所有者");
        }
        
        member.setTeam(null);
        member.setIsActive(false);
        userRepository.save(member);
        
        User operator = userRepository.findById(operatorId).orElse(null);
        
        auditService.logAction(team, operator, "REMOVE_MEMBER", "USER", memberId, null);
    }
    
    @Transactional(readOnly = true)
    public List<Invitation> getPendingInvitations(Long teamId) {
        validateTeamExists(teamId);
        return invitationRepository.findByTeamId(teamId).stream()
                .filter(inv -> !inv.getAccepted() && !inv.isExpired())
                .collect(Collectors.toList());
    }
    
    @Transactional
    public void cancelInvitation(Long teamId, Long invitationId, Long operatorId) {
        validateTeamExists(teamId);
        
        Invitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new IllegalArgumentException("邀请不存在"));
        
        if (!teamId.equals(invitation.getTeam().getId())) {
            throw new IllegalArgumentException("该邀请不属于当前团队");
        }
        
        if (invitation.getAccepted()) {
            throw new IllegalArgumentException("该邀请已被接受，无法取消");
        }
        
        User operator = userRepository.findById(operatorId).orElse(null);
        
        auditService.logAction(invitation.getTeam(), operator, "CANCEL_INVITATION", "INVITATION", invitationId, null);
        
        invitationRepository.delete(invitation);
    }
    
    private void validateTeamExists(Long teamId) {
        if (!teamRepository.existsById(teamId)) {
            throw new IllegalArgumentException("团队不存在");
        }
    }
    
    private void sendInvitationEmail(String email, String token, String teamName) {
        String inviteLink = "http://localhost:8080/api/invite/accept?token=" + token;
        System.out.println("发送邀请邮件到 " + email + ": 您被邀请加入 " + teamName + " 团队，点击链接接受邀请: " + inviteLink);
    }
}
