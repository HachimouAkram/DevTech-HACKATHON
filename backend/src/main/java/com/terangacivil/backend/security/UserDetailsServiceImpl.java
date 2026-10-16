package com.terangacivil.backend.security;

import com.terangacivil.backend.model.User;
import com.terangacivil.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    // In-memory cache: identifier → (UserDetails, expiry timestamp)
    // Avoids repeated DB joins on every API request (the main source of slowness).
    // Cache TTL: 2 minutes (120_000 ms) — short enough to not cause stale-password issues
    private static final long CACHE_TTL_MS = 120_000L;
    private final Map<String, long[]> cacheExpiry = new ConcurrentHashMap<>();
    private final Map<String, UserDetails> cache = new ConcurrentHashMap<>();

    /** Call this to invalidate a cached entry (e.g. after profile update) */
    public void invalidateCache(String identifier) {
        cache.remove(identifier);
        cacheExpiry.remove(identifier);
    }

    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        // Serve from cache if entry is still fresh
        long now = System.currentTimeMillis();
        long[] expiry = cacheExpiry.get(identifier);
        if (expiry != null && expiry[0] > now) {
            return cache.get(identifier);
        }

        // Cache miss — load from DB
        User user = userRepository.findByTelephone(identifier)
                .orElseGet(() -> userRepository.findByEmail(identifier)
                        .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé avec l'identifiant: " + identifier)));

        UserDetails userDetails = new UserDetailsImpl(user);
        cache.put(identifier, userDetails);
        cacheExpiry.put(identifier, new long[]{ now + CACHE_TTL_MS });
        return userDetails;
    }
}
