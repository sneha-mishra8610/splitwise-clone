package com.example.splitwise.controller;

import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.splitwise.model.Notification;
import com.example.splitwise.service.NotificationService;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private static final Logger logger = LoggerFactory.getLogger(NotificationController.class);

    public NotificationController(NotificationService notificationService){
        this.notificationService=notificationService;
    }

    @GetMapping("/{userId}")
    public ResponseEntity<List<Notification>> getNotifications(
            @PathVariable("userId") String userId,
            @RequestParam(value = "preferredCurrency", required = false, defaultValue = "INR") String preferredCurrency){
        try {
            return ResponseEntity.ok(notificationService.getScheduledNotifications(userId, preferredCurrency));
        } catch (Exception e) {
            logger.error("Failed to fetch notifications for userId={}", userId, e);
            return ResponseEntity.status(500).body(Collections.emptyList());
        }
    }
}
