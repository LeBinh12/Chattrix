# Task Message Persistence & Fixes Summary

## Changes Implemented

### 1. Backend Persistence (Go)
- **MongoDB**: Updated `models.Message` to include `Task` field. Updated `modules/chat/biz/chat.go` to handle task data in `HandleMessage`.
- **Kafka**: Updated `common/kafka/consumer.go` to propagate task data from Kafka messages to the business logic.
- **API Response**: Updated `modules/chat/storage/get_message.go` to ensure `Task` data is returned in message history API calls.

### 2. Elasticsearch Indexing
- **Model**: Updated `modules/chat/models/es_message.go` to include `Type` and `Task` fields in the `ESMessage` struct.
- **Indexing**: Updated `IndexMessage` in `modules/chat/storage/save_message.go` to map these fields when indexing messages, allowing for future search capabilities on task data.

### 3. Frontend (React/TypeScript)
- **Task Creation**: `AssignTaskForm.tsx` and `ChatInputWindow.tsx` now correctly create a task via API and send a structured socket message with `type: "task"`.
- **Rendering**: updated `MessageItem.tsx` and `TaskCard.tsx` to render task cards correctly. Added a fallback UI ("Thông tin công việc không khả dụng") for task messages that might be missing underlying data (e.g. from before the fix).
- **Linting**: Resolved all linting errors in:
    - `clientapp/src/api/socket.ts`
    - `clientapp/src/components/chat/chat_content/MessageItem.tsx`
    - `clientapp/src/components/group/AddMemberModal.tsx`
    - `clientapp/src/components/home/GroupMembersPanel.tsx`
    - `clientapp/src/components/group/CreateGroup.tsx` and others.

## Verification Instructions

1.  **Refresh the Page**: Ensure you load the latest frontend changes.
2.  **Create a Task**:
    - Open a chat.
    - Click the "+" menu and select "Giao việc".
    - Fill in the form and submit.
    - Verify the "Task Card" appears immediately in the chat.
3.  **Reload the Page (F5)**:
    - Reload the browser.
    - Check the same conversation.
    - **Success Criteria**: The task message should **persist as a Task Card** and NOT revert to plain text or show the "Task info unavailable" error (unless it was an old message).
4.  **Check Output**:
    - Backend logs should show no errors.
    - `pnpm lint` in `clientapp` should pass clean.

## Troubleshooting
- If old tasks still show as errors, this is expected as they lacked the persisted data. Only new tasks created *after* this fix will persist correctly.
- If the backend fails to start, check for port 3000 conflicts (`lsof -i :3000`).
