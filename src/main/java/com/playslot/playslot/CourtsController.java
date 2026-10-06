package com.playslot.playslot;

import com.playslot.playslot.model.Court;
import com.playslot.playslot.model.CourtStatus;
import com.playslot.playslot.model.SportType;
import com.playslot.playslot.repository.CourtRepository;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.time.LocalTime;

@RestController
@RequestMapping("/api/courts")
public class CourtsController {
    private final CourtRepository courtRepository;

    public CourtsController(CourtRepository courtRepository) {
        this.courtRepository = courtRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<CourtResponse> listCourts(@RequestParam(required = false) String city,
                                          @RequestParam(required = false) String district,
                                          @RequestParam(required = false) SportType sportType,
                                          @RequestParam(required = false) BigDecimal minPrice,
                                          @RequestParam(required = false) BigDecimal maxPrice,
                                          @RequestParam(required = false) String search) {
        return courtRepository.findByStatusOrderByCityAscNameAsc(CourtStatus.APPROVED)
                .stream()
                .filter(court -> city == null || court.getCity().equalsIgnoreCase(city.trim()))
                .filter(court -> district == null || (court.getDistrict() != null
                        && court.getDistrict().equalsIgnoreCase(district.trim())))
                .filter(court -> sportType == null || court.getSportType() == sportType)
                .filter(court -> minPrice == null || court.getHourlyPrice().compareTo(minPrice) >= 0)
                .filter(court -> maxPrice == null || court.getHourlyPrice().compareTo(maxPrice) <= 0)
                .filter(court -> search == null || (court.getName() + " " + court.getAddress() + " "
                        + court.getCity()).toLowerCase(Locale.ROOT).contains(search.trim().toLowerCase(Locale.ROOT)))
                .map(CourtResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CourtResponse> listCourts() {
        return listCourts(null, null, null, null, null, null);
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public CourtResponse getCourt(@PathVariable UUID id) {
        Court court = courtRepository.findById(id)
                .filter(item -> item.getStatus() == CourtStatus.APPROVED)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Алаң табылмады"));
        return CourtResponse.from(court);
    }

    public record CourtResponse(
            UUID id,
            String name,
            SportType sportType,
            String city,
            String district,
            BigDecimal latitude,
            BigDecimal longitude,
            String address,
            String description,
            BigDecimal hourlyPrice,
            LocalTime openingTime,
            LocalTime closingTime,
            List<String> photoUrls,
            List<String> amenities,
            CourtStatus status
    ) {
        private static CourtResponse from(Court court) {
            return new CourtResponse(
                    court.getId(),
                    court.getName(),
                    court.getSportType(),
                    court.getCity(),
                    court.getDistrict(),
                    court.getLatitude(),
                    court.getLongitude(),
                    court.getAddress(),
                    court.getDescription(),
                    court.getHourlyPrice(),
                    court.getOpeningTime(),
                    court.getClosingTime(),
                    court.getPhotoUrls(),
                    court.getAmenities(),
                    court.getStatus()
            );
        }
    }
}
