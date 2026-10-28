package com.playslot.playslot;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Serves the single-page application (SPA) HTML interface.
 */
@RestController
public class FrontendController {

    @GetMapping(
            value = {"/", "/index", "/index.html", "/courts", "/booking", "/games", "/profile", "/owner", "/admin"},
            produces = MediaType.TEXT_HTML_VALUE
    )
    public ResponseEntity<Resource> spa() {
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .body(new ClassPathResource("static/index.html"));
    }
}
