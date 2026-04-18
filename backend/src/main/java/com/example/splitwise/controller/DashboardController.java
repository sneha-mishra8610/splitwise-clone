package com.example.splitwise.controller;

import com.example.splitwise.dto.DashboardSummaryDTO;
import com.example.splitwise.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    private final DashboardService dashboardService;

    DashboardController(DashboardService dashboardService){
        this.dashboardService=dashboardService;
    }
    
    @GetMapping("/summary/{userId}")
    public DashboardService.DashboardSummary getDashboardSummary(@PathVariable String userId) {
        return dashboardService.getDashboardSummary(userId);
    }
    
}
