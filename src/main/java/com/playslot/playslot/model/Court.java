package com.playslot.playslot.model;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "courts")
public class Court {
    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(nullable = false, length = 150)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "sport_type", nullable = false, length = 30)
    private SportType sportType;

    @Column(nullable = false, length = 100)
    private String city;

    @Column(length = 100)
    private String district;

    @Column(nullable = false, length = 255)
    private String address;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "hourly_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal hourlyPrice;

    @ElementCollection
    @CollectionTable(name = "court_photos", joinColumns = @JoinColumn(name = "court_id"))
    @Column(name = "photo_url", nullable = false, length = 2048)
    private List<String> photoUrls = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "court_amenities", joinColumns = @JoinColumn(name = "court_id"))
    @Column(name = "amenity", nullable = false, length = 100)
    private List<String> amenities = new ArrayList<>();

    protected Court() {
    }

    public Court(User owner, String name, SportType sportType, String city, String district,
                 String address, String description, BigDecimal hourlyPrice,
                 List<String> photoUrls, List<String> amenities) {
        this.owner = owner;
        this.name = name;
        this.sportType = sportType;
        this.city = city;
        this.district = district;
        this.address = address;
        this.description = description;
        this.hourlyPrice = hourlyPrice;
        this.photoUrls = new ArrayList<>(photoUrls);
        this.amenities = new ArrayList<>(amenities);
    }

    public UUID getId() {
        return id;
    }

    public User getOwner() {
        return owner;
    }

    public String getName() {
        return name;
    }

    public SportType getSportType() {
        return sportType;
    }

    public String getCity() {
        return city;
    }

    public String getDistrict() {
        return district;
    }

    public String getAddress() {
        return address;
    }

    public String getDescription() {
        return description;
    }

    public BigDecimal getHourlyPrice() {
        return hourlyPrice;
    }

    public List<String> getPhotoUrls() {
        return List.copyOf(photoUrls);
    }

    public List<String> getAmenities() {
        return List.copyOf(amenities);
    }
}
