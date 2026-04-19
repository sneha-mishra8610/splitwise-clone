package com.example.splitwise.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonAlias;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Document(collection = "expenses")
public class Expense {

    public enum ExpenseType {
        PERSONAL,
        GROUP
    }

    public enum ExpenseStatus{
        Settled,
        Unsettled
    }

    @Id
    private String id;
    private String description;
    private BigDecimal amount;
    private String currency = "INR";
    private String payerId;
    private Set<String> participantIds = new HashSet<>();
    private String groupId;
    private ExpenseType type;
    private Instant createdAt = Instant.now();
    private String createdBy;
    private String imageUrl;
    @JsonProperty("isRecurring")
    @JsonAlias({"recurring"})
    private boolean isRecurring;
    private String generatedFromRecurringId;
    private Instant recurrenceOccurrenceDate;
    private Instant recurrenceStartDate;
    private String recurrenceType;
    private Integer recurrenceInterval;
    private Instant recurrenceEndDate;
    private List<String> flaggedBy;
    private ExpenseStatus expenseStatus=ExpenseStatus.Unsettled;
    private Map<String,Boolean> settledByUser=new HashMap<>();

    @JsonProperty("customSplits")
    @Field("customSplits")
    private Map<String,BigDecimal> customSplits;

    public ExpenseStatus getExpenseStatus(){
        return expenseStatus;
    }

    public void setExpenseStatus(ExpenseStatus expenseStatus){
        this.expenseStatus=expenseStatus;
    }

    public Map<String,Boolean> getSettledByUser(){
        return settledByUser;
    }

    public void setSettledByUser(Map<String,Boolean> settledByUser){
        this.settledByUser=settledByUser;
    }

    public List<String> getFlaggedBy() {
        return flaggedBy;
    }

    public void setFlaggedBy(List<String> getflaggedBy) {
        this.flaggedBy=getflaggedBy;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getPayerId() {
        return payerId;
    }

    public void setPayerId(String payerId) {
        this.payerId = payerId;
    }

    public Set<String> getParticipantIds() {
        return participantIds;
    }

    public void setParticipantIds(Set<String> participantIds) {
        this.participantIds = participantIds;
    }

    public String getGroupId() {
        return groupId;
    }

    public void setGroupId(String groupId) {
        this.groupId = groupId;
    }

    public ExpenseType getType() {
        return type;
    }

    public void setType(ExpenseType type) {
        this.type = type;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public boolean isRecurring() {
        return isRecurring;
    }

    public void setRecurring(boolean recurring) {
        isRecurring = recurring;
    }

    public String getRecurrenceType() {
        return recurrenceType;
    }

    public Instant getRecurrenceStartDate() {
        return recurrenceStartDate;
    }

    public void setRecurrenceStartDate(Instant recurrenceStartDate) {
        this.recurrenceStartDate = recurrenceStartDate;
    }

    public String getGeneratedFromRecurringId() {
        return generatedFromRecurringId;
    }

    public void setGeneratedFromRecurringId(String generatedFromRecurringId) {
        this.generatedFromRecurringId = generatedFromRecurringId;
    }

    public Instant getRecurrenceOccurrenceDate() {
        return recurrenceOccurrenceDate;
    }

    public void setRecurrenceOccurrenceDate(Instant recurrenceOccurrenceDate) {
        this.recurrenceOccurrenceDate = recurrenceOccurrenceDate;
    }

    public void setRecurrenceType(String recurrenceType) {
        this.recurrenceType = recurrenceType;
    }

    public Integer getRecurrenceInterval() {
        return recurrenceInterval;
    }

    public void setRecurrenceInterval(Integer recurrenceInterval) {
        this.recurrenceInterval = recurrenceInterval;
    }

    public Instant getRecurrenceEndDate() {
        return recurrenceEndDate;
    }

    public void setRecurrenceEndDate(Instant recurrenceEndDate) {
        this.recurrenceEndDate = recurrenceEndDate;
    }

    public Map<String,BigDecimal> getCustomSplits(){
        return customSplits;
    }

    public void setCustomSplits(Map<String,BigDecimal> customSplits){
        this.customSplits=customSplits;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Expense expense = (Expense) o;
        return Objects.equals(id, expense.id) &&
                Objects.equals(description, expense.description) &&
                Objects.equals(amount, expense.amount) &&
                Objects.equals(currency, expense.currency) &&
                Objects.equals(payerId, expense.payerId) &&
                Objects.equals(participantIds, expense.participantIds) &&
                Objects.equals(groupId, expense.groupId) &&
                type == expense.type &&
                Objects.equals(createdAt, expense.createdAt) &&
                Objects.equals(createdBy, expense.createdBy) &&
                Objects.equals(imageUrl, expense.imageUrl) &&
                isRecurring == expense.isRecurring &&
                Objects.equals(generatedFromRecurringId, expense.generatedFromRecurringId) &&
                Objects.equals(recurrenceOccurrenceDate, expense.recurrenceOccurrenceDate) &&
                Objects.equals(recurrenceStartDate, expense.recurrenceStartDate) &&
                Objects.equals(recurrenceType, expense.recurrenceType) &&
                Objects.equals(recurrenceInterval, expense.recurrenceInterval) &&
                Objects.equals(recurrenceEndDate, expense.recurrenceEndDate);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, description, amount, currency, payerId, participantIds, groupId, type, createdAt, createdBy, imageUrl, isRecurring, generatedFromRecurringId, recurrenceOccurrenceDate, recurrenceStartDate, recurrenceType, recurrenceInterval, recurrenceEndDate);
    }

    @Override
    public String toString() {
        return "Expense{" +
                "id='" + id + '\'' +
                ", description='" + description + '\'' +
                ", amount=" + amount +
                ", currency='" + currency + '\'' +
                ", payerId='" + payerId + '\'' +
                ", participantIds=" + participantIds +
                ", groupId='" + groupId + '\'' +
                ", type=" + type +
                ", createdAt=" + createdAt +
                ", createdBy='" + createdBy + '\'' +
                ", imageUrl='" + imageUrl + '\'' +
                ", isRecurring=" + isRecurring +
                ", generatedFromRecurringId='" + generatedFromRecurringId + '\'' +
                ", recurrenceOccurrenceDate=" + recurrenceOccurrenceDate +
                ", recurrenceStartDate=" + recurrenceStartDate +
                ", recurrenceType='" + recurrenceType + '\'' +
                ", recurrenceInterval=" + recurrenceInterval +
                ", recurrenceEndDate=" + recurrenceEndDate +
                '}';
    }
}

