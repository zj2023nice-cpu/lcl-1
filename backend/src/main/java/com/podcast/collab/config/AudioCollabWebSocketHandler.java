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

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class AudioCollabWebSocketHandler extends TextWebSocketHandler {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    private final Map<String, Map<String, WebSocketSession>> episodeSessions = new ConcurrentHashMap<>();
    private final Map<String, Map<String, Object>> episodeCursors = new ConcurrentHashMap<>();
    private final Map<String, List<Map<String, Object>>> episodeMessages = new ConcurrentHashMap<>();
    private final Map<String, Map<String, Map<String, Object>>> episodeCollaborators = new ConcurrentHashMap<>();

    private static final int MAX_MESSAGES_PER_EPISODE = 100;

    public AudioCollabWebSocketHandler(JwtUtil jwtUtil, UserRepository userRepository, ObjectMapper objectMapper) {
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
        String episodeId = extractParam(query, "episodeId");

        if (token == null || episodeId == null) {
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
            session.getAttributes().put("episodeId", episodeId);
            session.getAttributes().put("userName", user.getName());
            session.getAttributes().put("userAvatar", user.getAvatarUrl());
            session.getAttributes().put("userRole", user.getRole() != null ? user.getRole().name() : "EDITOR");

            episodeSessions.computeIfAbsent(episodeId, k -> new ConcurrentHashMap<>())
                    .put(session.getId(), session);

            Map<String, Object> collaborator = new HashMap<>();
            collaborator.put("userId", String.valueOf(userId));
            collaborator.put("name", user.getName());
            collaborator.put("avatarUrl", user.getAvatarUrl());
            collaborator.put("role", user.getRole() != null ? user.getRole().name() : "EDITOR");
            collaborator.put("joinedAt", Instant.now().toString());
            collaborator.put("lastActiveAt", Instant.now().toString());
            collaborator.put("isActive", true);
            collaborator.put("color", getColorForUser(String.valueOf(userId)));

            episodeCollaborators.computeIfAbsent(episodeId, k -> new ConcurrentHashMap<>())
                    .put(String.valueOf(userId), collaborator);

            sendInitState(session, episodeId);
            broadcastCollaboratorJoin(episodeId, collaborator, session.getId());

            log.debug("Audio collab WebSocket connected: episodeId={}, userId={}, sessionId={}",
                    episodeId, userId, session.getId());
        } catch (Exception e) {
            log.error("Audio collab WebSocket connection failed", e);
            session.close(CloseStatus.NOT_ACCEPTABLE.withReason("Authentication failed"));
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        try {
            JsonNode root = objectMapper.readTree(message.getPayload());
            String type = root.get("type").asText();
            JsonNode data = root.get("data");

            Long userId = (Long) session.getAttributes().get("userId");
            String episodeId = (String) session.getAttributes().get("episodeId");
            String userName = (String) session.getAttributes().get("userName");
            String userAvatar = (String) session.getAttributes().get("userAvatar");

            if (userId == null || episodeId == null) return;

            switch (type) {
                case "CURSOR_UPDATE":
                    handleCursorUpdate(episodeId, userId, userName, userAvatar, data);
                    break;
                case "MESSAGE_SEND":
                    handleMessageSend(episodeId, userId, userName, userAvatar, data);
                    break;
                default:
                    log.warn("Unknown message type: {}", type);
            }
        } catch (Exception e) {
            log.error("Failed to handle WebSocket message", e);
        }
    }

    private void handleCursorUpdate(String episodeId, Long userId, String userName, String userAvatar, JsonNode data) {
        Map<String, Object> cursor = new HashMap<>();
        cursor.put("userId", String.valueOf(userId));
        cursor.put("userName", userName);
        cursor.put("avatarUrl", userAvatar);
        cursor.put("color", getColorForUser(String.valueOf(userId)));
        cursor.put("timePosition", data.get("timePosition").asDouble());
        cursor.put("lastActiveAt", Instant.now().toString());
        cursor.put("episodeId", episodeId);

        episodeCursors.computeIfAbsent(episodeId, k -> new ConcurrentHashMap<>())
                .put(String.valueOf(userId), cursor);

        Map<String, Map<String, Object>> collaborators = episodeCollaborators.get(episodeId);
        if (collaborators != null) {
            Map<String, Object> collab = collaborators.get(String.valueOf(userId));
            if (collab != null) {
                collab.put("lastActiveAt", Instant.now().toString());
                collab.put("isActive", true);
            }
        }

        Map<String, Object> message = new HashMap<>();
        message.put("type", "CURSOR_UPDATE");
        message.put("data", cursor);

        broadcastToEpisode(episodeId, message, null);
    }

    private void handleMessageSend(String episodeId, Long userId, String userName, String userAvatar, JsonNode data) {
        Map<String, Object> messageData = new HashMap<>();
        messageData.put("id", data.has("id") ? data.get("id").asText() : "msg_" + System.currentTimeMillis());
        messageData.put("episodeId", episodeId);
        messageData.put("senderId", String.valueOf(userId));
        messageData.put("senderName", userName);
        messageData.put("senderAvatar", userAvatar);
        messageData.put("content", data.get("content").asText());
        if (data.has("timePosition") && !data.get("timePosition").isNull()) {
            messageData.put("timePosition", data.get("timePosition").asDouble());
        }
        messageData.put("createdAt", Instant.now().toString());

        List<Map<String, Object>> messages = episodeMessages.computeIfAbsent(episodeId, k -> Collections.synchronizedList(new ArrayList<>()));
        messages.add(messageData);
        while (messages.size() > MAX_MESSAGES_PER_EPISODE) {
            messages.remove(0);
        }

        Map<String, Object> broadcastMsg = new HashMap<>();
        broadcastMsg.put("type", "MESSAGE_SEND");
        broadcastMsg.put("data", messageData);

        broadcastToEpisode(episodeId, broadcastMsg, null);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        Long userId = (Long) session.getAttributes().get("userId");
        String episodeId = (String) session.getAttributes().get("episodeId");

        if (episodeId != null) {
            Map<String, WebSocketSession> sessions = episodeSessions.get(episodeId);
            if (sessions != null) {
                sessions.remove(session.getId());
                if (sessions.isEmpty()) {
                    episodeSessions.remove(episodeId);
                }
            }

            if (userId != null) {
                Map<String, Map<String, Object>> collaborators = episodeCollaborators.get(episodeId);
                if (collaborators != null) {
                    collaborators.remove(String.valueOf(userId));
                    if (collaborators.isEmpty()) {
                        episodeCollaborators.remove(episodeId);
                    }
                }

                Map<String, Object> cursors = episodeCursors.get(episodeId);
                if (cursors != null) {
                    cursors.remove(String.valueOf(userId));
                    if (cursors.isEmpty()) {
                        episodeCursors.remove(episodeId);
                    }
                }

                Map<String, Object> leaveMsg = new HashMap<>();
                leaveMsg.put("type", "COLLABORATOR_LEAVE");
                Map<String, Object> leaveData = new HashMap<>();
                leaveData.put("userId", String.valueOf(userId));
                leaveMsg.put("data", leaveData);
                broadcastToEpisode(episodeId, leaveMsg, session.getId());
            }
        }

        log.debug("Audio collab WebSocket disconnected: sessionId={}", session.getId());
    }

    private void sendInitState(WebSocketSession session, String episodeId) {
        try {
            List<Map<String, Object>> collaborators = new ArrayList<>();
            Map<String, Map<String, Object>> collabMap = episodeCollaborators.get(episodeId);
            if (collabMap != null) {
                collaborators.addAll(collabMap.values());
            }

            List<Map<String, Object>> cursors = new ArrayList<>();
            Map<String, Object> cursorMap = episodeCursors.get(episodeId);
            if (cursorMap != null) {
                cursors.addAll(cursorMap.values());
            }

            List<Map<String, Object>> messages = new ArrayList<>();
            List<Map<String, Object>> msgList = episodeMessages.get(episodeId);
            if (msgList != null) {
                messages.addAll(msgList);
            }

            Map<String, Object> initData = new HashMap<>();
            initData.put("collaborators", collaborators);
            initData.put("cursors", cursors);
            initData.put("messages", messages);

            Map<String, Object> message = new HashMap<>();
            message.put("type", "INIT_STATE");
            message.put("data", initData);

            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(message)));
        } catch (Exception e) {
            log.error("Failed to send init state", e);
        }
    }

    private void broadcastCollaboratorJoin(String episodeId, Map<String, Object> collaborator, String excludeSessionId) {
        Map<String, Object> message = new HashMap<>();
        message.put("type", "COLLABORATOR_JOIN");
        message.put("data", collaborator);
        broadcastToEpisode(episodeId, message, excludeSessionId);
    }

    private void broadcastToEpisode(String episodeId, Map<String, Object> message, String excludeSessionId) {
        Map<String, WebSocketSession> sessions = episodeSessions.get(episodeId);
        if (sessions == null || sessions.isEmpty()) {
            return;
        }

        try {
            String json = objectMapper.writeValueAsString(message);

            for (Map.Entry<String, WebSocketSession> entry : sessions.entrySet()) {
                if (excludeSessionId != null && excludeSessionId.equals(entry.getKey())) {
                    continue;
                }
                WebSocketSession session = entry.getValue();
                try {
                    if (session.isOpen()) {
                        session.sendMessage(new TextMessage(json));
                    }
                } catch (Exception e) {
                    log.error("Failed to send WebSocket message to session {}", entry.getKey(), e);
                }
            }
        } catch (Exception e) {
            log.error("Failed to broadcast message", e);
        }
    }

    private static final String[] COLLABORATOR_COLORS = {
            "#EF4444", "#F59E0B", "#10B981", "#3B82F6",
            "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"
    };

    private String getColorForUser(String userId) {
        int hash = 0;
        for (int i = 0; i < userId.length(); i++) {
            hash = userId.charAt(i) + ((hash << 5) - hash);
        }
        return COLLABORATOR_COLORS[Math.abs(hash) % COLLABORATOR_COLORS.length];
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
