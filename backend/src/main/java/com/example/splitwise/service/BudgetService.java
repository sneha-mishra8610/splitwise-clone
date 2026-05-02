package com.example.splitwise.service;

import com.example.splitwise.model.BudgetSummary;
import com.example.splitwise.model.User;
import com.example.splitwise.repository.ExpenseRepository;
import com.example.splitwise.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.*;
import java.time.temporal.IsoFields;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class BudgetService {
    private final UserRepository userRepository;
    private final ExpenseRepository expenseRepository;

    public BudgetService(UserRepository userRepository, ExpenseRepository expenseRepository) {
        this.userRepository = userRepository;
        this.expenseRepository = expenseRepository;
    }

    public List<BudgetSummary> getUserBudgets(String userId) {
        User user = userRepository.findById(userId).orElseThrow();
        List<BudgetSummary> summaries = new ArrayList<>();
        ZonedDateTime now = ZonedDateTime.now(ZoneId.systemDefault());
        for (String period : List.of("DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY")) {
            PeriodRange pr = computeRange(period, now);
            String storageToken = pr.storageToken;
            String key = String.format("budget:%s:%s", period, storageToken);
            double amount = 0d;
            if (user.getBudgetPreferences() != null && user.getBudgetPreferences().containsKey(key)) {
                Double val = user.getBudgetPreferences().get(key);
                amount = val != null ? val : 0d;
            }
            // sum expenses where payerId == userId and createdAt in [start, end)
            Instant start = pr.start.toInstant();
            Instant end = pr.end.toInstant();
            double spent = expenseRepository.findByPayerIdAndCreatedAtBetween(userId, start, end).stream()
                    .map(e -> e.getAmount() != null ? e.getAmount().doubleValue() : 0d)
                    .mapToDouble(Double::doubleValue)
                    .sum();
            BudgetSummary bs = new BudgetSummary();
            bs.setPeriod(period);
            bs.setStorageToken(storageToken);
            bs.setAmount(amount);
            bs.setSpent(spent);
            bs.setRemaining(amount - spent);
            bs.setRangeStart(start);
            bs.setRangeEnd(end);
            bs.setLabel(pr.label);
            summaries.add(bs);
        }
        return summaries;
    }

    public User setUserBudget(String userId, String period, String storageToken, double amount) {
        User user = userRepository.findById(userId).orElseThrow();
        Map<String, Double> next = new HashMap<>(user.getBudgetPreferences() == null ? Map.of() : user.getBudgetPreferences());
        String key = String.format("budget:%s:%s", period, storageToken);
        next.put(key, amount);
        user.setBudgetPreferences(next);
        return userRepository.save(user);
    }

    private static class PeriodRange {
        ZonedDateTime start;
        ZonedDateTime end;
        String storageToken;
        String label;
    }

    private PeriodRange computeRange(String period, ZonedDateTime now) {
        PeriodRange pr = new PeriodRange();
        switch (period) {
            case "DAILY": {
                ZonedDateTime start = now.toLocalDate().atStartOfDay(now.getZone());
                ZonedDateTime end = start.plusDays(1);
                pr.start = start;
                pr.end = end;
                pr.storageToken = start.toLocalDate().toString(); // e.g. 2026-05-03
                pr.label = start.toLocalDate().toString();
                break;
            }
            case "WEEKLY": {
                // ISO week: get Monday as start
                LocalDate ld = now.toLocalDate();
                LocalDate monday = ld.with(java.time.DayOfWeek.MONDAY);
                ZonedDateTime start = monday.atStartOfDay(now.getZone());
                ZonedDateTime end = start.plusWeeks(1);
                int week = now.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
                int year = now.get(IsoFields.WEEK_BASED_YEAR);
                pr.start = start;
                pr.end = end;
                pr.storageToken = String.format("%d-W%02d", year, week);
                pr.label = pr.storageToken;
                break;
            }
            case "MONTHLY": {
                LocalDate first = now.toLocalDate().withDayOfMonth(1);
                ZonedDateTime start = first.atStartOfDay(now.getZone());
                ZonedDateTime end = start.plusMonths(1);
                pr.start = start;
                pr.end = end;
                pr.storageToken = String.format("%04d-%02d", start.getYear(), start.getMonthValue());
                pr.label = start.getMonth().toString() + " " + start.getYear();
                break;
            }
            case "QUARTERLY": {
                int month = now.getMonthValue();
                int q = (month - 1) / 3 + 1;
                int startMonth = (q - 1) * 3 + 1;
                LocalDate first = LocalDate.of(now.getYear(), startMonth, 1);
                ZonedDateTime start = first.atStartOfDay(now.getZone());
                ZonedDateTime end = start.plusMonths(3);
                pr.start = start;
                pr.end = end;
                pr.storageToken = String.format("%04d-Q%d", start.getYear(), q);
                pr.label = pr.storageToken;
                break;
            }
            case "YEARLY": {
                LocalDate first = LocalDate.of(now.getYear(), 1, 1);
                ZonedDateTime start = first.atStartOfDay(now.getZone());
                ZonedDateTime end = start.plusYears(1);
                pr.start = start;
                pr.end = end;
                pr.storageToken = String.format("%04d", start.getYear());
                pr.label = pr.storageToken;
                break;
            }
            default:
                throw new IllegalArgumentException("Unknown period " + period);
        }
        return pr;
    }
}
