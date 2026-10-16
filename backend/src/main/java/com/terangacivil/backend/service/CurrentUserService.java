package com.terangacivil.backend.service;

import com.terangacivil.backend.model.User;
import com.terangacivil.backend.repository.UserRepository;
import com.terangacivil.backend.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.annotation.RequestScope;

/**
 * Request-scoped bean that resolves and caches the authenticated {@link User}
 * once per HTTP request, preventing redundant database JOINs when multiple
 * controllers/methods call {@code getCurrentUser()} in the same request cycle.
 */
@Service
@RequestScope
public class CurrentUserService {

    @Autowired
    private UserRepository userRepository;

    private User cachedUser;

    /**
     * Returns the fully-loaded {@link User} entity for the current authenticated
     * principal. The result is cached for the duration of the HTTP request.
     */
    public User getCurrentUser() {
        if (cachedUser != null) {
            return cachedUser;
        }
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder
                .getContext().getAuthentication().getPrincipal();
        cachedUser = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur non connecté"));
        return cachedUser;
    }

    /** Invalidate the in-request cache (rarely needed, but available). */
    public void invalidate() {
        cachedUser = null;
    }
}
