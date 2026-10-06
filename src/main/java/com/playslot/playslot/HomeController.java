package com.playslot.playslot;

import com.playslot.playslot.model.Court;
import com.playslot.playslot.model.CourtStatus;
import com.playslot.playslot.model.Game;
import com.playslot.playslot.model.GameStatus;
import com.playslot.playslot.repository.CourtRepository;
import com.playslot.playslot.repository.GameRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.time.LocalTime;

@RestController
public class HomeController {
    private final CourtRepository courtRepository;
    private final GameRepository gameRepository;

    public HomeController(CourtRepository courtRepository, GameRepository gameRepository) {
        this.courtRepository = courtRepository;
        this.gameRepository = gameRepository;
    }

    @GetMapping("/api/home")
    @Transactional(readOnly = true)
    public HomeView home() {
        List<CourtsController.CourtResponse> featuredCourts =
                courtRepository.findByStatusOrderByCityAscNameAsc(CourtStatus.APPROVED).stream()
                        .limit(6).map(HomeController::courtView).toList();
        List<GamesController.GameView> upcomingGames =
                gameRepository.findByStatusAndStartsAtAfterOrderByStartsAtAsc(
                                GameStatus.APPROVED, LocalDateTime.now()).stream()
                        .limit(6).map(GamesController.GameView::from).toList();
        return new HomeView("PlaySlot", "Спорт алаңын оңай тап және бронда",
                "Команда тап, ойын ұйымдастыр", featuredCourts, upcomingGames);
    }

    private static CourtsController.CourtResponse courtView(Court court) {
        return new CourtsController.CourtResponse(court.getId(), court.getName(), court.getSportType(),
                court.getCity(), court.getDistrict(), court.getLatitude(), court.getLongitude(),
                court.getAddress(), court.getDescription(),
                court.getHourlyPrice(), court.getOpeningTime(), court.getClosingTime(),
                court.getPhotoUrls(), court.getAmenities(), court.getStatus());
    }

    public record HomeView(String name, String headline, String tagline,
                           List<CourtsController.CourtResponse> featuredCourts,
                           List<GamesController.GameView> upcomingGames) {
    }
}
