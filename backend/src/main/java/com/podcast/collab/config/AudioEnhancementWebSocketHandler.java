package com.podcast.collab.config;

import com.fasterxml.jackson.databind.JsonNode;
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

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class AudioEnhancementWebSocketHandler extends TextWebSocketHandler {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    private final Map<String, Map<String, WebSocketSession>> teamSessions = new ConcurrentHashMap<>();

    public AudioEnhancementWebSocketHandler(JwtUtil jwtUtil, UserRepository userRepository, ObjectMapper objectMapper) {
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
        String teamId = extractParam(query, "teamId");

        if (token == null || teamId == null) {
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

            session.getAttributes().put("userId", userId);
            session.getAttributes().put("teamId", teamId);
            session.getAttributes().put("userName", user.getName());

            teamSessions.computeIfAbsent(teamId, k -> new ConcurrentHashMap<>())
                    .put(session.getId(), session);

            log.debug("Audio enhancement WebSocket connected: teamId={}, userId={}, sessionId={}",
                    teamId, userId, session.getId());
        } catch (Exception e) {
            log.error("Audio enhancement WebSocket connection failed", e);
            session.close(CloseStatus.NOT_ACCEPTABLE.withReason("Authentication failed"));
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        try {
            JsonNode root = objectMapper.readTree(message.getPayload());
            String type = root.get("type").asText();

            if ("PING".equals(type)) {
                Map<String, Object> pong = new HashMap<>();
                pong.put("type", "PONG");
                pong.put("timestamp", System.currentTimeMillis());
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(pong)));
            }
        } catch (Exception e) {
            log.error("Failed to handle WebSocket message", e);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String teamId = (String) session.getAttributes().get("teamId");

        if (teamId != null) {
            Map<String, WebSocketSession> sessions = teamSessions.get(teamId);
            if (sessions != null) {
                sessions.remove(session.getId());
                if (sessions.isEmpty()) {
                    teamSessions.remove(teamId);
                }
            }
        }

        log.debug("Audio enhancement WebSocket disconnected: sessionId={}", session.getId());
    }

    public void broadcastTaskProgress(Long teamId, Map<String, Object> progressData) {
        String teamIdStr = String.valueOf(teamId);
        Map<String, WebSocketSession> sessions = teamSessions.get(teamIdStr);
        if (sessions == null || sessions.isEmpty()) {
            return;
        }

        try {
            Map<String, Object> message = new HashMap<>();
            message.put("type", "TASK_PROGRESS");
            message.put("data", progressData);
            String json = objectMapper.writeValueAsString(message);

            for (Map.Entry<String, WebSocketSession> entry : sessions.entrySet()) {
                WebSocketSession session = entry.getValue();
                try {
                    if (session.isOpen()) {
                        session.sendMessage(new TextMessage(json));
                    }
                } catch (Exception e) {
                    log.error("Failed to send progress to session {}", entry.getKey(), e);
                }
            }
        } catch (Exception e) {
            log.error("Failed to broadcast progress", e);
        }
    }

    public void broadcastTaskCompleted(Long teamId, Map<String, Object> resultData) {
        String teamIdStr = String.valueOf(teamId);
        Map<String, WebSocketSession> sessions = teamSessions.get(teamIdStr);
        if (sessions == null || sessions.isEmpty()) {
            return;
        }

        try {
            Map<String, Object> message = new HashMap<>();
            message.put("type", "TASK_COMPLETED");
            message.put("data", resultData);
            String json = objectMapper.writeValueAsString(message);

            for (Map.Entry<String, WebSocketSession> entry : sessions.entrySet()) {
                WebSocketSession session = entry.getValue();
                try {
                    if (session.isOpen()) {
                        session.sendMessage(new TextMessage(json));
                    }
                } catch (Exception e) {
                    log.error("Failed to send completion to session {}", entry.getKey(), e);
                }
            }
        } catch (Exception e) {
            log.error("Failed to broadcast completion", e);
        }
    }

    public void broadcastTaskFailed(Long teamId, Map<String, Object> errorData) {
        String teamIdStr = String.valueOf(teamId);
        Map<String, WebSocketSession> sessions = teamSessions.get(teamIdStr);
        if (sessions == null || sessions.isEmpty()) {
            return;
        }

        try {
            Map<String, Object> message = new HashMap<>();
            message.put("type", "TASK_FAILED");
            message.put("data", errorData);
            String json = objectMapper.writeValueAsString(message);

            for (Map.Entry<String, WebSocketSession> entry : sessions.entrySet()) {
                WebSocketSession session = entry.getValue();
                try {
                    if (session.isOpen()) {
                        session.sendMessage(new TextMessage(json));
                    }
                } catch (Exception e) {
                    log.error("Failed to send error to session {}", entry.getKey(), e);
                }
            }
        } catch (Exception e) {
            log.error("Failed to broadcast error", e);
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
