package com.example.splitwise.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

@Document(collection = "users")
public class User {

    @Id
    private String id;
    private String name;
    private String email;

    @JsonIgnore
    private String passwordHash;

    private Set<String> friendIds = new HashSet<>();

    private boolean emailNotificationsEnabled = true;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public Set<String> getFriendIds() {
        return friendIds;
    }

    public void setFriendIds(Set<String> friendIds) {
        this.friendIds = friendIds;
    }

    public boolean isEmailNotificationsEnabled() {
        return emailNotificationsEnabled;
    }

    public void setEmailNotificationsEnabled(boolean emailNotificationsEnabled) {
        this.emailNotificationsEnabled = emailNotificationsEnabled;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        return emailNotificationsEnabled == user.emailNotificationsEnabled &&
                Objects.equals(id, user.id) &&
                Objects.equals(name, user.name) &&
                Objects.equals(email, user.email) &&
                Objects.equals(passwordHash, user.passwordHash) &&
                Objects.equals(friendIds, user.friendIds);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, name, email, passwordHash, friendIds, emailNotificationsEnabled);
    }

    @Override
    public String toString() {
        return "User{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", email='" + email + '\'' +
                ", friendIds=" + friendIds +
                ", emailNotificationsEnabled=" + emailNotificationsEnabled +
                '}';
    }
}

