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

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "teams")
public class Team {
    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(nullable = false, length = 150)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "sport_type", nullable = false, length = 30)
    private SportType sportType;

    @Column(columnDefinition = "text")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "captain_id", nullable = false)
    private User captain;

    @ManyToMany
    @JoinTable(
            name = "team_members",
            joinColumns = @JoinColumn(name = "team_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    private Set<User> members = new HashSet<>();

    protected Team() {
    }

    public Team(String name, SportType sportType, String description, User captain) {
        this.name = name;
        this.sportType = sportType;
        this.description = description;
        this.captain = captain;
        this.members.add(captain);
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public SportType getSportType() {
        return sportType;
    }

    public String getDescription() {
        return description;
    }

    public User getCaptain() {
        return captain;
    }

    public Set<User> getMembers() {
        return Set.copyOf(members);
    }

    public void addMember(User user) {
        members.add(user);
    }

    public void removeMember(User user) {
        if (!captain.equals(user)) {
            members.remove(user);
        }
    }
}
