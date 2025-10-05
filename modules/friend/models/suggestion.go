package models

type SuggestFriendQuery struct {
	UserID  string `form:"user_id" binding:"required"`
	Keyword string `form:"keyword"`
	Page    int    `form:"page,default=1" binding:"min=1"`
	Limit   int    `form:"limit,default=10" binding:"min=1,max=100"`
}
