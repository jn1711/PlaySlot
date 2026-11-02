package com.playslot.playslot;

import com.playslot.playslot.model.Court;
import com.playslot.playslot.model.CourtStatus;
import com.playslot.playslot.model.Game;
import com.playslot.playslot.model.GameStatus;
import com.playslot.playslot.model.NotificationType;
import com.playslot.playslot.model.SportType;
import com.playslot.playslot.model.User;
import com.playslot.playslot.repository.CourtRepository;
import com.playslot.playslot.repository.GameRepository;
import com.playslot.playslot.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/games")
public class GamesController {
    private final GameRepository gameRepository;
    private final CourtRepository courtRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public GamesController(GameRepository gameRepository, CourtRepository courtRepository,
                           UserRepository userRepository, NotificationService notificationService) {
        this.gameRepository = gameRepository;
        this.courtRepository = courtRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<GameView> upcomingGames() {
        return gameRepository.findByStatusAndStartsAtAfterOrderByStartsAtAsc(
                        GameStatus.APPROVED, LocalDateTime.now()).stream()
                .map(GameView::from).toList();
    }

    @PostMapping
    @Transactional
    public GameView create(@RequestBody GameRequest request, Authentication authentication) {
        if (request == null || request.courtId() == null || request.sportType() == null
                || request.startsAt() == null || !request.startsAt().isAfter(LocalDateTime.now())
                || request.maxPlayers() < 2 || request.maxPlayers() > 100
                || (request.description() != null && request.description().length() > 10_000)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ойын деректері қате");
        }
        Court court = courtRepository.findById(request.courtId())
                .filter(item -> item.getStatus() == CourtStatus.APPROVED)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Алаң табылмады"));
        if (court.getSportType() != request.sportType()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ойын түрі алаңға сәйкес емес");
        }
        User organizer = currentUser(authentication);
        Game game = new Game(organizer, court, request.sportType(), request.startsAt(),
                request.maxPlayers(), request.description());
        Game saved = gameRepository.save(game);
        notificationService.notify(organizer, NotificationType.GAME_CREATED,
                "Ойын модерацияға жіберілді",
                "«" + describeGame(saved) + "» ойыны сәтті құрылды. Әкімші растағаннан кейін ол тізімде көрінеді.");
        return GameView.from(saved);
    }

    @PostMapping("/{id}/join")
    @Transactional
    public GameView join(@PathVariable UUID id, Authentication authentication) {
        Game game = gameRepository.findById(id)
                .filter(item -> item.getStatus() == GameStatus.APPROVED)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ойын табылмады"));
        if (!game.getStartsAt().isAfter(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Бұл ойын басталып кеткен");
        }
        User player = currentUser(authentication);
        boolean alreadyJoined = game.getParticipants().stream()
                .anyMatch(participant -> participant.getId().equals(player.getId()));
        if (alreadyJoined) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Сіз бұл ойынға қатысып тұрсыз");
        }
        try {
            game.addParticipant(player);
        } catch (IllegalStateException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ойынға бос орын жоқ", exception);
        }
        notificationService.notify(game.getOrganizer(), NotificationType.GAME_JOINED,
                "Ойынға жаңа қатысушы",
                player.getFullName() + " «" + describeGame(game) + "» ойынына қосылды.");
        return GameView.from(game);
    }

    @PostMapping("/{id}/leave")
    @Transactional
    public GameView leave(@PathVariable UUID id, Authentication authentication) {
        Game game = gameRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ойын табылмады"));
        User player = currentUser(authentication);
        boolean wasParticipant = game.getParticipants().stream()
                .anyMatch(participant -> participant.getId().equals(player.getId()));
        game.removeParticipant(player);
        if (wasParticipant && !game.getOrganizer().getId().equals(player.getId())) {
            notificationService.notify(game.getOrganizer(), NotificationType.GAME_LEFT,
                    "Қатысушы ойыннан шықты",
                    player.getFullName() + " «" + describeGame(game) + "» ойынынан шықты.");
        }
        return GameView.from(game);
    }

    private static String describeGame(Game game) {
        String title = game.getDescription();
        if (title == null || title.isBlank()) {
            title = game.getSportType().name();
        }
        return title.length() > 60 ? title.substring(0, 60) : title;
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Кіру қажет"));
    }

    public record GameRequest(UUID courtId, SportType sportType, LocalDateTime startsAt,
                              int maxPlayers, String description) {
    }

    public record ParticipantView(UUID id, String fullName) {
    }

    public record GameView(UUID id, UUID courtId, String courtName, SportType sportType,
                           LocalDateTime startsAt, int maxPlayers, int currentPlayers,
                           String description, GameStatus status, List<ParticipantView> participants) {
        static GameView from(Game game) {
            return new GameView(game.getId(), game.getCourt().getId(), game.getCourt().getName(),
                    game.getSportType(), game.getStartsAt(), game.getMaxPlayers(),
                    game.getParticipants().size(), game.getDescription(), game.getStatus(),
                    game.getParticipants().stream()
                            .map(user -> new ParticipantView(user.getId(), user.getFullName())).toList());
        }
    }
}
