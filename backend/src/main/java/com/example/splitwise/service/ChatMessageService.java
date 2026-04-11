package com.example.splitwise.service;

import com.example.splitwise.model.ChatMessage;
import com.example.splitwise.repository.ChatMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class ChatMessageService {
    private final ChatMessageRepository chatMessageRepository;

    @Autowired
    public ChatMessageService(ChatMessageRepository chatMessageRepository) {
        this.chatMessageRepository = chatMessageRepository;
    }

    public ChatMessage saveMessage(String groupId, String senderId, String message) {
        ChatMessage chatMessage = new ChatMessage(groupId, senderId, message, Instant.now());
        return chatMessageRepository.save(chatMessage);
    }

    public List<ChatMessage> getMessagesByGroupId(String groupId) {
        return chatMessageRepository.findByGroupIdOrderByTimestampAsc(groupId);
    }
}
