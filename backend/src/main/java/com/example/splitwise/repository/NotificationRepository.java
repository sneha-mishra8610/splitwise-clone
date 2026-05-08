package com.example.splitwise.repository;

import java.util.Optional;
import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;
import com.example.splitwise.model.Notification;

public interface NotificationRepository extends MongoRepository<Notification,String>{

    Optional<Notification> findTopByUserIdAndExpenseIdOrderByLastSentDesc(String userId, String expenseId);

    List<Notification> findByUserIdOrderByLastSentDesc(String userId);
    
}
