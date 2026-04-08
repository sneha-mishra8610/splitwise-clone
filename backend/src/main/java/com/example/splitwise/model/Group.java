package com.example.splitwise.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

@Document(collection = "groups")
public class Group {

    @Id
    private String id;
    private String name;
    private String ownerId;
    private Set<String> memberIds = new HashSet<>();
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
    public String getOwnerId() {
        return ownerId;
    }
    public void setOwnerId(String ownerId) {
        this.ownerId = ownerId;
    }
    public Set<String> getMemberIds() {
        return memberIds;
    }
    public void setMemberIds(Set<String> memberIds) {
        this.memberIds = memberIds;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Group group = (Group) o;
        return Objects.equals(id, group.id) &&
                Objects.equals(name, group.name) &&
                Objects.equals(ownerId, group.ownerId) &&
                Objects.equals(memberIds, group.memberIds);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, name, ownerId, memberIds);
    }

    @Override
    public String toString() {
        return "Group{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", ownerId='" + ownerId + '\'' +
                ", memberIds=" + memberIds +
                '}';
    }
}

