package com.playslot.playslot;

import com.playslot.playslot.model.User;
import com.playslot.playslot.model.UserRole;
import com.playslot.playslot.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder,
                          AuthenticationManager authenticationManager,
                          SecurityContextRepository securityContextRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
    }

    @GetMapping("/csrf")
    public ResponseEntity<Void> csrf(CsrfToken csrfToken, HttpServletResponse response) {
        csrfToken.getToken();
        response.setHeader("Cache-Control", "no-store");
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpServletRequest httpRequest,
                                   HttpServletResponse httpResponse) {
        if (request == null) {
            return badRequest("Пошта мен құпиясөзді енгізіңіз");
        }
        String email = request.email() == null ? "" : request.email().trim().toLowerCase(Locale.ROOT);
        String password = request.password() == null ? "" : request.password();
        if (email.isBlank() || password.isEmpty()) {
            return badRequest("Пошта мен құпиясөзді енгізіңіз");
        }

        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(email, password));
        } catch (BadCredentialsException exception) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiError("Пошта немесе құпиясөз қате"));
        }

        httpRequest.getSession(true);
        httpRequest.changeSessionId();
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, httpRequest, httpResponse);

        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalStateException("Authenticated user no longer exists"));
        return ResponseEntity.ok(new RegisteredUser(user.getFullName(), user.getEmail(), user.getRole()));
    }

    @PostMapping("/logout")
    public ResponseEntity<LogoutResponse> logout(HttpServletRequest request, HttpServletResponse response,
                                                  Authentication authentication) {
        new SecurityContextLogoutHandler().logout(request, response, authentication);
        return ResponseEntity.ok(new LogoutResponse("logged_out"));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegistrationRequest request) {
        if (request == null) {
            return badRequest("Тіркелу деректері қажет");
        }
        String fullName = request.fullName() == null ? "" : request.fullName().trim();
        String email = request.email() == null ? "" : request.email().trim().toLowerCase(Locale.ROOT);
        String password = request.password() == null ? "" : request.password();
        UserRole role;
        try {
            role = request.role() == null ? UserRole.PLAYER
                    : UserRole.valueOf(request.role().trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            return badRequest("Рөл PLAYER немесе OWNER болуы керек");
        }
        if (role == UserRole.ADMIN) {
            return badRequest("Әкімші рөлін өздігінен тіркеуге болмайды");
        }

        if (fullName.isBlank() || fullName.length() > 150) {
            return badRequest("Аты-жөніңізді енгізіңіз (150 таңбаға дейін)");
        }
        if (email.length() > 254 || !EMAIL_PATTERN.matcher(email).matches()) {
            return badRequest("Дұрыс электрондық пошта мекенжайын енгізіңіз");
        }
        if (password.length() < 8 || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            return badRequest("Құпиясөз 8 таңбадан кем болмауы және 72 байттан аспауы керек");
        }
        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ApiError("Бұл электрондық пошта тіркелген"));
        }

        User user = new User(fullName, email, passwordEncoder.encode(password), role);
        try {
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException exception) {
            if (userRepository.existsByEmail(email)) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(new ApiError("Бұл электрондық пошта тіркелген"));
            }
            throw exception;
        }

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RegisteredUser(user.getFullName(), user.getEmail(), user.getRole()));
    }

    @GetMapping("/me")
    public ResponseEntity<?> currentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiError("Кіру қажет"));
        }
        return userRepository.findByEmail(authentication.getName())
                .<ResponseEntity<?>>map(user -> ResponseEntity.ok(
                        new RegisteredUser(user.getFullName(), user.getEmail(), user.getRole())))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ApiError("Кіру қажет")));
    }

    private static ResponseEntity<ApiError> badRequest(String message) {
        return ResponseEntity.badRequest().body(new ApiError(message));
    }

    public record RegistrationRequest(String fullName, String email, String password, String role) {
    }

    public record LoginRequest(String email, String password) {
    }

    public record RegisteredUser(String fullName, String email, UserRole role) {
    }

    public record LogoutResponse(String status) {
    }

    public record ApiError(String error) {
    }
}
