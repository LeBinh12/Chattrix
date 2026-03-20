package utils

import (
	"strings"
	"unicode"
)

// RemoveVietnameseAccents chuyển tiếng Việt có dấu thành không dấu
func RemoveVietnameseAccents(s string) string {
	// Bảng mapping các ký tự tiếng Việt có dấu → không dấu
	m := map[rune]string{
		'à': "a", 'á': "a", 'ả': "a", 'ã': "a", 'ạ': "a",
		'ằ': "a", 'ắ': "a", 'ẳ': "a", 'ẵ': "a", 'ặ': "a",
		'è': "e", 'é': "e", 'ẻ': "e", 'ẽ': "e", 'ẹ': "e",
		'ề': "e", 'ế': "e", 'ể': "e", 'ễ': "e", 'ệ': "e",
		'ì': "i", 'í': "i", 'ỉ': "i", 'ĩ': "i", 'ị': "i",
		'ò': "o", 'ó': "o", 'ỏ': "o", 'õ': "o", 'ọ': "o",
		'ồ': "o", 'ố': "o", 'ổ': "o", 'ỗ': "o", 'ộ': "o",
		'ờ': "o", 'ớ': "o", 'ở': "o", 'ỡ': "o", 'ợ': "o",
		'ù': "u", 'ú': "u", 'ủ': "u", 'ũ': "u", 'ụ': "u",
		'ừ': "u", 'ứ': "u", 'ử': "u", 'ữ': "u", 'ự': "u",
		'ỳ': "y", 'ý': "y", 'ỷ': "y", 'ỹ': "y", 'ỵ': "y",
		'đ': "d",
		// In hoa
		'À': "A", 'Á': "A", 'Ả': "A", 'Ã': "A", 'Ạ': "A",
		'Ằ': "A", 'Ắ': "A", 'Ẳ': "A", 'Ẵ': "A", 'Ặ': "A",
		'È': "E", 'É': "E", 'Ẻ': "E", 'Ẽ': "E", 'Ẹ': "E",
		'Ề': "E", 'Ế': "E", 'Ể': "E", 'Ễ': "E", 'Ệ': "E",
		'Ì': "I", 'Í': "I", 'Ỉ': "I", 'Ĩ': "I", 'Ị': "I",
		'Ò': "O", 'Ó': "O", 'Ỏ': "O", 'Õ': "O", 'Ọ': "O",
		'Ồ': "O", 'Ố': "O", 'Ổ': "O", 'Ỗ': "O", 'Ộ': "O",
		'Ờ': "O", 'Ớ': "O", 'Ở': "O", 'Ỡ': "O", 'Ợ': "O",
		'Ù': "U", 'Ú': "U", 'Ủ': "U", 'Ũ': "U", 'Ụ': "U",
		'Ừ': "U", 'Ứ': "U", 'Ử': "U", 'Ữ': "U", 'Ự': "U",
		'Ỳ': "Y", 'Ý': "Y", 'Ỷ': "Y", 'Ỹ': "Y", 'Ỵ': "Y",
		'Đ': "D",
	}

	var builder strings.Builder
	for _, r := range s {
		if replaced, ok := m[r]; ok {
			builder.WriteString(replaced)
		} else {
			builder.WriteRune(unicode.ToLower(r))
		}
	}
	return builder.String()
}

// GenerateUsernameFromDisplayName tạo username từ display_name
// Ví dụ: "Nguyễn Văn A" → "nguyen_van_a"
//
//	"Thông Báo Hệ Thống" → "thong_bao_he_thong"
func GenerateUsernameFromDisplayName(displayName string) string {
	if strings.TrimSpace(displayName) == "" {
		return "system_notification"
	}

	// Bước 1: Chuyển về chữ thường + bỏ dấu
	noAccent := RemoveVietnameseAccents(displayName)
	lower := strings.ToLower(noAccent)

	// Bước 2: Thay khoảng trắng bằng _
	username := strings.ReplaceAll(lower, " ", "_")

	// Bước 3: Loại bỏ các ký tự đặc biệt (giữ lại chữ cái, số, _)
	var cleaned strings.Builder
	for _, r := range username {
		if unicode.IsLetter(r) || unicode.IsNumber(r) || r == '_' {
			cleaned.WriteRune(r)
		}
	}

	result := cleaned.String()

	// Bước 4: Nếu rỗng hoặc quá ngắn → fallback
	if result == "" || len(result) < 3 {
		return "notification_channel"
	}

	return result
}
