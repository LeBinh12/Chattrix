package common

import "net/http"

type APIResponse struct {
	Status  int         `json:"status"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

func NewSuccessResponse(data, paging, filter interface{}) *APIResponse {
	return &APIResponse{
		Status:  http.StatusOK,
		Message: "success",
		Data:    data,
	}
}

func SimpleSuccessResponse(data interface{}) *APIResponse {
	return &APIResponse{
		Status:  http.StatusOK,
		Message: "success",
		Data:    data,
	}
}

func NewResponse(status int, message string, data interface{}) *APIResponse {
	return &APIResponse{
		Status:  status,
		Message: message,
		Data:    data,
	}
}
