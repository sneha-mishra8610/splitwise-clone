package com.example.splitwise.service;
import com.example.splitwise.model.Expense;
import com.example.splitwise.model.Group;
import java.util.*;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.splitwise.repository.*;

@Service
public class NotificationService {
    @Autowired
    private GroupRepository groupRepository;

    @Autowired
    private ExpenseRepository expenseRepository;

    public List<Expense> getPendingExpenses(String id){
        List<Expense> unsettled=new ArrayList<>();
        List<Group> userGroups=groupRepository.findByMemberIdsContaining(id);

        for(Group g:userGroups){
            List<Expense> expenses=expenseRepository.findByGroupId(g.getId());
            for(Expense e:expenses){
                if(!e.getParticipantIds().contains(id)) 
                    continue;
                boolean youOwe=!e.getPayerId().equals(id)&&e.getParticipantIds().contains(id);
                boolean owedToYou=e.getPayerId().equals(id)&&e.getParticipantIds().size()>1;
                if (youOwe||owedToYou) {
                    unsettled.add(e);
                }
            }
        }
        return unsettled;
    }
}