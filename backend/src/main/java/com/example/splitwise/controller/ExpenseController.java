package com.example.splitwise.controller;

import com.example.splitwise.model.Expense;
import com.example.splitwise.service.ExpenseService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpHeaders;
import jakarta.servlet.http.HttpServletRequest;
import com.example.splitwise.service.JwtService;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {

    private final ExpenseService expenseService;
    private final JwtService jwtService;

    public ExpenseController(ExpenseService expenseService,JwtService jwtService) {
        this.expenseService = expenseService;
        this.jwtService=jwtService;
    }

    @PutMapping("/{id}")
    public ResponseEntity<Expense> updateExpense(
        @PathVariable("id") String id,
        @Valid @RequestBody Expense expense,
        HttpServletRequest request
    ){
        String authHeader=request.getHeader(HttpHeaders.AUTHORIZATION);
        if(authHeader==null||!authHeader.startsWith("Bearer ")){
            return ResponseEntity.status(401).build();
        }
        String token=authHeader.substring(7);
        String userId=jwtService.validateAndGetUserId(token);
        expense.setId(id);
        return ResponseEntity.ok(expenseService.updateExpense(expense,userId));
    }

    @PostMapping
    public ResponseEntity<Expense> createExpense(@Valid @RequestBody Expense expense) {
        return ResponseEntity.ok(expenseService.createExpense(expense));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteExpense(@PathVariable("id") String id) {
        expenseService.deleteExpense(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/group/{groupId}")
    public List<Expense> listGroupExpenses(@PathVariable("groupId") String groupId) {
        return expenseService.listGroupExpenses(groupId);
    }

    @GetMapping("/personal/{userId}")
    public List<Expense> listPersonalExpenses(@PathVariable("userId") String userId) {
        return expenseService.listPersonalExpenses(userId);
    }

    @GetMapping("/{id}/splits")
    public ResponseEntity<Map<String, BigDecimal>> getSplits(@PathVariable("id") String id) {
        return expenseService.getExpenseById(id)
                .map(expense -> ResponseEntity.ok(expenseService.calculateSplits(expense)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/settle")
    public ResponseEntity<Void> settleExpense(@PathVariable("id") String id, @RequestParam("userId") String userId) {
        expenseService.settleExpense(id, userId);
        return ResponseEntity.ok().build();
    }
}

