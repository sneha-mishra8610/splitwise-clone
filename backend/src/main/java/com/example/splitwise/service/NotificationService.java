package com.example.splitwise.service;
import com.example.splitwise.repository.UserRepository;

import java.math.BigDecimal;
import java.time.Duration;

import com.example.splitwise.model.Expense;
import com.example.splitwise.model.Group;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.math.BigDecimal;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.stereotype.Service;
import com.example.splitwise.repository.ExpenseRepository;
import com.example.splitwise.repository.UserRepository;
import com.example.splitwise.model.User;
import com.example.splitwise.model.Notification;
import com.example.splitwise.service.ExpenseService;
import com.example.splitwise.repository.NotificationRepository;

@Service
public class NotificationService {

    @Autowired
    private ExpenseRepository expenseRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ExpenseService expenseService;

    @Autowired
    private NotificationRepository notificationRepository;

public List<Notification> getScheduledNotifications(String userId){

    List<Notification> notifications=new ArrayList<Notification>();
    Optional<User> userOpt=userRepository.findById(userId);
    if(userOpt.isPresent()){
        User user=userOpt.get();
        boolean notificationReminder=user.getSettlementReminderEnabled();
        if(notificationReminder==true){
            int delay=user.getRemainderDelays();
            Map<String,Instant> lastNotificationSent=user.getLastNotificationSent();
            if (lastNotificationSent == null) {
                lastNotificationSent = new HashMap<>();
            }

        List<Expense> expenses=expenseRepository.findByPayerIdWhereExpenseUnsettled(userId);
        for(Expense e:expenses){
        Instant time=e.getCreatedAt();

        if(lastNotificationSent.containsKey(e.getId()))
            time=lastNotificationSent.get(e.getId());
        
         if(time.plusSeconds(delay*86400L).isBefore(Instant.now())){
                Instant now=Instant.now();
                lastNotificationSent.put(e.getId(),now);
                long seconds=Duration.between(e.getCreatedAt(),now).getSeconds();
                long days=seconds/864000;
                BigDecimal amount=BigDecimal.ZERO;
                amount=e.getParticipantIds().stream()
               .filter(pid->!e.getSettledByUser().getOrDefault(pid, false))
               .map(pid->expenseService.getOwedAmount(e,pid))
               .reduce(BigDecimal.ZERO,BigDecimal::add);
                Notification n=new Notification(userId,e.getId(),Notification.Type.OWED,"Expense "+e.getDescription()+" created "+days+" ago. Amount other owe to you "+amount,now);
                notifications.add(n);
                notificationRepository.save(n);
        }
        }
        
        expenses=expenseRepository.findByParticipantIdWhereParticipantUnsettled(userId);

        for(Expense e:expenses){
        Instant time=e.getCreatedAt();

        if(lastNotificationSent.containsKey(e.getId()))
            time=lastNotificationSent.get(e.getId());
        
         if(time.plusSeconds(delay*86400L).isBefore(Instant.now())){
                Instant now=Instant.now();
                lastNotificationSent.put(e.getId(),now);
                long seconds=Duration.between(e.getCreatedAt(),now).getSeconds();
                long days=seconds/864000;
                BigDecimal amount=BigDecimal.ZERO;
                amount=expenseService.getOwedAmount(e,userId);
                Notification n=new Notification(userId,e.getId(),Notification.Type.OWE,"Expense "+e.getDescription()+" created "+days+" ago. Amount you owe "+amount,now);
                notifications.add(n);
                notificationRepository.save(n);
        }
        }
        user.setLastNotificationSent(lastNotificationSent);
        userRepository.save(user);
        }
        }
        return notifications;
    }
}