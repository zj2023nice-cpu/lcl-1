package com.podcast.collab.exception;

public class ForbiddenException extends BusinessException {
    
    public ForbiddenException(String message) {
        super(403, message);
    }
    
    public ForbiddenException() {
        super(403, "权限不足，无法执行此操作");
    }
}
