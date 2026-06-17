package com.podcast.collab.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.podcast.collab.entity.User;
import com.podcast.collab.repository.UserRepository;
import com.podcast.collab.security.JwtUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class EpisodeSortWebSocketHandler extends TextWebSocketHandler {
    
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    
    private final Map<Long, Map<String, WebSocketSession>> programSessions = new ConcurrentHashMap<>();
    
    public EpisodeSortWebSocketHandler(JwtUtil jwtUtil, UserRepository userRepository, ObjectMapper objectMapper) {
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }
    
    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String query = session.getUri().getQuery();
        if (query == null || !query.contains("token=")) {
            session.close(CloseStatus.NOT_ACCEPTABLE.withReason("Missing token"));
            return;
        }
        
        String token = extractParam(query, "token");
        String programIdParam = extractParam(query, "programId");
        
        if (token == null || programIdParam == null) {
            session.close(CloseStatus.NOT_ACCEPTABLE.withReason("Missing parameters"));
            return;
        }
        
        try {
            if (!jwtUtil.validateToken(token)) {
                session.close(CloseStatus.NOT_ACCEPTABLE.withReason("Invalid token"));
                return;
            }
            
            String userIdStr = jwtUtil.extractUserId(token);
            Long userId = Long.parseLong(userIdStr);
            
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
            
            Long programId = Long.parseLong(programIdParam);
            
            session.getAttributes().put("userId", userId);
            session.getAttributes().put("programId", programId);
            session.getAttributes().put("userName", user.getName());
            
            programSessions.computeIfAbsent(programId, k -> new ConcurrentHashMap<>())
                    .put(session.getId(), session);
            
            log.debug("WebSocket connected: programId={}, userId={}, sessionId={}", 
                    programId, userId, session.getId());
        } catch (Exception e) {
            log.error("WebSocket connection failed", e);
            session.close(CloseStatus.NOT_ACCEPTABLE.withReason("Authentication failed"));
        }
    }
    
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        log.debug("Received message: {}", message.getPayload());
    }
    
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        Long programId = (Long) session.getAttributes().get("programId");
        if (programId != null) {
            Map<String, WebSocketSession> sessions = programSessions.get(programId);
            if (sessions != null) {
                sessions.remove(session.getId());
                if (sessions.isEmpty()) {
                    programSessions.remove(programId);
                }
            }
        }
        log.debug("WebSocket disconnected: sessionId={}", session.getId());
    }
    
    public void broadcastSortUpdate(Long programId, Long sortVersion, Long updatedBy, String updatedByName) {
        Map<String, WebSocketSession> sessions = programSessions.get(programId);
        if (sessions == null || sessions.isEmpty()) {
            return;
        }
        
        try {
            Map<String, Object> message = Map.of(
                    "type", "SORT_UPDATED",
                    "programId", programId,
                    "sortVersion", sortVersion,
                    "updatedBy", updatedBy,
                    "updatedByName", updatedByName != null ? updatedByName : "Unknown"
            );
            
            String json = objectMapper.writeValueAsString(message);
            
            for (Map.Entry<String, WebSocketSession> entry : sessions.entrySet()) {
                WebSocketSession session = entry.getValue();
                try {
                    if (session.isOpen()) {
                        Long userId = (Long) session.getAttributes().get("userId");
                        if (userId == null || !userId.equals(updatedBy)) {
                            session.sendMessage(new TextMessage(json));
                        }
                    }
                } catch (Exception e) {
                    log.error("Failed to send WebSocket message to session {}", entry.getKey(), e);
                }
            }
        } catch (Exception e) {
            log.error("Failed to broadcast sort update", e);
        }
    }
    
    private String extractParam(String query, String name) {
        for (String param : query.split("&")) {
            String[] pair = param.split("=");
            if (pair.length == 2 && pair[0].equals(name)) {
                return pair[1];
            }
        }
        return null;
    }
}
