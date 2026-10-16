package com.terangacivil.backend.config;

import org.hibernate.boot.Metadata;
import org.hibernate.engine.spi.SessionFactoryImplementor;
import org.hibernate.event.service.spi.EventListenerRegistry;
import org.hibernate.event.spi.EventType;
import org.hibernate.integrator.spi.Integrator;
import org.hibernate.service.spi.SessionFactoryServiceRegistry;

import java.util.ArrayList;
import java.util.List;

public class AuditLogIntegrator implements Integrator {

    public static final List<AuditLogIntegrator> instances = new ArrayList<>();
    private EventListenerRegistry registry;

    @Override
    public void integrate(Metadata metadata, SessionFactoryImplementor sessionFactory, SessionFactoryServiceRegistry serviceRegistry) {
        this.registry = serviceRegistry.getService(EventListenerRegistry.class);
        instances.add(this);
    }

    public void registerListener(AuditEventListener listener) {
        if (this.registry != null) {
            registry.getEventListenerGroup(EventType.POST_INSERT).appendListener(listener);
            registry.getEventListenerGroup(EventType.POST_UPDATE).appendListener(listener);
            registry.getEventListenerGroup(EventType.POST_DELETE).appendListener(listener);
        }
    }

    @Override
    public void disintegrate(SessionFactoryImplementor sessionFactory, SessionFactoryServiceRegistry serviceRegistry) {
        instances.remove(this);
    }
}
