package com.example.splitwise.service;

import com.example.splitwise.model.Activity;
import com.example.splitwise.model.PendingInvitation;
import com.example.splitwise.model.User;
import com.example.splitwise.repository.ActivityRepository;
import com.example.splitwise.repository.PendingInvitationRepository;
import com.example.splitwise.repository.UserRepository;
import com.example.splitwise.repository.ExpenseRepository;
import com.example.splitwise.model.Expense;
import com.example.splitwise.model.Expense.ExpenseStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final ActivityRepository activityRepository;
    private final PendingInvitationRepository pendingInvitationRepository;
    private final ExpenseRepository expenseRepository;

    public UserService(UserRepository userRepository, ActivityRepository activityRepository,
                       PendingInvitationRepository pendingInvitationRepository,ExpenseRepository expenseRepository) {
        this.userRepository = userRepository;
        this.activityRepository = activityRepository;
        this.pendingInvitationRepository = pendingInvitationRepository;
        this.expenseRepository=expenseRepository;
    }

    public User createUser(User user) {
        return userRepository.save(user);
    }

    public User updateUser(User user) {
        User existing = userRepository.findById(user.getId())
                .orElseThrow(() -> new NoSuchElementException("User not found: " + user.getId()));

        // Never allow generic profile updates to wipe credentials.
        user.setPasswordHash(existing.getPasswordHash());

        // Preserve critical fields when omitted in partial update payloads.
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            user.setEmail(existing.getEmail());
        }
        if (user.getFriendIds() == null) {
            user.setFriendIds(existing.getFriendIds());
        }
        if (user.getBudgetPreferences() == null) {
            user.setBudgetPreferences(existing.getBudgetPreferences());
        }

        return userRepository.save(user);
    }

    public Optional<User> getUser(String id) {
        return userRepository.findById(id);
    }

    @Transactional
    public Object addFriendByEmail(String userId, String email, String name) {
        User currentUser = userRepository.findById(userId).orElseThrow();

        if (email.equalsIgnoreCase(currentUser.getEmail())) {
            throw new IllegalArgumentException("Cannot add yourself as a friend");
        }

        PendingInvitation invitation = new PendingInvitation();
        invitation.setInviterUserId(userId);
        invitation.setInviteeEmail(email);

        Optional<User> existingFriend = userRepository.findByEmail(email);
        if (existingFriend.isPresent()) {
            User friend = existingFriend.get();
            if (currentUser.getFriendIds().contains(friend.getId())) {
                throw new IllegalArgumentException("Already friends");
            }
            invitation.setInviteeUserId(friend.getId());
            invitation.setInviteeName(friend.getName());
        } else {
            invitation.setInviteeName(name != null && !name.isBlank() ? name : email.split("@")[0]);
        }

        invitation.setType(PendingInvitation.InvitationType.FRIEND);
        pendingInvitationRepository.save(invitation);

        return invitation;
    }

    public List<PendingInvitation> getPendingInvitationsByInviter(String userId) {
        return pendingInvitationRepository.findByInviterUserId(userId);
    }

    public List<PendingInvitation> getFriendInvitationsForUser(String userId) {
        return pendingInvitationRepository.findByInviteeUserIdAndType(userId, PendingInvitation.InvitationType.FRIEND);
    }

    @Transactional
    public void acceptFriendInvitation(String invitationId) {
        PendingInvitation inv = pendingInvitationRepository.findById(invitationId).orElseThrow();
        if (inv.getType() != PendingInvitation.InvitationType.FRIEND) {
            throw new IllegalArgumentException("Not a friend invitation");
        }
        if (inv.getInviteeUserId() == null) {
            throw new IllegalArgumentException("Invitee has no account");
        }

        User inviter = userRepository.findById(inv.getInviterUserId()).orElseThrow();
        User invitee = userRepository.findById(inv.getInviteeUserId()).orElseThrow();

        inviter.getFriendIds().add(invitee.getId());
        invitee.getFriendIds().add(inviter.getId());
        userRepository.save(inviter);
        userRepository.save(invitee);

        Activity actForInviter = new Activity();
        actForInviter.setUserId(inviter.getId());
        actForInviter.setType(Activity.ActivityType.FRIEND_ADDED);
        actForInviter.setDescription(invitee.getName() + " accepted your friend request!");
        activityRepository.save(actForInviter);

        Activity actForInvitee = new Activity();
        actForInvitee.setUserId(invitee.getId());
        actForInvitee.setType(Activity.ActivityType.FRIEND_ADDED);
        actForInvitee.setDescription("You and " + inviter.getName() + " are now friends.");
        activityRepository.save(actForInvitee);

        pendingInvitationRepository.delete(inv);
    }

    public void declineFriendInvitation(String invitationId) {
        pendingInvitationRepository.deleteById(invitationId);
    }

    @Transactional
    public void processInvitationsForNewUser(User newUser) {
        List<PendingInvitation> invitations = pendingInvitationRepository.findByInviteeEmail(newUser.getEmail());
        for (PendingInvitation inv : invitations) {
            inv.setInviteeUserId(newUser.getId());
            inv.setInviteeName(newUser.getName());
            pendingInvitationRepository.save(inv);
        }
    }

    @Transactional
    public void removeFriend(String userId, String friendId) {
        User user = userRepository.findById(userId).orElseThrow();
        User friend = userRepository.findById(friendId).orElseThrow();

        user.getFriendIds().remove(friendId);
        friend.getFriendIds().remove(userId);

        userRepository.save(user);
        userRepository.save(friend);
    }

    @Transactional
    public void addMutualFriends(String userId, String friendId) {
        if (userId.equals(friendId)) {
            return;
        }

        User user = userRepository.findById(userId).orElseThrow();
        User friend = userRepository.findById(friendId).orElseThrow();

        user.getFriendIds().add(friendId);
        friend.getFriendIds().add(userId);

        userRepository.save(user);
        userRepository.save(friend);

        Activity activityForUser = new Activity();
        activityForUser.setUserId(user.getId());
        activityForUser.setType(Activity.ActivityType.FRIEND_ADDED);
        activityForUser.setDescription("You and " + friend.getName() + " are now friends.");
        activityRepository.save(activityForUser);

        Activity activityForFriend = new Activity();
        activityForFriend.setUserId(friend.getId());
        activityForFriend.setType(Activity.ActivityType.FRIEND_ADDED);
        activityForFriend.setDescription("You and " + user.getName() + " are now friends.");
        activityRepository.save(activityForFriend);
    }

    @Transactional
public BigDecimal getUserFriendBalance(String friendId, String userId) {
    BigDecimal balance = BigDecimal.ZERO;
    List<Expense> expenses = expenseRepository.findByBothParticipants(friendId, userId);
    for (Expense expense : expenses) {
        if (expense.getExpenseStatus() == ExpenseStatus.Settled)
            continue;
        if (expense.getPayerId().equals(userId)
                && expense.getSettledByUser() != null
                && !Boolean.TRUE.equals(expense.getSettledByUser().get(friendId))) {
            BigDecimal share = expense.getCustomSplits() != null && expense.getCustomSplits().containsKey(friendId)
                    ? expense.getCustomSplits().get(friendId)
                    : expense.getAmount().divide(BigDecimal.valueOf(expense.getParticipantIds().size()), 2, RoundingMode.HALF_UP);
            balance = balance.add(share);
        }
        if (expense.getPayerId().equals(friendId)
                && expense.getSettledByUser() != null
                && !Boolean.TRUE.equals(expense.getSettledByUser().get(userId))) {
            BigDecimal share = expense.getCustomSplits() != null && expense.getCustomSplits().containsKey(userId)
                    ? expense.getCustomSplits().get(userId)
                    : expense.getAmount().divide(BigDecimal.valueOf(expense.getParticipantIds().size()), 2, RoundingMode.HALF_UP);
            balance = balance.subtract(share);
        }
    }
    return balance;
}

    @Transactional
    public Map<String, BigDecimal> getAllFriendBalances(String userId) {
    User user = userRepository.findById(userId).orElseThrow();
    Map<String, BigDecimal> balances = new HashMap<>();
    for (String friendId : user.getFriendIds()) {
        BigDecimal balance = getUserFriendBalance(friendId,userId);
        balances.put(friendId, balance);
    }
    return balances;
    }
}