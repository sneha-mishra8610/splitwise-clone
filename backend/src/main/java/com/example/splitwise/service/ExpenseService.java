package com.example.splitwise.service;

import com.example.splitwise.model.Activity;
import com.example.splitwise.model.Expense;
import com.example.splitwise.repository.ActivityRepository;
import com.example.splitwise.repository.ExpenseRepository;
import com.example.splitwise.repository.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final ActivityRepository activityRepository;
    private final UserRepository userRepository;

    public ExpenseService(ExpenseRepository expenseRepository, ActivityRepository activityRepository,
                          UserRepository userRepository) {
        this.expenseRepository = expenseRepository;
        this.activityRepository = activityRepository;
        this.userRepository = userRepository;
    }

    public Expense createExpense(Expense expense) {
        generateDueRecurringExpenses();
        if (expense.getId() != null && expense.getId().isBlank()) {
            expense.setId(null);
        }
        normalizeExpense(expense);
        validateCurrency(expense);
        validateRecurrence(expense);
        validateCustomSplits(expense);

        System.out.println("[ExpenseService] Received currency: " + expense.getCurrency());

        Expense saved = expenseRepository.save(expense);

        recordExpenseAddedActivities(saved);
        recordOwedActivities(saved);

        return saved;
    }

    public Expense updateExpense(Expense expense) {
        generateDueRecurringExpenses();
        normalizeExpense(expense);
        validateRecurrence(expense);
        validateCustomSplits(expense);

        Expense saved = expenseRepository.save(expense);

        return saved;
    }

    private void validateCustomSplits(Expense expense){
        if(expense.getCustomSplits()==null||expense.getCustomSplits().isEmpty())
            return;
        BigDecimal total=expense.getCustomSplits().values().stream().reduce(BigDecimal.ZERO,BigDecimal::add);
        if(total.compareTo(expense.getAmount())!=0){
            throw new IllegalArgumentException(
                "Splits ("+total+") must add up to "+expense.getAmount()+")"
            );
        }
    }

    public void deleteExpense(String id) {
        expenseRepository.findById(id).ifPresent(expense -> {
            expenseRepository.deleteById(id);
        });
    }

    private void normalizeExpense(Expense expense) {
        if (expense.getCurrency() == null) {
            expense.setCurrency("INR");
        }
        if (expense.getParticipantIds() == null || expense.getParticipantIds().isEmpty()) {
            expense.setParticipantIds(Set.of(expense.getPayerId()));
        }
        if (!expense.isRecurring()) {
            expense.setGeneratedFromRecurringId(null);
            expense.setRecurrenceOccurrenceDate(null);
            expense.setRecurrenceStartDate(null);
            expense.setRecurrenceType(null);
            expense.setRecurrenceInterval(null);
            expense.setRecurrenceEndDate(null);
        }
    }

    private void validateRecurrence(Expense expense) {
        if (!expense.isRecurring()) return;

        String recurrenceType = expense.getRecurrenceType();
        if (recurrenceType == null || recurrenceType.isBlank()) {
            throw new IllegalArgumentException("recurrenceType is required for recurring expenses");
        }
        if (expense.getRecurrenceStartDate() == null) {
            throw new IllegalArgumentException("recurrenceStartDate is required for recurring expenses");
        }

        String normalizedType = recurrenceType.trim().toUpperCase();
        String[] allowedTypes = {"DAILY", "WEEKLY", "MONTHLY", "YEARLY"};
        boolean validType = false;
        for (String allowed : allowedTypes) {
            if (allowed.equals(normalizedType)) {
                validType = true;
                break;
            }
        }
        if (!validType) {
            throw new IllegalArgumentException("Unsupported recurrenceType: " + recurrenceType);
        }
        expense.setRecurrenceType(normalizedType);

        Integer recurrenceInterval = expense.getRecurrenceInterval();
        if (recurrenceInterval == null || recurrenceInterval < 1) {
            throw new IllegalArgumentException("recurrenceInterval must be at least 1");
        }
        if (expense.getRecurrenceEndDate() != null &&
                expense.getRecurrenceEndDate().isBefore(expense.getRecurrenceStartDate())) {
            throw new IllegalArgumentException("recurrenceEndDate cannot be before recurrenceStartDate");
        }
    }

    @Scheduled(fixedDelay = 60 * 60 * 1000)
    public void scheduledRecurringGeneration() {
        generateDueRecurringExpenses();
    }

    public void generateDueRecurringExpenses() {
        Instant now = Instant.now();
        List<Expense> recurringTemplates = expenseRepository.findByIsRecurringTrueAndGeneratedFromRecurringIdIsNull();
        for (Expense template : recurringTemplates) {
            generateOccurrencesForTemplate(template, now);
        }
    }

    private void generateOccurrencesForTemplate(Expense template, Instant now) {
        if (template.getId() == null || template.getRecurrenceStartDate() == null) return;

        Instant cursor = template.getRecurrenceStartDate();
        Instant end = template.getRecurrenceEndDate();
        while (!cursor.isAfter(now)) {
            if (end != null && cursor.isAfter(end)) {
                break;
            }
            boolean exists = expenseRepository.existsByGeneratedFromRecurringIdAndRecurrenceOccurrenceDate(
                    template.getId(), cursor
            );
            if (!exists) {
                Expense generated = buildGeneratedExpense(template, cursor);
                Expense saved = expenseRepository.save(generated);
                recordExpenseAddedActivities(saved);
                recordOwedActivities(saved);
            }
            cursor = nextOccurrence(cursor, template.getRecurrenceType(), template.getRecurrenceInterval());
            if (cursor == null) break;
        }
    }

    private Expense buildGeneratedExpense(Expense template, Instant occurrenceDate) {
        Expense generated = new Expense();
        generated.setDescription(template.getDescription());
        generated.setAmount(template.getAmount());
        generated.setCurrency(template.getCurrency());
        generated.setPayerId(template.getPayerId());
        generated.setParticipantIds(template.getParticipantIds());
        generated.setGroupId(template.getGroupId());
        generated.setType(template.getType());
        generated.setCreatedAt(occurrenceDate);
        generated.setCreatedBy(template.getCreatedBy());
        generated.setImageUrl(template.getImageUrl());
        generated.setCustomSplits(template.getCustomSplits());

        generated.setRecurring(false);
        generated.setGeneratedFromRecurringId(template.getId());
        generated.setRecurrenceOccurrenceDate(occurrenceDate);
        return generated;
    }

    private Instant nextOccurrence(Instant current, String recurrenceType, Integer interval) {
        if (recurrenceType == null || interval == null || interval < 1) return null;
        ZonedDateTime utcDateTime = current.atZone(ZoneOffset.UTC);
        ZonedDateTime next = switch (recurrenceType) {
            case "DAILY" -> utcDateTime.plusDays(interval);
            case "WEEKLY" -> utcDateTime.plusWeeks(interval);
            case "MONTHLY" -> utcDateTime.plusMonths(interval);
            case "YEARLY" -> utcDateTime.plusYears(interval);
            default -> null;
        };
        return next == null ? null : next.toInstant();
    }

    private void validateCurrency(Expense expense) {
        String currency = expense.getCurrency();
        if (currency == null) return;
        // Allowed currencies
        String[] allowed = {"INR", "USD", "EUR", "GBP", "JPY"};
        boolean valid = false;
        for (String c : allowed) {
            if (c.equalsIgnoreCase(currency)) {
                expense.setCurrency(c); // normalize case
                valid = true;
                break;
            }
        }
        if (!valid) {
            throw new IllegalArgumentException("Unsupported currency: " + currency);
        }
    }

    private void recordOwedActivities(Expense expense) {
        if (expense.getParticipantIds() == null) return;
        String payerName = userRepository.findById(expense.getPayerId())
                .map(u -> u.getName()).orElse("Someone");
        for (String pid : expense.getParticipantIds()) {
            if (pid.equals(expense.getPayerId())) continue;
            BigDecimal owed = BigDecimal.ZERO;
            if (expense.getCustomSplits() != null && expense.getCustomSplits().containsKey(pid)) {
                owed = expense.getCustomSplits().get(pid);
            } else {
                owed = expense.getAmount().divide(
                    BigDecimal.valueOf(expense.getParticipantIds().size()), 2, java.math.RoundingMode.HALF_UP);
            }
            Activity a = new Activity();
            a.setUserId(pid);
            a.setType(Activity.ActivityType.EXPENSE_OWED);
            a.setRelatedExpenseId(expense.getId());
            a.setDescription("You owe \u20b9" + owed + " to " + payerName + " for \"" + expense.getDescription() + "\".");
            activityRepository.save(a);
        }
    }

    private void recordExpenseAddedActivities(Expense expense) {
        if (expense.getParticipantIds() == null || expense.getParticipantIds().isEmpty()) return;
        String recurrenceSuffix = "";
        if (expense.getGeneratedFromRecurringId() != null) {
            recurrenceSuffix = " (recurring";
            if (expense.getRecurrenceOccurrenceDate() != null) {
                recurrenceSuffix += " - " + expense.getRecurrenceOccurrenceDate().toString();
            }
            recurrenceSuffix += ")";
        }
        for (String pid : expense.getParticipantIds()) {
            Activity a = new Activity();
            a.setUserId(pid);
            a.setType(Activity.ActivityType.EXPENSE_ADDED);
            a.setRelatedExpenseId(expense.getId());
            a.setRelatedGroupId(expense.getGroupId());
            a.setDescription("Expense added: \"" + expense.getDescription() + "\"" + recurrenceSuffix + ".");
            activityRepository.save(a);
        }
    }

    public void settleExpense(String expenseId, String settlingUserId) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new IllegalArgumentException("Expense not found"));

        if (settlingUserId.equals(expense.getPayerId())) {
            settleAll(expenseId);
            return;
        }

        String payerName = userRepository.findById(expense.getPayerId())
                .map(u -> u.getName()).orElse("Someone");
        String settlerName = userRepository.findById(settlingUserId)
                .map(u -> u.getName()).orElse("Someone");
        BigDecimal owed = getOwedAmount(expense, settlingUserId);

        if (activityRepository.existsByRelatedExpenseIdAndUserIdAndType(expenseId, settlingUserId, Activity.ActivityType.EXPENSE_SETTLED)) {
            return;
        }

        Activity settlerActivity = new Activity();
        settlerActivity.setUserId(settlingUserId);
        settlerActivity.setType(Activity.ActivityType.EXPENSE_SETTLED);
        settlerActivity.setRelatedExpenseId(expenseId);
        settlerActivity.setDescription("You paid \u20b9" + owed + " to " + payerName + " for \"" + expense.getDescription() + "\".");
        activityRepository.save(settlerActivity);

        Activity payerActivity = new Activity();
        payerActivity.setUserId(expense.getPayerId());
        payerActivity.setType(Activity.ActivityType.EXPENSE_SETTLED);
        payerActivity.setRelatedExpenseId(expenseId);
        payerActivity.setDescription("Received \u20b9" + owed + " from " + settlerName + " for \"" + expense.getDescription() + "\".");
        activityRepository.save(payerActivity);
    }

    public void settleAll(String expenseId) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new IllegalArgumentException("Expense not found"));
        String payerName = userRepository.findById(expense.getPayerId())
                .map(u -> u.getName()).orElse("Someone");
        for (String pid : expense.getParticipantIds()) {
            if (pid.equals(expense.getPayerId())) continue;
            if (activityRepository.existsByRelatedExpenseIdAndUserIdAndType(expenseId, pid, Activity.ActivityType.EXPENSE_SETTLED)) {
                continue;
            }
            String settlerName = userRepository.findById(pid)
                    .map(u -> u.getName()).orElse("Someone");
            BigDecimal owed = getOwedAmount(expense, pid);
            Activity settlerActivity = new Activity();
            settlerActivity.setUserId(pid);
            settlerActivity.setType(Activity.ActivityType.EXPENSE_SETTLED);
            settlerActivity.setRelatedExpenseId(expenseId);
            settlerActivity.setDescription("You paid \u20b9" + owed + " to " + payerName + " for \"" + expense.getDescription() + "\".");
            activityRepository.save(settlerActivity);
            Activity payerActivity = new Activity();
            payerActivity.setUserId(expense.getPayerId());
            payerActivity.setType(Activity.ActivityType.EXPENSE_SETTLED);
            payerActivity.setRelatedExpenseId(expenseId);
            payerActivity.setDescription("Received \u20b9" + owed + " from " + settlerName + " for \"" + expense.getDescription() + "\".");
            activityRepository.save(payerActivity);
        }
    }

    private BigDecimal getOwedAmount(Expense expense, String userId) {
        if (expense.getCustomSplits() != null && expense.getCustomSplits().containsKey(userId)) {
            return expense.getCustomSplits().get(userId);
        }
        return expense.getAmount().divide(
            BigDecimal.valueOf(expense.getParticipantIds().size()), 2, java.math.RoundingMode.HALF_UP);
    }

    public List<Expense> listGroupExpenses(String groupId) {
        generateDueRecurringExpenses();
        return expenseRepository.findByGroupId(groupId);
    }

    public List<Expense> listPersonalExpenses(String userId) {
        generateDueRecurringExpenses();
        return expenseRepository.findByPayerIdAndType(userId, Expense.ExpenseType.PERSONAL);
    }

    public Optional<Expense> getExpenseById(String id) {
        return expenseRepository.findById(id);
    }

    public Map<String, BigDecimal> calculateSplits(Expense expense) {
        Map<String, BigDecimal> splits = new HashMap<>();
        Set<String> participants = expense.getParticipantIds();

        if (participants == null || participants.isEmpty()) {
            splits.put(expense.getPayerId(), expense.getAmount());
            return splits;
        }

        if (expense.getCustomSplits() != null && !expense.getCustomSplits().isEmpty()) {
            for (String pid : participants) {
                BigDecimal share = expense.getCustomSplits().getOrDefault(pid, BigDecimal.ZERO);
                splits.put(pid, share);
            }
            return splits;
        }

        BigDecimal equalShare = expense.getAmount()
                .divide(BigDecimal.valueOf(participants.size()), 2, java.math.RoundingMode.HALF_UP);
        for (String pid : participants) {
            splits.put(pid, equalShare);
        }
        return splits;
    }
}