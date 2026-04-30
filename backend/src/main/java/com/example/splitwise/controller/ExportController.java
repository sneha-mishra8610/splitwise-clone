package com.example.splitwise.controller;

import com.example.splitwise.model.Expense;
import com.example.splitwise.model.Group;
import com.example.splitwise.model.User;
import com.example.splitwise.repository.ExpenseRepository;
import com.example.splitwise.repository.GroupRepository;
import com.example.splitwise.repository.UserRepository;
import com.example.splitwise.service.ExportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/export")
@CrossOrigin(origins = "*")
public class ExportController {

    private final ExportService exportService;
    private final ExpenseRepository expenseRepository;
    private final GroupRepository groupRepository;
    private final UserRepository userRepository;

    public ExportController(ExportService exportService,
                            ExpenseRepository expenseRepository,
                            GroupRepository groupRepository,
                            UserRepository userRepository) {
        this.exportService = exportService;
        this.expenseRepository = expenseRepository;
        this.groupRepository = groupRepository;
        this.userRepository = userRepository;
    }

    private List<Expense> getExpensesForUser(String userId) {
        List<Expense> all = new ArrayList<>();

        all.addAll(expenseRepository
            .findByPayerIdAndType(userId, Expense.ExpenseType.PERSONAL));

        List<Group> groups = groupRepository.findByMemberIdsContaining(userId);
        for (Group g : groups) {
            all.addAll(expenseRepository.findByGroupId(g.getId()));
        }

        return all;
    }


    @GetMapping("/pdf/{userId}")
    public ResponseEntity<byte[]> exportPdf(@PathVariable String userId) throws Exception {
        User user = userRepository.findById(userId).orElseThrow();
        List<Expense> expenses = getExpensesForUser(userId);
        Map<String, String> userIdToName = userRepository.findAll().stream().collect(Collectors.toMap(User::getId, User::getName));
        Map<String, String> groupIdToName = groupRepository.findAll().stream().collect(Collectors.toMap(Group::getId, Group::getName));

        byte[] pdf = exportService.generatePdf(user, expenses, userIdToName, groupIdToName);

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=expenses_" + userId + ".pdf")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf);
    }


    @GetMapping("/excel/{userId}")
    public ResponseEntity<byte[]> exportExcel(@PathVariable String userId) throws Exception {
        User user = userRepository.findById(userId).orElseThrow();
        List<Expense> expenses = getExpensesForUser(userId);
        Map<String, String> userIdToName = userRepository.findAll().stream().collect(Collectors.toMap(User::getId, User::getName));
        Map<String, String> groupIdToName = groupRepository.findAll().stream().collect(Collectors.toMap(Group::getId, Group::getName));

        byte[] excel = exportService.generateExcel(user, expenses, userIdToName, groupIdToName);

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=expenses_" + userId + ".xlsx")
            .contentType(MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .body(excel);
    }


    @GetMapping("/word/{userId}")
    public ResponseEntity<byte[]> exportWord(@PathVariable String userId) throws Exception {
        User user = userRepository.findById(userId).orElseThrow();
        List<Expense> expenses = getExpensesForUser(userId);
        Map<String, String> userIdToName = userRepository.findAll().stream().collect(Collectors.toMap(User::getId, User::getName));
        Map<String, String> groupIdToName = groupRepository.findAll().stream().collect(Collectors.toMap(Group::getId, Group::getName));

        byte[] word = exportService.generateWord(user, expenses, userIdToName, groupIdToName);

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=expenses_" + userId + ".docx")
            .contentType(MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
            .body(word);
    }
}