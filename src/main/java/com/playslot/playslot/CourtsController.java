package com.playslot.playslot;

import com.playslot.playslot.model.Court;
import com.playslot.playslot.model.SportType;
import com.playslot.playslot.repository.CourtRepository;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/courts")
public class CourtsController {
    private final CourtRepository courtRepository;

    public CourtsController(CourtRepository courtRepository) {
        this.courtRepository = courtRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<CourtResponse> listCourts() {
        return courtRepository.findAll(Sort.by("city").ascending().and(Sort.by("name").ascending()))
                .stream()
                .map(CourtResponse::from)
                .toList();
    }

    public record CourtResponse(
            UUID id,
            String name,
            SportType sportType,
            String city,
            String district,
            String address,
            String description,
            BigDecimal hourlyPrice,
            List<String> photoUrls,
            List<String> amenities
    ) {
        private static CourtResponse from(Court court) {
            return new CourtResponse(
                    court.getId(),
                    court.getName(),
                    court.getSportType(),
                    court.getCity(),
                    court.getDistrict(),
                    court.getAddress(),
                    court.getDescription(),
                    court.getHourlyPrice(),
                    court.getPhotoUrls(),
                    court.getAmenities()
            );
        }
    }
}
