"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Circle,
  CircleAlert,
  CircleDotDashed,
  CircleX,
} from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

interface Subtask {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  tools?: string[];
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  level: number;
  dependencies: string[];
  subtasks: Subtask[];
}

const initialTasks: Task[] = [
  {
    id: "1",
    title: "Understand your request",
    description: "Figure out what you need and who it's for",
    status: "completed",
    priority: "high",
    level: 0,
    dependencies: [],
    subtasks: [
      {
        id: "1.1",
        title: "Parse occasion & recipient",
        description: "Identify who the gift is for and what the occasion is",
        status: "completed",
        priority: "high",
        tools: ["conversation"],
      },
      {
        id: "1.2",
        title: "Note delivery city",
        description: "Capture the city to deliver to",
        status: "completed",
        priority: "high",
        tools: ["conversation"],
      },
    ],
  },
  {
    id: "2",
    title: "Search Kapruka catalog",
    description: "Find real products that match your needs",
    status: "in-progress",
    priority: "high",
    level: 0,
    dependencies: [],
    subtasks: [
      {
        id: "2.1",
        title: "Search by keyword",
        description: "Search live Kapruka catalog for matching products",
        status: "in-progress",
        priority: "high",
        tools: ["kapruka_search_products"],
      },
      {
        id: "2.2",
        title: "Filter in-stock items",
        description: "Ensure recommendations are available to order",
        status: "pending",
        priority: "medium",
        tools: ["kapruka_search_products"],
      },
    ],
  },
  {
    id: "3",
    title: "Check delivery",
    description: "Confirm delivery is available to your city on your date",
    status: "pending",
    priority: "high",
    level: 1,
    dependencies: ["2"],
    subtasks: [
      {
        id: "3.1",
        title: "Verify city is deliverable",
        description: "Check if Kapruka delivers to the requested city",
        status: "pending",
        priority: "high",
        tools: ["kapruka_list_delivery_cities", "kapruka_check_delivery"],
      },
      {
        id: "3.2",
        title: "Get delivery rate & date",
        description: "Get the flat delivery fee and earliest available date",
        status: "pending",
        priority: "medium",
        tools: ["kapruka_check_delivery"],
      },
    ],
  },
  {
    id: "4",
    title: "Build your order",
    description: "Add items to cart and prepare for checkout",
    status: "pending",
    priority: "high",
    level: 1,
    dependencies: ["3"],
    subtasks: [
      {
        id: "4.1",
        title: "Confirm cart with you",
        description: "Review selected items, quantities, and gift message",
        status: "pending",
        priority: "high",
        tools: ["conversation"],
      },
      {
        id: "4.2",
        title: "Create guest checkout order",
        description: "Generate a pay link valid for 60 minutes",
        status: "pending",
        priority: "high",
        tools: ["kapruka_create_order"],
      },
    ],
  },
];

interface AgentPlanProps {
  tasks?: Task[];
}

export default function AgentPlan({ tasks: propTasks }: AgentPlanProps) {
  const [tasks, setTasks] = useState<Task[]>(propTasks ?? initialTasks);
  const [expandedTasks, setExpandedTasks] = useState<string[]>(["1", "2"]);
  const [expandedSubtasks, setExpandedSubtasks] = useState<{
    [key: string]: boolean;
  }>({});

  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  const toggleSubtaskExpansion = (taskId: string, subtaskId: string) => {
    const key = `${taskId}-${subtaskId}`;
    setExpandedSubtasks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSubtaskStatus = (taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const updatedSubtasks = task.subtasks.map((s) =>
          s.id === subtaskId
            ? { ...s, status: s.status === "completed" ? "pending" : "completed" }
            : s
        );
        const allDone = updatedSubtasks.every((s) => s.status === "completed");
        return { ...task, subtasks: updatedSubtasks, status: allDone ? "completed" : task.status };
      })
    );
  };

  const subtaskListVariants = {
    hidden: { opacity: 0, height: 0, overflow: "hidden" },
    visible: {
      height: "auto",
      opacity: 1,
      overflow: "visible",
      transition: {
        duration: 0.25,
        staggerChildren: prefersReducedMotion ? 0 : 0.05,
        when: "beforeChildren",
        ease: [0.2, 0.65, 0.3, 0.9] as [number, number, number, number],
      },
    },
    exit: {
      height: 0,
      opacity: 0,
      overflow: "hidden",
      transition: { duration: 0.2, ease: [0.2, 0.65, 0.3, 0.9] as [number, number, number, number] },
    },
  };

  const subtaskVariants = {
    hidden: { opacity: 0, x: prefersReducedMotion ? 0 : -8 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: prefersReducedMotion ? ("tween" as const) : ("spring" as const),
        stiffness: 500,
        damping: 25,
      },
    },
    exit: { opacity: 0, x: prefersReducedMotion ? 0 : -8, transition: { duration: 0.15 } },
  };

  const StatusIcon = ({ status, size = "md" }: { status: string; size?: "sm" | "md" }) => {
    const cls = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, scale: 0.7, rotate: -15 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.7, rotate: 15 }}
          transition={{ duration: 0.18, ease: [0.2, 0.65, 0.3, 0.9] }}
        >
          {status === "completed" ? (
            <CheckCircle2 className={`${cls} text-emerald-500`} />
          ) : status === "in-progress" ? (
            <CircleDotDashed className={`${cls} text-kap-purple`} />
          ) : status === "need-help" ? (
            <CircleAlert className={`${cls} text-amber-500`} />
          ) : status === "failed" ? (
            <CircleX className={`${cls} text-red-500`} />
          ) : (
            <Circle className={`${cls} text-kira-muted`} />
          )}
        </motion.div>
      </AnimatePresence>
    );
  };

  const StatusBadge = ({ status }: { status: string }) => (
    <motion.span
      key={status}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        status === "completed"
          ? "bg-emerald-100 text-emerald-700"
          : status === "in-progress"
          ? "bg-purple-100 text-kap-purple"
          : status === "need-help"
          ? "bg-amber-100 text-amber-700"
          : status === "failed"
          ? "bg-red-100 text-red-700"
          : "bg-gray-100 text-gray-500"
      }`}
    >
      {status}
    </motion.span>
  );

  return (
    <div className="bg-kira-bg rounded-2xl border border-kira-border overflow-hidden">
      <div className="px-3 py-2 border-b border-kira-border flex items-center gap-2">
        <span className="text-kap-purple text-xs font-bold uppercase tracking-wider">
          Kira&apos;s plan
        </span>
      </div>

      <LayoutGroup>
        <div className="p-3">
          <ul className="space-y-1">
            {tasks.map((task, index) => {
              const isExpanded = expandedTasks.includes(task.id);
              const isCompleted = task.status === "completed";

              return (
                <motion.li
                  key={task.id}
                  className={index !== 0 ? "pt-1.5" : ""}
                  layout
                >
                  {/* Task row */}
                  <motion.div
                    className="flex items-center px-2 py-1.5 rounded-xl cursor-pointer hover:bg-kira-border/30 transition-colors"
                    onClick={() => toggleTaskExpansion(task.id)}
                    layout
                  >
                    <div
                      className="mr-2 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <StatusIcon status={task.status} />
                    </div>

                    <div className="flex flex-1 min-w-0 items-center justify-between gap-2">
                      <span
                        className={`text-sm font-medium truncate ${
                          isCompleted ? "line-through text-kira-muted" : "text-kira-text"
                        }`}
                      >
                        {task.title}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {task.dependencies.length > 0 && (
                          <div className="flex gap-1">
                            {task.dependencies.map((dep, i) => (
                              <span
                                key={i}
                                className="bg-kira-border text-kira-muted rounded px-1.5 py-0.5 text-[10px] font-medium"
                              >
                                after {dep}
                              </span>
                            ))}
                          </div>
                        )}
                        <StatusBadge status={task.status} />
                      </div>
                    </div>
                  </motion.div>

                  {/* Subtasks */}
                  <AnimatePresence mode="wait">
                    {isExpanded && task.subtasks.length > 0 && (
                      <motion.div
                        className="relative overflow-hidden"
                        variants={subtaskListVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        layout
                      >
                        <div className="absolute top-0 bottom-0 left-[18px] border-l-2 border-dashed border-kira-border" />
                        <ul className="mt-0.5 mb-1 ml-2.5 mr-1 space-y-0.5">
                          {task.subtasks.map((subtask) => {
                            const key = `${task.id}-${subtask.id}`;
                            const isSubExpanded = expandedSubtasks[key];

                            return (
                              <motion.li
                                key={subtask.id}
                                className="flex flex-col pl-5 py-0.5"
                                variants={subtaskVariants}
                                onClick={() =>
                                  toggleSubtaskExpansion(task.id, subtask.id)
                                }
                                layout
                              >
                                <motion.div
                                  className="flex items-center gap-2 rounded-lg p-1 hover:bg-kira-border/30 transition-colors cursor-pointer"
                                  layout
                                >
                                  <div
                                    className="shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSubtaskStatus(task.id, subtask.id);
                                    }}
                                  >
                                    <StatusIcon status={subtask.status} size="sm" />
                                  </div>
                                  <span
                                    className={`text-xs flex-1 ${
                                      subtask.status === "completed"
                                        ? "line-through text-kira-muted"
                                        : "text-kira-text"
                                    }`}
                                  >
                                    {subtask.title}
                                  </span>
                                </motion.div>

                                <AnimatePresence>
                                  {isSubExpanded && (
                                    <motion.div
                                      className="ml-6 mt-1 mb-1 text-xs text-kira-muted border-l-2 border-dashed border-kira-border pl-3 overflow-hidden"
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <p className="py-0.5">{subtask.description}</p>
                                      {subtask.tools && subtask.tools.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1 mb-0.5">
                                          <span className="text-kira-muted font-medium mr-0.5">
                                            tools:
                                          </span>
                                          {subtask.tools.map((tool, i) => (
                                            <span
                                              key={i}
                                              className="bg-kap-purple/10 text-kap-purple rounded px-1.5 py-0.5 text-[10px] font-medium"
                                            >
                                              {tool}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.li>
                            );
                          })}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </ul>
        </div>
      </LayoutGroup>
    </div>
  );
}
