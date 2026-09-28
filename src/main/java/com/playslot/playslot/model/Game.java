package com.playslot.playslot.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "games")
public class Game {
    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizer_id", nullable = false)
    private User organizer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "court_id", nullable = false)
    private Court court;

    @Enumerated(EnumType.STRING)
    @Column(name = "sport_type", nullable = false, length = 30)
    private SportType sportType;

    @Column(name = "starts_at", nullable = false)
    private LocalDateTime startsAt;

    @Column(name = "max_players", nullable = false)
    private int maxPlayers;

    @Column(columnDefinition = "text")
    private String description;

    @ManyToMany
    @JoinTable(
            name = "game_participants",
            joinColumns = @JoinColumn(name = "game_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    private Set<User> participants = new HashSet<>();

    protected Game() {
    }

    public Game(User organizer, Court court, SportType sportType, LocalDateTime startsAt,
                int maxPlayers, String description) {
        if (maxPlayers < 1) {
            throw new IllegalArgumentException("maxPlayers must be positive");
        }
        this.organizer = organizer;
        this.court = court;
        this.sportType = sportType;
        this.startsAt = startsAt;
        this.maxPlayers = maxPlayers;
        this.description = description;
        this.participants.add(organizer);
    }

    public UUID getId() {
        return id;
    }

    public User getOrganizer() {
        return organizer;
    }

    public Court getCourt() {
        return court;
    }

    public SportType getSportType() {
        return sportType;
    }

    public LocalDateTime getStartsAt() {
        return startsAt;
    }

    public int getMaxPlayers() {
        return maxPlayers;
    }

    public String getDescription() {
        return description;
    }

    public Set<User> getParticipants() {
        return Set.copyOf(participants);
    }

    public void addParticipant(User user) {
        if (!participants.contains(user) && participants.size() >= maxPlayers) {
            throw new IllegalStateException("Game is full");
        }
        participants.add(user);
    }

    public void removeParticipant(User user) {
        if (!organizer.equals(user)) {
            participants.remove(user);
        }
    }
}
