package api

import (
	ginGroup "my-app/modules/group/transport/gin"
	ginUser "my-app/modules/user/transport/gin"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterAdminRoutes(rg *gin.RouterGroup, db *mongo.Database) {
	users := rg.Group("/admin")
	{
		users.GET("/get-pagination", ginUser.ListUsersWithStatusHandler(db))
		users.GET("/get-group", ginGroup.ListAllGroupsWithStatsHandler(db))
		users.GET("/get-number-group", ginGroup.ListGroupMembersWithUserHandler(db))

	}
}
