// Package loadtest cung cấp handler để thực hiện load test hệ thống realtime chat.
// Cơ chế: spawn N goroutines, mỗi goroutine đóng vai một "virtual user" kết nối WebSocket
// và gửi tin nhắn mô phỏng. Metrics được thu thập và streaming qua SSE về frontend.
package loadtest

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"sync/atomic"
	"time"

	"my-app/modules/user/models"
	"my-app/modules/user/storage"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"

	"github.com/shirou/gopsutil/v3/cpu"
)

// ======================== Types ========================

// LoadTestConfig là cấu hình đầu vào từ client
type LoadTestConfig struct {
	TargetUsers     int    `json:"target_users"`      // Số lượng concurrent users
	RampUpSeconds   int    `json:"ramp_up_seconds"`   // Thời gian ramp-up (giây)
	TestDuration    int    `json:"test_duration"`     // Thời gian chạy test (giây)
	RampDownSeconds int    `json:"ramp_down_seconds"` // Thời gian ramp-down (giây)
	MessageInterval int    `json:"message_interval"`  // Khoảng cách giữa messages (ms)
	ServerURL       string `json:"server_url"`        // WebSocket server URL
}

// MetricsSnapshot là bản chụp metrics tại một thời điểm
type MetricsSnapshot struct {
	Timestamp             string   `json:"timestamp"`
	ActiveConns           int64    `json:"active_connections"`
	TotalMessagesSent     int64    `json:"total_messages_sent"`
	TotalMessagesReceived int64    `json:"total_messages_received"`
	SuccessMessages       int64    `json:"success_messages"`
	ErrorMessages         int64    `json:"error_messages"`
	MessagesPerSec        float64  `json:"messages_per_sec"`
	ErrorRate             float64  `json:"error_rate_percent"`
	AvgLatencyMs          float64  `json:"avg_latency_ms"`
	CPUUsage              float64  `json:"cpu_usage_percent"`
	MemoryMB              float64  `json:"memory_mb"`
	Status                string   `json:"status"` // "running" | "completed" | "stopped"
	ElapsedSeconds        int      `json:"elapsed_seconds"`
	ReceivedUserIDs       []string `json:"received_user_ids"`
	TargetUsers           int64    `json:"target_users"`
}

// LoadTestState lưu trạng thái của một phiên test đang chạy
type LoadTestState struct {
	mu            sync.RWMutex
	activeConns   int64
	totalSent     int64
	totalReceived int64
	successCount  int64
	errorCount    int64
	latencySum    int64
	latencyCount  int64
	startTime     time.Time
	lastMsgTime   time.Time
	lastMsgCount  int64
	status        string
	ctx           context.Context
	cancelFunc    context.CancelFunc
	passiveUsers  []models.User
	receivedMap   sync.Map // Map[uid]bool
	targetUsers   int64
	wg            sync.WaitGroup
}

// LoadTestManager quản lý phiên test hiện tại (singleton)
type LoadTestManager struct {
	mu       sync.Mutex
	current  *LoadTestState
	db       *mongo.Database
	cpuUsage float64
}

var manager = &LoadTestManager{}

func SetDB(db *mongo.Database) {
	manager.db = db
	// Start periodic CPU monitor
	go func() {
		for {
			percents, err := cpu.Percent(1*time.Second, false)
			if err == nil && len(percents) > 0 {
				manager.mu.Lock()
				manager.cpuUsage = percents[0]
				manager.mu.Unlock()
			}
		}
	}()
}

// ======================== Start Handler ========================

// StartLoadTest bắt đầu một phiên load test mới
// POST /v1/load-test/start
func StartLoadTest(c *gin.Context) {
	var config LoadTestConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid config: " + err.Error()})
		return
	}

	// Validate
	if config.TargetUsers <= 0 || config.TargetUsers > 10000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "target_users must be between 1 and 10000"})
		return
	}
	if config.TestDuration <= 0 {
		config.TestDuration = 60 // default 60s
	}
	if config.RampUpSeconds <= 0 {
		config.RampUpSeconds = 10 // default 10s ramp-up
	}
	if config.MessageInterval <= 0 {
		config.MessageInterval = 500 // default 500ms between messages
	}
	if config.ServerURL == "" {
		config.ServerURL = "ws://localhost:8088/v1/chat/ws"
	}

	// Dừng test đang chạy hoặc tiếp tục
	manager.mu.Lock()
	var state *LoadTestState
	isNewTest := false
	if manager.current != nil && manager.current.status == "running" {
		state = manager.current
		atomic.AddInt64(&state.targetUsers, int64(config.TargetUsers))
	} else {
		isNewTest = true
		testCtx, cancel := context.WithCancel(context.Background())
		state = &LoadTestState{
			status:      "running",
			startTime:   time.Now(),
			lastMsgTime: time.Now(),
			ctx:         testCtx,
			cancelFunc:  cancel,
			targetUsers: int64(config.TargetUsers),
		}
		manager.current = state
	}
	manager.mu.Unlock()

	// Mỗi batch có timeout riêng
	batchCtx, batchCancel := context.WithTimeout(state.ctx, time.Duration(config.TestDuration+config.RampUpSeconds+5)*time.Second)

	// Chạy test trong background goroutine
	state.wg.Add(2)
	go func() {
		defer state.wg.Done()
		runLoadTest(batchCtx, batchCancel, config, state)
	}()
	go func() {
		defer state.wg.Done()
		startMetricLogging(batchCtx, config)
	}()

	// Monitor completion only for the first batch or if we want global monitoring
	if isNewTest {
		go func() {
			state.wg.Wait()
			state.mu.Lock()
			if state.status == "running" {
				state.status = "completed"
			}
			state.mu.Unlock()
		}()
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Load test started",
		"target_users": config.TargetUsers,
		"duration_s":   config.TestDuration,
		"ramp_up_s":    config.RampUpSeconds,
	})
}

// SeedStressUsers tạo 1000 user phục vụ stress test
// POST /v1/load-test/seed
func SeedStressUsers(c *gin.Context) {
	if manager.db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database not initialized"})
		return
	}

	ctx := c.Request.Context()
	store := storage.NewMongoStore(manager.db)
	const count = 20000
	const defaultPassword = "123456"

	hash, _ := bcrypt.GenerateFromPassword([]byte(defaultPassword), bcrypt.DefaultCost)
	passwordHash := string(hash)

	createdCount := 0
	for i := 1; i <= count; i++ {
		username := fmt.Sprintf("stress_user_%d", i)
		if _, err := store.FindByUsername(ctx, username); err == nil {
			continue
		}

		user := &models.User{
			Username:               username,
			Password:               passwordHash,
			Email:                  fmt.Sprintf("%s@example.com", username),
			DisplayName:            fmt.Sprintf("Stress User %d", i),
			Avatar:                 fmt.Sprintf("https://api.dicebear.com/7.x/avataaars/svg?seed=%s", username),
			Phone:                  fmt.Sprintf("098%07d", i),
			Gender:                 "other",
			Birthday:               time.Now(),
			IsCompletedFriendSetup: true,
			IsProfileComplete:      true,
		}
		user.ID = primitive.NewObjectID()
		user.CreatedAt = time.Now()
		user.UpdatedAt = time.Now()

		if err := store.Create(ctx, user); err == nil {
			createdCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Seeding completed. Created %d new users, total %d users ready.", createdCount, count),
	})
}

// StartStressTest bắt đầu test với user thật từ DB
// POST /v1/load-test/stress-start
func StartStressTest(c *gin.Context) {
	var config LoadTestConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid config: " + err.Error()})
		return
	}

	if manager.db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database not initialized"})
		return
	}

	// Lấy danh sách stress users từ DB
	ctx := context.Background()
	var seededUsers []models.User
	cursor, err := manager.db.Collection("users").Find(ctx, bson.M{"username": bson.M{"$regex": "^stress_user_"}})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch stress users: " + err.Error()})
		return
	}
	if err := cursor.All(ctx, &seededUsers); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to decode stress users: " + err.Error()})
		return
	}

	if len(seededUsers) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no stress users found. Please seed first."})
		return
	}

	// Xây dựng danh sách userID theo target (reuse nếu target > số đã seed)
	const maxUsers = 100000
	if config.TargetUsers > maxUsers {
		config.TargetUsers = maxUsers
	}
	poolSize := len(seededUsers)
	userIDs := make([]string, poolSize)
	for i, u := range seededUsers {
		userIDs[i] = u.ID.Hex()
	}

	// Tạo danh sách active users - nếu target > pool, reuse theo vòng
	activeUserIDs := make([]string, config.TargetUsers)
	for i := 0; i < config.TargetUsers; i++ {
		activeUserIDs[i] = userIDs[i%poolSize]
	}

	// Dừng test đang chạy hoặc tiếp tục
	manager.mu.Lock()
	var state *LoadTestState
	isAppending := false
	if manager.current != nil && manager.current.status == "running" {
		state = manager.current
		isAppending = true
		// Cộng dồn target_users
		atomic.AddInt64(&state.targetUsers, int64(config.TargetUsers))
	} else {
		testCtx, cancel := context.WithCancel(context.Background())
		state = &LoadTestState{
			status:      "running",
			startTime:   time.Now(),
			lastMsgTime: time.Now(),
			ctx:         testCtx,
			cancelFunc:  cancel,
			targetUsers: int64(config.TargetUsers),
		}
		manager.current = state
	}
	manager.mu.Unlock()

	// Mỗi batch có timeout riêng nhưng thuộc về master context của state
	batchCtx, batchCancel := context.WithTimeout(state.ctx, time.Duration(config.TestDuration+config.RampUpSeconds+5)*time.Second)

	// Chạy test với userIDs thật
	state.wg.Add(2)
	go func() {
		defer state.wg.Done()
		runLoadTestWithUsers(batchCtx, batchCancel, config, state, activeUserIDs, userIDs)
	}()
	go func() {
		defer state.wg.Done()
		startMetricLogging(batchCtx, config)
	}()

	if !isAppending {
		// Monitor completion only for the first batch or if we want global monitoring
		go func() {
			state.wg.Wait()
			state.mu.Lock()
			if state.status == "running" {
				state.status = "completed"
			}
			state.mu.Unlock()
		}()
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      fmt.Sprintf("Stress test started with real seeded users (pool: %d, target: %d)", poolSize, config.TargetUsers),
		"target_users": config.TargetUsers,
		"duration_s":   config.TestDuration,
	})
}

// UserBrief trả về thông tin tối giản của user
type UserBrief struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	Status      string `json:"status"` // "online", "received", "offline"
}

// GetLoadTestUsers lấy n users ngẫu nhiên để chuẩn bị connect
func GetLoadTestUsers(c *gin.Context) {
	var req struct {
		TargetUsers int `json:"target_users"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if manager.db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database not initialized"})
		return
	}

	ctx := context.Background()
	pipeline := mongo.Pipeline{
		{{Key: "$sample", Value: bson.D{{Key: "size", Value: req.TargetUsers}}}},
	}
	cursor, err := manager.db.Collection("users").Aggregate(ctx, pipeline)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query random users: " + err.Error()})
		return
	}
	var users []models.User
	if err := cursor.All(ctx, &users); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to decode users: " + err.Error()})
		return
	}

	userBriefs := make([]UserBrief, len(users))
	for i, u := range users {
		userBriefs[i] = UserBrief{
			ID:          u.ID.Hex(),
			Username:    u.Username,
			DisplayName: u.DisplayName,
			Status:      "offline",
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"users":        userBriefs,
		"target_users": len(users),
	})
}

// StartMassConnection kết nối một lượng user ngẫu nhiên để nhận thông báo
func StartMassConnection(c *gin.Context) {
	var req struct {
		TargetUsers   int      `json:"target_users"`
		UserIDs       []string `json:"user_ids"`
		RampUpSeconds int      `json:"ramp_up_seconds"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if manager.db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database not initialized"})
		return
	}

	var users []models.User
	ctx := context.Background()

	if len(req.UserIDs) > 0 {
		// Tìm users theo list IDs
		objIDs := make([]primitive.ObjectID, 0, len(req.UserIDs))
		for _, id := range req.UserIDs {
			if oid, err := primitive.ObjectIDFromHex(id); err == nil {
				objIDs = append(objIDs, oid)
			}
		}
		cursor, err := manager.db.Collection("users").Find(ctx, bson.M{"_id": bson.M{"$in": objIDs}})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to find users: " + err.Error()})
			return
		}
		if err := cursor.All(ctx, &users); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to decode users: " + err.Error()})
			return
		}
	} else if req.TargetUsers > 0 {
		// Lấy n users ngẫu nhiên từ DB
		pipeline := mongo.Pipeline{
			{{Key: "$sample", Value: bson.D{{Key: "size", Value: req.TargetUsers}}}},
		}
		cursor, err := manager.db.Collection("users").Aggregate(ctx, pipeline)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query random users: " + err.Error()})
			return
		}
		if err := cursor.All(ctx, &users); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to decode users: " + err.Error()})
			return
		}
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_ids or target_users required"})
		return
	}

	// Cấu hình WebSocket URL (mặc định)
	serverURL := "ws://localhost:8088/v1/chat/ws"

	// Khởi tạo state nếu chưa có để track connections
	manager.mu.Lock()
	var state *LoadTestState
	if manager.current != nil && manager.current.status == "running" {
		state = manager.current
		state.passiveUsers = append(state.passiveUsers, users...)
		atomic.AddInt64(&state.targetUsers, int64(len(users)))
	} else {
		testCtx, cancel := context.WithCancel(context.Background())
		state = &LoadTestState{
			status:       "running",
			startTime:    time.Now(),
			ctx:          testCtx,
			cancelFunc:   cancel,
			passiveUsers: users,
			targetUsers:  int64(len(users)),
		}
		manager.current = state
	}
	manager.mu.Unlock()

	testCtx := state.ctx

	// Tính khoảng cách spawn giữa các user để ramp-up đều
	spawnInterval := time.Duration(0)
	if len(users) > 1 && req.RampUpSeconds > 0 {
		spawnInterval = time.Duration(float64(req.RampUpSeconds) * float64(time.Second) / float64(len(users)))
	}

	// Kết nối từng user
	for i, u := range users {
		select {
		case <-testCtx.Done():
			return
		default:
		}

		go runPassiveUser(testCtx, serverURL, u.ID.Hex(), state)

		if spawnInterval > 0 && i < len(users)-1 {
			select {
			case <-testCtx.Done():
				return
			case <-time.After(spawnInterval):
			}
		}
	}

	// Trả về danh sách user cho FE
	userBriefs := make([]UserBrief, len(users))
	for i, u := range users {
		userBriefs[i] = UserBrief{
			ID:          u.ID.Hex(),
			Username:    u.Username,
			DisplayName: u.DisplayName,
			Status:      "connecting",
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      fmt.Sprintf("Started mass connection for %d users", len(users)),
		"users":        userBriefs,
		"target_users": len(users),
	})
}

// BroadcastMessage gửi tin nhắn từ 1 user cho tất cả passive users
func BroadcastMessage(c *gin.Context) {
	var req struct {
		Message    string `json:"message"`
		BatchSize  int    `json:"batch_size"`
		IntervalMs int    `json:"interval_ms"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid message"})
		return
	}

	manager.mu.Lock()
	state := manager.current
	manager.mu.Unlock()

	if state == nil || len(state.passiveUsers) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no active mass connections"})
		return
	}

	if req.BatchSize <= 0 {
		req.BatchSize = 1 //Default to 1 for gradual
	}
	if req.IntervalMs < 0 {
		req.IntervalMs = 100 // Default 100ms
	}

	// Reset received map and counter
	state.receivedMap = sync.Map{}
	atomic.StoreInt64(&state.totalReceived, 0)

	// Chọn 1 sender ngẫu nhiên
	sender := state.passiveUsers[rand.Intn(len(state.passiveUsers))]
	receiverIDs := make([]string, 0, len(state.passiveUsers))
	for _, u := range state.passiveUsers {
		receiverIDs = append(receiverIDs, u.ID.Hex())
	}

	// Gửi broadcast theo batch trong background để không block HTTP response
	go func() {
		serverURL := "ws://localhost:8088/v1/chat/ws"
		conn, err := connectWS(serverURL, sender.ID.Hex())
		if err != nil {
			log.Printf("[Broadcast] Failed to connect sender: %v", err)
			return
		}
		defer conn.Close()

		for i := 0; i < len(receiverIDs); i += req.BatchSize {
			end := i + req.BatchSize
			if end > len(receiverIDs) {
				end = len(receiverIDs)
			}
			batch := receiverIDs[i:end]

			msgPayload := map[string]interface{}{
				"type": "notification",
				"notification": map[string]interface{}{
					"sender_id":         sender.ID.Hex(),
					"receiver_id":       batch,
					"group_id":          []string{},
					"content":           req.Message,
					"type":              "text",
					"sender_name":       sender.DisplayName,
					"notification_type": "system",
				},
			}
			data, _ := json.Marshal(msgPayload)
			if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
				log.Printf("[Broadcast] Failed to send batch %d-%d: %v", i, end, err)
				return
			}

			if end < len(receiverIDs) && req.IntervalMs > 0 {
				time.Sleep(time.Duration(req.IntervalMs) * time.Millisecond)
			}
		}
		log.Printf("[Broadcast] Finished sending to %d users in batches of %d", len(receiverIDs), req.BatchSize)
	}()

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Broadcast started from %s to %d users (Batch: %d, Interval: %dms)", sender.DisplayName, len(receiverIDs), req.BatchSize, req.IntervalMs),
		"sender":  sender.DisplayName,
	})
}

// runPassiveUser giữ kết nối WebSocket và chỉ nhận message
func runPassiveUser(ctx context.Context, serverURL, userID string, state *LoadTestState) {
	conn, err := connectWS(serverURL, userID)
	if err != nil {
		atomic.AddInt64(&state.errorCount, 1)
		return
	}
	defer conn.Close()

	atomic.AddInt64(&state.activeConns, 1)
	defer atomic.AddInt64(&state.activeConns, -1)

	// Monitor context cancellation to close connection immediately
	go func() {
		<-ctx.Done()
		conn.Close()
	}()

	// Keep alive loop - chỉ nhận message
	for {
		select {
		case <-ctx.Done():
			return
		default:
			_, data, err := conn.ReadMessage()
			if err != nil {
				atomic.AddInt64(&state.errorCount, 1)
				return
			}

			// Kiểm tra nếu là message broadcast/notification
			var msg struct {
				Type string `json:"type"`
			}
			if err := json.Unmarshal(data, &msg); err == nil {
				if msg.Type == "notification" || msg.Type == "chat" || msg.Type == "conversations" {
					if _, loaded := state.receivedMap.LoadOrStore(userID, true); !loaded {
						atomic.AddInt64(&state.totalReceived, 1)
					}
				}
			}
		}
	}
}

// StopLoadTest dừng phiên test đang chạy
// POST /v1/load-test/stop
func StopLoadTest(c *gin.Context) {
	manager.mu.Lock()
	defer manager.mu.Unlock()

	if manager.current == nil || manager.current.status != "running" {
		c.JSON(http.StatusOK, gin.H{"message": "No test is currently running"})
		return
	}

	if manager.current.cancelFunc != nil {
		manager.current.cancelFunc()
	}
	manager.current.status = "stopped"
	c.JSON(http.StatusOK, gin.H{"message": "Load test stopped"})
}

// GetStats stream metrics real-time qua SSE
// GET /v1/load-test/stats
func GetStats(c *gin.Context) {
	// SSE headers
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Access-Control-Allow-Origin", "*")
	c.Header("X-Accel-Buffering", "no")

	clientGone := c.Request.Context().Done()
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	// Flush helper
	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "streaming not supported"})
		return
	}

	for {
		select {
		case <-clientGone:
			log.Println("[SSE] Client disconnected from /load-test/stats")
			return
		case <-ticker.C:
			snap := collectSnapshot()
			data, err := json.Marshal(snap)
			if err != nil {
				continue
			}
			fmt.Fprintf(c.Writer, "data: %s\n\n", data)
			flusher.Flush()
		}
	}
}

// ======================== Core Load Test Logic ========================

// runLoadTest là hàm chính điều phối toàn bộ phiên test
func runLoadTest(ctx context.Context, cancel context.CancelFunc, config LoadTestConfig, state *LoadTestState) {
	defer cancel()

	log.Printf("[LoadTest] Starting: %d users, ramp-up %ds, duration %ds", config.TargetUsers, config.RampUpSeconds, config.TestDuration)

	var wg sync.WaitGroup

	// Tính khoảng cách spawn giữa các user để ramp-up đều
	spawnInterval := time.Duration(0)
	if config.TargetUsers > 1 && config.RampUpSeconds > 0 {
		spawnInterval = time.Duration(float64(config.RampUpSeconds) * float64(time.Second) / float64(config.TargetUsers))
	}

	// Spawn virtual users - sử dụng channel cancel riêng cho từng user để ramp-down
	userCancels := make([]context.CancelFunc, 0, config.TargetUsers)

	for i := 0; i < config.TargetUsers; i++ {
		select {
		case <-ctx.Done():
			log.Printf("[LoadTest] Cancelled during ramp-up at user %d", i)
			for _, c := range userCancels {
				c()
			}
			wg.Wait()
			return
		default:
		}

		userCtx, userCancel := context.WithCancel(ctx)
		userCancels = append(userCancels, userCancel)

		wg.Add(1)
		userID := primitive.NewObjectID().Hex()
		go func(uCtx context.Context, uid string) {
			defer wg.Done()
			runVirtualUser(uCtx, config, state, uid)
		}(userCtx, userID)

		if spawnInterval > 0 && i < config.TargetUsers-1 {
			select {
			case <-ctx.Done():
				for _, c := range userCancels {
					c()
				}
				wg.Wait()
				return
			case <-time.After(spawnInterval):
			}
		}
	}

	log.Printf("[LoadTest] All %d virtual users spawned. Waiting for test duration...", config.TargetUsers)

	// Chờ hết test duration từ lúc spawn xong
	testEnd := time.After(time.Duration(config.TestDuration) * time.Second)
	select {
	case <-ctx.Done():
		log.Println("[LoadTest] Context cancelled, stopping test early.")
	case <-testEnd:
		log.Printf("[LoadTest] Main duration (%ds) completed. Starting Ramp-down...", config.TestDuration)

		// Ramp-down logic
		if config.RampDownSeconds > 0 && len(userCancels) > 1 {
			downInterval := time.Duration(float64(config.RampDownSeconds) * float64(time.Second) / float64(len(userCancels)))
			for _, stopFunc := range userCancels {
				stopFunc()
				time.Sleep(downInterval)
			}
		}
	}

	cancel() // Cuối cùng ngắt toàn bộ context (bao gồm cả logger nếu logger dùng ctx này)
	wg.Wait()
	log.Printf("[LoadTest] Test completed. Total sent: %d, Errors: %d", atomic.LoadInt64(&state.totalSent), atomic.LoadInt64(&state.errorCount))
}

// runLoadTestWithUsers tương tự runLoadTest nhưng sử dụng danh sách userID có sẵn
func runLoadTestWithUsers(ctx context.Context, cancel context.CancelFunc, config LoadTestConfig, state *LoadTestState, activeUserIDs []string, allUserIDs []string) {
	defer cancel()

	var wg sync.WaitGroup
	spawnInterval := time.Duration(0)
	if len(activeUserIDs) > 1 && config.RampUpSeconds > 0 {
		spawnInterval = time.Duration(float64(config.RampUpSeconds) * float64(time.Second) / float64(len(activeUserIDs)))
	}

	// Spawn virtual users - sử dụng channel cancel riêng cho từng user để ramp-down
	userCancels := make([]context.CancelFunc, 0, len(activeUserIDs))

	for i, userID := range activeUserIDs {
		select {
		case <-ctx.Done():
			for _, c := range userCancels {
				c()
			}
			wg.Wait()
			return
		default:
		}

		userCtx, userCancel := context.WithCancel(ctx)
		userCancels = append(userCancels, userCancel)

		wg.Add(1)
		go func(uCtx context.Context, uid string) {
			defer wg.Done()
			runVirtualUserWithPool(uCtx, config, state, uid, allUserIDs)
		}(userCtx, userID)

		if spawnInterval > 0 && i < len(activeUserIDs)-1 {
			select {
			case <-ctx.Done():
				wg.Wait()
				return
			case <-time.After(spawnInterval):
			}
		}
	}

	testEnd := time.After(time.Duration(config.TestDuration) * time.Second)
	select {
	case <-ctx.Done():
		log.Println("[LoadTest] Context cancelled, stopping test early.")
	case <-testEnd:
		log.Printf("[LoadTest] Main duration (%ds) completed. Starting Ramp-down...", config.TestDuration)

		// Ramp-down logic
		if config.RampDownSeconds > 0 && len(userCancels) > 1 {
			downInterval := time.Duration(float64(config.RampDownSeconds) * float64(time.Second) / float64(len(userCancels)))
			for _, stopFunc := range userCancels {
				stopFunc()
				time.Sleep(downInterval)
			}
		}
	}

	cancel()

	wg.Wait()
}

// runVirtualUserWithPool tương tự runVirtualUser nhưng target message đến người khác trong pool
func runVirtualUserWithPool(ctx context.Context, config LoadTestConfig, state *LoadTestState, userID string, pool []string) {
	conn, err := connectWS(config.ServerURL, userID)
	if err != nil {
		atomic.AddInt64(&state.errorCount, 1)
		atomic.AddInt64(&state.totalSent, 1)
		return
	}
	defer conn.Close()

	atomic.AddInt64(&state.activeConns, 1)
	defer atomic.AddInt64(&state.activeConns, -1)

	interval := time.Duration(config.MessageInterval) * time.Millisecond
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	go func() {
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				return
			}
			atomic.AddInt64(&state.totalReceived, 1)
		}
	}()

	consecutiveErrors := 0
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			// Chọn một receiver ngẫu nhiên từ pool (khác chính mình nếu có thể)
			targetID := pool[rand.Intn(len(pool))]
			if targetID == userID && len(pool) > 1 {
				targetID = pool[(rand.Intn(len(pool))+1)%len(pool)]
			}

			startTs := time.Now()
			err := sendStressMessage(conn, userID, targetID)
			latencyMs := time.Since(startTs).Milliseconds()

			atomic.AddInt64(&state.totalSent, 1)
			atomic.AddInt64(&state.latencySum, latencyMs)
			atomic.AddInt64(&state.latencyCount, 1)

			if err != nil {
				atomic.AddInt64(&state.errorCount, 1)
				consecutiveErrors++
				if consecutiveErrors >= 3 {
					return
				}
			} else {
				consecutiveErrors = 0
				atomic.AddInt64(&state.successCount, 1)
			}

			state.mu.Lock()
			state.lastMsgCount = atomic.LoadInt64(&state.successCount)
			state.lastMsgTime = time.Now()
			state.mu.Unlock()
		}
	}
}

func sendStressMessage(conn *websocket.Conn, senderID, receiverID string) error {
	msg := map[string]interface{}{
		"type": "chat",
		"message": map[string]interface{}{
			"sender_id":   senderID,
			"receiver_id": receiverID,
			"content":     fmt.Sprintf("Stress test: %s -> %s @ %d", senderID[:4], receiverID[:4], time.Now().UnixMilli()),
			"type":        "text",
		},
	}
	data, _ := json.Marshal(msg)
	conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
	return conn.WriteMessage(websocket.TextMessage, data)
}

// runVirtualUser mô phỏng một user kết nối WebSocket và gửi tin nhắn
func runVirtualUser(ctx context.Context, config LoadTestConfig, state *LoadTestState, userID string) {
	conn, err := connectWS(config.ServerURL, userID)
	if err != nil {
		atomic.AddInt64(&state.errorCount, 1)
		atomic.AddInt64(&state.totalSent, 1)
		log.Printf("[VUser %s] Connect failed: %v", userID, err)
		return
	}
	defer conn.Close()

	atomic.AddInt64(&state.activeConns, 1)
	defer atomic.AddInt64(&state.activeConns, -1)

	interval := time.Duration(config.MessageInterval) * time.Millisecond
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	// Nhận messages từ server trong background (chỉ để drain buffer)
	go func() {
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				return
			}
			atomic.AddInt64(&state.totalReceived, 1)
		}
	}()

	// Đếm lỗi liên tiếp để phát hiện kết nối chết
	consecutiveErrors := 0

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			startTs := time.Now()
			err := sendSimulatedMessage(conn, userID)
			latencyMs := time.Since(startTs).Milliseconds()

			if err == nil {
				log.Printf("[VUser %s] Sent message successfully (Latency: %dms)", userID, latencyMs)
			} else {
				log.Printf("[VUser %s] Failed to send message: %v", userID, err)
			}

			atomic.AddInt64(&state.totalSent, 1)
			atomic.AddInt64(&state.latencySum, latencyMs)
			atomic.AddInt64(&state.latencyCount, 1)

			if err != nil {
				atomic.AddInt64(&state.errorCount, 1)
				consecutiveErrors++
				// Chỉ disconnect sau 3 lỗi liên tiếp để tránh mất kết nối do timeout nhất thời
				if consecutiveErrors >= 3 {
					log.Printf("[VUser %s] 3 consecutive errors, disconnecting: %v", userID, err)
					return
				}
			} else {
				consecutiveErrors = 0
				atomic.AddInt64(&state.successCount, 1)
			}

			state.mu.Lock()
			state.lastMsgCount = atomic.LoadInt64(&state.successCount)
			state.lastMsgTime = time.Now()
			state.mu.Unlock()
		}
	}
}

// connectWS tạo WebSocket connection đến server với một userID giả lập
func connectWS(serverURL, userID string) (*websocket.Conn, error) {
	dialer := websocket.Dialer{
		HandshakeTimeout: 30 * time.Second,
	}
	fullURL := fmt.Sprintf("%s?id=%s", serverURL, userID)
	conn, _, err := dialer.Dial(fullURL, nil)
	return conn, err
}

// sendSimulatedMessage gửi một tin nhắn chat mô phỏng qua WebSocket
// SenderID và ReceiverID phải là valid MongoDB ObjectID hex string
func sendSimulatedMessage(conn *websocket.Conn, senderID string) error {
	msg := map[string]interface{}{
		"type": "chat",
		"message": map[string]interface{}{
			// Dùng senderID đã là valid ObjectID hex
			"sender_id": senderID,
			// Dùng một ObjectID zero để gửi 1-1 đến 'nobody' — server sẽ xử lý bình thường
			"receiver_id": primitive.NewObjectID().Hex(),
			"content":     fmt.Sprintf("Load test @ %d", time.Now().UnixMilli()),
			"type":        "text",
		},
	}
	data, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
	return conn.WriteMessage(websocket.TextMessage, data)
}

// ======================== Metrics Collection ========================

// collectSnapshot lấy snapshot metrics hiện tại
func collectSnapshot() MetricsSnapshot {
	manager.mu.Lock()
	state := manager.current
	manager.mu.Unlock()

	if state == nil {
		return MetricsSnapshot{
			Timestamp: time.Now().Format(time.RFC3339),
			Status:    "idle",
		}
	}

	state.mu.RLock()
	status := state.status
	startTime := state.startTime
	state.mu.RUnlock()

	activeConns := atomic.LoadInt64(&state.activeConns)
	totalSent := atomic.LoadInt64(&state.totalSent)
	totalReceived := atomic.LoadInt64(&state.totalReceived)
	successCount := atomic.LoadInt64(&state.successCount)
	errorCount := atomic.LoadInt64(&state.errorCount)
	latSum := atomic.LoadInt64(&state.latencySum)
	latCount := atomic.LoadInt64(&state.latencyCount)

	elapsed := int(time.Since(startTime).Seconds())

	// Tính messages/second (sliding window 1s)
	var msgPerSec float64
	if elapsed > 0 {
		msgPerSec = float64(successCount) / float64(elapsed)
	}

	// Tính error rate
	var errorRate float64
	if totalSent > 0 {
		errorRate = float64(errorCount) / float64(totalSent) * 100
	}

	// Tính average latency
	var avgLatency float64
	if latCount > 0 {
		avgLatency = float64(latSum) / float64(latCount)
	}

	// Đo CPU & Memory từ Go runtime (estimate)
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)
	memMB := float64(memStats.HeapAlloc) / 1024 / 1024

	// Lấy CPU từ monitor tập trung
	manager.mu.Lock()
	cpuUsage := manager.cpuUsage
	manager.mu.Unlock()

	// Nếu monitor chưa chạy hoặc trả về 0, thử lấy nhanh (nhưng không dùng fallback nhân goroutine nữa)
	if cpuUsage <= 0 {
		p, _ := cpu.Percent(0, false)
		if len(p) > 0 {
			cpuUsage = p[0]
		}
	}

	return MetricsSnapshot{
		Timestamp:             time.Now().Format(time.RFC3339),
		ActiveConns:           activeConns,
		TotalMessagesSent:     totalSent,
		TotalMessagesReceived: totalReceived,
		SuccessMessages:       successCount,
		ErrorMessages:         errorCount,
		MessagesPerSec:        msgPerSec,
		ErrorRate:             errorRate,
		AvgLatencyMs:          avgLatency,
		CPUUsage:              cpuUsage,
		MemoryMB:              memMB,
		Status:                status,
		ElapsedSeconds:        elapsed,
		ReceivedUserIDs:       extractReceivedIDs(state),
		TargetUsers:           atomic.LoadInt64(&state.targetUsers),
	}
}

func extractReceivedIDs(state *LoadTestState) []string {
	ids := make([]string, 0)
	if state == nil {
		return ids
	}
	state.receivedMap.Range(func(key, value interface{}) bool {
		if v, ok := value.(bool); ok && v {
			if id, ok := key.(string); ok {
				ids = append(ids, id)
			}
		}
		return true
	})
	return ids
}

func startMetricLogging(ctx context.Context, config LoadTestConfig) {
	logDir := "test_logs"
	if err := os.MkdirAll(logDir, 0755); err != nil {
		log.Printf("[StatsLogger] Failed to create log dir: %v", err)
		return
	}

	timestamp := time.Now().Unix()
	cpuFile := filepath.Join(logDir, fmt.Sprintf("cpu_%du_%d.log", config.TargetUsers, timestamp))
	ramFile := filepath.Join(logDir, fmt.Sprintf("ram_%du_%d.log", config.TargetUsers, timestamp))
	connFile := filepath.Join(logDir, fmt.Sprintf("conns_%du_%d.log", config.TargetUsers, timestamp))

	fCpu, err := os.Create(cpuFile)
	if err != nil {
		log.Printf("[StatsLogger] Failed to create CPU log: %v", err)
		return
	}
	defer fCpu.Close()

	fRam, err := os.Create(ramFile)
	if err != nil {
		log.Printf("[StatsLogger] Failed to create RAM log: %v", err)
		return
	}
	defer fRam.Close()

	fConn, err := os.Create(connFile)
	if err != nil {
		log.Printf("[StatsLogger] Failed to create Connection log: %v", err)
		return
	}
	defer fConn.Close()

	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	log.Printf("[StatsLogger] Started logging for %d users test to %s, %s and %s", config.TargetUsers, cpuFile, ramFile, connFile)

	for {
		select {
		case <-ctx.Done():
			// Khi context bị cancel, ta vẫn chạy thêm một lúc nếu ActiveConns > 0 (tối đa 60s dự phòng)
			for i := 0; i < 300; i++ { // Chờ tối đa 5 phút cho ramp-down
				snap := collectSnapshot()
				fmt.Fprintf(fCpu, "%.2f\n", snap.CPUUsage)
				fmt.Fprintf(fRam, "%.2f\n", snap.MemoryMB)
				fmt.Fprintf(fConn, "%d\n", snap.ActiveConns)
				if snap.ActiveConns <= 0 {
					break
				}
				time.Sleep(1 * time.Second)
			}
			log.Printf("[StatsLogger] Stopped logging for %d users test. ActiveConns: %d", config.TargetUsers, manager.current.activeConns)
			return
		case <-ticker.C:
			snap := collectSnapshot()
			fmt.Fprintf(fCpu, "%.2f\n", snap.CPUUsage)
			fmt.Fprintf(fRam, "%.2f\n", snap.MemoryMB)
			fmt.Fprintf(fConn, "%d\n", snap.ActiveConns)
		}
	}
}
