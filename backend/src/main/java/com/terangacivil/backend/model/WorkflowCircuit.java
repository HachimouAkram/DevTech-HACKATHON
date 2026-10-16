package com.terangacivil.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "workflow_circuits")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowCircuit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "activite_id", nullable = false)
    private Activity activite;

    @Column(nullable = false, length = 150)
    private String nom;

    @Column(nullable = false)
    private Boolean actif = true;

    @OneToMany(mappedBy = "circuit", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("ordre ASC")
    private List<WorkflowStep> steps = new ArrayList<>();
}
