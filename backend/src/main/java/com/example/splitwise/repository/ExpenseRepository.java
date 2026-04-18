package com.example.splitwise.repository;

import com.example.splitwise.model.Expense;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ExpenseRepository extends MongoRepository<Expense, String> {

    Optional<Expense> findById(String expenseId);
    
    List<Expense> findByGroupId(String groupId);

    List<Expense> findByPayerId(String payerId);

    List<Expense> findByPayerIdAndType(String payerId, com.example.splitwise.model.Expense.ExpenseType type);

    List<Expense> findByParticipantIdsContaining(String userId);

    List<Expense> findByIsRecurringTrueAndGeneratedFromRecurringIdIsNull();

    boolean existsByGeneratedFromRecurringIdAndRecurrenceOccurrenceDate(String generatedFromRecurringId, Instant recurrenceOccurrenceDate);
}

