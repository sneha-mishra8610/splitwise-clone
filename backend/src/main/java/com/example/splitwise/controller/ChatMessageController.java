package com.example.splitwise.controller;

import com.example.splitwise.model.ChatMessage;
import com.example.splitwise.service.ChatMessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatMessageController {
    private final ChatMessageService chatMessageService;

    @Autowired
    public ChatMessageController(ChatMessageService chatMessageService) {
        this.chatMessageService = chatMessageService;
    }

    // Send a new chat message
    @PostMapping("/{groupId}")
    public ResponseEntity<ChatMessage> sendMessage(
            @PathVariable String groupId,
            @RequestBody Map<String, String> payload) {
        String senderId = payload.get("senderId");
        String message = payload.get("message");
        if (senderId == null || message == null) {
            return ResponseEntity.badRequest().build();
        }
        ChatMessage saved = chatMessageService.saveMessage(groupId, senderId, message);
        return ResponseEntity.ok(saved);
    }

    // Get all messages for a group
    @GetMapping("/{groupId}")
    public ResponseEntity<List<ChatMessage>> getMessages(@PathVariable String groupId) {
        List<ChatMessage> messages = chatMessageService.getMessagesByGroupId(groupId);
        return ResponseEntity.ok(messages);
    }
}
