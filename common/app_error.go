package common

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
)

type AppError struct {
	StatusCode int    `json:"status"`
	RootErr    error  `json:"-"`
	Message    string `json:"message"`
	Log        string `json:"log"`
	Key        string `json:"key"`
}

func NewFullErrorResponse(status_code int, root error, msg, log, key string) *AppError {
	return &AppError{
		StatusCode: status_code,
		RootErr:    root,
		Message:    msg,
		Log:        log,
		Key:        key,
	}
}

func NewErrorResponse(root error, msg, log, key string) *AppError {
	return &AppError{
		StatusCode: http.StatusBadRequest,
		RootErr:    root,
		Message:    msg,
		Log:        log,
		Key:        key,
	}
}

func NewUnauthorized(root error, msg, log, key string) *AppError {
	return &AppError{
		StatusCode: http.StatusUnauthorized,
		RootErr:    root,
		Message:    msg,
		Log:        log,
		Key:        key,
	}
}

func (e *AppError) RootError() error {
	if err, ok := e.RootErr.(*AppError); ok {
		return err.RootError()
	}
	return e.RootErr
}

func (e *AppError) Error() string {
	return e.RootError().Error()
}

func NewCustomError(root error, msg, key string) *AppError {
	if root != nil {
		return NewErrorResponse(root, msg, root.Error(), key)
	}
	return NewErrorResponse(errors.New(msg), msg, msg, key)
}

func ErrDB(err error) *AppError {
	return NewFullErrorResponse(http.StatusInternalServerError, err, "Có lỗi xảy ra với cơ sở dữ liệu", err.Error(), "DB_ERROR")
}

func ErrRequest(err error) *AppError {
	return NewErrorResponse(err, "Bạn đã gửi quá nhiều request, xin hãy gửi lại sau", err.Error(), "ErrRequest")
}

func ErrApiKey(err error) *AppError {
	return NewErrorResponse(err, "Lỗi API KEY", err.Error(), "ErrRequest")
}

func ErrInvalidRequest(err error) *AppError {
	return NewErrorResponse(err, "Yêu cầu không hợp lệ", err.Error(), "ErrInvalidRequest")
}

func ErrLogin(err error) *AppError {
	return NewErrorResponse(err, "Sai tên đăng nhập hoặc mật khẩu", err.Error(), "ErrLogin")
}

func ErrRegister(err error) *AppError {
	return NewErrorResponse(err, "Không thể tạo tài khoản", err.Error(), "ErrLogin")
}

func ErrInternal(err error) *AppError {
	return NewFullErrorResponse(http.StatusInternalServerError, err,
		"Có lỗi xảy ra trong hệ thống", err.Error(), "ErrInternal")
}

func ErrCannotListEntity(entity string, err error) *AppError {
	return NewCustomError(
		err,
		fmt.Sprintf("Không thể lấy danh sách %s", strings.ToLower(entity)),
		fmt.Sprintf("ErrCannotList%s", entity),
	)
}

func ErrCannotCreateEntity(entity string, err error) *AppError {
	return NewCustomError(
		err,
		fmt.Sprintf("Không thể tạo mới %s", strings.ToLower(entity)),
		fmt.Sprintf("ErrCannotCreate%s", entity),
	)
}

func ErrCannotUpdateEntity(entity string, err error) *AppError {
	return NewCustomError(
		err,
		fmt.Sprintf("Không thể cập nhật %s", strings.ToLower(entity)),
		fmt.Sprintf("ErrCannotUpdate%s", entity),
	)
}

func ErrCannotDeleteEntity(entity string, err error) *AppError {
	return NewCustomError(
		err,
		fmt.Sprintf("Không thể xóa %s", strings.ToLower(entity)),
		fmt.Sprintf("ErrCannotDelete%s", entity),
	)
}

func ErrCannotGetEntity(entity string, err error) *AppError {
	return NewCustomError(
		err,
		fmt.Sprintf("Không thể lấy %s", strings.ToLower(entity)),
		fmt.Sprintf("ErrCannotGet%s", entity),
	)
}

func ErrEntityDeleted(entity string, err error) *AppError {
	return NewCustomError(
		err,
		fmt.Sprintf("%s đã bị xóa", strings.Title(entity)),
		fmt.Sprintf("Err%sDeleted", entity),
	)
}

var RecordNotFound = errors.New("Không tìm thấy dữ liệu")

