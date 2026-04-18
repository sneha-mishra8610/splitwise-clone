package com.example.splitwise.dto;

import java.math.BigDecimal;

public class DashboardSummaryDTO {
    private BigDecimal totalOwedToUser;
    private BigDecimal totalUserOwes;
    private BigDecimal netBalance;
    private BigDecimal amountSpentThisMonth;

    public DashboardSummaryDTO() {}

    public DashboardSummaryDTO(BigDecimal totalOwedToUser, BigDecimal totalUserOwes, BigDecimal netBalance, BigDecimal amountSpentThisMonth) {
        this.totalOwedToUser = totalOwedToUser;
        this.totalUserOwes = totalUserOwes;
        this.netBalance = netBalance;
        this.amountSpentThisMonth = amountSpentThisMonth;
    }

    public BigDecimal getTotalOwedToUser() {
        return totalOwedToUser;
    }

    public void setTotalOwedToUser(BigDecimal totalOwedToUser) {
        this.totalOwedToUser = totalOwedToUser;
    }

    public BigDecimal getTotalUserOwes() {
        return totalUserOwes;
    }

    public void setTotalUserOwes(BigDecimal totalUserOwes) {
        this.totalUserOwes = totalUserOwes;
    }

    public BigDecimal getNetBalance() {
        return netBalance;
    }

    public void setNetBalance(BigDecimal netBalance) {
        this.netBalance = netBalance;
    }

    public BigDecimal getAmountSpentThisMonth() {
        return amountSpentThisMonth;
    }

    public void setAmountSpentThisMonth(BigDecimal amountSpentThisMonth) {
        this.amountSpentThisMonth = amountSpentThisMonth;
    }
}
