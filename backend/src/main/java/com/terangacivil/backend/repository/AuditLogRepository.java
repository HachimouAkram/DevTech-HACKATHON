package com.terangacivil.backend.repository;

import com.terangacivil.backend.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Integer>, JpaSpecificationExecutor<AuditLog> {
    List<AuditLog> findByUserIdOrderByCreatedAtDesc(Integer userId);
}
