package api

import (
	"my-app/modules/chat/transport/websocket"
	ginGroup "my-app/modules/group/transport/gin"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func GroupRoutes(rg *gin.RouterGroup, db *mongo.Database, hub *websocket.Hub) {
	group := rg.Group("/group")
	{
		group.POST("/add", ginGroup.CreateGroupHandler(db))
		group.POST("/add-number", ginGroup.CreateGroupMemberHandler(db))
		group.GET("/get-all", ginGroup.ListGroupsByUserHandler(db))
		group.GET("/not-in-group", ginGroup.ListUsersNotInGroupHandler(db))
		group.GET("/list-group-member", ginGroup.ListGroupMembersExceptMeHandler(db))
		group.DELETE("/remove-member", ginGroup.RemoveGroupMemberHandler(db, hub))
		group.DELETE("/dissolve", ginGroup.DissolveGroupHandler(db, hub))
		group.POST("/promote-admin", ginGroup.PromoteToAdminHandler(db, hub))
		group.POST("/transfer-owner", ginGroup.TransferOwnerHandler(db, hub))
	}
}
