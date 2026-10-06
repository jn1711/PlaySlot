package com.playslot.playslot;

import com.playslot.playslot.model.SportType;
import com.playslot.playslot.model.Team;
import com.playslot.playslot.model.User;
import com.playslot.playslot.repository.TeamRepository;
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

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/teams")
public class TeamsController {
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;

    public TeamsController(TeamRepository teamRepository, UserRepository userRepository) {
        this.teamRepository = teamRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<TeamView> teams() {
        return teamRepository.findAllByOrderByNameAsc().stream().map(TeamView::from).toList();
    }

    @GetMapping("/mine")
    @Transactional(readOnly = true)
    public List<TeamView> myTeams(Authentication authentication) {
        User user = currentUser(authentication);
        return teamRepository.findByMembers_Id(user.getId()).stream().map(TeamView::from).toList();
    }

    @PostMapping
    @Transactional
    public TeamView create(@RequestBody TeamRequest request, Authentication authentication) {
        if (request == null || request.name() == null || request.name().isBlank()
                || request.name().trim().length() > 150 || request.sportType() == null
                || (request.description() != null && request.description().length() > 10_000)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Команда деректері қате");
        }
        Team team = new Team(request.name().trim(), request.sportType(), request.description(),
                currentUser(authentication));
        return TeamView.from(teamRepository.save(team));
    }

    @PostMapping("/{id}/join")
    @Transactional
    public TeamView join(@PathVariable UUID id, Authentication authentication) {
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Команда табылмады"));
        team.addMember(currentUser(authentication));
        return TeamView.from(team);
    }

    @PostMapping("/{id}/leave")
    @Transactional
    public TeamView leave(@PathVariable UUID id, Authentication authentication) {
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Команда табылмады"));
        team.removeMember(currentUser(authentication));
        return TeamView.from(team);
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Кіру қажет"));
    }

    public record TeamRequest(String name, SportType sportType, String description) {
    }

    public record MemberView(UUID id, String fullName) {
    }

    public record TeamView(UUID id, String name, SportType sportType, String description,
                           UUID captainId, List<MemberView> members) {
        static TeamView from(Team team) {
            return new TeamView(team.getId(), team.getName(), team.getSportType(), team.getDescription(),
                    team.getCaptain().getId(), team.getMembers().stream()
                    .map(user -> new MemberView(user.getId(), user.getFullName())).toList());
        }
    }
}
