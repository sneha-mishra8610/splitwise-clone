package com.example.splitwise.model;

import java.time.Instant;

public class BudgetSummary {
    private String period;
    private String storageToken;
    private double amount;
    private double spent;
    private double remaining;
    private Instant rangeStart;
    private Instant rangeEnd;
    private String label;

    public String getPeriod() {
        return period;
    }

    public void setPeriod(String period) {
        this.period = period;
    }

    public String getStorageToken() {
        return storageToken;
    }

    public void setStorageToken(String storageToken) {
        this.storageToken = storageToken;
    }

    public double getAmount() {
        return amount;
    }

    public void setAmount(double amount) {
        this.amount = amount;
    }

    public double getSpent() {
        return spent;
    }

    public void setSpent(double spent) {
        this.spent = spent;
    }

    public double getRemaining() {
        return remaining;
    }

    public void setRemaining(double remaining) {
        this.remaining = remaining;
    }

    public Instant getRangeStart() {
        return rangeStart;
    }

    public void setRangeStart(Instant rangeStart) {
        this.rangeStart = rangeStart;
    }

    public Instant getRangeEnd() {
        return rangeEnd;
    }

    public void setRangeEnd(Instant rangeEnd) {
        this.rangeEnd = rangeEnd;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }
}
