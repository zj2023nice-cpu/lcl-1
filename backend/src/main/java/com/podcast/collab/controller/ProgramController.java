package com.podcast.collab.controller;

import com.podcast.collab.dto.ApiResponse;
import com.podcast.collab.dto.ProgramDTO;
import com.podcast.collab.entity.Program;
import com.podcast.collab.entity.Team;
import com.podcast.collab.entity.User;
import com.podcast.collab.repository.ProgramRepository;
import com.podcast.collab.repository.TeamRepository;
import com.podcast.collab.security.SecurityUtil;
import com.podcast.collab.service.AuditService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/programs")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class ProgramController {
    
    private final ProgramRepository programRepository;
    private final TeamRepository teamRepository;
    private final SecurityUtil securityUtil;
    private final AuditService auditService;
    
    @GetMapping
    public ResponseEntity<ApiResponse<List<ProgramDTO>>> getPrograms() {
        Long teamId = securityUtil.getCurrentTeamId();
        
        List<Program> programs = programRepository.findByTeamId(teamId);
        List<ProgramDTO> dtos = programs.stream()
                .map(ProgramDTO::fromEntity)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProgramDTO>> getProgram(@PathVariable Long id) {
        Long teamId = securityUtil.getCurrentTeamId();
        
        Program program = programRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("节目不存在"));
        
        return ResponseEntity.ok(ApiResponse.success(ProgramDTO.fromEntity(program)));
    }
    
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'HOST')")
    public ResponseEntity<ApiResponse<ProgramDTO>> createProgram(
            @Valid @RequestBody Map<String, Object> request) {
        
        Long teamId = securityUtil.getCurrentTeamId();
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("团队不存在"));
        
        String name = request.get("name").toString();
        if (programRepository.existsByNameAndTeamId(name, teamId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("节目名称已存在"));
        }
        
        User currentUser = securityUtil.getCurrentUser();
        
        Program program = Program.builder()
                .team(team)
                .name(name)
                .description(request.get("description") != null ? request.get("description").toString() : null)
                .coverImageUrl(request.get("coverImage") != null ? request.get("coverImage").toString() : null)
                .build();
        
        program = programRepository.save(program);
        
        auditService.logAction(teamId, currentUser.getId(), "CREATE_PROGRAM", 
                "PROGRAM", program.getId(), Map.of("name", name));
        
        return ResponseEntity.ok(ApiResponse.success(ProgramDTO.fromEntity(program), "节目创建成功"));
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER', 'HOST')")
    public ResponseEntity<ApiResponse<ProgramDTO>> updateProgram(
            @PathVariable Long id,
            @Valid @RequestBody Map<String, Object> request) {
        
        Long teamId = securityUtil.getCurrentTeamId();
        Program program = programRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("节目不存在"));
        
        User currentUser = securityUtil.getCurrentUser();
        
        if (request.get("name") != null) {
            String newName = request.get("name").toString();
            if (!program.getName().equals(newName) && programRepository.existsByNameAndTeamId(newName, teamId)) {
                return ResponseEntity.badRequest().body(ApiResponse.error("节目名称已存在"));
            }
            program.setName(newName);
        }
        if (request.get("description") != null) {
            program.setDescription(request.get("description").toString());
        }
        if (request.get("coverImage") != null) {
            program.setCoverImageUrl(request.get("coverImage").toString());
        }
        
        program = programRepository.save(program);
        
        auditService.logAction(teamId, currentUser.getId(), "UPDATE_PROGRAM", 
                "PROGRAM", id, null);
        
        return ResponseEntity.ok(ApiResponse.success(ProgramDTO.fromEntity(program), "节目更新成功"));
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PRODUCER')")
    public ResponseEntity<ApiResponse<Void>> deleteProgram(@PathVariable Long id) {
        Long teamId = securityUtil.getCurrentTeamId();
        Program program = programRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException("节目不存在"));
        
        User currentUser = securityUtil.getCurrentUser();
        
        programRepository.delete(program);
        
        auditService.logAction(teamId, currentUser.getId(), "DELETE_PROGRAM", 
                "PROGRAM", id, null);
        
        return ResponseEntity.ok(ApiResponse.success(null, "节目删除成功"));
    }
}
