package biz

import (
	"context"
	"errors"
	"my-app/modules/group/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PromoteAdminStore interface {
	FindMember(ctx context.Context, groupID, userID primitive.ObjectID) (*models.GroupMember, error)
	UpdateMemberRole(ctx context.Context, groupID, userID primitive.ObjectID, role string) error
}

type PromoteAdminBiz struct {
	store PromoteAdminStore
}

func NewPromoteAdminBiz(store PromoteAdminStore) *PromoteAdminBiz {
	return &PromoteAdminBiz{store: store}
}

func (b *PromoteAdminBiz) PromoteMember(ctx context.Context, requesterID, groupID, targetUserID string) error {
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
		return errors.New("only the group owner can appoint admins")
	}

	// 2. Check target user
	targetMember, err := b.store.FindMember(ctx, groupOID, targetOID)
	if err != nil {
		return errors.New("member does not exist in the group")
	}

	if targetMember.Role == "owner" {
		return errors.New("cannot change the group owner's permissions")
	}

	if targetMember.Role == "admin" {
		return errors.New("this member is already an admin")
	}

	// 3. Update role
	if err := b.store.UpdateMemberRole(ctx, groupOID, targetOID, "admin"); err != nil {
		return err
	}

	return nil
}
