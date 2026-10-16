package com.terangacivil.backend.service;

import com.terangacivil.backend.dto.response.*;
import com.terangacivil.backend.exception.ResourceNotFoundException;
import com.terangacivil.backend.exception.UnauthorizedActionException;
import com.terangacivil.backend.model.*;
import com.terangacivil.backend.repository.*;
import com.terangacivil.backend.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class DivisionService {

    @Autowired
    private RegionRepository regionRepository;

    @Autowired
    private DepartementRepository departementRepository;

    @Autowired
    private CommuneRepository communeRepository;

    @Autowired
    private CentreRepository centreRepository;

    @Autowired
    private UserRepository userRepository;

    public User getCurrentUser() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new UnauthorizedActionException("Utilisateur non connecté"));
    }

    public List<RegionResponse> getAllRegions() {
        return regionRepository.findAll().stream()
                .map(RegionResponse::new)
                .collect(Collectors.toList());
    }

    public List<DepartementResponse> getAllDepartements() {
        return departementRepository.findAll().stream()
                .map(DepartementResponse::new)
                .collect(Collectors.toList());
    }

    public List<CommuneResponse> getAllCommunes() {
        return communeRepository.findAll().stream()
                .map(CommuneResponse::new)
                .collect(Collectors.toList());
    }

    public List<CentreResponse> getAllCentres(boolean isPublic) {
        User currentUser = getCurrentUser();
        return centreRepository.findAll().stream()
                .filter(c -> {
                    if (isPublic) return true;
                    if (currentUser.hasPermission("GERER_GLOBAL")) return true;

                    boolean isManageScope = currentUser.hasPermission("GERER_REGION") ||
                            currentUser.hasPermission("GERER_DEPARTEMENT") ||
                            currentUser.hasPermission("GERER_COMMUNE") ||
                            currentUser.hasPermission("GERER_CENTRE") ||
                            currentUser.hasPermission("GERER_BUREAU") ||
                            currentUser.hasPermission("GERER_SERVICES");
                    if (!isManageScope) return true;

                    if (currentUser.hasPermission("GERER_REGION")) {
                        return currentUser.getRegionsGerees() != null && c.getCommune() != null && c.getCommune().getDepartement() != null &&
                                currentUser.getRegionsGerees().stream().anyMatch(r -> r.getId().equals(c.getCommune().getDepartement().getRegion().getId()));
                    }
                    if (currentUser.hasPermission("GERER_DEPARTEMENT")) {
                        return currentUser.getDepartementsGeres() != null && c.getCommune() != null &&
                                currentUser.getDepartementsGeres().stream().anyMatch(d -> d.getId().equals(c.getCommune().getDepartement().getId()));
                    }
                    if (currentUser.hasPermission("GERER_COMMUNE")) {
                        return (currentUser.getCommunesGerees() != null && c.getCommune() != null &&
                                currentUser.getCommunesGerees().stream().anyMatch(com -> com.getId().equals(c.getCommune().getId())))
                                || (currentUser.getCommune() != null && c.getCommune() != null && currentUser.getCommune().getId().equals(c.getCommune().getId()));
                    }
                    if (currentUser.hasPermission("GERER_CENTRE") || currentUser.hasPermission("GERER_BUREAU") || currentUser.hasPermission("GERER_SERVICES")) {
                        return currentUser.getCentre() != null && currentUser.getCentre().getId().equals(c.getId());
                    }
                    return false;
                })
                .map(CentreResponse::new)
                .collect(Collectors.toList());
    }

    public void createRegion(String nom, String code) {
        Region region = new Region();
        region.setNom(nom);
        region.setCode(code);
        regionRepository.save(region);
    }

    public void updateRegion(Integer id, String nom, String code) {
        Region region = regionRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Région non trouvée"));
        region.setNom(nom);
        region.setCode(code);
        regionRepository.save(region);
    }

    public void deleteRegion(Integer id) {
        Region region = regionRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Région non trouvée"));
        regionRepository.delete(region);
    }

    public void createDepartement(String nom, String code, Integer regionId) {
        Departement departement = new Departement();
        departement.setNom(nom);
        departement.setCode(code);
        Region region = regionRepository.findById(regionId).orElseThrow(() -> new ResourceNotFoundException("Région non trouvée"));
        departement.setRegion(region);
        departementRepository.save(departement);
    }

    public void updateDepartement(Integer id, String nom, String code, Integer regionId) {
        Departement departement = departementRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Département non trouvé"));
        departement.setNom(nom);
        departement.setCode(code);
        Region region = regionRepository.findById(regionId).orElseThrow(() -> new ResourceNotFoundException("Région non trouvée"));
        departement.setRegion(region);
        departementRepository.save(departement);
    }

    public void deleteDepartement(Integer id) {
        Departement departement = departementRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Département non trouvé"));
        departementRepository.delete(departement);
    }

    public void createCommune(String nom, String code, Double latitude, Double longitude, Integer departementId) {
        Commune commune = new Commune();
        commune.setNom(nom);
        commune.setCode(code);
        commune.setLatitude(latitude);
        commune.setLongitude(longitude);
        Departement dept = departementRepository.findById(departementId).orElseThrow(() -> new ResourceNotFoundException("Département non trouvé"));
        commune.setDepartement(dept);
        communeRepository.save(commune);
    }

    public void updateCommune(Integer id, String nom, String code, Double latitude, Double longitude, Integer departementId) {
        Commune commune = communeRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Commune non trouvée"));
        commune.setNom(nom);
        commune.setCode(code);
        commune.setLatitude(latitude);
        commune.setLongitude(longitude);
        Departement dept = departementRepository.findById(departementId).orElseThrow(() -> new ResourceNotFoundException("Département non trouvé"));
        commune.setDepartement(dept);
        communeRepository.save(commune);
    }

    public void deleteCommune(Integer id) {
        Commune commune = communeRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Commune non trouvée"));
        communeRepository.delete(commune);
    }

    public void createCentre(String nom, String code, Double latitude, Double longitude, Integer communeId) {
        User currentUser = getCurrentUser();
        Commune commune = communeRepository.findById(communeId).orElseThrow(() -> new ResourceNotFoundException("Commune non trouvée"));

        verifyCentrePermissions(currentUser, commune);

        Centre centre = new Centre();
        centre.setNom(nom);
        centre.setCode(code);
        centre.setCommune(commune);
        centre.setLatitude(latitude);
        centre.setLongitude(longitude);
        centreRepository.save(centre);
    }

    public void updateCentre(Integer id, String nom, String code, Double latitude, Double longitude, Integer communeId) {
        User currentUser = getCurrentUser();
        Centre centre = centreRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Centre non trouvé"));
        Commune commune = communeRepository.findById(communeId).orElseThrow(() -> new ResourceNotFoundException("Commune non trouvée"));

        verifyCentrePermissions(currentUser, commune);

        if (!currentUser.hasPermission("GERER_GLOBAL") && currentUser.hasPermission("GERER_COMMUNE")) {
            if (!centre.getCommune().getId().equals(currentUser.getCommune().getId())) {
                throw new UnauthorizedActionException("Non autorisé pour ce centre.");
            }
        }

        centre.setNom(nom);
        centre.setCode(code);
        centre.setCommune(commune);
        centre.setLatitude(latitude);
        centre.setLongitude(longitude);
        centreRepository.save(centre);
    }

    public void deleteCentre(Integer id) {
        User currentUser = getCurrentUser();
        Centre centre = centreRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Centre non trouvé"));

        if (!currentUser.hasPermission("GERER_GLOBAL")) {
            if (currentUser.hasPermission("GERER_COMMUNE")) {
                if (currentUser.getCommune() == null || !currentUser.getCommune().getId().equals(centre.getCommune().getId())) {
                    throw new UnauthorizedActionException("Non autorisé à supprimer ce centre.");
                }
            } else {
                throw new UnauthorizedActionException("Non autorisé à supprimer ce centre.");
            }
        }
        centreRepository.delete(centre);
    }

    private void verifyCentrePermissions(User currentUser, Commune commune) {
        if (!currentUser.hasPermission("GERER_GLOBAL")) {
            if (currentUser.hasPermission("GERER_REGION")) {
                boolean hasAccess = currentUser.getRegionsGerees() != null && commune.getDepartement() != null &&
                        currentUser.getRegionsGerees().stream()
                                .anyMatch(r -> r.getId().equals(commune.getDepartement().getRegion().getId()));
                if (!hasAccess) throw new UnauthorizedActionException("Non autorisé pour cette commune.");
            } else if (currentUser.hasPermission("GERER_DEPARTEMENT")) {
                boolean hasAccess = currentUser.getDepartementsGeres() != null &&
                        currentUser.getDepartementsGeres().stream()
                                .anyMatch(d -> d.getId().equals(commune.getDepartement().getId()));
                if (!hasAccess) throw new UnauthorizedActionException("Non autorisé pour cette commune.");
            } else if (currentUser.hasPermission("GERER_COMMUNE")) {
                if (currentUser.getCommune() == null || !currentUser.getCommune().getId().equals(commune.getId())) {
                    throw new UnauthorizedActionException("Non autorisé pour cette commune.");
                }
            } else {
                throw new UnauthorizedActionException("Non autorisé à gérer un centre.");
            }
        }
    }
}
