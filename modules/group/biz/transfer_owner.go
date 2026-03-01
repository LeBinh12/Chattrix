package biz

import (
	"context"
	"errors"
	"my-app/modules/group/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type TransferOwnerStore interface {
	FindMember(ctx context.Context, groupID, userID primitive.ObjectID) (*models.GroupMember, error)
	UpdateMemberRole(ctx context.Context, groupID, userID primitive.ObjectID, role string) error
	UpdateGroupCreator(ctx context.Context, groupID, newCreatorID primitive.ObjectID) error
}

type TransferOwnerBiz struct {
	store TransferOwnerStore
}

func NewTransferOwnerBiz(store TransferOwnerStore) *TransferOwnerBiz {
	return &TransferOwnerBiz{store: store}
}

func (b *TransferOwnerBiz) TransferOwnership(ctx context.Context, requesterID, groupID, targetUserID string) error {
	groupOID, err := primitive.ObjectIDFromHex(groupID)
	if err != nil {
		return errors.New("invalid group_id")
	}

	targetOID, err := primitive.ObjectIDFromHex(targetUserID)
	if err != nil {
		return errors.New("invalid user_id")
	}

	requesterOID, err := primitive.ObjectIDFromHex(requesterID)
	if err != nil {
		return errors.New("invalid requester_id")
	}

	// 1. Check if requester is the owner
	requesterMember, err := b.store.FindMember(ctx, groupOID, requesterOID)
	if err != nil {
		return errors.New("your information not found in the group")
	}

	if requesterMember.Role != "owner" {
		return errors.New("only the group owner can transfer ownership")
	}

	// 2. Check target user
	targetMember, err := b.store.FindMember(ctx, groupOID, targetOID)
	if err != nil {
		return errors.New("member does not exist in the group")
	}

	if targetMember.Role == "owner" {
		return errors.New("this user is already the owner")
	}

	// 3. Perform ownership swap
	// Step 3a: Demote old owner to 'number' (regular member)
	if err := b.store.UpdateMemberRole(ctx, groupOID, requesterOID, "member"); err != nil {
		return err
	}

	// Step 3b: Promote new person to 'owner'
	if err := b.store.UpdateMemberRole(ctx, groupOID, targetOID, "owner"); err != nil {
		// Rollback old owner role in case of failure?
		// MongoDB doesn't support transactions easily without replica sets.
		// For now simple update.
		return err
	}

	// Step 3c: Update Group's creator_id
	if err := b.store.UpdateGroupCreator(ctx, groupOID, targetOID); err != nil {
		return err
	}

	return nil
}
