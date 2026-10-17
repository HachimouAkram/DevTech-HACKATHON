package com.terangacivil.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Collections;

@Service
public class GeocodingService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public static class Coordinates {
        public double latitude;
        public double longitude;

        public Coordinates(double latitude, double longitude) {
            this.latitude = latitude;
            this.longitude = longitude;
        }
    }

    /**
     * Geocode an address/name using Nominatim OpenStreetMap API.
     * Returns Coordinates or null if not found/error.
     */
    public Coordinates geocode(String query) {
        if (query == null || query.trim().isEmpty()) {
            return null;
        }

        try {
            // Nominatim OpenStreetMap search URL
            String url = "https://nominatim.openstreetmap.org/search";
            
            // Build URI with query params
            URI uri = UriComponentsBuilder.fromHttpUrl(url)
                    .queryParam("q", query + ", Senegal")
                    .queryParam("format", "json")
                    .queryParam("limit", 1)
                    .build()
                    .toUri();

            // Nominatim REQUIRES a custom User-Agent to avoid HTTP 403 Forbidden
            HttpHeaders headers = new HttpHeaders();
            headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
            headers.set("User-Agent", "SenInnov-App-Geocoding-Service/1.0");

            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    uri,
                    HttpMethod.GET,
                    entity,
                    String.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                if (root.isArray() && root.size() > 0) {
                    JsonNode result = root.get(0);
                    double lat = result.get("lat").asDouble();
                    double lon = result.get("lon").asDouble();
                    return new Coordinates(lat, lon);
                }
            }
        } catch (Exception e) {
            System.err.println("[GeocodingService] Failed to geocode query '" + query + "': " + e.getMessage());
        }
        return null;
    }
}
