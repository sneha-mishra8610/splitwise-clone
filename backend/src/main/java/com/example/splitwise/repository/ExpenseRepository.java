package com.example.splitwise.repository;

import com.example.splitwise.model.Expense;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ExpenseRepository extends MongoRepository<Expense, String> {

    Optional<Expense> findById(String expenseId);
    
    List<Expense> findByGroupId(String groupId);

    List<Expense> findByPayerId(String payerId);

    List<Expense> findByPayerIdAndType(String payerId, com.example.splitwise.model.Expense.ExpenseType type);

    List<Expense> findByParticipantIdsContaining(String userId);

    @Query("{'participantIds': { $all: [?0, ?1] }}")
    List<Expense> findByBothParticipants(String id1, String id2);
    
    List<Expense> findByIsRecurringTrueAndGeneratedFromRecurringIdIsNull();

    boolean existsByGeneratedFromRecurringIdAndRecurrenceOccurrenceDate(String generatedFromRecurringId, Instant recurrenceOccurrenceDate);

    @Query("{ 'payerId': ?0, 'createdAt': { $gte: ?1, $lt: ?2 } }")
    List<Expense> findByPayerIdAndCreatedAtBetween(String payerId, Instant start, Instant end);
}

