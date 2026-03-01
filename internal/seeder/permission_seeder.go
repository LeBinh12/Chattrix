package seeder

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func SeedPermissions(db *mongo.Database) {
	ctx := context.Background()
	permCollection := db.Collection("permissions")
	moduleCollection := db.Collection("permission_modules")

	// 1. Map Module Code -> ID
	moduleMap := make(map[string]string)
	cursor, _ := moduleCollection.Find(ctx, bson.M{})
	for cursor.Next(ctx) {
		var m struct {
			ID   primitive.ObjectID `bson:"_id"`
			Code string             `bson:"code"`
		}
		if err := cursor.Decode(&m); err == nil {
			moduleMap[m.Code] = m.ID.Hex()
		}
	}

	// 2. Define standard system permissions (Matched with APIs & Frontend)
	type pData struct {
		Code   string
		Name   string
		Desc   string
		Module string
	}

	data := []pData{
		// System Admin (module: system_admin)
		{Code: "system:admin:access_admin_panel", Name: "Truy cập trang quản trị", Desc: "Quyền truy cập vào trang quản trị hệ thống", Module: "system_admin"},
		// System User (module: system_user)
		{Code: "system:user:view_all", Name: "Xem toàn bộ danh sách người dùng", Desc: "Xem toàn bộ danh sách người dùng trong hệ thống có phân trang và tìm kiếm", Module: "system_user"},
		{Code: "system:user:create", Name: "Tạo người dùng hệ thống", Desc: "Tạo tài khoản người dùng mới trong hệ thống", Module: "system_user"},
		{Code: "system:user:update_global", Name: "Cập nhật bất kỳ người dùng", Desc: "Cập nhật thông tin của bất kỳ người dùng nào trong hệ thống", Module: "system_user"},
		{Code: "system:user:delete", Name: "Xóa người dùng", Desc: "xóa tài khoản của bất kỳ người dùng nào", Module: "system_user"},
		// {Code: "system:user:force_logout", Name: "Đăng xuất người dùng", Desc: "Buộc đăng xuất người dùng khỏi hệ thống", Module: "system_user"},
		{Code: "system:user:view_details", Name: "Xem chi tiết người dùng", Desc: "Xem thông tin chi tiết của người dùng", Module: "system_user"},
		{Code: "system:user:reset_password", Name: "Đặt lại mật khẩu người dùng", Desc: "Đặt lại mật khẩu cho bất kỳ người dùng nào trong hệ thống", Module: "system_user"},

		// System Group (module: system_group)
		{Code: "system:group:view_all", Name: "Xem tất cả nhóm", Desc: "Xem danh sách toàn bộ nhóm trong hệ thống", Module: "system_group"},
		{Code: "system:group:view_details", Name: "Xem chi tiết nhóm", Desc: "Xem thông tin chi tiết của nhóm", Module: "system_group"},
		// {Code: "system:group:force_delete", Name: "Xóa nhóm vĩnh viễn", Desc: "Xóa vĩnh viễn bất kỳ nhóm nào khỏi hệ thống", Module: "system_group"},
		{Code: "system:group:resolve_report", Name: "Giải quyết báo cáo", Desc: "Xử lý báo cáo vi phạm từ các nhóm", Module: "system_group"},
		{Code: "system:group:change_owner", Name: "Thay đổi chủ sở hữu nhóm", Desc: "Thay đổi chủ sở hữu của bất kỳ nhóm nào", Module: "system_group"},
		// {Code: "system:group:lock", Name: "Khóa nhóm", Desc: "Khóa hoạt động của nhóm", Module: "system_group"},

		// System Log (module: system_log)
		// {Code: "system:log:view", Name: "Xem log hệ thống", Desc: "Xem nhật ký hoạt động của hệ thống", Module: "system_log"},

		// System Settings (module: system_settings)
		{Code: "system:setting:view", Name: "Xem cài đặt hệ thống", Desc: "Xem các cài đặt và cấu hình của hệ thống", Module: "system_settings"},
		{Code: "system:setting:config", Name: "Cấu hình hệ thống", Desc: "Thay đổi cấu hình và cài đặt của hệ thống", Module: "system_settings"},
		{Code: "system:moderator:assign", Name: "Bổ nhiệm quản moderator", Desc: "Bổ nhiệm người dùng thành quản moderator", Module: "system_settings"},


		// role
		{Code: "system:role:view", Name: "Xem quyền & vai trò", Desc: "Xem danh mục các vai trò trong hệ thống", Module: "system_role"},
		{Code: "system:role:create", Name: "Tạo vai trò", Desc: "Thêm vai trò mới", Module: "system_role"},
		{Code: "system:role:update", Name: "Cập nhật vai trò", Desc: "Sửa thông tin vai trò", Module: "system_role"},
		{Code: "system:role:delete", Name: "Xóa vai trò", Desc: "Xóa vai trò khỏi hệ thống", Module: "system_role"},

		// permission 
		{Code: "system:permission:view", Name: "Xem danh sách quyền", Desc: "Xem chi tiết các quyền kỹ thuật", Module: "system_permission"},
		{Code: "system:permission:create", Name: "Tạo quyền mới", Desc: "Thêm mã quyền mới cho hệ thống", Module: "system_permission"},
		{Code: "system:permission:update", Name: "Cập nhật quyền", Desc: "Sửa thông tin mã quyền", Module: "system_permission"},
		{Code: "system:permission:delete", Name: "Xóa quyền", Desc: "Loại bỏ mã quyền khỏi hệ thống", Module: "system_permission"},
		
		// permission module
		{Code: "system:module:view", Name: "Xem danh sách module", Desc: "Xem các nhóm chức năng", Module: "system_module"},
		{Code: "system:module:create", Name: "Tạo module mới", Desc: "Thêm nhóm chức năng mới", Module: "system_module"},
		{Code: "system:module:update", Name: "Cập nhật module", Desc: "Sửa thông tin module", Module: "system_module"},
		{Code: "system:module:delete", Name: "Xóa module", Desc: "Xóa nhóm chức năng", Module: "system_module"},

		// permission matrix
		{Code: "system:matrix:view", Name: "Xem ma trận phân quyền", Desc: "Xem bảng phân bổ quyền cho các vai trò", Module: "system_matrix"},
		{Code: "system:matrix:update", Name: "Cấu hình ma trận quyền", Desc: "Thay đổi quyền cho các vai trò", Module: "system_matrix"},
		
		// Forced Actions (module: system_group - system level group actions)
		{Code: "system:content:delete_any", Name: "Xóa nội dung bất kỳ", Desc: "Xóa bất kỳ nội dung nào trong hệ thống", Module: "system_group"},
		{Code: "system:message:delete_any", Name: "Xóa tin nhắn bất kỳ", Desc: "Xóa bất kỳ tin nhắn nào trong hệ thống", Module: "system_group"},

		// Group Management (module: group_management)
		{Code: "group:settings:edit", Name: "Chỉnh sửa cài đặt nhóm", Desc: "Chỉnh sửa các cài đặt của nhóm", Module: "group_management"},
		{Code: "group:info:edit", Name: "Chỉnh sửa thông tin nhóm", Desc: "Chỉnh sửa tên, mô tả và thông tin nhóm", Module: "group_management"},
		{Code: "group:search:config", Name: "Cấu hình tìm kiếm nhóm", Desc: "Cấu hình các tham số tìm kiếm của nhóm", Module: "group_management"},
		{Code: "group:dissolve", Name: "Giải tán nhóm", Desc: "Giải tán nhóm và xóa toàn bộ dữ liệu", Module: "group_management"},
		{Code: "group:feature:admin_only", Name: "Chế độ chỉ admin phát biểu", Desc: "Bật chế độ chỉ admin có thể gửi tin nhắn", Module: "group_management"},
		{Code: "group:feature:approval_required", Name: "Yêu cầu phê duyệt thành viên mới", Desc: "Bật chế độ phê duyệt trước khi thêm thành viên mới", Module: "group_management"},
		{Code: "group:member:add", Name: "Thêm thành viên", Desc: "Thêm người dùng vào nhóm", Module: "group_management"},
		{Code: "group:member:approve", Name: "Phê duyệt yêu cầu thành viên", Desc: "Phê duyệt yêu cầu tham gia nhóm", Module: "group_management"},
		{Code: "group:member:remove", Name: "Xóa thành viên", Desc: "Loại bỏ thành viên khỏi nhóm", Module: "group_management"},
		// {Code: "group:member:ban", Name: "Cấm thành viên", Desc: "Cấm thành viên tham gia nhóm", Module: "group_management"},
		{Code: "group:member:promote_admin", Name: "Nâng cấp thành admin", Desc: "Nâng quyền thành viên lên admin", Module: "group_management"},
		{Code: "group:member:transfer_owner", Name: "Chuyển giao quyền sở hữu", Desc: "Chuyển quyền sở hữu nhóm cho thành viên khác", Module: "group_management"},
		{Code: "group:member:view_all", Name: "Xem tất cả thành viên", Desc: "Xem danh sách toàn bộ thành viên nhóm", Module: "group_management"},

		// Group Content (module: group_content)
		{Code: "group:message:send", Name: "Gửi tin nhắn", Desc: "Gửi tin nhắn trong nhóm", Module: "group_content"},
		{Code: "group:message:pin", Name: "Ghim tin nhắn", Desc: "Ghim tin nhắn để hiển thị ở trên cùng", Module: "group_content"},
		{Code: "group:message:unpin", Name: "Bỏ ghim tin nhắn", Desc: "Bỏ ghim tin nhắn đã ghim", Module: "group_content"},
		{Code: "group:message:delete_any", Name: "Xóa tin nhắn bất kỳ", Desc: "Xóa bất kỳ tin nhắn nào trong nhóm", Module: "group_content"},
		{Code: "group:message:recall_own", Name: "Thu hồi tin nhắn riêng", Desc: "Thu hồi tin nhắn của chính mình", Module: "group_content"},
		{Code: "group:message:delete_own", Name: "Xóa tin nhắn riêng", Desc: "Xóa tin nhắn của chính mình", Module: "group_content"},
		{Code: "group:message:format", Name: "Định dạng tin nhắn", Desc: "Sử dụng các tính năng định dạng text trong tin nhắn", Module: "group_content"},
		{Code: "group:mention:all", Name: "Nhắc tất cả thành viên", Desc: "Sử dụng @all để nhắc tất cả thành viên", Module: "group_content"},
		{Code: "group:message:reply", Name: "Trả lời tin nhắn", Desc: "Trả lời tin nhắn cụ thể", Module: "group_content"},
		{Code: "group:file:upload", Name: "Tải tệp lên", Desc: "Tải tệp tin lên nhóm", Module: "group_content"},
		{Code: "group:file:view_all", Name: "Xem tất cả tệp", Desc: "Xem danh sách toàn bộ tệp trong nhóm", Module: "group_content"},
		{Code: "group:poll:create", Name: "Tạo cuộc bầu chọn", Desc: "Tạo cuộc bầu chọn/khảo sát trong nhóm", Module: "group_content"},
		{Code: "group:task:create", Name: "Tạo nhiệm vụ", Desc: "Tạo nhiệm vụ mới trong nhóm", Module: "group_content"},
		{Code: "group:task:assign", Name: "Giao nhiệm vụ", Desc: "Giao nhiệm vụ cho thành viên", Module: "group_content"},
		{Code: "group:task:update_status", Name: "Cập nhật trạng thái nhiệm vụ", Desc: "Thay đổi trạng thái của nhiệm vụ", Module: "group_content"},
		{Code: "group:task:view_all", Name: "Xem tất cả nhiệm vụ", Desc: "Xem danh sách toàn bộ nhiệm vụ", Module: "group_content"},
		{Code: "group:notification:manage", Name: "Quản lý thông báo", Desc: "Quản lý cài đặt thông báo của nhóm", Module: "group_content"},
		{Code: "group:notification:read", Name: "Đọc thông báo", Desc: "Xem các thông báo nhóm", Module: "group_content"},
	}

	validCodes := make([]string, 0, len(data))
	for _, p := range data {
		mIDHex := moduleMap[p.Module]

		filter := bson.M{"code": p.Code}
		update := bson.M{
			"$setOnInsert": bson.M{"_id": primitive.NewObjectID(), "created_at": time.Now()},
			"$set": bson.M{
				"name":        p.Name,
				"description": p.Desc,
				"module_id":   mIDHex,
				"updated_at":  time.Now(),
				"deleted_at":  nil,
			},
		}

		opts := options.Update().SetUpsert(true)
		_, err := permCollection.UpdateOne(ctx, filter, update, opts)
		if err == nil {
			validCodes = append(validCodes, p.Code)
		}
	}

	// CLEANUP: Xóa các quyền không thuộc bộ chuẩn này
	deleteResult, err := permCollection.DeleteMany(ctx, bson.M{"code": bson.M{"$nin": validCodes}})
	if err == nil && deleteResult.DeletedCount > 0 {
		log.Printf("🔥 Cleaned up %d legacy permissions from Database", deleteResult.DeletedCount)
	}

	log.Printf("✅ Seeding %d system permissions completed.", len(validCodes))
}
