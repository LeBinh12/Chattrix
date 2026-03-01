package storage

import (
	"context"
	"my-app/modules/group/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (s *mongoStoreGroup) DissolveGroup(ctx context.Context, groupID primitive.ObjectID) error {
	// 1. Delete the group from "group" collection
	_, err := s.db.Collection("group").DeleteOne(ctx, bson.M{"_id": groupID})
	if err != nil {
		return err
	}

	// 2. Delete all members from "group_user_roles" collection
	_, err = s.db.Collection("group_user_roles").DeleteMany(ctx, bson.M{"group_id": groupID.Hex()})
	if err != nil {
		return err
	}

	// 3. Delete from "group_members" collection (legacy)
	_, _ = s.db.Collection("group_members").DeleteMany(ctx, bson.M{"group_id": groupID})

	return nil
}

func (s *mongoStoreGroup) GetGroup(ctx context.Context, groupID primitive.ObjectID) (*models.Group, error) {
	var group models.Group
	err := s.db.Collection("group").FindOne(ctx, bson.M{"_id": groupID}).Decode(&group)
	if err != nil {
		return nil, err
	}
	return &group, nil
}
