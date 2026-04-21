package com.example.splitwise.service;

import com.example.splitwise.repository.ExpenseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.Map;

@Service
public class DashboardService {

	private final ExpenseRepository expenseRepository;
	private final UserService userService;

	@Autowired
	public DashboardService(ExpenseRepository expenseRepository, UserService userService) {
		this.expenseRepository = expenseRepository;
		this.userService = userService;
	}

	public DashboardSummary getDashboardSummary(String userId) {
		BigDecimal totalOwedToUser = getTotalOwedToUser(userId);
		BigDecimal totalUserOwes = getTotalUserOwes(userId);
		BigDecimal netBalance = totalOwedToUser.subtract(totalUserOwes);
		BigDecimal spentThisMonth = getAmountSpentThisMonth(userId);
		return new DashboardSummary(totalOwedToUser, totalUserOwes, netBalance, spentThisMonth);
	}

	private BigDecimal getTotalOwedToUser(String userId) {
		BigDecimal total = BigDecimal.ZERO;
		Map<String, BigDecimal> friendBalances = userService.getAllFriendBalances(userId);
		for (BigDecimal balance : friendBalances.values()) {
			if (balance.compareTo(BigDecimal.ZERO) > 0) {
				total = total.add(balance);
			}
		}
		return total;
	}

	private BigDecimal getTotalUserOwes(String userId) {
		BigDecimal total = BigDecimal.ZERO;
		Map<String, BigDecimal> friendBalances = userService.getAllFriendBalances(userId);
		for (BigDecimal balance : friendBalances.values()) {
			if (balance.compareTo(BigDecimal.ZERO) < 0) {
				total = total.add(balance.abs());
			}
		}
		return total;
	}

	private BigDecimal getAmountSpentThisMonth(String userId) {
		BigDecimal total = BigDecimal.ZERO;
		var expenses = expenseRepository.findByPayerId(userId);
		java.time.YearMonth currentMonth = java.time.YearMonth.now();
		for (var expense : expenses) {
			java.time.Instant createdAt = expense.getCreatedAt();
			if (createdAt != null) {
				java.time.LocalDate date = createdAt.atZone(java.time.ZoneId.systemDefault()).toLocalDate();
				java.time.YearMonth expenseMonth = java.time.YearMonth.from(date);
				if (expenseMonth.equals(currentMonth)) {
					total = total.add(expense.getAmount());
				}
			}
		}
		return total;
	}

	public static class DashboardSummary {
		private BigDecimal totalOwedToUser;
		private BigDecimal totalUserOwes;
		private BigDecimal netBalance;
		private BigDecimal spentThisMonth;

		public DashboardSummary(BigDecimal totalOwedToUser, BigDecimal totalUserOwes, BigDecimal netBalance, BigDecimal spentThisMonth) {
			this.totalOwedToUser = totalOwedToUser;
			this.totalUserOwes = totalUserOwes;
			this.netBalance = netBalance;
			this.spentThisMonth = spentThisMonth;
		}

		public BigDecimal getTotalOwedToUser() { return totalOwedToUser; }
		public BigDecimal getTotalUserOwes() { return totalUserOwes; }
		public BigDecimal getNetBalance() { return netBalance; }
		public BigDecimal getSpentThisMonth() { return spentThisMonth; }
	}
}
