package api

import (
	ginGroup "my-app/modules/group/transport/gin"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func GroupRoutes(rg *gin.RouterGroup, db *mongo.Database) {
	group := rg.Group("/group")
	{
		group.POST("/add", ginGroup.CreateGroupHandler(db))
		group.POST("/add-number", ginGroup.CreateGroupMemberHandler(db))
		group.GET("/get-all", ginGroup.ListGroupsByUserHandler(db))
		group.GET("/not-in-group", ginGroup.ListUsersNotInGroupHandler(db))
	}
}
