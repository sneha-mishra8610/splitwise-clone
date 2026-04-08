package com.example.splitwise.repository;

import com.example.splitwise.model.Activity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ActivityRepository extends MongoRepository<Activity, String> {

    List<Activity> findByUserIdOrderByCreatedAtDesc(String userId, org.springframework.data.domain.Pageable pageable);

    boolean existsByRelatedExpenseIdAndUserIdAndType(String relatedExpenseId, String userId, Activity.ActivityType type);
}

