package ginUser

// func UnBlockFriendHandler(db *mongo.Database) gin.HandlerFunc {
// 	return func(ctx *gin.Context) {
// 		var req models.UserFriend

// 		if err := ctx.ShouldBindJSON(&req); err != nil {
// 			ctx.JSON(http.StatusBadRequest, utils.HandleValidationErrors(err))
// 			return
// 		}

// 		store := storage.NewMongoStoreFriend(db) // Giả sử bạn dùng cùng MongoStoreFriend
// 		business := biz.NewUnBlockBiz(store)

// 		c, cancel := context.WithTimeout(context.Background(), 5*time.Second)
// 		defer cancel()

// 		if err := business.UnBlock(c, req.UserID, req.FriendID); err != nil {
// 			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
// 			return
// 		}

// 		ctx.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Đã bỏ chặn hoặc cập nhật trạng thái thành công", nil))
// 	}
// }
