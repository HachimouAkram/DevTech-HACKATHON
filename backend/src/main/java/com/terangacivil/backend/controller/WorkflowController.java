package com.terangacivil.backend.controller;

import com.terangacivil.backend.model.WorkflowCircuit;
import com.terangacivil.backend.service.WorkflowService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/workflow")
@CrossOrigin(origins = "*")
public class WorkflowController {

    @Autowired
    private WorkflowService workflowService;

    @PostMapping("/circuit/{activiteId}")
    public ResponseEntity<?> createOrUpdateCircuit(@PathVariable Integer activiteId, @RequestBody WorkflowCircuit circuit) {
        try {
            WorkflowCircuit saved = workflowService.createOrUpdateCircuit(activiteId, circuit);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/circuit/activite/{activiteId}")
    public ResponseEntity<?> getCircuit(@PathVariable Integer activiteId) {
        try {
            WorkflowCircuit circuit = workflowService.getCircuitForActivity(activiteId);
            if (circuit == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(circuit);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
