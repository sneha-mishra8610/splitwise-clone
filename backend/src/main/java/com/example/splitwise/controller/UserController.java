package com.example.splitwise.controller;

import com.example.splitwise.model.PendingInvitation;
import com.example.splitwise.model.User;
import com.example.splitwise.repository.UserRepository;
import com.example.splitwise.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final UserService userService;
    private final com.example.splitwise.service.BudgetService budgetService;

    public UserController(UserRepository userRepository, UserService userService, com.example.splitwise.service.BudgetService budgetService) {
        this.userRepository = userRepository;
        this.userService = userService;
        this.budgetService = budgetService;
    }

    @PostMapping
    public ResponseEntity<User> createUser(@Valid @RequestBody User user) {
        return ResponseEntity.ok(userService.createUser(user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable("id") String id, @Valid @RequestBody User user) {
        user.setId(id);
        return ResponseEntity.ok(userService.updateUser(user));
    }

    @GetMapping
    public List<User> listUsers() {
        return userRepository.findAll();
    }

    @GetMapping("/{userId}/budgets")
    public ResponseEntity<?> getUserBudgets(@PathVariable("userId") String userId) {
        return ResponseEntity.ok(budgetService.getUserBudgets(userId));
    }

    @PostMapping("/{userId}/budgets")
    public ResponseEntity<User> setUserBudget(@PathVariable("userId") String userId, @RequestBody Map<String, Object> body) {
        String period = (String) body.get("period");
        String storageToken = (String) body.get("storageToken");
        Double amount = body.get("amount") instanceof Number ? ((Number) body.get("amount")).doubleValue() : null;
        if (period == null || storageToken == null || amount == null) return ResponseEntity.badRequest().build();
        User updated = budgetService.setUserBudget(userId, period, storageToken, amount);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{userId}/friends/{friendId}")
    public ResponseEntity<Void> addMutualFriend(@PathVariable("userId") String userId, @PathVariable("friendId") String friendId) {
        userService.addMutualFriends(userId, friendId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{userId}/friends/{friendId}")
    public ResponseEntity<Void> removeFriend(@PathVariable("userId") String userId, @PathVariable("friendId") String friendId) {
        userService.removeFriend(userId, friendId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{userId}/friends/add-by-email")
    public ResponseEntity<?> addFriendByEmail(@PathVariable("userId") String userId, @RequestBody Map<String, String> body) {
        String email = body.get("email");
        String name = body.get("name");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        try {
            Object result = userService.addFriendByEmail(userId, email.trim(), name != null ? name.trim() : null);
            return ResponseEntity.ok(Map.of("status", "invited", "invitation", result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{userId}/invitations")
    public List<PendingInvitation> getPendingInvitations(@PathVariable("userId") String userId) {
        return userService.getPendingInvitationsByInviter(userId);
    }

    @GetMapping("/{userId}/friend-invitations")
    public List<PendingInvitation> getFriendInvitations(@PathVariable("userId") String userId) {
        return userService.getFriendInvitationsForUser(userId);
    }

    @PostMapping("/friend-invitations/{invitationId}/accept")
    public ResponseEntity<Void> acceptFriendInvitation(@PathVariable("invitationId") String invitationId) {
        userService.acceptFriendInvitation(invitationId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/friend-invitations/{invitationId}")
    public ResponseEntity<Void> declineFriendInvitation(@PathVariable("invitationId") String invitationId) {
        userService.declineFriendInvitation(invitationId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/balances/{userId}/{friendId}")
    public ResponseEntity<BigDecimal> getUserFriendBalance(@PathVariable String userId, @PathVariable String friendId) {
        BigDecimal balance=userService.getUserFriendBalance(friendId, userId);
        return ResponseEntity.ok(balance);
    }

    @GetMapping("/{userId}/friend-balances")
    public ResponseEntity<Map<String, BigDecimal>> getAllFriendBalances(@PathVariable String userId) {
    return ResponseEntity.ok(userService.getAllFriendBalances(userId));
    }
}

