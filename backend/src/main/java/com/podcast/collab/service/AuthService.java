package com.podcast.collab.service;

import com.podcast.collab.dto.LoginRequest;
import com.podcast.collab.dto.LoginResponse;
import com.podcast.collab.dto.RegisterRequest;
import com.podcast.collab.dto.UserDTO;
import com.podcast.collab.entity.Session;
import com.podcast.collab.entity.Team;
import com.podcast.collab.entity.User;
import com.podcast.collab.repository.SessionRepository;
import com.podcast.collab.repository.TeamRepository;
import com.podcast.collab.repository.UserRepository;
import com.podcast.collab.security.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {
    
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final SessionRepository sessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final HttpServletRequest request;
    
    @Value("${jwt.access-token-expiration}")
    private Long accessTokenExpiration;
    
    @Value("${verification.code.expiration.minutes:10}")
    private Integer verificationCodeExpiration;
    
    private final Map<String, VerificationCode> verificationCodes = new HashMap<>();
    
    @Transactional
    public LoginResponse register(RegisterRequest registerRequest) {
        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            throw new IllegalArgumentException("该邮箱已被注册");
        }
        
        String teamName = registerRequest.getTeamName();
        if (teamName == null || teamName.trim().isEmpty()) {
            teamName = registerRequest.getName() + "的团队";
        }
        
        Team team = Team.builder()
                .name(teamName)
                .ownerId(0L)
                .build();
        team = teamRepository.save(team);
        
        User user = User.builder()
                .email(registerRequest.getEmail())
                .passwordHash(passwordEncoder.encode(registerRequest.getPassword()))
                .name(registerRequest.getName())
                .role(User.Role.ADMIN)
                .team(team)
                .isActive(true)
                .build();
        user = userRepository.save(user);
        
        team.setOwnerId(user.getId());
        teamRepository.save(team);
        
        String accessToken = jwtUtil.generateAccessToken(user.getId(), user.getEmail(), user.getRole().name());
        String refreshToken = jwtUtil.generateRefreshToken(user.getId());
        
        Session session = Session.builder()
                .user(user)
                .refreshToken(refreshToken)
                .userAgent(getUserAgent())
                .ipAddress(getClientIp())
                .expiresAt(LocalDateTime.now().plusSeconds(accessTokenExpiration / 1000 * 24))
                .build();
        sessionRepository.save(session);
        
        auditService.logAction(team, user, "REGISTER", "USER", user.getId(), null);
        
        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(accessTokenExpiration / 1000)
                .user(UserDTO.fromEntity(user))
                .issuedAt(LocalDateTime.now())
                .build();
    }
    
    @Transactional
    public LoginResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );
        
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("用户不存在"));
        
        if (!user.getIsActive()) {
            throw new IllegalArgumentException("用户账户已被禁用");
        }
        
        String accessToken = jwtUtil.generateAccessToken(user.getId(), user.getEmail(), user.getRole().name());
        String refreshToken = jwtUtil.generateRefreshToken(user.getId());
        
        Session session = Session.builder()
                .user(user)
                .refreshToken(refreshToken)
                .userAgent(getUserAgent())
                .ipAddress(getClientIp())
                .expiresAt(LocalDateTime.now().plusSeconds(accessTokenExpiration / 1000 * 24))
                .build();
        sessionRepository.save(session);
        
        auditService.logAction(user.getTeam(), user, "LOGIN", "SESSION", user.getId(), null);
        
        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(accessTokenExpiration / 1000)
                .user(UserDTO.fromEntity(user))
                .issuedAt(LocalDateTime.now())
                .build();
    }
    
    @Transactional
    public LoginResponse refreshToken(String refreshToken) {
        if (!jwtUtil.validateToken(refreshToken)) {
            throw new IllegalArgumentException("无效的刷新令牌");
        }
        
        Long userId = Long.parseLong(jwtUtil.extractUserId(refreshToken));
        
        Session session = sessionRepository.findByRefreshToken(refreshToken)
                .orElseThrow(() -> new IllegalArgumentException("会话不存在"));
        
        if (session.isExpired()) {
            sessionRepository.delete(session);
            throw new IllegalArgumentException("刷新令牌已过期");
        }
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("用户不存在"));
        
        String newAccessToken = jwtUtil.generateAccessToken(user.getId(), user.getEmail(), user.getRole().name());
        String newRefreshToken = jwtUtil.generateRefreshToken(user.getId());
        
        session.setRefreshToken(newRefreshToken);
        session.setExpiresAt(LocalDateTime.now().plusSeconds(accessTokenExpiration / 1000 * 24));
        sessionRepository.save(session);
        
        return LoginResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .tokenType("Bearer")
                .expiresIn(accessTokenExpiration / 1000)
                .user(UserDTO.fromEntity(user))
                .issuedAt(LocalDateTime.now())
                .build();
    }
    
    @Transactional
    public void logout(String refreshToken) {
        Session session = sessionRepository.findByRefreshToken(refreshToken)
                .orElse(null);
        
        if (session != null) {
            User user = session.getUser();
            auditService.logAction(user.getTeam(), user, "LOGOUT", "SESSION", user.getId(), null);
            sessionRepository.delete(session);
        }
    }
    
    @Transactional
    public void logoutAll(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("用户不存在"));
        
        auditService.logAction(user.getTeam(), user, "LOGOUT_ALL", "SESSION", userId, null);
        sessionRepository.deleteByUserId(userId);
    }
    
    @Transactional
    public void sendVerificationCode(String email) {
        String code = generateVerificationCode();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(verificationCodeExpiration);
        
        verificationCodes.put(email, new VerificationCode(code, expiresAt));
        
        try {
            sendEmail(email, "密码重置验证码", "您的验证码是: " + code + "，有效期" + verificationCodeExpiration + "分钟。");
        } catch (Exception e) {
            throw new RuntimeException("发送邮件失败，请稍后重试", e);
        }
    }
    
    @Transactional
    public void resetPassword(String email, String verificationCode, String newPassword) {
        VerificationCode storedCode = verificationCodes.get(email);
        
        if (storedCode == null || storedCode.isExpired()) {
            throw new IllegalArgumentException("验证码已过期或不存在");
        }
        
        if (!storedCode.getCode().equals(verificationCode)) {
            throw new IllegalArgumentException("验证码不正确");
        }
        
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("用户不存在"));
        
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        
        verificationCodes.remove(email);
        
        auditService.logAction(user.getTeam(), user, "RESET_PASSWORD", "USER", user.getId(), null);
        
        sessionRepository.deleteByUserId(user.getId());
    }
    
    @Transactional(readOnly = true)
    public User getCurrentUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("用户不存在"));
    }
    
    private String generateVerificationCode() {
        return String.format("%06d", (int) (Math.random() * 1000000));
    }
    
    private void sendEmail(String to, String subject, String body) {
        System.out.println("发送邮件到 " + to + ": " + subject + " - " + body);
    }
    
    private String getUserAgent() {
        return request.getHeader("User-Agent");
    }
    
    private String getClientIp() {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
    
    @lombok.Data
    @lombok.AllArgsConstructor
    private static class VerificationCode {
        private String code;
        private LocalDateTime expiresAt;
        
        public boolean isExpired() {
            return LocalDateTime.now().isAfter(expiresAt);
        }
    }
}
