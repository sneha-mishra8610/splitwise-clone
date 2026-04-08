package com.example.splitwise.controller;

import com.example.splitwise.model.Group;
import com.example.splitwise.model.PendingInvitation;
import com.example.splitwise.repository.GroupRepository;
import com.example.splitwise.service.GroupService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/groups")
public class GroupController {

    private final GroupRepository groupRepository;
    private final GroupService groupService;

    public GroupController(GroupRepository groupRepository, GroupService groupService) {
        this.groupRepository = groupRepository;
        this.groupService = groupService;
    }

    @PostMapping
    public ResponseEntity<Group> createGroup(@RequestBody Map<String, Object> body) {
        Group group = new Group();
        group.setName((String) body.get("name"));
        group.setOwnerId((String) body.get("ownerId"));

        @SuppressWarnings("unchecked")
        List<String> memberIdsList = (List<String>) body.get("memberIds");
        Set<String> allRequestedMembers = memberIdsList != null ? new HashSet<>(memberIdsList) : new HashSet<>();

        return ResponseEntity.ok(groupService.createGroup(group, allRequestedMembers));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Group> updateGroup(@PathVariable("id") String id, @RequestBody Map<String, Object> body) {
        String newName = (String) body.get("name");

        @SuppressWarnings("unchecked")
        List<String> memberIdsList = (List<String>) body.get("memberIds");
        Set<String> requestedMembers = memberIdsList != null ? new HashSet<>(memberIdsList) : new HashSet<>();

        return ResponseEntity.ok(groupService.updateGroupWithInvitations(id, newName, requestedMembers));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGroup(@PathVariable("id") String id) {
        groupService.deleteGroup(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping
    public List<Group> listGroups(@RequestParam(value = "userId", required = false) String userId) {
        if (userId != null && !userId.isBlank()) {
            return groupService.getGroupsForUser(userId);
        }
        return groupRepository.findAll();
    }

    @GetMapping("/invitations/{userId}")
    public List<PendingInvitation> getGroupInvitations(@PathVariable("userId") String userId) {
        return groupService.getGroupInvitationsForUser(userId);
    }

    @PostMapping("/invitations/{invitationId}/accept")
    public ResponseEntity<Void> acceptInvitation(@PathVariable("invitationId") String invitationId) {
        groupService.acceptGroupInvitation(invitationId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/invitations/{invitationId}")
    public ResponseEntity<Void> declineInvitation(@PathVariable("invitationId") String invitationId) {
        groupService.declineGroupInvitation(invitationId);
        return ResponseEntity.ok().build();
    }
}

