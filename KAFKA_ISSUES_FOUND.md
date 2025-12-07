# 🔴 CÁC VẤN ĐỀ TÌM THẤY - KAFKA & DATABASE

## 1. 🔴 CRITICAL: Race Condition trong Commit Offset

**Vấn đề:**

```go
// Consumer batch processing but NO guarantee message in DB before commit
sess.MarkMessage(msg, "")  // Commit offset BEFORE insert complete
c.batchProcessor.Add(msg, sess) // Add to batch AFTER commit
```

**Hậu quả:**

- Message commit nhưng insert vào DB still ongoing → Kafka thinks already processed
- Nếu insert fail → message LOST, không thể reprocess
- Dữ liệu mất vĩnh viễn

**Giải pháp:** ✅ Commit ONLY AFTER insert success

---

## 2. 🔴 CRITICAL: Insert Chậm - Không có Batch Index

**Vấn đề:**

```go
func (s *MongoChatStore) SaveMessage(ctx context.Context, msg *models.Message) error {
    _, err := s.db.Collection("messages").InsertOne(ctx, msg)
    return err
}
```

- Insert từng message 1 cái → N requests = N latency
- Batch processor có 100 messages nhưng insert 1-1 → vô ích
- Database quá tải từ lượng connection lớn

**Hậu quả:**

- Timeout, connection pool exhausted
- Chậm 100x so với batch insert

**Giải pháp:** ✅ Dùng InsertMany (batch insert)

---

## 3. 🔴 CRITICAL: Elasticsearch Index Blocking Main Thread

**Vấn đề:**

```go
if biz.es != nil {
    // This blocks if ES is slow/down
    if err := biz.es.IndexMessage(ctx, msg, ...) {
        log.Printf("[ES] Error: %v", err) // Just log, but BLOCKS
    }
}
```

**Hậu quả:**

- ES slow/down → insert message stalls
- Message processing blocks entire batch
- Consumer lag → all messages queue up

**Giải pháp:** ✅ Index to ES async (fire-and-forget with retry queue)

---

## 4. 🔴 CRITICAL: No Connection Pool Reuse

**Vấn đề:**

```go
// In processBatch, creating NEW storage instances every batch
chatStore := storage.NewMongoChatStore(bp.db)
esChatStore := storage.NewESChatStore(bp.es)
// Creates 100 new instances per 100-msg batch
```

**Hậu quả:**

- Lots of allocation/deallocation overhead
- Connection pool not utilized efficiently

**Giải pháp:** ✅ Create storage once, reuse

---

## 5. 🟠 HIGH: Incomplete Error Handling in Retry

**Vấn đề:**

```go
for retry := 0; retry < 3; retry++ {
    _, err = chatBiz.HandleMessage(...)
    if err == nil {
        bp.commitQueue <- &commitTask{...}
        break
    }
    // Retry sleep + continue
}

if err != nil {
    log.Printf(" CRITICAL: Failed after 3 retries: %v", msg.ID.Hex(), err)
    // NO ACTION - message is LOST!
}
```

**Hậu quả:**

- Failed messages not committed to Dead Letter Queue
- No way to track/recover lost messages

**Giải pháp:** ✅ Send to DLQ topic + alert

---

## 6. 🟠 HIGH: Validation Error Not Retried

**Vấn đề:**

```go
senderExists, err := biz.store.CheckUserExists(ctx, sender)
if !senderExists {
    return nil, errors.New("sender not found")  // Immediate fail, NO RETRY
}
```

**Hậu quả:**

- If sender added milliseconds later → message lost
- No exponential backoff for transient failures

**Giải pháp:** ✅ Retry validation with backoff

---

## 7. 🟠 HIGH: Context Timeout Too Short

**Vấn đề:**

```go
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()

// But batch processing + DB + ES can exceed 30s under load
```

**Hậu quả:**

- Context deadline exceeded on slow batches
- Partial inserts (some messages in batch processed, some not)

**Giải pháp:** ✅ Per-message timeout vs batch timeout

---

## 8. 🟡 MEDIUM: No Batch Deduplication

**Vấn đề:**

```go
// Same message can appear multiple times in Kafka
// No check if already in DB before insert
_, err := s.db.Collection("messages").InsertOne(ctx, msg)
// Unique index on msg.ID? Maybe, but not checked
```

**Hậu quả:**

- Duplicate messages in DB if Kafka reprocess
- Database unique constraint error → whole batch fails

**Giải pháp:** ✅ Upsert with \_id, or check exists first

---

## 9. 🟡 MEDIUM: Producer Async Fire-and-Forget

**Vấn đề trong producer.go:**

```go
go c.sendToKafkaWithRetry("chat-topic", msgCopy.SenderID.Hex(), msgCopy)
// No wait for result - WebSocket response sent before Kafka ack
```

**Hậu quả:**

- Client thinks message sent, but Kafka fails
- No error feedback to user

**Giải pháp:** ✅ Wait for producer ack (semaphore)

---

## 10. 🟡 MEDIUM: No Graceful Shutdown

**Vấn đề:**

```go
// CloseProducer exists but not called on app shutdown
// Consumer Shutdown() exists but not guaranteed called
```

**Hậu quả:**

- In-flight messages lost on restart
- Partial commits cause replay

**Giải pháp:** ✅ Defer cleanup in main.go

---

## Summary

| Issue                | Severity    | Impact               | Status    |
| -------------------- | ----------- | -------------------- | --------- |
| Commit before insert | 🔴 CRITICAL | Data loss            | Not Fixed |
| Insert 1-1 vs batch  | 🔴 CRITICAL | Slow (100x)          | Not Fixed |
| ES blocking          | 🔴 CRITICAL | Timeout cascade      | Not Fixed |
| No DLQ               | 🟠 HIGH     | Silent failures      | Not Fixed |
| Short timeout        | 🟠 HIGH     | Partial batches      | Not Fixed |
| No dedup             | 🟡 MEDIUM   | Duplicates           | Not Fixed |
| Async fire-forget    | 🟡 MEDIUM   | Client error blind   | Not Fixed |
| No shutdown hook     | 🟡 MEDIUM   | Data loss on restart | Not Fixed |
