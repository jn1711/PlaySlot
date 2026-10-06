package com.playslot.playslot.repository;

import com.playslot.playslot.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ReviewRepository extends JpaRepository<Review, UUID> {
    List<Review> findByCourt_IdOrderByCreatedAtDesc(UUID courtId);
    boolean existsByUser_IdAndCourt_Id(UUID userId, UUID courtId);
    long countByCourt_Id(UUID courtId);

    @Query("select avg(review.rating) from Review review where review.court.id = :courtId")
    Double averageRatingForCourt(@Param("courtId") UUID courtId);
}
