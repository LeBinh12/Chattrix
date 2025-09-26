package middleware

import (
	"log"
	"my-app/common"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

type Client struct {
	LimitTer *rate.Limiter
	lastSeen time.Time
}

var (
	mu      sync.Mutex
	clients = make(map[string]*Client)
)

func getClientIP(ctx *gin.Context) string {
	ip := ctx.ClientIP() // Lấy địa chỉ IP của gười dùng

	if ip == "" {
		ip = ctx.Request.RemoteAddr
	}

	return ip
}

//// hey -n 20 -c 1 -H "X-API-Key: becfce45-9237-4c6d-a7c5-f3be786249a5" http://localhost:3000/v1/items/get-all

func getRateLimiter(ip string) *rate.Limiter {
	mu.Lock()
	defer mu.Unlock() // tự đóng ở cuối cùng
	client, exists := clients[ip]

	//nếu chưa có ip thì tạo mới
	if !exists {
		limiter := rate.NewLimiter(5, 10) // bucket nghĩa là nhận 5 request / s , tức là mỗi giây sẽ cấp thêm 5 request
		// 	 brust là số lượng request tối đa có thể xử lý ngay cùng 1 lúc
		// có nghĩa là nếu mà cùng lúc có 11 request thì request sẽ phải đợi bucket sinh ra token mớisẽ là khoản 200ms

		newClient := &Client{limiter, time.Now()}

		clients[ip] = newClient
		log.Printf("A clients[%s] - {limiter: %v+v, lastSeen: %s}", ip, newClient.LimitTer, newClient.lastSeen)
		return limiter
	}
	log.Printf("A clients[%s] - {limiter: %v+v, lastSeen: %s}", ip, client.LimitTer, client.lastSeen)

	client.lastSeen = time.Now()
	return client.LimitTer
}

func CleanUpClient() {
	for {
		time.Sleep(time.Minute)
		mu.Lock()

		for ip, client := range clients {
			if time.Since(client.lastSeen) > 3*time.Minute { // nếu thời gian sài hơn 3p rồi thì xóa
				delete(clients, ip)
			}
		}

		mu.Unlock()
	}
}

// hey -n 2000 -c 1 -H "X-API-Key: becfce45-9237-4c6d-a7c5-f3be786249a5" http://localhost:3000/v1/items/get-all
func RateLimitingMiddleware() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		ip := getClientIP(ctx)

		limiter := getRateLimiter(ip)

		if !limiter.Allow() {
			ctx.AbortWithStatusJSON(http.StatusTooManyRequests, common.ErrRequest)
			return
		}

		ctx.Next()
	}
}
