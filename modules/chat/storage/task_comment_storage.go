package storage

import (
	"context"
	"time"

	"my-app/modules/chat/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type TaskCommentStorage struct {
	db *mongo.Database
}

func NewTaskCommentStorage(db *mongo.Database) *TaskCommentStorage {
	return &TaskCommentStorage{db: db}
}

func (s *TaskCommentStorage) CreateComment(
	ctx context.Context,
	comment *models.TaskComment,
) error {
	_, err := s.db.Collection("task_comments").InsertOne(ctx, comment)
	return err
}

func (s *TaskCommentStorage) GetComment(
	ctx context.Context,
	commentID primitive.ObjectID,
) (*models.TaskComment, error) {
	var comment models.TaskComment

	err := s.db.Collection("task_comments").
		FindOne(ctx, bson.M{"_id": commentID}).
		Decode(&comment)

	if err != nil {
		return nil, err
	}
	return &comment, nil
}

func (s *TaskCommentStorage) ListCommentsByTask(
	ctx context.Context,
	taskID primitive.ObjectID,
	page, limit int64,
) ([]models.TaskComment, error) {

	if page < 1 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}

	skip := (page - 1) * limit

	// Only get parent comments (not replies)
	filter := bson.M{
		"task_id": taskID,
		// "$or": []bson.M{
		// 	{"reply_to_id": bson.M{"$exists": false}},
		// 	{"reply_to_id": nil},
		// },
	}
	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: 1}}).
		SetSkip(skip).
		SetLimit(limit)

	cursor, err := s.db.Collection("task_comments").
		Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}

	var comments []models.TaskComment
	if err := cursor.All(ctx, &comments); err != nil {
		return nil, err
	}

	return comments, nil
}

func (s *TaskCommentStorage) UpdateCommentContent(
	ctx context.Context,
	commentID primitive.ObjectID,
	content string,
) error {

	filter := bson.M{"_id": commentID}
	update := bson.M{
		"$set": bson.M{
			"content":    content,
			"updated_at": time.Now(),
		},
	}

	result, err := s.db.Collection("task_comments").
		UpdateOne(ctx, filter, update)
	if err != nil {
		return err
	}

	if result.MatchedCount == 0 {
		return mongo.ErrNoDocuments
	}

	replyFilter := bson.M{
		"reply_to_id": commentID,
	}

	replyUpdate := bson.M{
		"$set": bson.M{
			"reply_to_content": content,
			"updated_at":       time.Now(),
		},
	}

	_, err = s.db.Collection("task_comments").
		UpdateMany(ctx, replyFilter, replyUpdate)
	if err != nil {
		return err
	}

	return nil
}

func (s *TaskCommentStorage) DeleteComment(
	ctx context.Context,
	commentID primitive.ObjectID,
) error {

	result, err := s.db.Collection("task_comments").
		DeleteOne(ctx, bson.M{"_id": commentID})
	if err != nil {
		return err
	}

	if result.DeletedCount == 0 {
		return mongo.ErrNoDocuments
	}

	return nil
}

func (s *TaskCommentStorage) CountCommentsByTask(
	ctx context.Context,
	taskID primitive.ObjectID,
) (int64, error) {
	return s.db.Collection("task_comments").
		CountDocuments(ctx, bson.M{"task_id": taskID})
}

func (s *TaskCommentStorage) ListRepliesByComment(
	ctx context.Context,
	parentCommentID primitive.ObjectID,
	page, limit int64,
) ([]models.TaskComment, error) {

	if page < 1 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}

	skip := (page - 1) * limit

	filter := bson.M{"reply_to_id": parentCommentID}
	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: 1}}).
		SetSkip(skip).
		SetLimit(limit)

	cursor, err := s.db.Collection("task_comments").
		Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}

	var replies []models.TaskComment
	if err := cursor.All(ctx, &replies); err != nil {
		return nil, err
	}

	return replies, nil
}

func (s *TaskCommentStorage) CountRepliesByComment(
	ctx context.Context,
	parentCommentID primitive.ObjectID,
) (int64, error) {
	return s.db.Collection("task_comments").
		CountDocuments(ctx, bson.M{"reply_to_id": parentCommentID})
}

func (s *TaskCommentStorage) IncrementReplyCount(
	ctx context.Context,
	parentCommentID primitive.ObjectID,
) error {
	filter := bson.M{"_id": parentCommentID}
	update := bson.M{
		"$inc": bson.M{"reply_count": 1},
	}

	_, err := s.db.Collection("task_comments").UpdateOne(ctx, filter, update)
	return err
}

func (s *TaskCommentStorage) DecrementReplyCount(
	ctx context.Context,
	parentCommentID primitive.ObjectID,
) error {
	filter := bson.M{"_id": parentCommentID}
	update := bson.M{
		"$inc": bson.M{"reply_count": -1},
	}

	_, err := s.db.Collection("task_comments").UpdateOne(ctx, filter, update)
	return err
}
