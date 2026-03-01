import { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  Search,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCcw,
  Loader2,
  Filter,
  X
} from "lucide-react";
import { taskApi, type Task, type TaskStatus } from "../api/taskApi";
import { useRecoilValue } from "recoil";
import { userAtom } from "../recoil/atoms/userAtom";
import { toast } from "react-toastify";
import TaskDetailModal from "../components/home/chat_window/TaskDetailModal";
import AssignTaskForm, { type TaskData } from "../components/home/chat_window/AssignTaskForm";
import { BUTTON_HOVER } from "../utils/className";
import { socketManager } from "../api/socket";

export default function TodoScreen() {
  const [activeTab, setActiveTab] = useState<"assigned_to_me" | "assigned_by_me">("assigned_to_me");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | TaskStatus>("all");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const user = useRecoilValue(userAtom);
  const currentUserId = user?.data.id;

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await taskApi.getTasks(activeTab);
      if (res.data && Array.isArray(res.data.data)) {
        setTasks(res.data.data);
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error("Fetch tasks error", error);
      toast.error("Không thể tải danh sách công việc");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchTasks();
  }, [activeTab, fetchTasks]);

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    if (selectedTask?.id === updatedTask.id) {
      setSelectedTask(updatedTask);
    }
  };

  const handleCreateTask = async (data: TaskData) => {
    try {
      const res = await taskApi.createTask({
        ...data,
        group_id: data.group_id || "000000000000000000000000",
        attachment_ids: data.attachment_ids || []
      });

      // Backend trả về mảng tasks (atomic bulk)
      const createdTasks: typeof res.data.data = Array.isArray(res.data.data)
        ? res.data.data
        : [res.data.data];

      // Real-time notification cho từng task
      if (currentUserId && createdTasks) {
        createdTasks.forEach((createdTask: any) => {
          if (!createdTask) return;
          const finalGroupId = createdTask.group_id === "000000000000000000000000" ? "" : createdTask.group_id;

          if (createdTask.assignees && createdTask.assignees.length > 0) {
            // GROUP TASK
            if (finalGroupId) {
              // Có group_id → chỉ gửi 1 message vào group, không lặp per-assignee
              socketManager.sendTask(
                currentUserId,
                "",
                finalGroupId,
                createdTask,
                createdTask.assignee_name,
                "",
                user?.data.avatar
              );
            } else {
              // DM context → gửi riêng cho từng assignee
              createdTask.assignees.forEach((a: any) => {
                socketManager.sendTask(
                  currentUserId,
                  a.assignee_id,
                  "",
                  createdTask,
                  a.assignee_name,
                  "",
                  user?.data.avatar
                );
              });
            }
          } else {
            // SINGLE-ASSIGNEE TASK: giữ nguyên
            const finalReceiverId = finalGroupId ? "" : createdTask.assignee_id;
            socketManager.sendTask(
              currentUserId,
              finalReceiverId,
              finalGroupId,
              createdTask,
              createdTask.assignee_name,
              "",
              user?.data.avatar
            );
          }
        });
      }

      toast.success(
        createdTasks.length > 1
          ? `Giao việc thành công cho ${createdTasks.length} người`
          : "Giao việc thành công"
      );
      setIsAssignModalOpen(false);
      fetchTasks();
    } catch (error) {
      console.error("Create task error", error);
      toast.error("Giao việc thất bại, vui lòng thử lại");
    }
  };

  const filteredTasks = tasks.filter(task => {
    // Status filter
    if (filterStatus !== "all" && task.status !== filterStatus) return false;

    // Search filter
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      return task.title.toLowerCase().includes(lowerQ) ||
        (task.assignee_name && task.assignee_name.toLowerCase().includes(lowerQ));
    }

    return true;
  });

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-[#00568c] bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityLabel = (priority?: string) => {
    switch (priority) {
      case 'critical': return 'Khẩn cấp';
      case 'high': return 'Cao';
      case 'medium': return 'Trung bình';
      case 'low': return 'Thấp';
      default: return 'Bình thường';
    }
  };

  return (
    <div className="h-full flex flex-col font-sans bg-white text-gray-900">
      {/* Header Sticky */}
      <div className="flex-none bg-white border-b border-gray-100 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <p className="text-lg font-bold text-gray-900">Giao việc</p>
          <div className="flex gap-2">
            <button onClick={fetchTasks} className={`p-2 text-gray-500 ${BUTTON_HOVER} rounded-full transition" title="Làm mới`}>
              <RefreshCcw size={18} className={isLoading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => setIsAssignModalOpen(true)}
              className="flex items-center gap-1.5 !px-3 !py-1.5 !bg-blue-50 !text-[#00568c] !rounded hover:!bg-blue-100 !transition !font-medium !text-sm !cursor-pointer"
            >
              <Plus size={16} />
              <span>Tạo mới</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Tìm kiếm công việc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
                className={`
                  !w-full !pl-9 !pr-4 !py-2 !text-sm !rounded-md focus:!outline-none focus:!ring-1 focus:!ring-[#00568c] !transition-all !font-medium border border-transparent
                  md:!bg-gray-50 md:!text-gray-900 md:!placeholder-gray-400
                  !bg-gray-50 !text-gray-900 !placeholder-gray-400 focus:!bg-white focus:!border-[#00568c]/30`}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-6 mt-2">
          <button
            onClick={() => setActiveTab("assigned_to_me")}
            className={`!pb-2.5 !text-sm !font-semibold !border-b-2 !transition-colors !cursor-pointer ${activeTab === 'assigned_to_me' ? '!border-[#00568c] !text-[#00568c]' : '!border-transparent !text-gray-500 hover:!text-[#00568c]'}`}
          >
            Việc tôi làm
          </button>
          <button
            onClick={() => setActiveTab("assigned_by_me")}
            className={`!pb-2.5 !text-sm !font-semibold !border-b-2 !transition-colors !cursor-pointer ${activeTab === 'assigned_by_me' ? '!border-[#00568c] !text-[#00568c]' : '!border-transparent !text-gray-500 hover:!text-[#00568c]'}`}
          >
            Việc tôi giao
          </button>
        </div>
      </div>

      {/* Filter Chips - Horizontal Scroll if needed */}
      <div className="flex-none bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <Filter size={14} className="!text-gray-400 flex-shrink-0" />
        <button
          onClick={() => setFilterStatus("all")}
          className={`!px-3 !py-1 !rounded-full !text-xs !font-medium !whitespace-nowrap !transition-colors !cursor-pointer ${filterStatus === 'all' ? '!bg-[#00568c] !text-white' : '!bg-gray-100 !text-gray-600 hover:!bg-gray-200'}`}
        >
          Tất cả
        </button>
        <button
          onClick={() => setFilterStatus("pending_acceptance")}
          className={`!px-3 !py-1 !rounded-full !text-xs !font-medium !whitespace-nowrap !transition-colors !cursor-pointer ${filterStatus === 'pending_acceptance' ? '!bg-[#00568c] !text-white' : '!bg-gray-100 !text-gray-600 hover:!bg-gray-200'}`}
        >
          Chờ tiếp nhận
        </button>
        <button
          onClick={() => setFilterStatus("accepted")}
          className={`!px-3 !py-1 !rounded-full !text-xs !font-medium !whitespace-nowrap !transition-colors !cursor-pointer ${filterStatus === 'accepted' ? '!bg-[#00568c] !text-white' : '!bg-gray-100 !text-gray-600 hover:!bg-gray-200'}`}
        >
          Đã tiếp nhận
        </button>
        <button
          onClick={() => setFilterStatus("todo")}
          className={`!px-3 !py-1 !rounded-full !text-xs !font-medium !whitespace-nowrap !transition-colors !cursor-pointer ${filterStatus === 'todo' ? '!bg-[#00568c] !text-white' : '!bg-gray-100 !text-gray-600 hover:!bg-gray-200'}`}
        >
          Cần làm
        </button>
        <button
          onClick={() => setFilterStatus("in_progress")}
          className={`!px-3 !py-1 !rounded-full !text-xs !font-medium !whitespace-nowrap !transition-colors !cursor-pointer ${filterStatus === 'in_progress' ? '!bg-[#00568c] !text-white' : '!bg-gray-100 !text-gray-600 hover:!bg-gray-200'}`}
        >
          Đang làm
        </button>
        <button
          onClick={() => setFilterStatus("rejected")}
          className={`!px-3 !py-1 !rounded-full !text-xs !font-medium !whitespace-nowrap !transition-colors !cursor-pointer ${filterStatus === 'rejected' ? '!bg-red-500 !text-white' : '!bg-gray-100 !text-gray-600 hover:!bg-gray-200'}`}
        >
          Từ chối
        </button>
        <button
          onClick={() => setFilterStatus("cancel")}
          className={`!px-3 !py-1 !rounded-full !text-xs !font-medium !whitespace-nowrap !transition-colors !cursor-pointer ${filterStatus === 'cancel' ? '!bg-gray-500 !text-white' : '!bg-gray-100 !text-gray-600 hover:!bg-gray-200'}`}
        >
          Đã hủy
        </button>
        <button
          onClick={() => setFilterStatus("done")}
          className={`!px-3 !py-1 !rounded-full !text-xs !font-medium !whitespace-nowrap !transition-colors !cursor-pointer ${filterStatus === 'done' ? '!bg-[#00568c] !text-white' : '!bg-gray-100 !text-gray-600 hover:!bg-gray-200'}`}
        >
          Hoàn thành
        </button>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 size={24} className="animate-spin mb-2 text-[#00568c]" />
            <p className="text-sm">Đang tải dữ liệu...</p>
          </div>
        ) : filteredTasks.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filteredTasks.map(task => (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="group !p-4 hover:!bg-gray-50 !transition-colors !cursor-pointer flex items-start gap-4"
              >
                {/* Left: Status Icon */}
                <div className="flex-shrink-0 pt-0.5">
                  {task.status === 'done' ? (
                    <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                      <CheckCircle2 size={20} />
                    </div>
                  ) : task.status === 'in_progress' ? (
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#00568c]">
                      <div className="relative">
                        <Clock size={20} />
                        <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></div>
                      </div>
                    </div>
                  ) : task.status === 'rejected' || task.status === 'cancel' ? (
                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                      <X size={20} />
                    </div>
                  ) : task.status === 'pending_acceptance' ? (
                    <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600">
                      <Clock size={20} />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                      <ClipboardList size={20} />
                    </div>
                  )}
                </div>

                {/* Center: Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="!text-xl !font-semibold !text-gray-900 !truncate !pr-2 group-hover:!text-[#00568c] !transition-colors">{task.title}</p>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {task.deadline ? new Date(task.deadline).toLocaleDateString('vi-VN') : ''}
                    </span>
                  </div>

                  <p className="text-[13px] text-gray-500 line-clamp-2 leading-relaxed mb-2">
                    {task.description || "Không có mô tả"}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${getPriorityColor(task.priority)}`}>
                      {getPriorityLabel(task.priority)}
                    </span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                    <span>
                      {activeTab === 'assigned_to_me' ?
                        `Người giao: ${task.creator_id === currentUserId ? 'Tôi' : (task.creator_name || '...')}` :
                        `Người nhận: ${task.assignee_name || '...'}`
                      }
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <ClipboardList size={32} />
            </div>
            <p className="text-sm font-medium text-gray-500">Không có công việc nào</p>
          </div>
        )}

        {/* Footer info/spacer */}
        {filteredTasks.length > 0 && (
          <div className="p-4 text-center text-xs text-gray-400 border-t border-gray-50">
            Đã hiển thị hết danh sách
          </div>
        )}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          task={selectedTask}
          onTaskUpdate={handleTaskUpdate}
        />
      )}
      {/* Create Task Modal */}
      <AssignTaskForm
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onSubmit={handleCreateTask}
        currentUser={user?.data ? {
          user_id: user.data.id,
          display_name: user.data.display_name,
          avatar: user.data.avatar
        } : undefined}
      />
    </div>
  );
}
