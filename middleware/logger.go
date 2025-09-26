package middleware

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/natefinch/lumberjack"
	"github.com/rs/zerolog"
)

type CustomResponseWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w *CustomResponseWriter) Write(data []byte) (n int, err error) {
	w.body.Write(data)
	return w.ResponseWriter.Write(data)
}

func LoggerMiddleware() gin.HandlerFunc {
	// *** Những gì liên quan đến Khai báo nên đặt trước Func
	logPath := "logs/http.log"

	// Cacsh 1 tạo folder thử công
	//
	// if err := os.MkdirAll(filepath.Dir(logPath), os.ModePerm); err != nil {
	// 	panic(err)
	// }

	// logFile, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644) // được phép ghi đè file

	// if err != nil {
	// 	panic(err)
	// }

	// Cách 2 dùng thư viện lumberjack
	logger := zerolog.New(&lumberjack.Logger{
		Filename:   logPath,
		MaxSize:    1, // megabytes
		MaxBackups: 5,
		MaxAge:     5,    //days Bao lâu thì xóa file này
		Compress:   true, // bạn có muốn nén file hay không
		LocalTime:  true,
	}).With().Timestamp().Logger()

	return func(ctx *gin.Context) {

		start := time.Now()

		contentType := ctx.GetHeader("Content-Type")
		requestBody := make(map[string]any)
		var formFiles []map[string]any

		if strings.HasPrefix(contentType, "multipart/form-data") {
			if err := ctx.Request.ParseMultipartForm(32 << 20); err == nil && ctx.Request.MultipartForm != nil {
				// lặp qua value
				for key, vals := range ctx.Request.MultipartForm.Value {
					if len(vals) == 1 {
						requestBody[key] = vals[0]
					} else {
						requestBody[key] = vals
					}
				}

				// lặp qua file
				for filed, files := range ctx.Request.MultipartForm.File {
					for _, f := range files {
						formFiles = append(formFiles, map[string]any{
							"field":        filed,
							"filename":     f.Filename,
							"size":         formatFileSize(f.Size),
							"content_type": f.Header.Get("content-Type"),
						})
					}
				}

				if len(formFiles) > 0 {
					requestBody["form_files"] = formFiles
				}
			}
			log.Println("multipart/form-data")
		} else {
			// dành cho Content-Type: json || x-www-form-urlencoded
			//io.ReadAll(ctx.Request.Body) khi dùng io để đọc hết thì sau khi đọc xong thì nó sẽ bỏ hết dữ lệu
			bodyBytes, err := io.ReadAll(ctx.Request.Body)
			if err != nil {
				logger.Error().Err(err).Msg("Lỗi khi đọc body trả về")
			}

			// sau khi đọc xong rồi thì nạp dữ liệu lại cho body
			ctx.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

			// dành cho Content-Type: application/json
			if strings.HasPrefix(contentType, "application/json") {
				_ = json.Unmarshal(bodyBytes, &requestBody) // phải dùng con trỏ để gắn vùng nhớ
			} else {
				// dành cho Content-Type: application/x-www-form-urlencoded
				values, _ := url.ParseQuery(string(bodyBytes))

				for key, val := range values {
					if len(val) == 1 {
						requestBody[key] = val[0]
					} else {
						requestBody[key] = val
					}
				}
			}
		}

		customWriter := &CustomResponseWriter{
			ResponseWriter: ctx.Writer,
			body:           bytes.NewBufferString(""),
		}

		ctx.Writer = customWriter

		ctx.Next()

		duration := time.Since(start)
		static_code := ctx.Writer.Status()

		responseContentType := ctx.Writer.Header().Get("Content-Type")
		responseBodyRaw := customWriter.body.String()
		var responseBodyParsed interface{}

		if strings.HasPrefix(responseContentType, "image/") {
			responseBodyParsed = "[BINARY DATA]"
		} else if strings.HasPrefix(responseContentType, "application/json") ||
			strings.HasPrefix(strings.TrimSpace(responseBodyRaw), "{") ||
			strings.HasPrefix(strings.TrimSpace(responseBodyRaw), "[") {

			if err := json.Unmarshal([]byte(responseBodyRaw), &responseBodyParsed); err != nil {
				responseBodyParsed = responseBodyRaw
			}

		} else {
			responseBodyParsed = responseBodyRaw
		}

		logEvent := logger.Info()

		if static_code >= 500 {
			logEvent = logger.Error()
		} else if static_code >= 400 {
			logEvent = logger.Warn()
		}

		logEvent.
			Str("method", ctx.Request.Method).
			Str("path", ctx.Request.URL.Path).
			Str("query", ctx.Request.URL.RawQuery).
			Str("client_ip", ctx.ClientIP()).
			Str("user_agent", ctx.Request.UserAgent()). // nhận biết được trình duyệt nào
			Str("referer", ctx.Request.Referer()).      // link bạn được chuyển từ hệ thống nào
			Str("protocol", ctx.Request.Proto).         // lưu giao thức
			Str("remote_address", ctx.Request.RemoteAddr).
			Str("remote_uri", ctx.Request.RequestURI).
			Int64("content_length", ctx.Request.ContentLength).
			Interface("headers", ctx.Request.Header).
			Interface("request_body", requestBody).
			Interface("response_body", responseBodyParsed).
			Int("status_code", static_code).
			Int64("duration_ms", duration.Milliseconds()).
			Msg("HTTP request")
	}
}

func formatFileSize(size int64) string {
	switch {
	case size > 1<<20:
		return fmt.Sprintf("%.2f MB", float64(size)/(1<<20))
	case size < 1<<20:
		return fmt.Sprintf("%.2f KB", float64(size)/(1<<20))
	default:
		return fmt.Sprintf("%d B", size)
	}
}
