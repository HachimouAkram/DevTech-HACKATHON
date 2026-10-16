package com.terangacivil.backend.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import jakarta.annotation.PostConstruct;

@Configuration
public class HibernateListenerConfig {

    @Autowired
    private AuditEventListener auditEventListener;

    @PostConstruct
    public void registerListeners() {
        for (AuditLogIntegrator integrator : AuditLogIntegrator.instances) {
            integrator.registerListener(auditEventListener);
        }
    }
}
