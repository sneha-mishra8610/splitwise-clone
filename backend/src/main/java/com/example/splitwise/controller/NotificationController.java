package com.example.splitwise.controller;

import org.springframework.web.bind.annotation.GetMapping;
import com.example.splitwise.service.NotificationService;
import com.example.splitwise.model.Expense;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService){
        this.notificationService=notificationService;
    }

    @GetMapping("/{userId}")
    public List<Expense> getNotifications(@PathVariable("userId") String userId){
        return notificationService.getPendingExpenses(userId);
    }
}
