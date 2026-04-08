package com.example.splitwise.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Objects;

@Document(collection = "activities")
public class Activity {

    @Id
    private String id;
    private String userId;
    private ActivityType type;
    private String description;
    private String relatedExpenseId;
    private String relatedGroupId;
    private Instant createdAt = Instant.now();
    public enum ActivityType {
        FRIEND_ADDED,
        GROUP_CREATED,
        EXPENSE_ADDED,
        EXPENSE_UPDATED,
        EXPENSE_DELETED,
        EXPENSE_SETTLED,
        EXPENSE_OWED
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

    public ActivityType getType() {
        return type;
    }

    public void setType(ActivityType type) {
        this.type = type;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getRelatedExpenseId() {
        return relatedExpenseId;
    }

    public void setRelatedExpenseId(String relatedExpenseId) {
        this.relatedExpenseId = relatedExpenseId;
    }

    public String getRelatedGroupId() {
        return relatedGroupId;
    }

    public void setRelatedGroupId(String relatedGroupId) {
        this.relatedGroupId = relatedGroupId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Activity activity = (Activity) o;
        return Objects.equals(id, activity.id) &&
                Objects.equals(userId, activity.userId) &&
                type == activity.type &&
                Objects.equals(description, activity.description) &&
                Objects.equals(relatedExpenseId, activity.relatedExpenseId) &&
                Objects.equals(relatedGroupId, activity.relatedGroupId) &&
                Objects.equals(createdAt, activity.createdAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, userId, type, description, relatedExpenseId, relatedGroupId, createdAt);
    }

    @Override
    public String toString() {
        return "Activity{" +
                "id='" + id + '\'' +
                ", userId='" + userId + '\'' +
                ", type=" + type +
                ", description='" + description + '\'' +
                ", relatedExpenseId='" + relatedExpenseId + '\'' +
                ", relatedGroupId='" + relatedGroupId + '\'' +
                ", createdAt=" + createdAt +
                '}';
    }
}

