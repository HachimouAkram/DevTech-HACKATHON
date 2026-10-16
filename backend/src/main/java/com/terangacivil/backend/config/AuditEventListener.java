package com.terangacivil.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.terangacivil.backend.model.AuditLog;
import com.terangacivil.backend.model.User;
import com.terangacivil.backend.service.CurrentUserService;
import org.hibernate.event.spi.*;
import org.hibernate.persister.entity.EntityPersister;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.time.LocalDateTime;

@Component
public class AuditEventListener implements PostInsertEventListener, PostUpdateEventListener, PostDeleteEventListener {

    @Autowired
    private ObjectMapper objectMapper;

    @Override
    public boolean requiresPostCommitHandling(EntityPersister persister) {
        return false;
    }

    @Override
    public void onPostInsert(PostInsertEvent event) {
        if (event.getEntity() instanceof AuditLog) return;
        saveAuditLog("CREATE", event.getEntity(), null, event.getState(), event.getPersister());
    }

    @Override
    public void onPostUpdate(PostUpdateEvent event) {
        if (event.getEntity() instanceof AuditLog) return;
        saveAuditLog("UPDATE", event.getEntity(), event.getOldState(), event.getState(), event.getPersister());
    }

    @Override
    public void onPostDelete(PostDeleteEvent event) {
        if (event.getEntity() instanceof AuditLog) return;
        saveAuditLog("DELETE", event.getEntity(), event.getDeletedState(), null, event.getPersister());
    }

    @Autowired
    private org.springframework.context.ApplicationContext applicationContext;

    public void saveAuditLog(String action, Object entity, Object[] oldState, Object[] newState, EntityPersister persister) {
        try {
            com.terangacivil.backend.service.CurrentUserService currentUserService = applicationContext.getBean(com.terangacivil.backend.service.CurrentUserService.class);
            com.terangacivil.backend.service.AuditLogService auditLogService = applicationContext.getBean(com.terangacivil.backend.service.AuditLogService.class);

            User currentUser = null;
            try {
                currentUser = currentUserService.getCurrentUser();
            } catch (Exception e) {
                System.err.println("AuditEventListener: failed to get current user via service: " + e.getMessage());
                // Fallback direct
                try {
                    org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
                    if (auth != null && auth.getPrincipal() instanceof com.terangacivil.backend.security.UserDetailsImpl) {
                        com.terangacivil.backend.security.UserDetailsImpl userDetails = (com.terangacivil.backend.security.UserDetailsImpl) auth.getPrincipal();
                        currentUser = new User();
                        currentUser.setId(userDetails.getId());
                        // On n'aura pas le profil complet mais on peut au moins enregistrer l'ID
                    } else {
                        return;
                    }
                } catch(Exception ex) {
                    return;
                }
            }

            if (currentUser == null) {
                System.err.println("AuditEventListener: currentUser is null");
                return;
            }

            String entityType = entity.getClass().getSimpleName();
            Integer entityId = extractId(entity, persister);
            String[] propertyNames = persister.getPropertyNames();

            ObjectNode oldNode = null;
            if (oldState != null) {
                oldNode = objectMapper.createObjectNode();
                for (int i = 0; i < propertyNames.length; i++) {
                    if (oldState[i] != null && isPrimitiveOrString(oldState[i])) {
                        oldNode.putPOJO(propertyNames[i], oldState[i]);
                    }
                }
            }

            ObjectNode newNode = null;
            if (newState != null) {
                newNode = objectMapper.createObjectNode();
                for (int i = 0; i < propertyNames.length; i++) {
                    if (newState[i] != null && isPrimitiveOrString(newState[i])) {
                        newNode.putPOJO(propertyNames[i], newState[i]);
                    }
                }
            }

            auditLogService.saveAuditLogNewTx(action, entityType, entityId, currentUser, oldNode, newNode);
        } catch (Exception e) {
            System.err.println("Failed to capture audit log: " + e.getMessage());
        }
    }

    private Integer extractId(Object entity, EntityPersister persister) {
        Object id = persister.getIdentifier(entity, (org.hibernate.engine.spi.SharedSessionContractImplementor) null);
        if (id instanceof Integer) return (Integer) id;
        if (id instanceof Long) return ((Long) id).intValue();
        return 0;
    }

    private boolean isPrimitiveOrString(Object obj) {
        if (obj == null) return false;
        Class<?> clazz = obj.getClass();
        return clazz.isPrimitive() || clazz == String.class || Number.class.isAssignableFrom(clazz) || clazz == Boolean.class || java.time.temporal.Temporal.class.isAssignableFrom(clazz);
    }
}
