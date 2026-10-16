package com.terangacivil.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.terangacivil.backend.dto.DemandeRequest;

public class JacksonTest {
    public static void main(String[] args) throws Exception {
        String json = "{\"activite_id\": 1, \"centre_id\": 2, \"donnees\": {}}";
        ObjectMapper mapper = new ObjectMapper();
        DemandeRequest req = mapper.readValue(json, DemandeRequest.class);
        System.out.println("activiteId: " + req.getActiviteId());
        System.out.println("centreId: " + req.getCentreId());
    }
}
