package biz

import (
	"context"
	"fmt"
	"my-app/modules/group/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Storage interface for member removal
type RemoveGroupMemberStorage interface {
	RemoveMember(ctx context.Context, groupID, userID primitive.ObjectID) error
	FindMember(ctx context.Context, groupID, userID primitive.ObjectID) (*models.GroupMember, error)
	GetNextSuccessor(ctx context.Context, groupID, leavingUserID primitive.ObjectID) (*models.GroupMember, error)
	UpdateMemberRole(ctx context.Context, groupID, userID primitive.ObjectID, role string) error
	UpdateGroupCreator(ctx context.Context, groupID, newCreatorID primitive.ObjectID) error
}

// Biz struct
type removeGroupMemberBiz struct {
	store RemoveGroupMemberStorage
}

// Constructor
func NewRemoveGroupMemberBiz(store RemoveGroupMemberStorage) *removeGroupMemberBiz {
	return &removeGroupMemberBiz{store: store}
}

// Main logic
func (biz *removeGroupMemberBiz) RemoveMember(ctx context.Context, requesterID, groupID, targetUserID string) (*primitive.ObjectID, error) {

	reqId, _ := primitive.ObjectIDFromHex(requesterID)
	setUserId, _ := primitive.ObjectIDFromHex(targetUserID)
	setGroupId, _ := primitive.ObjectIDFromHex(groupID)

	// Validate input
	if setUserId.IsZero() || setGroupId.IsZero() {
		return nil, fmt.Errorf("invalid data")
	}

	// If requesterID is provided, perform permission check (this is a call from the API)
	if requesterID != "" {
		if reqId.IsZero() {
			return nil, fmt.Errorf("invalid requester_id")
		}

		// 1. Check requester permissions (must be owner)
		// requester, err := biz.store.FindMember(ctx, setGroupId, reqId)
		// if err != nil {
		// 	return nil, fmt.Errorf("could not verify permissions: %w", err)
		// }

		// if requester.Role != "owner" {
		// 	return nil, fmt.Errorf("only the group owner has the right to remove members")
		// }

		// 2. Do not allow self-removal via this API (LeaveGroup should be used instead)
		// if reqId == setUserId {
		// 	return nil, fmt.Errorf("you cannot remove yourself from the group using this function")
		// }
	}

	// 3. Check if target user is in the group
	target, err := biz.store.FindMember(ctx, setGroupId, setUserId)
	if err != nil || target == nil {
		return nil, fmt.Errorf("member does not exist in the group or has already left")
	}

	// 4. If the owner is leaving -> Find a successor
	var successorID *primitive.ObjectID
	if target.Role == "owner" {
		successor, err := biz.store.GetNextSuccessor(ctx, setGroupId, setUserId)
		if err == nil && successor != nil {
			// Promote the successor
			_ = biz.store.UpdateMemberRole(ctx, setGroupId, successor.UserID, "owner")
			// Update Group Creator info
			_ = biz.store.UpdateGroupCreator(ctx, setGroupId, successor.UserID)
			successorID = &successor.UserID
		}
	}

	// Call storage layer to remove member
	if err := biz.store.RemoveMember(ctx, setGroupId, setUserId); err != nil {
		return nil, fmt.Errorf("failed to remove member from group: %w", err)
	}

	return successorID, nil
}
