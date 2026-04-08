package com.example.splitwise.repository;

import com.example.splitwise.model.Group;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface GroupRepository extends MongoRepository<Group, String> {

    List<Group> findByMemberIdsContaining(String userId);
}

