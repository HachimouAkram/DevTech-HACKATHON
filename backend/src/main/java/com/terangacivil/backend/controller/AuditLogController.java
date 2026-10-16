package com.terangacivil.backend.controller;

import com.terangacivil.backend.dto.AuditLogDto;
import com.terangacivil.backend.service.AuditLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditLogController {

    @Autowired
    private AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasAuthority('GERER_GLOBAL') or hasAuthority('GERER_REGION') or hasAuthority('GERER_DEPARTEMENT') or hasAuthority('GERER_COMMUNE') or hasAuthority('GERER_CENTRE') or hasAuthority('GERER_BUREAU') or hasAuthority('GERER_SERVICES')")
    public ResponseEntity<Page<AuditLogDto>> getAuditLogs(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String profil,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir
    ) {
        Sort sort = sortDir.equalsIgnoreCase(Sort.Direction.ASC.name()) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<AuditLogDto> result = auditLogService.getFilteredAuditLogs(search, profil, startDate, endDate, pageable);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/test")
    public ResponseEntity<String> testLogs() {
        try {
            long count = auditLogService.countLogs();
            return ResponseEntity.ok("Total audit logs in DB: " + count);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }
}
