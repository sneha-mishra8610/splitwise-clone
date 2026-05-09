package com.example.splitwise.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.Comparator;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.example.splitwise.model.Expense;
import com.example.splitwise.model.Notification;
import com.example.splitwise.model.User;
import com.example.splitwise.repository.ExpenseRepository;
import com.example.splitwise.repository.NotificationRepository;
import com.example.splitwise.repository.UserRepository;

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

    private final RestTemplate restTemplate = new RestTemplate();
    private volatile Map<String, Object> cachedExchangeRates = new ConcurrentHashMap<>();
    private volatile Instant cachedExchangeRatesAt = Instant.EPOCH;
    private static final Duration EXCHANGE_RATE_CACHE_TTL = Duration.ofMinutes(30);

        private boolean isUnsettled(Expense e) {
        if (e.getParticipantIds() == null || e.getParticipantIds().isEmpty()) {
            return false;
        }
        if (e.getSettledByUser() != null && !e.getSettledByUser().isEmpty()) {
            for (String pid : e.getParticipantIds()) {
                if (pid == null || pid.equals(e.getPayerId())) continue;
                if (!Boolean.TRUE.equals(e.getSettledByUser().get(pid))) {
                    return true;
                }
            }
            return false;
        }
        return e.getExpenseStatus() == Expense.ExpenseStatus.Unsettled;
    }

    private boolean isUserStillOwing(Expense e, String userId) {
        if (e == null || userId == null) return false;
        if (userId.equals(e.getPayerId())) return false;
        if (e.getParticipantIds() == null || !e.getParticipantIds().contains(userId)) return false;

        if (e.getSettledByUser() != null && e.getSettledByUser().containsKey(userId)) {
            return !Boolean.TRUE.equals(e.getSettledByUser().get(userId));
        }
        return e.getExpenseStatus() == Expense.ExpenseStatus.Unsettled;
    }

        private String notificationKey(Notification n) {
        if (n == null) return "";
        return String.valueOf(n.getUserId()) + "|" +
                String.valueOf(n.getExpenseId()) + "|" +
                String.valueOf(n.getType());
    }

    private Instant notificationInstant(Notification n) {
        if (n == null) return Instant.EPOCH;
        if (n.getLastSent() != null) return n.getLastSent();
        if (n.getCreatedAt() != null) return n.getCreatedAt();
        return Instant.EPOCH;
    }

    private void mergeLatestNotification(Map<String, Notification> bucket, Notification candidate) {
        if (candidate == null) return;
        String key = notificationKey(candidate);
        Notification existing = bucket.get(key);
        if (existing == null || notificationInstant(candidate).isAfter(notificationInstant(existing))) {
            bucket.put(key, candidate);
        }
    }

    public List<Notification> getScheduledNotifications(String userId, String preferredCurrency) {
        List<Notification> responseNotifications = new ArrayList<>();
        try {
            String effectivePreferredCurrency = preferredCurrency == null || preferredCurrency.isBlank()
                    ? "INR"
                    : preferredCurrency.toUpperCase();
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                if (user.getSettlementReminderEnabled()) {
                    int delay = user.getRemainderDelays();
                    Map<String, Instant> lastNotificationSent = user.getLastNotificationSent();
                    if (lastNotificationSent == null) {
                        lastNotificationSent = new HashMap<>();
                    }
                    Instant now = Instant.now();
                    Set<String> addedExpenseIds = new HashSet<>();

                    List<Expense> expenses = expenseRepository.findByPayerId(userId);
                    for (Expense e : expenses) {
                        if (e == null || e.getId() == null || e.getParticipantIds() == null || e.getParticipantIds().isEmpty()) {
                            continue;
                        }
                        if (!isUnsettled(e)) {
                            continue;
                        }
                        try {
                            Instant createdAt = e.getCreatedAt() == null ? now : e.getCreatedAt();
                            Instant time = lastNotificationSent.getOrDefault(e.getId(), createdAt);
                            if (!time.plusSeconds(delay * 86400L).isBefore(now)) {
                                continue;
                            }

                            lastNotificationSent.put(e.getId(), now);
                            long seconds = Math.max(0, Duration.between(createdAt, now).getSeconds());
                            long days = seconds / 86400;
                            BigDecimal amount = e.getParticipantIds().stream()
                                    .filter(pid -> pid != null && !pid.equals(e.getPayerId()))
                                    .filter(pid -> !(e.getSettledByUser() != null && e.getSettledByUser().getOrDefault(pid, false)))
                                    .map(pid -> expenseService.getOwedAmount(e, pid))
                                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                            if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                                continue;
                            }

                                BigDecimal convertedAmount = convertAmount(amount, e.getCurrency(), effectivePreferredCurrency);

                            Notification n = new Notification(
                                    userId,
                                    e.getId(),
                                    Notification.Type.OWED,
                                    buildNotificationMessage(
                                        "Expense " + e.getDescription() + " created " + days + " ago. Amount other owe to you ",
                                        amount,
                                        e.getCurrency(),
                                        convertedAmount,
                                        effectivePreferredCurrency
                                    ),
                                    now
                            );
                            responseNotifications.add(n);
                            addedExpenseIds.add(e.getId());
                            
                        } catch (Exception ignored) {
                            
                        }
                    }

                    expenses = expenseRepository.findByParticipantIdsContaining(userId);
                    for (Expense e : expenses) {
                        if (e == null || e.getId() == null) {
                            continue;
                        }
                        if (!isUserStillOwing(e, userId)) {
                            continue;
                        }
                        try {
                            Instant createdAt = e.getCreatedAt() == null ? now : e.getCreatedAt();
                            Instant time = lastNotificationSent.getOrDefault(e.getId(), createdAt);
                            if (!time.plusSeconds(delay * 86400L).isBefore(now)) {
                                continue;
                            }

                            lastNotificationSent.put(e.getId(), now);
                            long seconds = Math.max(0, Duration.between(createdAt, now).getSeconds());
                            long days = seconds / 86400;
                            BigDecimal amount = expenseService.getOwedAmount(e, userId);
                            if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                                continue;
                            }

                            BigDecimal convertedAmount = convertAmount(amount, e.getCurrency(), effectivePreferredCurrency);
                            Notification n = new Notification(
                                    userId,
                                    e.getId(),
                                    Notification.Type.OWE,
                                    buildNotificationMessage(
                                        "Expense " + e.getDescription() + " created " + days + " ago. Amount you owe ",
                                        amount,
                                        e.getCurrency(),
                                        convertedAmount,
                                        effectivePreferredCurrency
                                    ),
                                    now
                            );
                            responseNotifications.add(n);
                            addedExpenseIds.add(e.getId());
                            try {
                                notificationRepository.save(n);
                            } catch (Exception ignored) { }
                        } catch (Exception ignored) {
                            
                        }
                    }

                    appendFallbackOverdueNotifications(userId, delay, now, responseNotifications, addedExpenseIds, effectivePreferredCurrency);

                    user.setLastNotificationSent(lastNotificationSent);
                    userRepository.save(user);
                }
            }
        } catch (Exception ignored) {
            
        }

        List<Notification> persisted = new ArrayList<>();
        try {
            persisted = notificationRepository.findByUserIdOrderByLastSentDesc(userId);
        } catch (Exception ignored) {
        }

        Map<String, Notification> latestByExpenseAndType = new HashMap<>();
        for (Notification n : responseNotifications) {
            mergeLatestNotification(latestByExpenseAndType, n);
        }
        for (Notification n : persisted) {
            mergeLatestNotification(latestByExpenseAndType, n);
        }

        List<Notification> merged = new ArrayList<>(latestByExpenseAndType.values());
        merged.sort(Comparator.comparing(this::notificationInstant).reversed());
        return merged;
    }

    private void appendFallbackOverdueNotifications(
            String userId,
            int delay,
            Instant now,
            List<Notification> out,
            Set<String> addedExpenseIds,
            String preferredCurrency
    ) {
        try {
            for (Expense e : expenseRepository.findByPayerId(userId)) {
                if (e == null || e.getId() == null || addedExpenseIds.contains(e.getId()) || !isUnsettled(e)) 
                    continue;
                Instant createdAt = e.getCreatedAt() == null ? now : e.getCreatedAt();
                if (!createdAt.plusSeconds(delay * 86400L).isBefore(now)) 
                    continue;
                BigDecimal amount = e.getParticipantIds().stream()
                        .filter(pid -> pid != null && !pid.equals(e.getPayerId()))
                        .filter(pid -> !(e.getSettledByUser() != null && e.getSettledByUser().getOrDefault(pid, false)))
                        .map(pid -> expenseService.getOwedAmount(e, pid))
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                if (amount.compareTo(BigDecimal.ZERO) <= 0) 
                    continue;
                BigDecimal convertedAmount = convertAmount(amount, e.getCurrency(), preferredCurrency);
                Notification n = new Notification(userId, e.getId(), Notification.Type.OWED,
                        buildNotificationMessage(
                                "Expense " + e.getDescription() + " is overdue. Amount others owe to you ",
                                amount,
                                e.getCurrency(),
                                convertedAmount,
                                preferredCurrency
                        ), now);
                out.add(n);
                addedExpenseIds.add(e.getId());
            }
            for (Expense e : expenseRepository.findByParticipantIdsContaining(userId)) {
                if (e == null || e.getId() == null || addedExpenseIds.contains(e.getId()) || !isUserStillOwing(e, userId)) continue;
                Instant createdAt = e.getCreatedAt() == null ? now : e.getCreatedAt();
                if (!createdAt.plusSeconds(delay * 86400L).isBefore(now)) continue;
                BigDecimal amount = expenseService.getOwedAmount(e, userId);
                if (amount.compareTo(BigDecimal.ZERO) <= 0) continue;
                BigDecimal convertedAmount = convertAmount(amount, e.getCurrency(), preferredCurrency);
                Notification n = new Notification(userId, e.getId(), Notification.Type.OWE,
                        buildNotificationMessage(
                                "Expense " + e.getDescription() + " is overdue. Amount you owe ",
                                amount,
                                e.getCurrency(),
                                convertedAmount,
                                preferredCurrency
                        ), now);
                out.add(n);
                addedExpenseIds.add(e.getId());
            }
        } catch (Exception ignored) {
        }
    }

    private String buildNotificationMessage(
            String prefix,
            BigDecimal sourceAmount,
            String sourceCurrency,
            BigDecimal preferredAmount,
            String preferredCurrency
    ) {
        String normalizedSourceCurrency = sourceCurrency == null || sourceCurrency.isBlank() ? "INR" : sourceCurrency.toUpperCase();
        String normalizedPreferredCurrency = preferredCurrency == null || preferredCurrency.isBlank() ? "INR" : preferredCurrency.toUpperCase();
        BigDecimal safePreferredAmount = preferredAmount == null ? sourceAmount : preferredAmount;
        return prefix
                + normalizedSourceCurrency + " " + sourceAmount.setScale(2, RoundingMode.HALF_UP)
                + " (" + normalizedPreferredCurrency + " " + safePreferredAmount.setScale(2, RoundingMode.HALF_UP) + ")";
    }

    private BigDecimal convertAmount(BigDecimal amount, String sourceCurrency, String targetCurrency) {
        if (amount == null) return BigDecimal.ZERO;
        String source = sourceCurrency == null || sourceCurrency.isBlank() ? "INR" : sourceCurrency.toUpperCase();
        String target = targetCurrency == null || targetCurrency.isBlank() ? "INR" : targetCurrency.toUpperCase();
        if (source.equals(target)) {
            return amount;
        }
        try {
            Map<String, Object> rates = getExchangeRates();
            if (rates == null || rates.isEmpty()) {
                return amount;
            }
            BigDecimal sourceRate = readRate(rates, source);
            BigDecimal targetRate = readRate(rates, target);
            if (sourceRate == null || targetRate == null || sourceRate.compareTo(BigDecimal.ZERO) == 0) {
                return amount;
            }
            return amount.multiply(targetRate).divide(sourceRate, 2, RoundingMode.HALF_UP);
        } catch (Exception ignored) {
            return amount;
        }
    }

    private Map<String, Object> getExchangeRates() {
        Instant now = Instant.now();
        if (!cachedExchangeRates.isEmpty() && Duration.between(cachedExchangeRatesAt, now).compareTo(EXCHANGE_RATE_CACHE_TTL) < 0) {
            return cachedExchangeRates;
        }
        synchronized (this) {
            now = Instant.now();
            if (!cachedExchangeRates.isEmpty() && Duration.between(cachedExchangeRatesAt, now).compareTo(EXCHANGE_RATE_CACHE_TTL) < 0) {
                return cachedExchangeRates;
            }
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> data = restTemplate.getForObject("https://api.exchangerate-api.com/v4/latest/INR", Map.class);
                if (data == null) {
                    return cachedExchangeRates;
                }
                Object ratesObj = data.get("rates");
                if (ratesObj instanceof Map<?, ?> rates) {
                    Map<String, Object> normalized = new HashMap<>();
                    for (Map.Entry<?, ?> entry : rates.entrySet()) {
                        if (entry.getKey() != null && entry.getValue() != null) {
                            normalized.put(String.valueOf(entry.getKey()).toUpperCase(), entry.getValue());
                        }
                    }
                    cachedExchangeRates = normalized;
                    cachedExchangeRatesAt = now;
                }
            } catch (Exception ignored) {
                return cachedExchangeRates;
            }
            return cachedExchangeRates;
        }
    }

    private BigDecimal readRate(Map<?, ?> rates, String currency) {
        if (rates == null || currency == null) return null;
        Object value = rates.get(currency);
        if (value == null) return null;
        try {
            return new BigDecimal(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

}