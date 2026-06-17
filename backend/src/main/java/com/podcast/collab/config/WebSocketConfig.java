package com.podcast.collab.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
    
    private final EpisodeSortWebSocketHandler episodeSortWebSocketHandler;
    private final AudioCollabWebSocketHandler audioCollabWebSocketHandler;
    private final AudioEnhancementWebSocketHandler audioEnhancementWebSocketHandler;
    
    public WebSocketConfig(EpisodeSortWebSocketHandler episodeSortWebSocketHandler,
                          AudioCollabWebSocketHandler audioCollabWebSocketHandler,
                          AudioEnhancementWebSocketHandler audioEnhancementWebSocketHandler) {
        this.episodeSortWebSocketHandler = episodeSortWebSocketHandler;
        this.audioCollabWebSocketHandler = audioCollabWebSocketHandler;
        this.audioEnhancementWebSocketHandler = audioEnhancementWebSocketHandler;
    }
    
    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(episodeSortWebSocketHandler, "/ws/episode-sort")
                .setAllowedOrigins("*");
        registry.addHandler(audioCollabWebSocketHandler, "/ws/audio-collab")
                .setAllowedOrigins("*");
        registry.addHandler(audioEnhancementWebSocketHandler, "/ws/audio-enhancement")
                .setAllowedOrigins("*");
    }
}
