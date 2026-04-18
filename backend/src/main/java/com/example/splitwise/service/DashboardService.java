package com.example.splitwise.service;

import com.example.splitwise.repository.ExpenseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;

@Service
public class DashboardService {

	private final ExpenseRepository expenseRepository;

	@Autowired
	public DashboardService(ExpenseRepository expenseRepository) {
		this.expenseRepository = expenseRepository;
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
		var expenses = expenseRepository.findByPayerId(userId);
		for (var expense : expenses) {
			if (expense.getCustomSplits() != null) {
				for (var entry : expense.getCustomSplits().entrySet()) {
					String participantId = entry.getKey();
					BigDecimal share = entry.getValue();
					if (!participantId.equals(userId)) {
						total = total.add(share);
					}
				}
			} else if (expense.getParticipantIds() != null) {
				int numParticipants = expense.getParticipantIds().size();
				if (numParticipants > 1) {
					BigDecimal share = expense.getAmount().divide(BigDecimal.valueOf(numParticipants), BigDecimal.ROUND_HALF_UP);
					int numberOfPeopleWhoOwe=numParticipants-1;
                    BigDecimal amountOwed=share.multiply(BigDecimal.valueOf(numberOfPeopleWhoOwe));
                    total.add(amountOwed);
				}
			}
		}
		return total;
	}

	private BigDecimal getTotalUserOwes(String userId) {
		BigDecimal total = BigDecimal.ZERO;
		var expenses = expenseRepository.findByParticipantIdsContaining(userId);
        for(var expense:expenses){
            if(expense.getPayerId().equals(userId))
                continue;
            if(expense.getCustomSplits()!=null){
                for(var entry:expense.getCustomSplits().entrySet()){
                    String participantId=entry.getKey();
                    BigDecimal share=entry.getValue();
                    if(participantId==userId)
                        total=total.add(share);
                }
            }
            else if(expense.getParticipantIds()!=null){
                int numParticipants=expense.getParticipantIds().size();
                BigDecimal share=expense.getAmount().divide(BigDecimal.valueOf(numParticipants),BigDecimal.ROUND_HALF_EVEN);
                total=total.add(share);
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
