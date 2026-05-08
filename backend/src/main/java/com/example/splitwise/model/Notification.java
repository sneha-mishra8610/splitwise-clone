package com.example.splitwise.model;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.format.annotation.DateTimeFormat;


@Document(collection="notifications")
public class Notification {
    public static enum Type{
        OWE,
        OWED
    }

    @Id
    private String id;
    private String userId;
    private String expenseId;
    private Type type;
    private String message;
    private boolean read;
    private Instant lastSent;
    private Instant createdAt;

    public Notification(String userId,String expenseId,Type type,String message,Instant now){
        this.userId=userId;
        this.expenseId=expenseId;
        this.type=type;
        this.message=message;
        this.lastSent=now;
        this.createdAt=now;
    }

    public Instant getLastSent() {
        return lastSent;
    }
    public void setLastSent(Instant lastSent) {
        this.lastSent = lastSent;
    }

    public String getId() {
        return id;
    }
    public void setId(String id) {
        this.id = id;
    }
    public String getUserId() {
        return userId;
    }
    public void setUserId(String userId) {
        this.userId = userId;
    }
    public String getExpenseId() {
        return expenseId;
    }
    public void setExpenseId(String expenseId) {
        this.expenseId = expenseId;
    }
    public Type getType() {
        return type;
    }
    public void setType(Type type) {
        this.type = type;
    }
    public String getMessage() {
        return message;
    }
    public void setMessage(String message) {
        this.message = message;
    }
    public boolean isRead() {
        return read;
    }
    public void setRead(boolean read) {
        this.read = read;
    }
    
    public Instant getCreatedAt() {
        return createdAt;
    }
    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
