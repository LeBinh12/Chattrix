import { motion } from "framer-motion";

interface AuthFormProps {
  title: string;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
}

export default function AuthForm({ title, onSubmit, children }: AuthFormProps) {
  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onSubmit={onSubmit}
      className="w-full"
    >
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          {title}
        </h2>
        <div className="h-1 w-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full" />
      </div>
      
      {/* Form Content */}
      <div className="space-y-5">
        {children}
      </div>
    </motion.form>
  );
}
