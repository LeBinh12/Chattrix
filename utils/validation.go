package utils

import (
	"fmt"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
)

func ValidationRequired(fieldName, value string) error {
	if value == "" {
		return fmt.Errorf("%s Không được tìm kiếm trống", fieldName)
	}

	return nil
}

func ValidationStringLength(fieldName, value string, min, max int) error {
	l := len(value)

	if l < min || l > max {
		return fmt.Errorf("%s Phản nằm trong khoảng %d đến %d", fieldName, min, max)

	}
	return nil
}

func ValidationRegex(fieldName, value string, regex *regexp.Regexp, errMessage string) error {
	if !regex.MatchString(value) {
		return fmt.Errorf("%s : %s", fieldName, errMessage)

	}

	return nil
}

func ValidateStruct(s interface{}) error {
	v, ok := binding.Validator.Engine().(*validator.Validate)
	if !ok {
		return fmt.Errorf("validator chưa được khởi tạo")
	}

	return v.Struct(s)
}

func ValidationPositiveInt(fieldName, value string) (int, error) {
	v, err := strconv.Atoi(value)

	if err != nil {
		return 0, fmt.Errorf("%s khoog phải kiểu số", fieldName)

	}

	if v <= 0 {
		return 0, fmt.Errorf("%s khoog phải kiểu số", fieldName)
	}

	return v, nil
}

func ValidationUuid(fieldName, value string) (uuid.UUID, error) {
	uid, err := uuid.Parse(value)

	if err != nil {
		return uuid.Nil, fmt.Errorf("%s không đúng định dạng dữ liệu", fieldName)
	}

	return uid, nil
}

func ValidationInList(fieldName, value string, allow map[string]bool) error {
	if !allow[value] {
		return fmt.Errorf("%s Không tồn tại : %v", fieldName, keys(allow))
	}
	return nil
}

func keys(m map[string]bool) []string {
	var k []string

	for key := range m {
		k = append(k, key)
	}

	return k
}

func HandleValidationErrors(err error) gin.H {
	if validationError, ok := err.(validator.ValidationErrors); ok {
		errors := make(map[string]string)

		for _, e := range validationError {

			root := strings.Split(e.Namespace(), " .")[0] // cawcst ra các dấu chấm
			rawPath := strings.TrimPrefix(e.Namespace(), root+".")

			parts := strings.Split(rawPath, ".")

			for i, part := range parts {
				if strings.Contains("part", "[") {
					idx := strings.Index(part, "[")
					base := camelToSnake(part[:idx])
					index := part[idx:]
					parts[i] = base + index
				} else {
					parts[i] = camelToSnake(part)
				}
			}

			filepath := strings.Join(parts, ".")

			switch e.Tag() {
			case "gt":
				errors[filepath] = fmt.Sprintf("%s phải lớn hơn %s", filepath, e.Param())
			case "lt":
				errors[filepath] = fmt.Sprintf("%s phải nhỏ hơn %s", filepath, e.Param())
			case "gte":
				errors[filepath] = fmt.Sprintf("%s phải lớn hơn hoặc bằng %s", filepath, e.Param())
			case "lte":
				errors[filepath] = fmt.Sprintf("%s phải nhỏ hoặc bằng hơn %s", filepath, e.Param())
			case "uuid":
				errors[filepath] = fmt.Sprintf("%s phải Uuid hợp lệ", filepath)
			case "slug":
				errors[filepath] = fmt.Sprintf("%s phải Slug hợp lệ", filepath)
			case "required":
				errors[filepath] = fmt.Sprintf("%s bắt buộc phải có", filepath)
			case "search":
				errors[filepath] = fmt.Sprintf("%s Lỗi ký tự tìm kiếm", filepath)
			case "min":
				errors[filepath] = fmt.Sprintf("%s phải lớn hơn hoặc bằng %s", filepath, e.Param())
			case "max":
				errors[filepath] = fmt.Sprintf("%s phải nhỏ hơn hoặc bằng %s", filepath, e.Param())
			case "min_int":
				errors[filepath] = fmt.Sprintf("%s phải có giá trị lớn hơn hoặc bằng %s", filepath, e.Param())
			case "max_int":
				errors[filepath] = fmt.Sprintf("%s phải có giá trị nhỏ hơn hoặc bằng %s", filepath, e.Param())
			case "oneof":
				allowedValues := strings.Join(strings.Split(e.Param(), " "), ",")
				errors[filepath] = fmt.Sprintf("%s phải là 1 trong các giá trị: %s", filepath, allowedValues)
			case "email":
				errors[filepath] = fmt.Sprintf("%s Cú pháp email không hợp lệ", filepath)
			case "datetime":
				errors[filepath] = fmt.Sprintf("%s Cú pháp Date(YYYY-MM-DD) không hợp lệ", filepath)
			case "file_ext":
				allowedValues := strings.Join(strings.Split(e.Param(), " "), ",")
				errors[filepath] = fmt.Sprintf("%s chỉ cho phép nhập file có các ext: %s", filepath, allowedValues)
			}

		}
		return gin.H{"error": errors}

	}
	return gin.H{"error": "Yêu cầu không hợp lệ" + err.Error()}

}

func RegisterValidator() error {
	v, ok := binding.Validator.Engine().(*validator.Validate)

	if !ok {
		return fmt.Errorf("lỗi validator")
	}

	var slugRegex = regexp.MustCompile(`^[a-z0-9]+(?:[-.][a-z0-9]+)*$`)
	v.RegisterValidation("slug", func(fl validator.FieldLevel) bool {
		return slugRegex.MatchString(fl.Field().String())
	})

	var searchRegex = regexp.MustCompile(`^[a-zA-Z0-9\s]+$`)
	v.RegisterValidation("search", func(fl validator.FieldLevel) bool {
		return searchRegex.MatchString(fl.Field().String())
	})

	v.RegisterValidation("min_int", func(fl validator.FieldLevel) bool {
		minStr := fl.Param()

		value, err := strconv.ParseInt(minStr, 10, 64)

		if err != nil {
			return false
		}

		return fl.Field().Int() >= value
	})

	v.RegisterValidation("max_int", func(fl validator.FieldLevel) bool {
		maxStr := fl.Param()

		value, err := strconv.ParseInt(maxStr, 10, 64)

		if err != nil {
			return false
		}

		return fl.Field().Int() >= value
	})
	v.RegisterValidation("file_ext", func(fl validator.FieldLevel) bool {
		filename := fl.Field().String()

		allowedStr := fl.Param()

		if allowedStr == "" {
			return false
		}

		allowedExt := strings.Fields(allowedStr)

		ext := strings.TrimPrefix(strings.ToLower(filepath.Ext(filename)), ".") // lấy file name

		for _, allowed := range allowedExt {
			if ext == strings.ToLower(allowed) {
				return true
			}
		}

		return false
	})

	return nil
}
