package com.example.splitwise.service;

import com.example.splitwise.model.Activity;
import com.example.splitwise.model.Group;
import com.example.splitwise.model.PendingInvitation;
import com.example.splitwise.model.User;
import com.example.splitwise.repository.ActivityRepository;
import com.example.splitwise.repository.GroupRepository;
import com.example.splitwise.repository.PendingInvitationRepository;
import com.example.splitwise.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class GroupService {

    private final GroupRepository groupRepository;
    private final ActivityRepository activityRepository;
    private final PendingInvitationRepository pendingInvitationRepository;
    private final UserRepository userRepository;

    public GroupService(GroupRepository groupRepository, ActivityRepository activityRepository,
                        PendingInvitationRepository pendingInvitationRepository, UserRepository userRepository) {
        this.groupRepository = groupRepository;
        this.activityRepository = activityRepository;
        this.pendingInvitationRepository = pendingInvitationRepository;
        this.userRepository = userRepository;
    }

    public Group updateGroup(Group group) {
        return groupRepository.save(group);
    }

    public void deleteGroup(String id) {
        groupRepository.deleteById(id);
    }

    @Transactional
    public Group createGroup(Group group, Set<String> invitedMemberIds) {
        Set<String> ownerOnly = new HashSet<>();
        ownerOnly.add(group.getOwnerId());
        group.setMemberIds(ownerOnly);

        Group saved = groupRepository.save(group);

        Activity activity = new Activity();
        activity.setUserId(group.getOwnerId());
        activity.setType(Activity.ActivityType.GROUP_CREATED);
        activity.setRelatedGroupId(saved.getId());
        activity.setDescription("Group \"" + saved.getName() + "\" created.");
        activityRepository.save(activity);

        if (invitedMemberIds != null) {
            for (String friendId : invitedMemberIds) {
                if (friendId.equals(group.getOwnerId())) continue;
                userRepository.findById(friendId).ifPresent(friend -> {
                    PendingInvitation inv = new PendingInvitation();
                    inv.setInviterUserId(group.getOwnerId());
                    inv.setInviteeUserId(friendId);
                    inv.setInviteeEmail(friend.getEmail());
                    inv.setInviteeName(friend.getName());
                    inv.setType(PendingInvitation.InvitationType.GROUP);
                    inv.setGroupId(saved.getId());
                    inv.setGroupName(saved.getName());
                    pendingInvitationRepository.save(inv);
                });
            }
        }
        return saved;
    }

    @Transactional
    public Group updateGroupWithInvitations(String groupId, String newName, Set<String> requestedMemberIds) {
        Group group = groupRepository.findById(groupId).orElseThrow();
        group.setName(newName);

        Set<String> currentMembers = new HashSet<>(group.getMemberIds());
        Set<String> newMembers = new HashSet<>();
        for (String mid : requestedMemberIds) {
            if (!currentMembers.contains(mid)) {
                newMembers.add(mid);
            }
        }

        Set<String> updatedMembers = new HashSet<>();
        for (String mid : requestedMemberIds) {
            if (currentMembers.contains(mid)) {
                updatedMembers.add(mid);
            }
        }

        updatedMembers.add(group.getOwnerId());
        group.setMemberIds(updatedMembers);
        Group saved = groupRepository.save(group);

        for (String friendId : newMembers) {
            userRepository.findById(friendId).ifPresent(friend -> {
                PendingInvitation inv = new PendingInvitation();
                inv.setInviterUserId(group.getOwnerId());
                inv.setInviteeUserId(friendId);
                inv.setInviteeEmail(friend.getEmail());
                inv.setInviteeName(friend.getName());
                inv.setType(PendingInvitation.InvitationType.GROUP);
                inv.setGroupId(saved.getId());
                inv.setGroupName(saved.getName());
                pendingInvitationRepository.save(inv);
            });
        }

        return saved;
    }

    public List<Group> getGroupsForUser(String userId) {
        return groupRepository.findByMemberIdsContaining(userId);
    }

    public List<PendingInvitation> getGroupInvitationsForUser(String userId) {
        return pendingInvitationRepository.findByInviteeUserIdAndType(userId, PendingInvitation.InvitationType.GROUP);
    }

    @Transactional
    public void acceptGroupInvitation(String invitationId) {
        PendingInvitation inv = pendingInvitationRepository.findById(invitationId).orElseThrow();
        if (inv.getType() != PendingInvitation.InvitationType.GROUP || inv.getGroupId() == null) {
            throw new IllegalArgumentException("Not a group invitation");
        }

        Group group = groupRepository.findById(inv.getGroupId()).orElseThrow();
        group.getMemberIds().add(inv.getInviteeUserId());
        groupRepository.save(group);

        Activity actForUser = new Activity();
        actForUser.setUserId(inv.getInviteeUserId());
        actForUser.setType(Activity.ActivityType.GROUP_CREATED);
        actForUser.setRelatedGroupId(group.getId());
        actForUser.setDescription("You joined group \"" + group.getName() + "\".");
        activityRepository.save(actForUser);

        User invitee = userRepository.findById(inv.getInviteeUserId()).orElse(null);
        if (invitee != null) {
            Activity actForOwner = new Activity();
            actForOwner.setUserId(inv.getInviterUserId());
            actForOwner.setType(Activity.ActivityType.GROUP_CREATED);
            actForOwner.setRelatedGroupId(group.getId());
            actForOwner.setDescription(invitee.getName() + " accepted your invitation and joined \"" + group.getName() + "\".");
            activityRepository.save(actForOwner);
        }

        pendingInvitationRepository.delete(inv);
    }

    public void declineGroupInvitation(String invitationId) {
        pendingInvitationRepository.deleteById(invitationId);
    }
}

