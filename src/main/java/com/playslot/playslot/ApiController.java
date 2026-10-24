package com.playslot.playslot;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class ApiController {

    @GetMapping("/api")
    public ApiInfo apiInfo() {
        return new ApiInfo("PlaySlot API", List.of(
                "/api/auth/csrf",
                "/api/auth/register",
                "/api/auth/login",
                "/api/auth/me",
                "/api/auth/logout",
                "/api/courts",
                "/api/home",
                "/api/bookings",
                "/api/games",
                "/api/teams",
                "/api/profile",
                "/api/owner/courts",
                "/api/admin",
                "/api/health/database"
        ));
    }

    public record ApiInfo(String name, List<String> endpoints) {
    }
}
